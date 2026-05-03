# app/services/cache.py
"""
Typed cache helpers.
All cache keys are namespaced under 'gitvis:' (set in settings KEY_PREFIX).

TTL strategy:
  profile          15 min   — refreshed on manual sync
  analytics        10 min   — slightly faster stale tolerance
  momentum         5 min    — score can change after sync
  public_profile   30 min   — rarely changes
  search           2 min    — frequently queried, low staleness tolerance
  ranking          1 hour   — recalculated by weekly task
"""

from django.core.cache import cache

# TTLs in seconds
_TTL = {
    "profile": 60 * 15,
    "analytics": 60 * 10,
    "momentum": 60 * 5,
    "public_profile": 60 * 30,
    "search": 60 * 2,
    "ranking": 60 * 60,
    "github_user": 60 * 60 * 6,   # raw github /user response — 6h
}


def get(key: str):
    return cache.get(key)


def set(key: str, value, ttl_key: str = "profile"):
    ttl = _TTL.get(ttl_key, 300)
    cache.set(key, value, ttl)


def delete(key: str):
    cache.delete(key)


def delete_pattern(pattern: str):
    """Delete all keys matching a prefix. Requires django-redis."""
    try:
        cache.delete_pattern(f"*{pattern}*")
    except AttributeError:
        pass  # Non-redis backend — skip


# ── Named helpers ──────────────────────────────────────────────────────────────

def profile_key(user_id: int) -> str:
    return f"profile:{user_id}"


def analytics_key(user_id: int) -> str:
    return f"analytics:{user_id}"


def momentum_key(user_id: int) -> str:
    return f"momentum:{user_id}"


def public_profile_key(username: str) -> str:
    return f"pub:{username}"


def search_key(query: str, language: str, min_contrib: int) -> str:
    return f"search:{query}:{language}:{min_contrib}"


def ranking_key() -> str:
    return "ranking:global"


def invalidate_user(user_id: int, username: str = None):
    """Invalidate all cached data for a user after a sync."""
    delete(profile_key(user_id))
    delete(analytics_key(user_id))
    delete(momentum_key(user_id))
    if username:
        delete(public_profile_key(username))
