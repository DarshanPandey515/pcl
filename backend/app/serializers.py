from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, MomentumSnapshot


class MomentumSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MomentumSnapshot
        fields = ["date", "score", "consistency", "recency", "depth", "decay", "contributions_that_day"]


class ProfileSerializer(serializers.ModelSerializer):
    """Full authenticated-user profile — all fields."""

    class Meta:
        model = UserProfile
        fields = [
            # Identity
            "avatar_url", "bio", "location", "website",
            "github_username", "github_url", "is_github_connected", "email_verified",
            "twitter_handle", "linkedin_url",
            # Momentum
            "momentum_score", "momentum_consistency", "momentum_recency",
            "momentum_depth", "momentum_decay", "momentum_last_calculated",
            # Personality
            "personality_type", "personality_confidence", "personality_signals",
            # Burnout
            "burnout_risk", "burnout_signals",
            # Contribution scalars
            "total_contributions", "total_commits", "total_pull_requests",
            "total_issues", "total_reviews",
            "current_streak", "longest_streak", "last_streak_break",
            "peak_contribution_time", "top_language",
            # Timelines
            "daily_contributions", "monthly_contributions", "weekly_contributions",
            "contribution_types",
            # Languages
            "languages_used", "language_stats",
            # Repos
            "own_repos", "pinned_repos", "contributed_repos", "repo_health_cache",
            # Narrative
            "contribution_narrative",
            # Ranking
            "consistency_rank", "consistency_percentile",
            # Meta
            "profile_public", "last_github_sync", "last_full_sync",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "momentum_score", "momentum_consistency", "momentum_recency",
            "momentum_depth", "momentum_decay", "momentum_last_calculated",
            "personality_type", "personality_confidence", "personality_signals",
            "burnout_risk", "burnout_signals",
            "total_contributions", "total_commits", "total_pull_requests",
            "total_issues", "total_reviews",
            "current_streak", "longest_streak", "last_streak_break",
            "peak_contribution_time", "top_language",
            "daily_contributions", "monthly_contributions", "weekly_contributions",
            "contribution_types", "languages_used", "language_stats",
            "own_repos", "pinned_repos", "contributed_repos", "repo_health_cache",
            "contribution_narrative", "consistency_rank", "consistency_percentile",
            "is_github_connected", "email_verified",
            "last_github_sync", "last_full_sync", "created_at", "updated_at",
        ]


class UserSerializer(serializers.ModelSerializer):
    """Auth response + /profile/ GET — includes nested profile."""
    profile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "full_name", "profile"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_profile(self, obj):
        try:
            return ProfileSerializer(obj.profile).data
        except UserProfile.DoesNotExist:
            return None


class PublicProfileSerializer(serializers.ModelSerializer):
    """Public profile — omits sensitive fields (token, raw JSON caches)."""
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "username", "full_name",
            "avatar_url", "bio", "location", "website",
            "github_username", "github_url",
            "twitter_handle", "linkedin_url",
            # Scores only — no raw JSON
            "momentum_score", "personality_type",
            "total_contributions", "total_commits", "total_pull_requests",
            "current_streak", "longest_streak", "top_language",
            "burnout_risk",
            # Timelines for charts
            "monthly_contributions", "weekly_contributions", "language_stats",
            "contribution_narrative",
            # Public repos only
            "pinned_repos",
            "consistency_rank", "consistency_percentile",
            "last_github_sync",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """PATCH /profile/ — only user-editable fields."""
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    email = serializers.EmailField(source="user.email", required=False)

    class Meta:
        model = UserProfile
        fields = [
            "first_name", "last_name", "email",
            "bio", "location", "website",
            "twitter_handle", "linkedin_url",
            "profile_public",
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save(update_fields=list(user_data.keys()) if user_data else ["username"])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class GitHubAuthSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)


class SyncResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    momentum_score = serializers.FloatField()
    total_contributions = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    top_language = serializers.CharField()
    last_sync = serializers.DateTimeField()


class AnalyticsSerializer(serializers.Serializer):
    """Shape of the /analytics/ response."""
    summary = serializers.DictField()
    momentum = serializers.DictField()
    trends = serializers.DictField()
    languages = serializers.DictField()
    contribution_types = serializers.DictField()
    burnout = serializers.DictField()
    personality = serializers.DictField()
    narrative = serializers.ListField()
    repo_health = serializers.DictField()
    recent_activity = serializers.ListField()
    momentum_history = MomentumSnapshotSerializer(many=True)


class ContributorSearchResultSerializer(serializers.Serializer):
    username = serializers.CharField()
    full_name = serializers.CharField()
    avatar_url = serializers.URLField(allow_null=True)
    momentum_score = serializers.FloatField()
    total_contributions = serializers.IntegerField()
    top_language = serializers.CharField(allow_blank=True)
    current_streak = serializers.IntegerField()
    personality_type = serializers.CharField()
    consistency_rank = serializers.IntegerField(allow_null=True)
