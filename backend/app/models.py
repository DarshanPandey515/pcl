from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class UserProfile(models.Model):
    """
    Extended profile storing all GitHub intelligence:
    raw stats, computed scores, and cached analysis results.

    Design principle: never store raw API payloads here long-term.
    Structured, queryable fields only. Raw JSON caches are prefixed _cache.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")

    # ── Identity ───────────────────────────────────────────────────────────────
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    website = models.URLField(max_length=200, blank=True)

    # ── GitHub connection ──────────────────────────────────────────────────────
    github_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    github_username = models.CharField(max_length=100, blank=True, db_index=True)
    github_url = models.URLField(max_length=200, blank=True)
    # Token stored; encrypt at rest in production (use django-fernet-fields or Vault)
    github_token = models.CharField(max_length=255, blank=True)
    is_github_connected = models.BooleanField(default=False)

    # ── Contribution scalars (cached, recalculated on sync) ────────────────────
    total_contributions = models.IntegerField(default=0, db_index=True)
    total_commits = models.IntegerField(default=0)
    total_pull_requests = models.IntegerField(default=0)
    total_issues = models.IntegerField(default=0)
    total_reviews = models.IntegerField(default=0)

    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_streak_break = models.DateField(null=True, blank=True)
    peak_contribution_time = models.CharField(max_length=20, blank=True)  # Morning/Afternoon/Evening/Night
    top_language = models.CharField(max_length=50, blank=True)

    # ── Momentum Score (first-class metric) ────────────────────────────────────
    momentum_score = models.FloatField(default=0.0, db_index=True)
    momentum_consistency = models.FloatField(default=0.0)  # sub-score 0-100
    momentum_recency = models.FloatField(default=0.0)      # sub-score 0-100
    momentum_depth = models.FloatField(default=0.0)        # sub-score 0-100
    momentum_decay = models.FloatField(default=1.0)        # multiplier (0-1)
    momentum_last_calculated = models.DateTimeField(null=True, blank=True)

    # ── Developer Personality ──────────────────────────────────────────────────
    PERSONALITY_CHOICES = [
        ("explorer", "Explorer"),       # many repos, low depth
        ("specialist", "Specialist"),   # few repos, high depth
        ("maintainer", "Maintainer"),   # consistent long-term
        ("sprinter", "Sprinter"),       # short bursts, high intensity
        ("unknown", "Unknown"),
    ]
    personality_type = models.CharField(
        max_length=20, choices=PERSONALITY_CHOICES, default="unknown"
    )
    personality_confidence = models.FloatField(default=0.0)  # 0-1
    personality_signals = models.JSONField(default=dict, blank=True)

    # ── Burnout / health flags ─────────────────────────────────────────────────
    burnout_risk = models.CharField(
        max_length=10,
        choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")],
        default="low",
    )
    burnout_signals = models.JSONField(default=list, blank=True)
    # Each entry: {type, detected_at, gap_days, score_drop, resolved}

    # ── Contribution timelines (JSON caches) ───────────────────────────────────
    # date (YYYY-MM-DD) → count  — full year heatmap
    daily_contributions = models.JSONField(default=dict, blank=True)
    # YYYY-MM → count  — last 12 months
    monthly_contributions = models.JSONField(default=dict, blank=True)
    # YYYY-Www → count  — last 16 weeks
    weekly_contributions = models.JSONField(default=dict, blank=True)
    # event type → count
    contribution_types = models.JSONField(default=dict, blank=True)

    # ── Language stats ─────────────────────────────────────────────────────────
    # lang → bytes
    languages_used = models.JSONField(default=dict, blank=True)
    # lang → {bytes, percentage, repos_count, trend}
    language_stats = models.JSONField(default=dict, blank=True)

    # ── Repository intelligence ────────────────────────────────────────────────
    # Concise summaries only — full data fetched on demand
    own_repos = models.JSONField(default=list, blank=True)
    pinned_repos = models.JSONField(default=list, blank=True)
    contributed_repos = models.JSONField(default=list, blank=True)
    # Precomputed health scores: repo_full_name → {health, impact, lifecycle}
    repo_health_cache = models.JSONField(default=dict, blank=True)

    # ── Narrative cache ────────────────────────────────────────────────────────
    # List of narrative phases — rebuilt weekly
    contribution_narrative = models.JSONField(default=list, blank=True)

    # ── Consistency ranking ────────────────────────────────────────────────────
    consistency_rank = models.IntegerField(null=True, blank=True)
    consistency_percentile = models.FloatField(null=True, blank=True)

    # ── Social ────────────────────────────────────────────────────────────────
    twitter_handle = models.CharField(max_length=100, blank=True)
    linkedin_url = models.URLField(max_length=200, blank=True)

    # ── Account ───────────────────────────────────────────────────────────────
    email_verified = models.BooleanField(default=False)
    profile_public = models.BooleanField(default=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_github_sync = models.DateTimeField(null=True, blank=True)
    last_full_sync = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=["github_username"]),
            models.Index(fields=["-momentum_score"]),
            models.Index(fields=["-total_contributions"]),
            models.Index(fields=["personality_type"]),
            models.Index(fields=["top_language"]),
        ]

    def __str__(self):
        return f"{self.user.username} — momentum {self.momentum_score:.1f}"

    def get_full_name(self):
        return self.user.get_full_name() or self.user.username

    # ── Persistence helpers ────────────────────────────────────────────────────

    def apply_github_identity(self, github_user: dict, access_token: str):
        """Store basic GitHub profile fields from the /user API response."""
        name_parts = (github_user.get("name") or "").split(maxsplit=1)
        self.avatar_url = github_user.get("avatar_url", "")
        self.github_id = str(github_user.get("id", ""))
        self.github_url = github_user.get("html_url", "")
        self.github_username = github_user.get("login", "")
        self.github_token = access_token
        self.is_github_connected = True
        self.bio = github_user.get("bio") or self.bio
        self.location = github_user.get("location") or self.location
        self.website = github_user.get("blog") or self.website
        self.email_verified = True
        # Sync name back to Django User
        user = self.user
        if name_parts:
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else user.last_name
        user.save(update_fields=["first_name", "last_name"])

    def apply_contribution_stats(self, stats: dict):
        """Persist contribution stats produced by GitHubService."""
        self.total_contributions = stats.get("total_contributions", 0)
        self.total_commits = stats.get("total_commits", 0)
        self.total_pull_requests = stats.get("total_pull_requests", 0)
        self.total_issues = stats.get("total_issues", 0)
        self.current_streak = stats.get("current_streak", 0)
        self.longest_streak = max(
            stats.get("longest_streak", 0), self.longest_streak
        )
        self.last_streak_break = stats.get("last_streak_break")
        self.peak_contribution_time = stats.get("peak_time", "")
        self.daily_contributions = stats.get("daily_counts", {})
        self.monthly_contributions = stats.get("monthly_data", {})
        self.weekly_contributions = stats.get("weekly_data", {})
        self.contribution_types = stats.get("contribution_types", {})

    def apply_language_stats(self, language_stats: dict, top_language: str):
        """Persist language breakdown."""
        self.language_stats = language_stats
        self.languages_used = {k: v.get("bytes", 0) for k, v in language_stats.items()}
        self.top_language = top_language

    def apply_repo_data(self, own_repos, pinned_repos, contributed_repos):
        """Persist summarised repository lists."""
        self.own_repos = [_summarise_repo(r) for r in (own_repos or [])]
        self.pinned_repos = pinned_repos or []
        self.contributed_repos = [_summarise_repo(r) for r in (contributed_repos or [])]

    def apply_momentum(self, result: dict):
        """Persist momentum score and sub-scores."""
        self.momentum_score = round(result.get("score", 0.0), 2)
        self.momentum_consistency = round(result.get("consistency", 0.0), 2)
        self.momentum_recency = round(result.get("recency", 0.0), 2)
        self.momentum_depth = round(result.get("depth", 0.0), 2)
        self.momentum_decay = round(result.get("decay", 1.0), 4)
        self.momentum_last_calculated = timezone.now()

    def apply_personality(self, result: dict):
        """Persist personality classification."""
        self.personality_type = result.get("type", "unknown")
        self.personality_confidence = round(result.get("confidence", 0.0), 3)
        self.personality_signals = result.get("signals", {})

    def apply_burnout(self, result: dict):
        """Persist burnout analysis."""
        self.burnout_risk = result.get("risk", "low")
        self.burnout_signals = result.get("signals", [])

    def apply_narrative(self, phases: list):
        self.contribution_narrative = phases

    def apply_repo_health(self, health_map: dict):
        self.repo_health_cache = health_map

    def mark_synced(self, full=False):
        now = timezone.now()
        self.last_github_sync = now
        if full:
            self.last_full_sync = now


# ── Momentum history (time-series for score evolution chart) ──────────────────

class MomentumSnapshot(models.Model):
    """
    One row per day per user. Lets us render the momentum score evolution
    graph and detect score drops (burnout proxy).
    """
    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="momentum_snapshots"
    )
    date = models.DateField(db_index=True)
    score = models.FloatField()
    consistency = models.FloatField(default=0.0)
    recency = models.FloatField(default=0.0)
    depth = models.FloatField(default=0.0)
    decay = models.FloatField(default=1.0)
    contributions_that_day = models.IntegerField(default=0)

    class Meta:
        unique_together = ("profile", "date")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["profile", "-date"]),
        ]

    def __str__(self):
        return f"{self.profile.github_username} {self.date} → {self.score:.1f}"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _summarise_repo(r: dict) -> dict:
    """Return a concise repo dict safe to store in JSON fields."""
    return {
        "name": r.get("name"),
        "full_name": r.get("full_name") or r.get("nameWithOwner"),
        "html_url": r.get("html_url") or r.get("url"),
        "description": (r.get("description") or "")[:200],
        "stargazers_count": r.get("stargazers_count") or r.get("stargazerCount", 0),
        "forks_count": r.get("forks_count") or r.get("forkCount", 0),
        "language": r.get("language") or (
            r.get("primaryLanguage", {}) or {}
        ).get("name"),
        "updated_at": r.get("updated_at") or r.get("updatedAt"),
        "fork": r.get("fork", False),
        "archived": r.get("archived", False),
    }


# ── Signals ────────────────────────────────────────────────────────────────────

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        UserProfile.objects.create(user=instance)
