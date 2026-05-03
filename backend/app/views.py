import logging

import requests
from django.contrib.auth import get_user_model
from django.db import models as djmodels
from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile, MomentumSnapshot
from .serializers import (
    UserSerializer,
    PublicProfileSerializer,
    ProfileUpdateSerializer,
    GitHubAuthSerializer,
)
from .services import cache as cache_svc

logger = logging.getLogger(__name__)
User = get_user_model()


# ── GitHub OAuth ───────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def github_login(request):
    """Return the GitHub OAuth redirect URL."""
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.SOCIAL_AUTH_GITHUB_CLIENT_ID}"
        f"&scope={settings.GITHUB_OAUTH_SCOPES}"
    )
    return Response({"auth_url": url})


@api_view(["POST"])
@permission_classes([AllowAny])
def github_callback(request):
    """
    Exchange OAuth code → JWT tokens.
    Runs the initial sync synchronously so the user lands on a populated dashboard.
    """
    serializer = GitHubAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = serializer.validated_data["code"]

    # ── 1. Exchange code for GitHub access token ───────────────────────────────
    try:
        token_resp = requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.SOCIAL_AUTH_GITHUB_CLIENT_ID,
                "client_secret": settings.SOCIAL_AUTH_GITHUB_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_data = token_resp.json()
    except requests.RequestException as exc:
        logger.error(f"GitHub token exchange network error: {exc}")
        return Response({"error": "Could not reach GitHub"}, status=status.HTTP_502_BAD_GATEWAY)

    access_token = token_data.get("access_token")
    if not access_token:
        error = token_data.get("error_description", "No access token returned")
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    gh_headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}

    # ── 2. Fetch GitHub user + email ───────────────────────────────────────────
    try:
        github_user  = requests.get("https://api.github.com/user", headers=gh_headers, timeout=10).json()
        emails_data  = requests.get("https://api.github.com/user/emails", headers=gh_headers, timeout=10).json()
    except requests.RequestException as exc:
        logger.error(f"GitHub user fetch error: {exc}")
        return Response({"error": "Could not fetch GitHub profile"}, status=status.HTTP_502_BAD_GATEWAY)

    primary_email = next(
        (e["email"] for e in (emails_data if isinstance(emails_data, list) else [])
         if e.get("primary") and e.get("verified")),
        github_user.get("email") or f"{github_user['login']}@users.noreply.github.com",
    )

    # ── 3. Upsert Django user + profile ───────────────────────────────────────
    user, _ = User.objects.get_or_create(
        username=github_user["login"],
        defaults={"email": primary_email},
    )
    if user.email != primary_email:
        user.email = primary_email
        user.save(update_fields=["email"])

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.apply_github_identity(github_user, access_token)
    profile.save()

    # ── 4. Run initial sync synchronously (gives user data on first load) ──────
    try:
        _run_sync(user.id, full=True)
    except Exception as exc:
        logger.warning(f"Initial sync failed for {user.username}: {exc}")

    # ── 5. Return JWT tokens ───────────────────────────────────────────────────
    user.refresh_from_db()
    refresh = RefreshToken.for_user(user)
    return Response({
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
        "user":    UserSerializer(user).data,
    })


