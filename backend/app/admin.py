from django.contrib import admin
from .models import UserProfile, MomentumSnapshot


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        "github_username", "momentum_score", "personality_type",
        "burnout_risk", "total_contributions", "current_streak",
        "top_language", "is_github_connected", "last_github_sync",
    ]
    list_filter = [
        "personality_type", "burnout_risk", "is_github_connected",
        "profile_public", "top_language",
    ]
    search_fields = ["github_username", "user__username", "user__email"]
    readonly_fields = [
        "momentum_score", "momentum_consistency", "momentum_recency",
        "momentum_depth", "momentum_decay", "momentum_last_calculated",
        "personality_type", "personality_confidence", "personality_signals",
        "burnout_risk", "burnout_signals",
        "total_contributions", "total_commits", "total_pull_requests",
        "total_issues", "total_reviews", "current_streak", "longest_streak",
        "top_language", "last_github_sync", "last_full_sync",
        "created_at", "updated_at",
    ]
    fieldsets = (
        ("User", {"fields": ("user", "avatar_url", "bio", "location", "website")}),
        ("GitHub", {
            "fields": (
                "github_id", "github_username", "github_url",
                "is_github_connected", "last_github_sync", "last_full_sync",
            )
        }),
        ("Momentum Score", {
            "fields": (
                "momentum_score", "momentum_consistency", "momentum_recency",
                "momentum_depth", "momentum_decay", "momentum_last_calculated",
            )
        }),
        ("Personality & Burnout", {
            "fields": (
                "personality_type", "personality_confidence",
                "burnout_risk",
            )
        }),
        ("Contribution Stats", {
            "fields": (
                "total_contributions", "total_commits", "total_pull_requests",
                "total_issues", "total_reviews",
                "current_streak", "longest_streak", "last_streak_break",
                "peak_contribution_time", "top_language",
            )
        }),
        ("Account", {
            "fields": ("email_verified", "profile_public", "consistency_rank", "consistency_percentile")
        }),
    )
    ordering = ["-momentum_score"]


@admin.register(MomentumSnapshot)
class MomentumSnapshotAdmin(admin.ModelAdmin):
    list_display = ["profile", "date", "score", "consistency", "recency", "depth", "decay", "contributions_that_day"]
    list_filter = ["date"]
    search_fields = ["profile__github_username"]
    ordering = ["-date"]
    date_hierarchy = "date"
