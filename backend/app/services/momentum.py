# app/services/momentum.py
"""
Developer Momentum Score Engine
================================
Score range: 0 – 100 (float, 2 d.p.)

Formula
-------
  raw = (consistency × 0.40) + (recency × 0.35) + (depth × 0.25)
  score = raw × decay_multiplier

Sub-scores
----------
  consistency  — How evenly distributed contributions are over the period.
                 Penalises long gaps; rewards steady daily/weekly cadence.

  recency      — How much activity has happened in the last 30 days relative
                 to the trailing 12-month average. Recent = matters more.

  depth        — Quality proxy: pull requests + reviews count more than raw
                 commits; issue engagement included.

  decay        — Time-decay multiplier. Every day without any contribution
                 after a 3-day grace period reduces the score by 0.4 %.
                 Floors at 0.30 to avoid complete score collapse.

Explainability
--------------
  The returned dict includes a human-readable `explanation` list so the
  frontend can render "why your score changed" copy.
"""

import logging
import math
from datetime import date, datetime

logger = logging.getLogger(__name__)

# Weights
_W_CONSISTENCY = 0.40
_W_RECENCY = 0.35
_W_DEPTH = 0.25

# Decay constants
_GRACE_DAYS = 3          # days of inactivity before decay starts
_DECAY_PER_DAY = 0.004   # 0.4 % per day
_DECAY_FLOOR = 0.30      # never goes below 30 % of raw


def calculate(profile_data: dict) -> dict:
    """
    Calculate the Momentum Score from cached profile data.

    Args:
        profile_data: dict with keys:
            daily_counts          {YYYY-MM-DD: int}
            monthly_contributions {YYYY-MM: int}
            total_contributions   int
            total_commits         int
            total_pull_requests   int
            total_issues          int
            total_reviews         int
            current_streak        int
            longest_streak        int

    Returns:
        {
            score, consistency, recency, depth, decay,
            explanation: [str, ...]
        }
    """
    today = date.today()
    daily: dict[str, int] = profile_data.get("daily_counts", {})
    monthly: dict[str, int] = profile_data.get("monthly_contributions", {})
    total = profile_data.get("total_contributions", 0)
    commits = profile_data.get("total_commits", 0)
    prs = profile_data.get("total_pull_requests", 0)
    issues = profile_data.get("total_issues", 0)
    reviews = profile_data.get("total_reviews", 0)
    current_streak = profile_data.get("current_streak", 0)
    longest_streak = profile_data.get("longest_streak", 0)

    explanation = []

    # ── Consistency (0-100) ────────────────────────────────────────────────────
    consistency = _score_consistency(daily, monthly, current_streak, longest_streak, today, explanation)

    # ── Recency (0-100) ────────────────────────────────────────────────────────
    recency = _score_recency(daily, monthly, today, explanation)

    # ── Depth (0-100) ─────────────────────────────────────────────────────────
    depth = _score_depth(commits, prs, issues, reviews, total, explanation)

    # ── Decay multiplier ───────────────────────────────────────────────────────
    decay = _calculate_decay(daily, today, explanation)

    # ── Final score ────────────────────────────────────────────────────────────
    raw = (consistency * _W_CONSISTENCY) + (recency * _W_RECENCY) + (depth * _W_DEPTH)
    score = round(raw * decay, 2)

    logger.debug(
        f"Momentum: consistency={consistency:.1f} recency={recency:.1f} "
        f"depth={depth:.1f} decay={decay:.4f} → {score}"
    )

    return {
        "score": score,
        "consistency": round(consistency, 2),
        "recency": round(recency, 2),
        "depth": round(depth, 2),
        "decay": round(decay, 4),
        "explanation": explanation,
    }


# ── Sub-score functions ────────────────────────────────────────────────────────

def _score_consistency(
    daily: dict, monthly: dict, current_streak: int, longest_streak: int,
    today: date, explanation: list
) -> float:
    """
    Measures how evenly spread contributions are.

    Components:
      - Active days ratio over the last 90 days (50 %)
      - Current streak bonus (30 %)
      - Monthly variance penalty — high variance = lower score (20 %)
    """
    # Active days in last 90 days
    window = 90
    active_days = sum(
        1 for d_str in daily
        if (today - datetime.strptime(d_str, "%Y-%m-%d").date()).days <= window
    )
    active_ratio = min(active_days / window, 1.0)
    active_score = active_ratio * 100

    # Streak bonus — current streak relative to longest ever (capped at 60 days)
    ref_streak = max(longest_streak, 1)
    streak_ratio = min(current_streak / ref_streak, 1.0)
    streak_bonus = streak_ratio * 100

    # Monthly variance penalty
    monthly_vals = list(monthly.values()) if monthly else []
    variance_penalty = _coefficient_of_variation(monthly_vals)
    # CV > 1.5 = very inconsistent → 0; CV < 0.3 = very consistent → 100
    variance_score = max(0.0, min(100.0, (1.5 - variance_penalty) / 1.2 * 100))

    score = (active_score * 0.50) + (streak_bonus * 0.30) + (variance_score * 0.20)

    if active_ratio > 0.7:
        explanation.append(f"Contributing on {active_days}/{window} days this quarter boosts consistency.")
    elif active_ratio < 0.3:
        explanation.append(f"Only {active_days}/{window} active days this quarter hurts consistency.")

    if current_streak >= 7:
        explanation.append(f"{current_streak}-day streak is rewarding consistency sub-score.")

    return min(score, 100.0)


