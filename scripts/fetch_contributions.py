"""
fetch_contributions.py
─────────────────────
Scrape the public GitHub contributions calendar for a user.
No auth token needed — uses the public HTML endpoint.
Writes data/contributions.json with raw days + derived stats.
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

USERNAME = "Tusharkapoor-oop"
OUT = Path(__file__).resolve().parent.parent / "data" / "contributions.json"


def fetch():
    url = f"https://github.com/users/{USERNAME}/contributions"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse(html: str):
    soup = BeautifulSoup(html, "html.parser")
    days = []

    # GitHub renders contribution cells as <td> with data-date and data-level
    for td in soup.select("td.ContributionCalendar-day"):
        date = td.get("data-date", "")
        level = int(td.get("data-level", 0))
        # Try to get the count from the tooltip or aria text
        text = td.get_text(strip=True)
        count_match = re.search(r"(\d+)", text)
        count = int(count_match.group(1)) if count_match else 0
        if date:
            days.append({"date": date, "count": count, "level": level})

    # Sort by date
    days.sort(key=lambda d: d["date"])
    return days


def compute_stats(days):
    total = sum(d["count"] for d in days)

    # Current streak
    today = datetime.utcnow().strftime("%Y-%m-%d")
    streak = 0
    for d in reversed(days):
        if d["count"] > 0:
            streak += 1
        elif d["date"] <= today:
            break

    # Longest streak
    longest = 0
    current = 0
    for d in days:
        if d["count"] > 0:
            current += 1
            longest = max(longest, current)
        else:
            current = 0

    # Best day
    best = max(days, key=lambda d: d["count"]) if days else {"date": "", "count": 0}

    return {
        "total": total,
        "current_streak": streak,
        "longest_streak": longest,
        "best_day": {"date": best["date"], "count": best["count"]},
    }


def main():
    print(f"Fetching contributions for {USERNAME}...")
    html = fetch()
    days = parse(html)
    stats = compute_stats(days)

    payload = {
        "username": USERNAME,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "days": days,
        "stats": stats,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {len(days)} days -> {OUT}")
    print(f"  Total: {stats['total']}, Streak: {stats['current_streak']}, Longest: {stats['longest_streak']}")


if __name__ == "__main__":
    main()
