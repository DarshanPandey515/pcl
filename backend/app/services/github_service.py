# app/services/github_service.py
"""
GitHub data ingestion service.

Responsibilities:
  - REST API calls (user, repos, events, languages)
  - GraphQL calls (contribution calendar, pinned repos)
  - Aggregation into structured dicts consumed by the analysis layer

Never imports Django models — stays a pure data-fetching layer.
"""

import logging
from collections import Counter
from datetime import datetime, timedelta, date

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_REST = "https://api.github.com"
_GRAPHQL = "https://api.github.com/graphql"


class GitHubService:
    def __init__(self, access_token: str = None):
        token = access_token or settings.GITHUB_TOKEN
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        } if token else {}

    # ── Low-level helpers ──────────────────────────────────────────────────────

    def _get(self, path: str, params: dict = None, timeout: int = 15) -> dict | list:
        url = f"{_REST}{path}"
        resp = requests.get(url, headers=self.headers, params=params, timeout=timeout)
        if resp.status_code == 403:
            raise RateLimitError("GitHub API rate limit exceeded")
        if resp.status_code == 404:
            raise NotFoundError(f"Not found: {path}")
        resp.raise_for_status()
        return resp.json()

    def _graphql(self, query: str, variables: dict = None) -> dict:
        resp = requests.post(
            _GRAPHQL,
            json={"query": query, "variables": variables or {}},
            headers={**self.headers, "Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        result = resp.json()
        if "errors" in result:
            raise GraphQLError(result["errors"])
        return result.get("data", {})

    # ── User profile ───────────────────────────────────────────────────────────

    def get_user(self, username: str) -> dict:
        return self._get(f"/users/{username}")

    def get_primary_email(self) -> str:
        """Fetch the authenticated user's verified primary email."""
        try:
            emails = self._get("/user/emails")
            return next(
                (e["email"] for e in emails if e.get("primary") and e.get("verified")),
                None,
            )
        except Exception:
            return None

    # ── Events (recent public activity) ───────────────────────────────────────

    def get_events(self, username: str, per_page: int = 100) -> list:
        try:
            return self._get(
                f"/users/{username}/events/public",
                params={"per_page": per_page},
            )
        except Exception as exc:
            logger.warning(f"get_events({username}): {exc}")
            return []

    # ── Repositories ──────────────────────────────────────────────────────────

    def get_own_repos(self, username: str, per_page: int = 100) -> list:
        """All public repos owned by the user, sorted by most recently pushed."""
        try:
            return self._get(
                f"/users/{username}/repos",
                params={"type": "owner", "sort": "pushed", "per_page": per_page},
            )
        except Exception as exc:
            logger.warning(f"get_own_repos({username}): {exc}")
            return []

    def get_repo_languages(self, repo_full_name: str) -> dict:
        """Language → byte count for a single repo."""
        try:
            return self._get(f"/repos/{repo_full_name}/languages")
        except Exception:
            return {}

    def get_contributed_repos(self, username: str, events: list) -> list:
        """
        Repos the user contributed to that they do NOT own,
        derived from the public events stream.
        """
        seen, result = set(), []
        for event in events:
            if event.get("type") not in ("PushEvent", "PullRequestEvent", "IssuesEvent"):
                continue
            repo_name = event.get("repo", {}).get("name")
            if not repo_name or repo_name in seen:
                continue
            seen.add(repo_name)
            try:
                repo = self._get(f"/repos/{repo_name}")
            except Exception:
                continue
            if repo.get("owner", {}).get("login") == username:
                continue
            result.append({**repo, "contribution_type": event.get("type")})
        return result

    # ── GraphQL queries ────────────────────────────────────────────────────────

    def get_contribution_calendar(self, username: str) -> dict:
        """
        Full contribution calendar + counts from GraphQL.
        Returns the contributionsCollection dict.
        """
        query = """
        query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                    color
                  }
                }
              }
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalPullRequestReviewContributions
              totalRepositoryContributions
              restrictedContributionsCount
            }
          }
        }
        """
        try:
            data = self._graphql(query, {"login": username})
            return data["user"]["contributionsCollection"]
        except Exception as exc:
            logger.warning(f"get_contribution_calendar({username}): {exc}")
            return {}

    def get_pinned_repos(self, username: str) -> list:
        query = """
        query($login: String!) {
          user(login: $login) {
            pinnedItems(first: 6, types: [REPOSITORY]) {
              nodes {
                ... on Repository {
                  name
                  nameWithOwner
                  description
                  url
                  stargazerCount
                  forkCount
                  primaryLanguage { name color }
                  updatedAt
                  isPrivate
                  defaultBranchRef {
                    target {
                      ... on Commit {
                        history(first: 1) { totalCount }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        try:
            data = self._graphql(query, {"login": username})
            return data["user"]["pinnedItems"]["nodes"]
        except Exception as exc:
            logger.warning(f"get_pinned_repos({username}): {exc}")
            return []

    # ── Aggregation ────────────────────────────────────────────────────────────

    def aggregate_language_stats(self, repos: list, limit: int = 30) -> tuple[dict, str]:
        """
        Sum language bytes across non-fork owned repos.
        Returns (language_stats_dict, top_language).

        language_stats shape:
          { "TypeScript": { "bytes": 184000, "percentage": 41.2, "repos_count": 7 } }
        """
        totals: Counter = Counter()
        repo_counts: Counter = Counter()

        for repo in repos[:limit]:
            if repo.get("fork"):
                continue
            langs = self.get_repo_languages(repo["full_name"])
            totals.update(langs)
            for lang in langs:
                repo_counts[lang] += 1

        if not totals:
            return {}, "N/A"

        grand_total = sum(totals.values())
        stats = {
            lang: {
                "bytes": bytes_,
                "percentage": round(bytes_ / grand_total * 100, 1),
                "repos_count": repo_counts[lang],
            }
            for lang, bytes_ in totals.most_common(15)
        }
        top_language = totals.most_common(1)[0][0]
        return stats, top_language

    def build_contribution_stats(self, events: list, calendar: dict) -> dict:
        """
        Combine event stream + GraphQL calendar into a unified stats dict.

        The calendar is the ground truth for counts and daily heatmap.
        Events supply contribution type breakdown and peak-hour analysis.
        """
        today = datetime.utcnow().date()

        # ── Daily heatmap from calendar ────────────────────────────────────────
        daily_counts: dict[str, int] = {}
        if calendar:
            for week in calendar.get("contributionCalendar", {}).get("weeks", []):
                for day in week.get("contributionDays", []):
                    if day["contributionCount"] > 0:
                        daily_counts[day["date"]] = day["contributionCount"]

        # ── Streak calculation ─────────────────────────────────────────────────
        current_streak, longest_streak, last_streak_break = _calculate_streaks(
            daily_counts, today
        )

        # ── Monthly timeline (last 12 months) ──────────────────────────────────
        monthly_data = _build_monthly(daily_counts, today)

        # ── Weekly timeline (last 16 weeks) ───────────────────────────────────
        weekly_data = _build_weekly(daily_counts, today)

        # ── Peak contribution hour (from events) ───────────────────────────────
        event_hours = []
        contribution_types: Counter = Counter()
        for event in events:
            try:
                dt = datetime.strptime(event["created_at"], "%Y-%m-%dT%H:%M:%SZ")
                event_hours.append(dt.hour)
                contribution_types[event.get("type")] += 1
            except Exception:
                continue

        peak_time = _classify_peak_hour(event_hours)

        # ── Totals (calendar wins; fall back to event count) ───────────────────
        cal_data = calendar.get("contributionCalendar", {}) if calendar else {}
        total_contributions = cal_data.get("totalContributions") or len(events)
        total_commits = calendar.get("totalCommitContributions", 0) if calendar else 0
        total_prs = calendar.get("totalPullRequestContributions", 0) if calendar else 0
        total_issues = calendar.get("totalIssueContributions", 0) if calendar else 0
        total_reviews = calendar.get("totalPullRequestReviewContributions", 0) if calendar else 0

        return {
            "total_contributions": total_contributions,
            "total_commits": total_commits,
            "total_pull_requests": total_prs,
            "total_issues": total_issues,
            "total_reviews": total_reviews,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_streak_break": last_streak_break,
            "peak_time": peak_time,
            "daily_counts": daily_counts,
            "monthly_data": monthly_data,
            "weekly_data": weekly_data,
            "contribution_types": dict(contribution_types),
        }

    # ── Full orchestration ─────────────────────────────────────────────────────

    def get_complete_user_data(self, username: str) -> dict:
        """
        Fetch everything needed for a full profile sync.

        Returns a structured dict consumed by the analysis services.
        Raises on hard failures; logs and continues on soft failures.
        """
        user_data = self.get_user(username)
        events = self.get_events(username)
        own_repos = self.get_own_repos(username)
        pinned_repos = self.get_pinned_repos(username)
        contributed_repos = self.get_contributed_repos(username, events)
        calendar = self.get_contribution_calendar(username)
        language_stats, top_language = self.aggregate_language_stats(own_repos)
        contribution_stats = self.build_contribution_stats(events, calendar)
        contribution_stats["top_language"] = top_language
        contribution_stats["languages"] = {
            k: v["bytes"] for k, v in language_stats.items()
        }

        return {
            "user_data": user_data,
            "events": events,
            "own_repos": own_repos,
            "pinned_repos": pinned_repos,
            "contributed_repos": contributed_repos,
            "language_stats": language_stats,
            "top_language": top_language,
            "stats": contribution_stats,
        }


# ── Pure calculation helpers ───────────────────────────────────────────────────

def _calculate_streaks(daily_counts: dict, today: date) -> tuple[int, int, date | None]:
    """Return (current_streak, longest_streak, last_streak_break_date)."""
    if not daily_counts:
        return 0, 0, None

    sorted_dates = sorted(
        datetime.strptime(d, "%Y-%m-%d").date() for d in daily_counts
    )

    # Longest streak
    longest = streak = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 1

    # Current streak — walk back from today (allow yesterday as start)
    current = 0
    check = today
    while True:
        if str(check) in daily_counts:
            current += 1
            check -= timedelta(days=1)
        elif check == today:
            # today no contribution yet — check from yesterday
            check -= timedelta(days=1)
            if str(check) in daily_counts:
                current += 1
                check -= timedelta(days=1)
            else:
                break
        else:
            break

    # Last streak break — find the most recent gap in sorted_dates
    last_break = None
    for i in range(len(sorted_dates) - 1, 0, -1):
        if (sorted_dates[i] - sorted_dates[i - 1]).days > 1:
            last_break = sorted_dates[i - 1]
            break

    return current, longest, last_break


def _build_monthly(daily_counts: dict, today: date) -> dict:
    months = {}
    for i in range(11, -1, -1):
        # generate keys for last 12 calendar months
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        key = f"{y}-{m:02d}"
        months[key] = 0

    for date_str, count in daily_counts.items():
        key = date_str[:7]
        if key in months:
            months[key] += count

    return months


def _build_weekly(daily_counts: dict, today: date, weeks: int = 16) -> dict:
    weekly: dict[str, int] = {}
    for i in range(weeks - 1, -1, -1):
        d = today - timedelta(weeks=i)
        iso = d.isocalendar()
        key = f"{iso[0]}-W{iso[1]:02d}"
        weekly[key] = 0

    for date_str, count in daily_counts.items():
        try:
            parsed = datetime.strptime(date_str, "%Y-%m-%d").date()
            iso = parsed.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            if key in weekly:
                weekly[key] += count
        except Exception:
            continue

    return weekly


def _classify_peak_hour(hours: list) -> str:
    if not hours:
        return "N/A"
    peak = Counter(hours).most_common(1)[0][0]
    if 5 <= peak < 12:
        return "Morning"
    if 12 <= peak < 17:
        return "Afternoon"
    if 17 <= peak < 22:
        return "Evening"
    return "Night"


# ── Custom exceptions ──────────────────────────────────────────────────────────

class RateLimitError(Exception):
    pass

class NotFoundError(Exception):
    pass

class GraphQLError(Exception):
    pass