def _score_recency(daily: dict, monthly: dict, today: date, explanation: list) -> float:
    """
    Measures whether recent activity is above or below the user's own baseline.

    Compares:
      - Last 30 days (high weight)
      - Last 7 days (extra boost)
    vs.
      - 12-month monthly average
    """
    monthly_vals = list(monthly.values()) if monthly else [0]
    baseline = sum(monthly_vals) / len(monthly_vals) if monthly_vals else 1

    last_30 = sum(
        c for d_str, c in daily.items()
        if (today - datetime.strptime(d_str, "%Y-%m-%d").date()).days <= 30
    )
    last_7 = sum(
        c for d_str, c in daily.items()
        if (today - datetime.strptime(d_str, "%Y-%m-%d").date()).days <= 7
    )

    # 30-day score: ratio vs baseline, capped at 2× = 100
    monthly_score = min((last_30 / max(baseline, 1)) * 50, 100.0)
    # 7-day boost: up to 20 bonus points
    weekly_boost = min((last_7 / max(baseline / 4, 1)) * 10, 20.0)

    score = min(monthly_score + weekly_boost, 100.0)

    if last_30 > baseline * 1.3:
        explanation.append("Recent 30-day activity is above your annual average — recency boosted.")
    elif last_30 < baseline * 0.5:
        explanation.append("Recent 30-day activity is well below your annual average — recency penalised.")

    return score


def _score_depth(
    commits: int, prs: int, issues: int, reviews: int, total: int,
    explanation: list
) -> float:
    """
    Meaningful contribution quality proxy.

    PRs and reviews signal deeper engagement than raw commits.
    Formula: weighted sum, normalised against a 'mature developer' baseline.
    """
    if total == 0:
        return 0.0

    # Weighted contribution units (PRs and reviews worth more)
    weighted = commits * 1.0 + prs * 3.0 + reviews * 2.5 + issues * 1.5
    # A "highly engaged" baseline = 500 weighted units/year
    baseline = 500.0
    raw_score = min(weighted / baseline * 100, 100.0)

    # Engagement ratio bonus: what proportion of activity is PRs/reviews?
    engagement = (prs + reviews) / max(total, 1)
    engagement_bonus = min(engagement * 30, 20.0)  # up to 20 bonus points

    score = min(raw_score + engagement_bonus, 100.0)

    if engagement > 0.3:
        explanation.append(
            f"{prs} PRs and {reviews} reviews show strong collaborative depth."
        )
    elif prs == 0:
        explanation.append("No pull requests detected — depth score is limited to commits only.")

    return score


def _calculate_decay(daily: dict, today: date, explanation: list) -> float:
    """
    Returns a multiplier in [DECAY_FLOOR, 1.0].
    Decay starts after GRACE_DAYS of inactivity.
    """
    if not daily:
        return _DECAY_FLOOR

    last_active = max(
        datetime.strptime(d, "%Y-%m-%d").date() for d in daily
    )
    gap_days = (today - last_active).days

    if gap_days <= _GRACE_DAYS:
        return 1.0

    inactive_days = gap_days - _GRACE_DAYS
    decay = 1.0 - (inactive_days * _DECAY_PER_DAY)
    decay = max(decay, _DECAY_FLOOR)

    if gap_days > 14:
        explanation.append(
            f"{gap_days}-day inactivity gap is applying a ×{decay:.2f} decay to your score."
        )
    elif gap_days > _GRACE_DAYS:
        explanation.append(
            f"{gap_days} days since last contribution — slight decay applied."
        )

    return decay


# ── Maths helpers ──────────────────────────────────────────────────────────────

def _coefficient_of_variation(values: list) -> float:
    """CV = std / mean. Returns 0 if insufficient data."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    if mean == 0:
        return 0.0
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance) / mean
