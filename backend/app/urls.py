# app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ── GitHub OAuth (only auth method) ───────────────────────────────────────
    path("auth/github/", views.github_login, name="github-login"),
    path("auth/github/callback/", views.github_callback, name="github-callback"),

    # ── Profile ───────────────────────────────────────────────────────────────
    path("profile/", views.user_profile, name="profile"),
    path("profile/<str:username>/", views.public_profile, name="public-profile"),

    # ── GitHub data management ────────────────────────────────────────────────
    path("github/sync/", views.sync_github, name="github-sync"),
    path("github/disconnect/", views.disconnect_github, name="github-disconnect"),

    # ── Analytics & intelligence ──────────────────────────────────────────────
    path("analytics/", views.get_analytics, name="analytics"),
    path("analytics/momentum/", views.momentum_history, name="momentum-history"),

    # ── Discovery ─────────────────────────────────────────────────────────────
    path("contributors/search/", views.search_contributors, name="search-contributors"),
    path("leaderboard/", views.leaderboard, name="leaderboard"),

    # ── Settings ──────────────────────────────────────────────────────────────
    path("settings/", views.update_settings, name="update-settings"),
]
