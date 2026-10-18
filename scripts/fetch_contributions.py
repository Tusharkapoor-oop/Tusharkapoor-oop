# fetch_contributions.py
# ----------------------
# Scrapes the public contribution calendar for Tusharkapoor-oop — no token,
# no GraphQL — from https://github.com/users/<user>/contributions and writes
# data/contributions.json with raw days plus derived stats.
#
# Day cells come down as <rect data-date="YYYY-MM-DD" data-count="N"/>;
# BeautifulSoup picks every shape, then we derive streaks and totals.

import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup

# ── Configuration ──────────────────────────────────────────────────────

USERNAME = os.environ.get("GITHUB_USERNAME", "Tusharkapoor-oop")
URL      = f"https://github.com/users/{USERNAME}/contributions"
OUT      = os.path.join(os.path.dirname(__file__), "..", "data", "contributions.json")
TIMEOUT  = 20

# Browser-ish headers: GitHub serves the calendar table to browser UAs and
# varies markup by client class, so identify as a conventional browser.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    )
}


# ── Calendar fetch + parse ─────────────────────────────────────────────

def fetch_days(username: str = USERNAME):
    """Return [(date_str, count), ...] oldest → newest."""
    resp = requests.get(
        f"https://github.com/users/{username}/contributions",
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # 2026 markup: <td data-date data-level id=contribution-day-component-x-y>
    # with the count living in a sibling <tool-tip for=...> label:
    #   "4 contributions on March 3rd." / "No contributions on October 19th."
    tips = {}
    for tip in soup.select("tool-tip"):
        anchor = tip.get("for")
        if anchor:
            tips[anchor] = tip.get_text(" ", strip=True)

    days = []
    for td in soup.select("td[data-date]"):
        d = td.get("data-date")
        if not d:
            continue
        count = _day_count_from_tooltip(tips.get(td.get("id", ""), ""))
        if count == 0 and td.get("data-count"):
            # forward-compat: count back as a direct attribute some day
            try:
                count = int(td.get("data-count", 0) or 0)
            except (TypeError, ValueError):
                count = 0
        days.append((d, count))

    if not days:
        raise RuntimeError("no contribution day cells found — page markup may have changed")

    # Dedup (if any) and sort oldest → newest.
    seen, ordered = set(), []
    for d, c in days:
        if d not in seen:
            seen.add(d)
            ordered.append((d, c))
    return sorted(ordered)


def _day_count_from_tooltip(tooltip: str) -> int:
    # "12 contributions on Friday, March 3, 2023" / "No contributions on ..."
    head = tooltip.split(" contribution")[0].strip()
    if not head or not head[0].isdigit():
        return 0
    try:
        return int(head)
    except ValueError:
        return 0


# ── Derived stats ──────────────────────────────────────────────────────

def derive(days):
    """days: [(date_str, count)] oldest → newest."""
    total = sum(c for _, c in days)

    current, longest, run = 0, 0, 0
    for _, c in days:
        run = run + 1 if c > 0 else 0
        longest = max(longest, run)

    # Current streak: walk back from the tail; today being empty doesn't
    # break it (the classic GitHub behaviour).
    current = 0
    walked = 0
    for _, c in reversed(days):
        if c == 0 and walked == 0:
            walked = 1
            continue
        if c > 0:
            current += 1
        else:
            break
        walked += 1

    best_day  = max(days, key=lambda t: t[1]) if days else ("", 0)
    months: dict = {}
    for d, c in days:
        months[d[:7]] = months.get(d[:7], 0) + c
    best_month = max(months.items(), key=lambda kv: kv[1])[0] if months else ""

    return {
        "total": total,
        "current_streak": current,
        "longest_streak": longest,
        "best_day": {"date": best_day[0], "count": best_day[1]},
        "active_days": sum(1 for _, c in days if c > 0),
        "months": months,
        "best_month": best_month,
    }


# ── Entry point ────────────────────────────────────────────────────────

def main() -> int:
    print(f"[fetch] {URL}")
    days = fetch_days()
    stats = derive(days)
    payload = {
        "username": USERNAME,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "since": days[0][0] if days else "",
        "until": days[-1][0] if days else "",
        "stats": stats,
        "days": [{"date": d, "count": c} for d, c in days],
    }

    out_path = os.path.normpath(OUT)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))

    print(f"[fetch] {len(days)} days | total {stats['total']} | "
          f"current streak {stats['current_streak']}d | best day {stats['best_day']['count']}")
    print(f"[fetch] wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace") if hasattr(sys.stdout, "reconfigure") else None
    sys.exit(main())
