# app/services/burnout.py
"""
Burnout Detection Service
==========================
Analyses a developer's contribution timeline for patterns that indicate
potential burnout or unsustainable pace.

Signals detected:
  1. hard_stop       — intense streak immediately followed by long gap
  2. declining_pace  — month-over-month decline for 3+ consecutive months
  3. inactivity_gap  — gap of 14+ days with no contributions
  4. erratic_pattern — very high coefficient of variation over 6+ months
  5. recovery        — previously flagged burnout followed by return (positive)

Risk levels: low | medium | high
"""

import logging
import math
from datetime import date, datetime, timedelta

logger = logging.getLogger(__name__)

# Thresholds
_GAP_HIGH = 21       # days — high-risk inactivity gap
_GAP_MEDIUM = 14     # days — medium-risk
_DECLINE_MONTHS = 3  # consecutive declining months for "declining_pace"
_CV_HIGH = 1.5       # coefficient of variation — erratic threshold
_SPRINT_STREAK = 14  # minimum streak before a "hard stop" is flagged


def analyse(profile_data: dict) -> dict:
    """
    Detect burnout signals in a developer's contribution history.

    Args:
        profile_data: dict with keys:
            daily_counts          {YYYY-MM-DD: int}
            monthly_contributions {YYYY-MM: int}
            current_streak        int
            longest_streak        int

    Returns:
        {
            risk: "low"|"medium"|"high",
            signals: [
                {
                    type: str,
                    severity: "low"|"medium"|"high",
                    detected_at: str (YYYY-MM-DD),
                    description: str,
                    gap_days: int (optional),
                }
            ],
            summary: str,
        }
    """
    daily: dict[str, int] = profile_data.get("daily_counts", {})
    monthly: dict[str, int] = profile_data.get("monthly_contributions", {})
    current_streak = profile_data.get("current_streak", 0)

    signals = []

    if not daily:
        return {"risk": "low", "signals": [], "summary": "Insufficient data for burnout analysis."}

    today = date.today()
    sorted_dates = sorted(datetime.strptime(d, "%Y-%m-%d").date() for d in daily)
    gaps = _find_gaps(sorted_dates)

    # ── Signal: inactivity gap ─────────────────────────────────────────────────
    for gap_start, gap_days in gaps:
        if gap_days >= _GAP_MEDIUM:
            severity = "high" if gap_days >= _GAP_HIGH else "medium"
            signals.append({
                "type": "inactivity_gap",
                "severity": severity,
                "detected_at": str(gap_start),
                "gap_days": gap_days,
                "description": (
                    f"{gap_days}-day contribution gap starting {gap_start}. "
                    f"No activity detected during this period."
                ),
            })

    # ── Signal: hard stop (sprint → abrupt gap) ────────────────────────────────
    streaks = _find_streaks(sorted_dates)
    for streak_end, streak_len in streaks:
        # Find the gap that immediately follows this streak
        following_gap = next(
            (g for gap_start, g in gaps if gap_start == streak_end + timedelta(days=1)),
            0,
        )
        if streak_len >= _SPRINT_STREAK and following_gap >= _GAP_MEDIUM:
            signals.append({
                "type": "hard_stop",
                "severity": "high" if following_gap >= _GAP_HIGH else "medium",
                "detected_at": str(streak_end),
                "gap_days": following_gap,
                "description": (
                    f"{streak_len}-day intense streak ended on {streak_end}, "
                    f"followed by a {following_gap}-day inactivity gap. "
                    f"Classic sprint→burnout pattern."
                ),
            })

    # ── Signal: declining pace ─────────────────────────────────────────────────
    if monthly:
        sorted_months = sorted(monthly.items())
        decline_run = 0
        decline_start = None
        for i in range(1, len(sorted_months)):
            prev_val = sorted_months[i - 1][1]
            curr_val = sorted_months[i][1]
            if curr_val < prev_val * 0.8 and curr_val > 0:  # >20% drop
                decline_run += 1
                if decline_run == 1:
                    decline_start = sorted_months[i][0]
            else:
                decline_run = 0
                decline_start = None

            if decline_run >= _DECLINE_MONTHS:
                signals.append({
                    "type": "declining_pace",
                    "severity": "medium",
                    "detected_at": decline_start,
                    "description": (
                        f"Contribution count has declined for {decline_run} consecutive months "
                        f"since {decline_start}. Consider reviewing your workload."
                    ),
                })
                decline_run = 0  # reset to avoid duplicate signals

    # ── Signal: erratic pattern ────────────────────────────────────────────────
    monthly_vals = list(monthly.values()) if monthly else []
    if len(monthly_vals) >= 6:
        cv = _cv(monthly_vals)
        if cv >= _CV_HIGH:
            signals.append({
                "type": "erratic_pattern",
                "severity": "medium",
                "detected_at": str(today),
                "description": (
                    f"High variability (CV={cv:.2f}) in monthly contribution counts. "
                    f"Inconsistent pace may be unsustainable long-term."
                ),
            })

    # ── Signal: recovery (positive) ───────────────────────────────────────────
    if current_streak >= 7 and any(s["type"] in ("inactivity_gap", "hard_stop") for s in signals):
        signals.append({
            "type": "recovery",
            "severity": "low",
            "detected_at": str(today),
            "description": (
                f"Current {current_streak}-day streak suggests recovery from a previous gap. "
                f"Great momentum — maintain a sustainable pace."
            ),
        })

    # ── Determine overall risk ─────────────────────────────────────────────────
    high_count = sum(1 for s in signals if s["severity"] == "high")
    medium_count = sum(1 for s in signals if s["severity"] == "medium")
    recovery = any(s["type"] == "recovery" for s in signals)

    if high_count >= 2 and not recovery:
        risk = "high"
    elif high_count >= 1 or medium_count >= 2:
        risk = "medium"
    else:
        risk = "low"

    summary = _build_summary(risk, signals, current_streak)

    return {
        "risk": risk,
        "signals": signals,
        "summary": summary,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _find_gaps(sorted_dates: list) -> list[tuple[date, int]]:
    """Return list of (gap_start_date, gap_length_days) for gaps ≥ 7 days."""
    gaps = []
    for i in range(1, len(sorted_dates)):
        gap = (sorted_dates[i] - sorted_dates[i - 1]).days - 1
        if gap >= 7:
            gaps.append((sorted_dates[i - 1] + timedelta(days=1), gap))
    return gaps


def _find_streaks(sorted_dates: list) -> list[tuple[date, int]]:
    """Return list of (streak_end_date, streak_length) for all streaks."""
    if not sorted_dates:
        return []
    streaks = []
    streak_len = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            streak_len += 1
        else:
            if streak_len >= 5:
                streaks.append((sorted_dates[i - 1], streak_len))
            streak_len = 1
    if streak_len >= 5:
        streaks.append((sorted_dates[-1], streak_len))
    return streaks


def _cv(values: list) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    if mean == 0:
        return 0.0
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))
    return std / mean


def _build_summary(risk: str, signals: list, current_streak: int) -> str:
    if not signals:
        return "No burnout signals detected. Keep up the consistent work."
    if risk == "high":
        return (
            f"{len(signals)} burnout signal(s) detected, including high-severity patterns. "
            "Consider scheduling deliberate rest and avoiding unsustainable sprint cycles."
        )
    if risk == "medium":
        return (
            f"{len(signals)} burnout signal(s) detected. "
            "Your pattern shows some inconsistency — watch for escalation."
        )
    recovery = any(s["type"] == "recovery" for s in signals)
    if recovery:
        return (
            f"Recovery phase detected — your current {current_streak}-day streak is positive. "
            "Aim to maintain a sustainable daily pace rather than sprinting."
        )
    return "Minor signals detected. No immediate concern."
