# app/services/narrative.py
"""
Contribution Timeline Narrative Builder
=========================================
Converts raw monthly contribution data into a structured list of narrative
"phases" — contextual story segments the UI can display as a timeline.

Phase types:
  high_activity   — significantly above average
  low_activity    — significantly below average
  recovery        — below → above transition
  decline         — above → below transition
  streak_peak     — month containing the user's longest streak
  stable          — near-average, consistent activity
"""

import logging
import math
from datetime import datetime

logger = logging.getLogger(__name__)

# Thresholds relative to the user's own mean
_HIGH_MULTIPLIER = 1.5     # > 1.5× mean = high activity
_LOW_MULTIPLIER = 0.4      # < 0.4× mean = low activity


def build(profile_data: dict) -> list[dict]:
    """
    Build a list of narrative phases from monthly contribution data.

    Args:
        profile_data: dict with keys:
            monthly_contributions  {YYYY-MM: int}
            current_streak         int
            longest_streak         int

    Returns:
        List of phase dicts, most recent first:
        [
          {
            period,        "YYYY-MM" or "YYYY-MM → YYYY-MM"
            type,          phase type string
            title,         short display title
            description,   1-2 sentence explanation
            intensity,     "high"|"medium"|"low"
            contribution_count,
          }, ...
        ]
    """
    monthly: dict[str, int] = profile_data.get("monthly_contributions", {})
    longest_streak = profile_data.get("longest_streak", 0)

    if not monthly or len(monthly) < 3:
        return []

    sorted_months = sorted(monthly.items())  # [(YYYY-MM, count), ...]
    values = [v for _, v in sorted_months]
    mean = sum(values) / len(values)
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))

    # Classify each month
    classified = [
        (month, count, _classify_month(count, mean, std))
        for month, count in sorted_months
    ]

    # Merge consecutive months of the same type into phases
    phases = _merge_into_phases(classified, mean, longest_streak)

    # Return most recent first
    return list(reversed(phases))


# ── Classification ─────────────────────────────────────────────────────────────

def _classify_month(count: int, mean: float, std: float) -> str:
    if mean == 0:
        return "stable"
    if count > mean * _HIGH_MULTIPLIER:
        return "high_activity"
    if count < mean * _LOW_MULTIPLIER:
        return "low_activity"
    return "stable"


# ── Merging ────────────────────────────────────────────────────────────────────

def _merge_into_phases(classified: list, mean: float, longest_streak: int) -> list[dict]:
    if not classified:
        return []

    phases = []
    current_type = classified[0][2]
    current_months = [classified[0]]

    def flush(months, next_type=None, prev_type=None):
        if not months:
            return
        start_month, start_count, _ = months[0]
        end_month, end_count, _ = months[-1]
        period = start_month if start_month == end_month else f"{start_month} → {end_month}"
        total = sum(c for _, c, _ in months)
        phase_type = months[0][2]

        # Transition detection
        if prev_type == "low_activity" and phase_type == "high_activity":
            phase_type = "recovery"
        elif prev_type == "high_activity" and phase_type == "low_activity":
            phase_type = "decline"

        title, description, intensity = _describe_phase(
            phase_type, start_month, end_month, total, len(months), mean, longest_streak
        )

        phases.append({
            "period": period,
            "type": phase_type,
            "title": title,
            "description": description,
            "intensity": intensity,
            "contribution_count": total,
            "month_count": len(months),
        })

    prev_type = None
    for i, (month, count, mtype) in enumerate(classified):
        if mtype == current_type:
            current_months.append((month, count, mtype))
        else:
            flush(current_months, next_type=mtype, prev_type=prev_type)
            prev_type = current_type
            current_type = mtype
            current_months = [(month, count, mtype)]

    flush(current_months, prev_type=prev_type)
    return phases


# ── Phase description ──────────────────────────────────────────────────────────

def _describe_phase(
    phase_type: str, start: str, end: str, total: int, months: int, mean: float, longest_streak: int
) -> tuple[str, str, str]:
    avg_this_phase = total / max(months, 1)
    ratio = avg_this_phase / max(mean, 1)
    start_label = _month_label(start)
    end_label = _month_label(end) if start != end else ""
    period_label = f"{start_label}–{end_label}" if end_label else start_label

    if phase_type == "high_activity":
        return (
            "High-velocity phase",
            f"{int(avg_this_phase)} contributions/month during {period_label} — "
            f"{ratio:.1f}× your annual average. Strong commit cadence.",
            "high",
        )

    if phase_type == "low_activity":
        return (
            "Low-activity period",
            f"Contribution count dropped to {int(avg_this_phase)}/month during {period_label}. "
            f"This is {100 - int(ratio * 100)}% below your usual pace.",
            "low",
        )

    if phase_type == "recovery":
        return (
            "Recovery phase",
            f"Activity rebounded in {start_label} after a slower period. "
            f"Momentum score recovered as consistency returned.",
            "medium",
        )

    if phase_type == "decline":
        return (
            "Declining phase",
            f"Pace dropped after a high-activity period starting {start_label}. "
            f"Monitor for extended slowdowns.",
            "low",
        )

    if phase_type == "streak_peak":
        return (
            f"Personal best — {longest_streak}-day streak",
            f"Your all-time longest streak occurred around {start_label}. "
            f"Exceptional consistency during this window.",
            "high",
        )

    # stable
    return (
        "Steady phase",
        f"Consistent contributions around your average during {period_label}. "
        f"Stable momentum — {int(avg_this_phase)} contributions/month.",
        "medium",
    )


def _month_label(yyyy_mm: str) -> str:
    try:
        dt = datetime.strptime(yyyy_mm, "%Y-%m")
        return dt.strftime("%b %Y")
    except Exception:
        return yyyy_mm
