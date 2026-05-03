# app/services/repo_health.py
"""
Repository Health & Impact Scorer
====================================
Evaluates each repo the user owns and produces:
  - health status : active | stale | idle | abandoned
  - impact score  : 0-100 (NOT star-count-driven)
  - lifecycle     : growing | stable | declining | archived

Impact score weights:
  commit_frequency   30 %  — commits per month (capped)
  recency            25 %  — how recently it was updated
  depth              20 %  — commit count (depth of investment)
  engagement         15 %  — PRs / issues as proxy for community
  size_signal        10 %  — non-fork, non-archived, has description
"""

import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

# Thresholds for health status
_STALE_DAYS = 60     # updated between 60–180 days ago
_IDLE_DAYS = 180     # updated 180–365 days ago
_ABANDONED_DAYS = 365


def score_repos(repos: list) -> dict[str, dict]:
    """
    Score a list of repo summaries.

    Args:
        repos: list of repo dicts (own_repos format)

    Returns:
        { "owner/repo": { health, impact, lifecycle, signals } }
    """
    result = {}
    today = date.today()

    for repo in repos:
        full_name = repo.get("full_name") or repo.get("name", "unknown")
        try:
            result[full_name] = _score_single(repo, today)
        except Exception as exc:
            logger.warning(f"repo_health: failed to score {full_name}: {exc}")
            result[full_name] = _default_score()

    return result


def _score_single(repo: dict, today: date) -> dict:
    updated_str = repo.get("updated_at", "")
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)
    is_fork = repo.get("fork", False)
    is_archived = repo.get("archived", False)
    description = repo.get("description") or ""
    language = repo.get("language") or ""
    # commit_count is in the summarised field if available
    commit_count = repo.get("commit_count", 0)

    days_since_update = _days_since(updated_str, today)

    # ── Health status ──────────────────────────────────────────────────────────
    if is_archived or days_since_update >= _ABANDONED_DAYS:
        health = "abandoned"
    elif days_since_update >= _IDLE_DAYS:
        health = "idle"
    elif days_since_update >= _STALE_DAYS:
        health = "stale"
    else:
        health = "active"

    # ── Impact sub-scores ──────────────────────────────────────────────────────

    # Recency (25 %) — exponential decay, 0 days = 100, 365+ days = 0
    recency = max(0.0, 100 * (1 - days_since_update / 365))

    # Commit depth (20 %) — log scale; 500+ commits = 100
    depth = min(100.0, (commit_count / 500) * 100) if commit_count else _infer_depth(days_since_update, health)

    # Commit frequency proxy (30 %) — infer from days_since + depth
    age_days = max(days_since_update, 1)
    if commit_count:
        commits_per_month = (commit_count / max(age_days / 30, 1))
        frequency = min(100.0, (commits_per_month / 20) * 100)
    else:
        frequency = recency * 0.5  # rough fallback

    # Engagement (15 %) — stars + forks (log-scaled, not linear — avoids vanity bias)
    import math
    engagement_raw = math.log1p(stars * 0.5 + forks * 1.5)
    engagement = min(100.0, engagement_raw / math.log1p(200) * 100)

    # Size / quality signals (10 %)
    quality = 0.0
    if not is_fork:
        quality += 40
    if description:
        quality += 30
    if language:
        quality += 20
    if not is_archived:
        quality += 10

    impact = round(
        frequency * 0.30 +
        recency * 0.25 +
        depth * 0.20 +
        engagement * 0.15 +
        quality * 0.10,
        1,
    )

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    lifecycle = _determine_lifecycle(health, impact, is_archived)

    # ── Human-readable signals ────────────────────────────────────────────────
    signals = _build_signals(health, days_since_update, is_fork, is_archived, stars, forks)

    return {
        "health": health,
        "impact": impact,
        "lifecycle": lifecycle,
        "days_since_update": days_since_update,
        "signals": signals,
    }


def _determine_lifecycle(health: str, impact: float, archived: bool) -> str:
    if archived:
        return "archived"
    if health == "abandoned":
        return "abandoned"
    if health == "active" and impact >= 70:
        return "growing"
    if health == "active":
        return "stable"
    if health in ("stale", "idle"):
        return "declining"
    return "stable"


def _build_signals(
    health: str, days: int, is_fork: bool, is_archived: bool, stars: int, forks: int
) -> list[str]:
    signals = []
    if is_archived:
        signals.append("Archived by owner")
    if is_fork:
        signals.append("Fork — contributions tracked separately")
    if health == "abandoned":
        signals.append(f"No activity for {days} days")
    elif health == "idle":
        signals.append(f"Last updated {days} days ago")
    elif health == "stale":
        signals.append(f"Approaching inactivity ({days} days since update)")
    if stars > 100:
        signals.append(f"{stars} stars — community traction")
    if forks > 20:
        signals.append(f"{forks} forks — being built upon")
    return signals


def _infer_depth(days_since_update: int, health: str) -> float:
    """Rough depth estimate when no commit count is available."""
    if health == "active":
        return 60.0
    if health == "stale":
        return 35.0
    if health == "idle":
        return 20.0
    return 5.0


def _days_since(date_str: str, today: date) -> int:
    if not date_str:
        return 9999
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (today - d).days
    except Exception:
        return 9999


def _default_score() -> dict:
    return {
        "health": "unknown",
        "impact": 0.0,
        "lifecycle": "unknown",
        "days_since_update": -1,
        "signals": [],
    }
