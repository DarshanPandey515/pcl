# app/services/personality.py
"""
Developer Personality Classifier
==================================
Types (from spec):
  explorer    — many repos, low depth per repo
  specialist  — focused on few repos, high depth
  maintainer  — consistent long-term contributions
  sprinter    — short intense bursts, then gaps

Each classification returns a confidence score (0-1) and the raw signals
so the frontend can explain the classification to the user.
"""

import logging
import math
from datetime import date, datetime

logger = logging.getLogger(__name__)


def classify(profile_data: dict) -> dict:
    """
    Classify developer personality from cached stats.

    Args:
        profile_data: dict with keys:
            own_repos             list of repo summaries
            daily_counts          {YYYY-MM-DD: int}
            monthly_contributions {YYYY-MM: int}
            total_contributions   int
            current_streak        int
            longest_streak        int
            contribution_types    {type: count}

    Returns:
        { type, confidence, signals, description }
    """
    own_repos = profile_data.get("own_repos", [])
    daily = profile_data.get("daily_counts", {})
    monthly = profile_data.get("monthly_contributions", {})
    total = profile_data.get("total_contributions", 0)
    current_streak = profile_data.get("current_streak", 0)
    longest_streak = profile_data.get("longest_streak", 0)

    if not own_repos and total == 0:
        return _result("unknown", 0.0, {}, "Insufficient data to classify.")

    signals = _extract_signals(own_repos, daily, monthly, total, current_streak, longest_streak)
    scores = _score_types(signals)

    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]

    # Confidence: how dominant is the winner?
    sorted_scores = sorted(scores.values(), reverse=True)
    margin = sorted_scores[0] - sorted_scores[1] if len(sorted_scores) > 1 else sorted_scores[0]
    confidence = min(best_score / 100 + margin / 200, 1.0)

    description = _DESCRIPTIONS.get(best_type, "")

    logger.debug(f"Personality scores: {scores} → {best_type} ({confidence:.2f})")

    return _result(best_type, round(confidence, 3), signals, description)


# ── Signal extraction ──────────────────────────────────────────────────────────

def _extract_signals(
    own_repos, daily, monthly, total, current_streak, longest_streak
) -> dict:
    today = date.today()

    # Repo breadth vs depth
    repo_count = len(own_repos)
    non_fork_repos = [r for r in own_repos if not r.get("fork")]
    active_repos = [
        r for r in non_fork_repos
        if _days_since(r.get("updated_at"), today) <= 180
    ]
    commits_per_repo = total / max(repo_count, 1)

    # Consistency
    monthly_vals = list(monthly.values()) if monthly else [0]
    cv = _cv(monthly_vals)
    active_days_90 = sum(
        1 for d_str in daily
        if (today - datetime.strptime(d_str, "%Y-%m-%d").date()).days <= 90
    )

    # Burst detection — find months that are outliers (> mean + 1.5σ)
    mean_m = sum(monthly_vals) / len(monthly_vals) if monthly_vals else 0
    std_m = math.sqrt(sum((v - mean_m) ** 2 for v in monthly_vals) / max(len(monthly_vals), 1))
    burst_months = sum(1 for v in monthly_vals if v > mean_m + 1.5 * std_m)
    quiet_months = sum(1 for v in monthly_vals if v < mean_m * 0.2)

    return {
        "repo_count": repo_count,
        "active_repo_count": len(active_repos),
        "commits_per_repo": round(commits_per_repo, 1),
        "monthly_cv": round(cv, 3),          # coefficient of variation
        "burst_months": burst_months,
        "quiet_months": quiet_months,
        "active_days_90": active_days_90,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_contributions": total,
    }


def _score_types(s: dict) -> dict[str, float]:
    scores = {t: 0.0 for t in ("explorer", "specialist", "maintainer", "sprinter")}

    # Explorer: many repos, low depth
    if s["repo_count"] >= 10:
        scores["explorer"] += 30
    if s["repo_count"] >= 20:
        scores["explorer"] += 20
    if s["commits_per_repo"] < 50:
        scores["explorer"] += 30
    if s["active_repo_count"] >= 5:
        scores["explorer"] += 20

    # Specialist: few repos, high depth
    if s["repo_count"] <= 6:
        scores["specialist"] += 25
    if s["commits_per_repo"] > 200:
        scores["specialist"] += 40
    if s["active_repo_count"] <= 3 and s["active_repo_count"] > 0:
        scores["specialist"] += 20
    if s["total_contributions"] > 500 and s["repo_count"] <= 8:
        scores["specialist"] += 15

    # Maintainer: consistent long-term
    if s["monthly_cv"] < 0.5:
        scores["maintainer"] += 35
    if s["active_days_90"] >= 60:
        scores["maintainer"] += 30
    if s["current_streak"] >= 14:
        scores["maintainer"] += 20
    if s["longest_streak"] >= 30:
        scores["maintainer"] += 15

    # Sprinter: burst months, quiet months
    if s["burst_months"] >= 2:
        scores["sprinter"] += 35
    if s["quiet_months"] >= 3:
        scores["sprinter"] += 30
    if s["monthly_cv"] > 1.0:
        scores["sprinter"] += 25
    if s["longest_streak"] >= 20 and s["current_streak"] < 5:
        scores["sprinter"] += 10

    return scores


# ── Helpers ────────────────────────────────────────────────────────────────────

def _result(type_: str, confidence: float, signals: dict, description: str) -> dict:
    return {
        "type": type_,
        "confidence": confidence,
        "signals": signals,
        "description": description,
    }


def _days_since(date_str: str | None, today: date) -> int:
    if not date_str:
        return 9999
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        return (today - d).days
    except Exception:
        return 9999


def _cv(values: list) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    if mean == 0:
        return 0.0
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    return std / mean


_DESCRIPTIONS = {
    "explorer": (
        "You spread contributions across many repositories, constantly exploring new "
        "projects. You thrive on variety and are quick to experiment."
    ),
    "specialist": (
        "You go deep into a small number of projects with high commit density. "
        "Your focus and sustained attention drives significant repo impact."
    ),
    "maintainer": (
        "You contribute consistently every day or week over long periods. "
        "Discipline and reliability define your open-source presence."
    ),
    "sprinter": (
        "You contribute in intense bursts followed by rest periods. "
        "Your peaks are impressive — the challenge is sustaining momentum between sprints."
    ),
    "unknown": "Not enough contribution history to classify your developer personality yet.",
}
