# app/github_service.py
import requests
import logging
from datetime import datetime, timedelta
from collections import Counter
from django.conf import settings

logger = logging.getLogger(__name__)


class GitHubService:
    """Fetch and aggregate GitHub user data (REST + GraphQL)."""

    REST_URL = "https://api.github.com"
    GRAPHQL_URL = "https://api.github.com/graphql"

    def __init__(self, access_token=None):
        self.access_token = access_token or getattr(settings, 'GITHUB_TOKEN', None)
        self.headers = {
            "Authorization": f"token {self.access_token}",
            "Accept": "application/vnd.github+json",
        } if self.access_token else {}

    # ── low-level helpers ────────────────────────────────────────────────────

    def _get(self, path, params=None):
        url = f"{self.REST_URL}{path}"
        resp = requests.get(url, headers=self.headers, params=params, timeout=15)
        if resp.status_code == 403:
            raise Exception("GitHub API rate limit exceeded")
        if resp.status_code == 404:
            raise Exception(f"Resource not found: {path}")
        resp.raise_for_status()
        return resp.json()

    def _graphql(self, query, variables=None):
        resp = requests.post(
            self.GRAPHQL_URL,
            json={"query": query, "variables": variables or {}},
            headers={**self.headers, "Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        result = resp.json()
        if "errors" in result:
            raise Exception(f"GraphQL errors: {result['errors']}")
        return result.get("data", {})

    # ── REST-based fetchers ──────────────────────────────────────────────────

    def get_user_data(self, username):
        return self._get(f"/users/{username}")

    def get_user_events(self, username, per_page=100):
        try:
            return self._get(f"/users/{username}/events/public", params={"per_page": per_page})
        except Exception as exc:
            logger.error(f"get_user_events: {exc}")
            return []

    def get_user_repos(self, username, per_page=100):
        """All public repos owned by the user, sorted by most recently pushed."""
        try:
            return self._get(
                f"/users/{username}/repos",
                params={"type": "owner", "sort": "pushed", "per_page": per_page},
            )
        except Exception as exc:
            logger.error(f"get_user_repos: {exc}")
            return []

    def get_repo_languages(self, repo_full_name):
        """Return language-byte mapping for a single repo."""
        try:
            return self._get(f"/repos/{repo_full_name}/languages")
        except Exception:
            return {}

    def get_contributed_repos(self, username, events_data):
        """
        Repos the user contributed to but does NOT own,
        derived from their public event stream.
        """
        contributed = {}
        for event in events_data:
            if event.get("type") not in ("PushEvent", "PullRequestEvent", "IssuesEvent"):
                continue
            repo_name = event.get("repo", {}).get("name")
            if not repo_name or repo_name in contributed:
                continue
            try:
                repo_data = self._get(f"/repos/{repo_name}")
            except Exception:
                continue
            if repo_data.get("owner", {}).get("login") == username:
                continue  # skip own repos
            contributed[repo_name] = {
                "name": repo_data.get("name"),
                "full_name": repo_data.get("full_name"),
                "html_url": repo_data.get("html_url"),
                "description": repo_data.get("description"),
                "stargazers_count": repo_data.get("stargazers_count", 0),
                "forks_count": repo_data.get("forks_count", 0),
                "updated_at": repo_data.get("updated_at"),
                "language": repo_data.get("language"),
                "owner": {
                    "login": repo_data.get("owner", {}).get("login"),
                    "avatar_url": repo_data.get("owner", {}).get("avatar_url"),
                },
                "contribution_type": event.get("type"),
            }
        return list(contributed.values())

    # ── GraphQL-based fetchers ───────────────────────────────────────────────

    def get_contribution_calendar(self, username):
        """
        Fetch the full contribution calendar (last year) via GraphQL.
        Returns a dict: { 'totalContributions': int, 'weeks': [...] }
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
              totalRepositoryContributions
              restrictedContributionsCount
            }
          }
        }
        """
        try:
            data = self._graphql(query, {"login": username})
            collection = data["user"]["contributionsCollection"]
            return collection
        except Exception as exc:
            logger.error(f"get_contribution_calendar: {exc}")
            return {}

    def get_pinned_repos(self, username):
        """Fetch pinned repositories via GraphQL."""
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
            logger.error(f"get_pinned_repos: {exc}")
            return []

    # ── aggregation helpers ──────────────────────────────────────────────────

    def aggregate_language_stats(self, username, repos):
        """
        Sum language bytes across all owned repos, return sorted dict.
        Limits to first 30 repos to stay within rate limits.
        """
        totals = Counter()
        for repo in repos[:30]:
            if repo.get("fork"):
                continue  # exclude forks for accurate personal stats
            langs = self.get_repo_languages(repo["full_name"])
            totals.update(langs)

        if not totals:
            return {}

        grand_total = sum(totals.values())
        return {
            lang: {
                "bytes": bytes_,
                "percentage": round(bytes_ / grand_total * 100, 1),
            }
            for lang, bytes_ in totals.most_common(15)
        }

    def calculate_contribution_stats(self, events_data, calendar_data=None):
        """
        Combine event stream data with GraphQL calendar data into a unified
        stats object.
        """
        today = datetime.utcnow().date()
        event_dates = []
        event_hours = []
        contribution_types = Counter()

        for event in events_data:
            try:
                dt = datetime.strptime(event['created_at'], "%Y-%m-%dT%H:%M:%SZ")
                event_dates.append(dt.date())
                event_hours.append(dt.hour)
                contribution_types[event.get("type")] += 1
            except Exception:
                continue

        # ── streak calculation (from calendar when available) ────────────────
        current_streak = 0
        longest_streak = 0
        daily_counts = {}  # date_str → count

        if calendar_data:
            for week in calendar_data.get("contributionCalendar", {}).get("weeks", []):
                for day in week.get("contributionDays", []):
                    daily_counts[day["date"]] = day["contributionCount"]

            dates_with_contributions = sorted(
                d for d, c in daily_counts.items() if c > 0
            )

            if dates_with_contributions:
                streak = 1
                for i in range(1, len(dates_with_contributions)):
                    prev = datetime.strptime(dates_with_contributions[i - 1], "%Y-%m-%d").date()
                    curr = datetime.strptime(dates_with_contributions[i], "%Y-%m-%d").date()
                    if (curr - prev).days == 1:
                        streak += 1
                    else:
                        longest_streak = max(longest_streak, streak)
                        streak = 1
                longest_streak = max(longest_streak, streak)

                # current streak – walk backwards from today
                cs = 0
                check = today
                while str(check) in daily_counts and daily_counts[str(check)] > 0:
                    cs += 1
                    check -= timedelta(days=1)
                # also accept yesterday as start
                if cs == 0:
                    check = today - timedelta(days=1)
                    while str(check) in daily_counts and daily_counts[str(check)] > 0:
                        cs += 1
                        check -= timedelta(days=1)
                current_streak = cs
        else:
            # Fallback to event stream
            unique_dates = sorted(set(event_dates))
            if unique_dates:
                streak = 1
                for i in range(1, len(unique_dates)):
                    if (unique_dates[i] - unique_dates[i - 1]).days == 1:
                        streak += 1
                    else:
                        longest_streak = max(longest_streak, streak)
                        streak = 1
                longest_streak = max(longest_streak, streak)
                current_streak = streak if unique_dates[-1] >= today - timedelta(days=1) else 0

        # ── monthly timeline (last 12 months) ────────────────────────────────
        monthly_data = {}
        for i in range(11, -1, -1):
            d = today - timedelta(days=30 * i)
            key = d.strftime("%Y-%m")
            monthly_data[key] = 0

        if daily_counts:
            for date_str, count in daily_counts.items():
                key = date_str[:7]
                if key in monthly_data:
                    monthly_data[key] += count
        else:
            for d in event_dates:
                key = d.strftime("%Y-%m")
                if key in monthly_data:
                    monthly_data[key] += 1

        # ── weekly heatmap (last 4 weeks) ─────────────────────────────────────
        weekly_data = {}
        for i in range(3, -1, -1):
            d = today - timedelta(weeks=i)
            iso = d.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            weekly_data[key] = 0

        for d in event_dates:
            iso = d.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
            if key in weekly_data:
                weekly_data[key] += 1

        # ── peak time ────────────────────────────────────────────────────────
        if event_hours:
            peak_hour = Counter(event_hours).most_common(1)[0][0]
            if 5 <= peak_hour < 12:
                peak_time = "Morning"
            elif 12 <= peak_hour < 17:
                peak_time = "Afternoon"
            elif 17 <= peak_hour < 22:
                peak_time = "Evening"
            else:
                peak_time = "Night"
        else:
            peak_time = "N/A"

        # ── total contributions ───────────────────────────────────────────────
        total_contributions = (
            calendar_data.get("contributionCalendar", {}).get("totalContributions", 0)
            if calendar_data else len(events_data)
        )

        return {
            "total_contributions": total_contributions,
            "total_commits": calendar_data.get("totalCommitContributions", 0) if calendar_data else 0,
            "total_pull_requests": calendar_data.get("totalPullRequestContributions", 0) if calendar_data else 0,
            "total_issues": calendar_data.get("totalIssueContributions", 0) if calendar_data else 0,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "peak_time": peak_time,
            "monthly_data": monthly_data,
            "weekly_data": weekly_data,
            "contribution_types": dict(contribution_types),
            "daily_counts": daily_counts,
            "event_dates": sorted(set(str(d) for d in event_dates)),
        }

    # ── main entry point ─────────────────────────────────────────────────────

    def get_complete_user_data(self, username):
        """
        Orchestrate all fetches and return a unified payload:
          - user_data          : basic GitHub profile
          - repos              : list of own repos (sorted by push date)
          - pinned_repos       : pinned repos from GraphQL
          - contributed_repos  : repos the user contributed to (not owns)
          - language_stats     : {lang: {bytes, percentage}}
          - top_language       : str (most-used language by bytes)
          - stats              : contribution statistics
          - events             : raw events list
        """
        try:
            user_data = self.get_user_data(username)
            events = self.get_user_events(username)
            repos = self.get_user_repos(username)
            pinned_repos = self.get_pinned_repos(username)
            contributed_repos = self.get_contributed_repos(username, events)
            calendar_data = self.get_contribution_calendar(username)
            language_stats = self.aggregate_language_stats(username, repos)

            top_language = (
                max(language_stats, key=lambda k: language_stats[k]["bytes"])
                if language_stats else "N/A"
            )

            stats = self.calculate_contribution_stats(events, calendar_data)
            stats["top_language"] = top_language
            stats["languages"] = {k: v["bytes"] for k, v in language_stats.items()}

            return {
                "user_data": user_data,
                "repos": repos,
                "pinned_repos": pinned_repos,
                "contributed_repos": contributed_repos,
                "language_stats": language_stats,
                "top_language": top_language,
                "stats": stats,
                "events": events,
            }
        except Exception as exc:
            logger.error(f"get_complete_user_data({username}): {exc}", exc_info=True)
            raise