# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

"""
update_readme.py
----------------
Fetches all public repositories for the GitHub user, sorts them by
last push date, and injects a formatted markdown section between the
<!-- REPOS:START --> and <!-- REPOS:END --> markers in README.md.

Runs as a GitHub Actions step on every push and daily via cron.
"""

import os
import re
import requests
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────────────

USERNAME = os.environ.get("GITHUB_USERNAME", "Tusharkapoor-oop")
TOKEN    = os.environ.get("GITHUB_TOKEN", "")

# Repos to never show in the showcase (profile repo, forks, deprecated)
EXCLUDED = {
    "Tusharkapoor-oop",  # this profile repo itself
    "NEW-Git",           # deprecated init repo
    "idk",               # private/low-signal
}

# Human-readable language labels for formatting
LANG_WIDTH  = 14
NAME_WIDTH  = 36
DESC_WIDTH  = 62

# ── GitHub API ─────────────────────────────────────────────────────────

def fetch_repos():
    headers = {}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"

    url = (
        f"https://api.github.com/users/{USERNAME}/repos"
        f"?sort=pushed&direction=desc&per_page=30&type=public"
    )
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


def filter_repos(repos):
    """Remove excluded, archived, empty, and forked repositories."""
    result = []
    for r in repos:
        if r["name"] in EXCLUDED:
            continue
        if r.get("archived"):
            continue
        if r.get("fork"):
            continue
        if r.get("size", 0) == 0:
            continue
        result.append(r)
    return result[:8]  # show maximum 8 repos


# ── Formatting ─────────────────────────────────────────────────────────

def format_age(pushed_at: str) -> str:
    """Return a human-readable relative time string."""
    pushed = datetime.fromisoformat(pushed_at.replace("Z", "+00:00"))
    now    = datetime.now(timezone.utc)
    delta  = now - pushed
    days   = delta.days

    if days == 0:
        return "today"
    elif days == 1:
        return "yesterday"
    elif days < 7:
        return f"{days}d ago"
    elif days < 30:
        return f"{days // 7}w ago"
    elif days < 365:
        return f"{days // 30}mo ago"
    else:
        return f"{days // 365}y ago"


def classify_repo(repo) -> str:
    """Return a one-word engineering classification based on topics/language."""
    topics   = set(repo.get("topics") or [])
    language = (repo.get("language") or "").lower()

    if any(t in topics for t in ["machine-learning", "ai", "deep-learning", "nlp"]):
        return "AI/ML"
    if any(t in topics for t in ["computer-vision", "opencv", "mediapipe"]):
        return "Vision"
    if any(t in topics for t in ["cloud", "ibm-cloud", "watsonx", "azure"]):
        return "Cloud"
    if language in ["c++", "c", "assembly"]:
        return "Systems"
    if any(t in topics for t in ["data-analytics", "data-science", "eda"]):
        return "Data"
    if any(t in topics for t in ["react", "typescript", "nextjs", "vite"]):
        return "Frontend"
    if any(t in topics for t in ["python", "fastapi", "flask", "django"]):
        return "Backend"
    if any(t in topics for t in ["dsa", "algorithms", "data-structures"]):
        return "CS Core"
    return "Engineering"


def generate_section(repos) -> str:
    """Generate the full markdown section to inject between markers."""
    if not repos:
        return "*No public repositories found.*\n"

    lines = []

    # Header bar
    lines.append("```")
    lines.append(
        f"  {'REPOSITORY':<{NAME_WIDTH}} "
        f"{'LANGUAGE':<{LANG_WIDTH}} "
        f"{'TYPE':<12} "
        f"{'⭐':>4}  "
        f"UPDATED"
    )
    lines.append("  " + "─" * 85)

    for repo in repos:
        name     = repo["name"]
        lang     = repo.get("language") or "–"
        stars    = repo.get("stargazers_count", 0)
        kind     = classify_repo(repo)
        updated  = format_age(repo["pushed_at"])
        url      = repo["html_url"]
        desc     = (repo.get("description") or "").strip()

        # Truncate long names/descriptions
        display_name = (name[:NAME_WIDTH - 2] + "..") if len(name) > NAME_WIDTH else name
        display_desc = (desc[:DESC_WIDTH - 2] + "..") if len(desc) > DESC_WIDTH else desc

        lines.append(
            f"  {display_name:<{NAME_WIDTH}} "
            f"{lang:<{LANG_WIDTH}} "
            f"{kind:<12} "
            f"{stars:>4}★  "
            f"{updated}"
        )
        if display_desc:
            lines.append(f"  {'':>{NAME_WIDTH + 1}}└─ {display_desc}")

    lines.append("```")
    lines.append("")

    # Below the code block, render clickable links for each repo
    lines.append("<details>")
    lines.append("<summary><sub>View repository links</sub></summary>")
    lines.append("<br/>")
    lines.append("")
    for repo in repos:
        name  = repo["name"]
        url   = repo["html_url"]
        desc  = (repo.get("description") or "").strip()
        stars = repo.get("stargazers_count", 0)
        lang  = repo.get("language") or ""
        kind  = classify_repo(repo)

        lang_badge = (
            f"![{lang}](https://img.shields.io/badge/{requests.utils.quote(lang)}"
            f"-0f0f1a?style=flat-square&logo={lang.lower().replace(' ','').replace('+','plus')}&logoColor=4f46e5)"
            if lang else ""
        )
        lines.append(
            f"**[{name}]({url})** &nbsp;·&nbsp; "
            f"`{kind}` &nbsp;·&nbsp; "
            f"⭐ {stars}"
        )
        if desc:
            lines.append(f"<br/><sub>{desc}</sub>")
        lines.append("")

    lines.append("</details>")
    lines.append("")

    # Timestamp
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines.append(f"<sub><sup>↻ auto-updated · {now_str}</sup></sub>")
    lines.append("")

    return "\n".join(lines)


# ── README injection ───────────────────────────────────────────────────

START_MARKER = "<!-- REPOS:START -->"
END_MARKER   = "<!-- REPOS:END -->"


def inject_into_readme(section: str, readme_path: str = "README.md"):
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern     = re.compile(
        re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER),
        re.DOTALL,
    )
    replacement = f"{START_MARKER}\n{section}{END_MARKER}"

    if not re.search(pattern, content):
        raise ValueError(
            f"Markers {START_MARKER} / {END_MARKER} not found in {readme_path}"
        )

    new_content = re.sub(pattern, replacement, content)

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"[OK] README.md updated with {len(section.splitlines())} lines of repo data.")


# ── Entry point ────────────────────────────────────────────────────────

def main():
    print(f"[>>] Fetching repos for @{USERNAME}...")
    all_repos   = fetch_repos()
    repos       = filter_repos(all_repos)
    print(f"[>>] Found {len(repos)} qualifying repositories.")

    section = generate_section(repos)
    inject_into_readme(section)
    print("[OK] Done.")


if __name__ == "__main__":
    main()
