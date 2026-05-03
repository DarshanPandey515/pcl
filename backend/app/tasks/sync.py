# app/tasks/sync.py
"""
Celery periodic sync tasks.
The actual sync logic lives in app.views._run_sync to avoid duplication.
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="app.tasks.sync.sync_single_user")
def sync_single_user(self, user_id: int, full: bool = False):
    """Queue-able wrapper around the synchronous _run_sync helper."""
    try:
        from app.views import _run_sync
        from app.services.cache import invalidate_user
        profile = _run_sync(user_id, full=full)
        invalidate_user(user_id, profile.github_username)
        return {"status": "ok", "momentum": profile.momentum_score}
    except Exception as exc:
        logger.error(f"sync_single_user: user {user_id} failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(name="app.tasks.sync.daily_activity_sync")
def daily_activity_sync():
    """Nightly: lightweight sync for users active in the last 30 days."""
    from app.models import UserProfile
    cutoff   = timezone.now() - timedelta(days=30)
    user_ids = list(
        UserProfile.objects.filter(
            is_github_connected=True,
            github_token__gt="",
            last_github_sync__gte=cutoff,
        ).values_list("user_id", flat=True)
    )
    logger.info(f"daily_activity_sync: queuing {len(user_ids)} users")
    for uid in user_ids:
        sync_single_user.delay(uid, full=False)


@shared_task(name="app.tasks.sync.weekly_full_sync")
def weekly_full_sync():
    """Weekly: full recalculation for all GitHub-connected users."""
    from app.models import UserProfile
    user_ids = list(
        UserProfile.objects.filter(
            is_github_connected=True,
            github_token__gt="",
        ).values_list("user_id", flat=True)
    )
    logger.info(f"weekly_full_sync: queuing {len(user_ids)} users")
    for uid in user_ids:
        sync_single_user.delay(uid, full=True)


@shared_task(name="app.tasks.sync.refresh_active_momentum")
def refresh_active_momentum():
    """
    Hourly: recalculate momentum from cached DB data only (no GitHub API call)
    for users who synced in the last 2 hours.
    """
    from app.models import UserProfile, MomentumSnapshot
    from app.services import momentum
    from app.services.cache import invalidate_user

    cutoff   = timezone.now() - timedelta(hours=2)
    profiles = UserProfile.objects.filter(
        is_github_connected=True,
        last_github_sync__gte=cutoff,
    )
    count = 0
    for profile in profiles:
        try:
            profile_data = {
                "daily_counts":          profile.daily_contributions,
                "monthly_contributions": profile.monthly_contributions,
                "weekly_contributions":  profile.weekly_contributions,
                "total_contributions":   profile.total_contributions,
                "total_commits":         profile.total_commits,
                "total_pull_requests":   profile.total_pull_requests,
                "total_issues":          profile.total_issues,
                "total_reviews":         profile.total_reviews,
                "contribution_types":    profile.contribution_types,
                "current_streak":        profile.current_streak,
                "longest_streak":        profile.longest_streak,
                "own_repos":             profile.own_repos,
                "language_stats":        profile.language_stats,
            }
            result = momentum.calculate(profile_data)
            profile.apply_momentum(result)
            profile.save(update_fields=[
                "momentum_score", "momentum_consistency", "momentum_recency",
                "momentum_depth", "momentum_decay", "momentum_last_calculated",
            ])
            today = timezone.now().date()
            MomentumSnapshot.objects.update_or_create(
                profile=profile,
                date=today,
                defaults={
                    "score":       profile.momentum_score,
                    "consistency": profile.momentum_consistency,
                    "recency":     profile.momentum_recency,
                    "depth":       profile.momentum_depth,
                    "decay":       profile.momentum_decay,
                },
            )
            invalidate_user(profile.user_id, profile.github_username)
            count += 1
        except Exception as exc:
            logger.error(f"refresh_active_momentum: user {profile.user_id}: {exc}")

    logger.info(f"refresh_active_momentum: updated {count} profiles")


@shared_task(name="app.tasks.sync.recalculate_consistency_rankings")
def recalculate_consistency_rankings():
    """Weekly: recompute global consistency percentile ranking."""
    from app.models import UserProfile
    profiles = list(
        UserProfile.objects.filter(is_github_connected=True)
        .only("id", "momentum_score")
        .order_by("-momentum_score")
    )
    total = len(profiles)
    for rank, profile in enumerate(profiles, start=1):
        percentile = round((total - rank) / max(total, 1) * 100, 1)
        UserProfile.objects.filter(pk=profile.pk).update(
            consistency_rank=rank,
            consistency_percentile=percentile,
        )
    logger.info(f"recalculate_consistency_rankings: ranked {total} users")