# ── Profile ────────────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """GET or PATCH the authenticated user's own profile."""
    user      = request.user
    cache_key = cache_svc.profile_key(user.id)

    if request.method == "GET":
        cached = cache_svc.get(cache_key)
        if cached:
            return Response(cached)
        data = UserSerializer(user).data
        cache_svc.set(cache_key, data, ttl_key="profile")
        return Response(data)

    # PATCH
    profile, _ = UserProfile.objects.get_or_create(user=user)
    serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    cache_svc.invalidate_user(user.id, profile.github_username)
    return Response(UserSerializer(user).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_profile(request, username):
    """Public profile — cached, no auth required."""
    cache_key = cache_svc.public_profile_key(username)
    cached    = cache_svc.get(cache_key)
    if cached:
        return Response(cached)

    try:
        user = User.objects.select_related("profile").get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    profile = getattr(user, "profile", None)
    if not profile or not profile.profile_public:
        return Response({"error": "Profile is private or not found"}, status=status.HTTP_404_NOT_FOUND)

    data = PublicProfileSerializer(profile).data
    cache_svc.set(cache_key, data, ttl_key="public_profile")
    return Response(data)


# ── GitHub data sync ───────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_github(request):
    """
    Manually trigger a full GitHub sync.

    Runs synchronously in the request so the response contains fresh data.
    Also queues a Celery task for any heavy background work.
    """
    profile = getattr(request.user, "profile", None)
    if not profile or not profile.github_token:
        return Response({"error": "GitHub account not connected"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Run synchronously — this is what populates the DB before we respond
        _run_sync(request.user.id, full=True)
    except Exception as exc:
        logger.error(f"sync_github failed for user {request.user.id}: {exc}", exc_info=True)
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Reload fresh data from DB
    profile.refresh_from_db()
    cache_svc.invalidate_user(request.user.id, profile.github_username)

    return Response({
        "message":            "GitHub data synced successfully",
        "momentum_score":     profile.momentum_score,
        "total_contributions": profile.total_contributions,
        "current_streak":     profile.current_streak,
        "top_language":       profile.top_language,
        "last_sync":          profile.last_github_sync,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def disconnect_github(request):
    """Unlink GitHub from the account."""
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    profile.github_token       = ""
    profile.is_github_connected = False
    profile.github_username    = ""
    profile.github_id          = None
    profile.save(update_fields=["github_token", "is_github_connected", "github_username", "github_id"])

    cache_svc.invalidate_user(request.user.id)
    return Response({"message": "GitHub disconnected successfully"})


# ── Analytics ──────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analytics(request):
    """Full analytics payload for the dashboard."""
    user      = request.user
    cache_key = cache_svc.analytics_key(user.id)
    cached    = cache_svc.get(cache_key)
    if cached:
        return Response(cached)

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    # If never synced, run sync now so the dashboard isn't empty
    if not profile.last_github_sync and profile.github_token:
        try:
            _run_sync(user.id, full=True)
            profile.refresh_from_db()
        except Exception as exc:
            logger.warning(f"Auto-sync on analytics fetch failed: {exc}")

    history_qs = MomentumSnapshot.objects.filter(profile=profile).order_by("-date")[:90]
    history = [
        {
            "date":          str(s.date),
            "score":         s.score,
            "consistency":   s.consistency,
            "recency":       s.recency,
            "depth":         s.depth,
            "decay":         s.decay,
            "contributions": s.contributions_that_day,
        }
        for s in history_qs
    ]

    repos_with_health = _enrich_repos_with_health(profile.own_repos, profile.repo_health_cache)

    data = {
        "summary": {
            "total_contributions":    profile.total_contributions,
            "total_commits":          profile.total_commits,
            "total_pull_requests":    profile.total_pull_requests,
            "total_issues":           profile.total_issues,
            "total_reviews":          profile.total_reviews,
            "current_streak":         profile.current_streak,
            "longest_streak":         profile.longest_streak,
            "peak_contribution_time": profile.peak_contribution_time,
            "last_streak_break":      str(profile.last_streak_break) if profile.last_streak_break else None,
        },
        "momentum": {
            "score":          profile.momentum_score,
            "consistency":    profile.momentum_consistency,
            "recency":        profile.momentum_recency,
            "depth":          profile.momentum_depth,
            "decay":          profile.momentum_decay,
            "last_calculated": profile.momentum_last_calculated,
            "history":        history,
        },
        "trends": {
            "daily":   profile.daily_contributions,
            "monthly": profile.monthly_contributions,
            "weekly":  profile.weekly_contributions,
        },
        "languages":          profile.language_stats,
        "contribution_types": profile.contribution_types,
        "burnout": {
            "risk":    profile.burnout_risk,
            "signals": profile.burnout_signals,
        },
        "personality": {
            "type":       profile.personality_type,
            "confidence": profile.personality_confidence,
            "signals":    profile.personality_signals,
        },
        "narrative":        profile.contribution_narrative,
        "repos":            repos_with_health,
        "pinned_repos":     profile.pinned_repos,
        "contributed_repos": profile.contributed_repos[:10],
        "ranking": {
            "rank":       profile.consistency_rank,
            "percentile": profile.consistency_percentile,
        },
        "last_sync":      profile.last_github_sync,
        "last_full_sync": profile.last_full_sync,
    }

    cache_svc.set(cache_key, data, ttl_key="analytics")
    return Response(data)


# ── Momentum history ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def momentum_history(request):
    """Momentum score time-series for line chart."""
    days    = min(int(request.GET.get("days", 90)), 365)
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    snapshots = MomentumSnapshot.objects.filter(profile=profile).order_by("date")[:days]
    return Response([
        {"date": str(s.date), "score": s.score, "contributions": s.contributions_that_day}
        for s in snapshots
    ])


# ── Contributors search ────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def search_contributors(request):
    """Search public profiles."""
    q           = request.GET.get("q", "").strip()
    language    = request.GET.get("language", "").strip()
    personality = request.GET.get("personality", "").strip()
    try:
        min_momentum = float(request.GET.get("min_momentum", 0))
    except ValueError:
        min_momentum = 0

    cache_key = cache_svc.search_key(q, language, int(min_momentum))
    cached    = cache_svc.get(cache_key)
    if cached:
        return Response(cached)

    profiles = UserProfile.objects.filter(
        profile_public=True, is_github_connected=True
    ).select_related("user")

    if q:
        profiles = profiles.filter(
            djmodels.Q(user__username__icontains=q)
            | djmodels.Q(github_username__icontains=q)
        )
    if language:
        profiles = profiles.filter(top_language__iexact=language)
    if personality:
        profiles = profiles.filter(personality_type=personality)
    if min_momentum > 0:
        profiles = profiles.filter(momentum_score__gte=min_momentum)

    profiles = profiles.order_by("-momentum_score")[:50]
    data = [
        {
            "username":         p.user.username,
            "full_name":        p.get_full_name(),
            "avatar_url":       p.avatar_url,
            "momentum_score":   p.momentum_score,
            "total_contributions": p.total_contributions,
            "top_language":     p.top_language,
            "current_streak":   p.current_streak,
            "personality_type": p.personality_type,
            "consistency_rank": p.consistency_rank,
        }
        for p in profiles
    ]
    cache_svc.set(cache_key, data, ttl_key="search")
    return Response(data)


# ── Leaderboard ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def leaderboard(request):
    """Top developers by momentum score."""
    limit     = min(int(request.GET.get("limit", 20)), 100)
    cache_key = cache_svc.ranking_key()
    cached    = cache_svc.get(cache_key)
    if cached:
        return Response(cached[:limit])

    profiles = (
        UserProfile.objects.filter(profile_public=True, is_github_connected=True)
        .select_related("user")
        .order_by("-momentum_score")[:100]
    )
    data = [
        {
            "rank":                 p.consistency_rank or (i + 1),
            "username":             p.user.username,
            "full_name":            p.get_full_name(),
            "avatar_url":           p.avatar_url,
            "momentum_score":       p.momentum_score,
            "personality_type":     p.personality_type,
            "top_language":         p.top_language,
            "current_streak":       p.current_streak,
            "consistency_percentile": p.consistency_percentile,
        }
        for i, p in enumerate(profiles)
    ]
    cache_svc.set(cache_key, data, ttl_key="ranking")
    return Response(data[:limit])


# ── Settings ───────────────────────────────────────────────────────────────────

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_settings(request):
    """Update account settings (privacy, etc.)."""
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    if "privacy" in request.data:
        privacy = request.data["privacy"]
        if "profile_public" in privacy:
            profile.profile_public = bool(privacy["profile_public"])

    profile.save(update_fields=["profile_public"])
    cache_svc.invalidate_user(request.user.id, profile.github_username)
    return Response({"message": "Settings updated"})


# ── Core sync helper (shared by view + tasks) ──────────────────────────────────

def _run_sync(user_id: int, full: bool = True):
    """
    Synchronous sync implementation used directly by views.
    The Celery task calls this same logic via shared_task wrapper.
    Keeping it here avoids circular imports between views and tasks.
    """
    from .models import UserProfile, MomentumSnapshot
    from .services.github_service import GitHubService
    from .services import momentum, personality, burnout, narrative, repo_health

    profile = UserProfile.objects.select_related("user").get(user_id=user_id)

    if not profile.github_token or not profile.github_username:
        raise ValueError(f"User {user_id} has no GitHub token")

    service = GitHubService(access_token=profile.github_token)
    data    = service.get_complete_user_data(profile.github_username)

    profile.apply_contribution_stats(data["stats"])
    profile.apply_language_stats(data["language_stats"], data["top_language"])
    profile.apply_repo_data(data["own_repos"], data["pinned_repos"], data["contributed_repos"])

    profile_data = {
        "daily_counts":          data["stats"].get("daily_counts", {}),
        "monthly_contributions": data["stats"].get("monthly_data", {}),
        "weekly_contributions":  data["stats"].get("weekly_data", {}),
        "total_contributions":   data["stats"].get("total_contributions", 0),
        "total_commits":         data["stats"].get("total_commits", 0),
        "total_pull_requests":   data["stats"].get("total_pull_requests", 0),
        "total_issues":          data["stats"].get("total_issues", 0),
        "total_reviews":         data["stats"].get("total_reviews", 0),
        "contribution_types":    data["stats"].get("contribution_types", {}),
        "current_streak":        data["stats"].get("current_streak", 0),
        "longest_streak":        data["stats"].get("longest_streak", 0),
        "own_repos":             data.get("own_repos", []),
        "language_stats":        data.get("language_stats", {}),
    }

    momentum_result = momentum.calculate(profile_data)
    profile.apply_momentum(momentum_result)

    burnout_result = burnout.analyse(profile_data)
    profile.apply_burnout(burnout_result)

    if full:
        personality_result = personality.classify(profile_data)
        profile.apply_personality(personality_result)

        narrative_phases = narrative.build(profile_data)
        profile.apply_narrative(narrative_phases)

        health_map = repo_health.score_repos(profile.own_repos)
        profile.apply_repo_health(health_map)

        profile.mark_synced(full=True)
    else:
        profile.mark_synced(full=False)

    profile.save()

    # Momentum snapshot for history chart
    from django.utils import timezone
    today = timezone.now().date()
    contributions_today = profile.daily_contributions.get(str(today), 0)
    MomentumSnapshot.objects.update_or_create(
        profile=profile,
        date=today,
        defaults={
            "score":                   profile.momentum_score,
            "consistency":             profile.momentum_consistency,
            "recency":                 profile.momentum_recency,
            "depth":                   profile.momentum_depth,
            "decay":                   profile.momentum_decay,
            "contributions_that_day":  contributions_today,
        },
    )

    logger.info(
        f"_run_sync: user {user_id} ({profile.github_username}) "
        f"done — momentum={profile.momentum_score:.2f}"
    )
    return profile


# ── Helpers ────────────────────────────────────────────────────────────────────

def _enrich_repos_with_health(own_repos: list, health_cache: dict) -> list:
    result = []
    for repo in own_repos:
        full_name   = repo.get("full_name") or repo.get("name", "")
        health_data = health_cache.get(full_name, {})
        result.append({**repo, **health_data})
    return result