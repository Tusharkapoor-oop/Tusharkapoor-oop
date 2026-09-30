import requests
import os
import re
from datetime import datetime, timezone

USERNAME = "Tusharkapoor-oop"
EXCLUDED = {USERNAME, "NEW-Git", "idk"}  # repos to hide
TOKEN = os.getenv("GITHUB_TOKEN", "")

HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"} if TOKEN else {}

# ── Fetch repos ──────────────────────────────────────────────────────
def fetch_repos():
    url = f"https://api.github.com/users/{USERNAME}/repos?sort=updated&per_page=50&type=owner"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    repos = resp.json()
    return [
        r for r in repos
        if not r["fork"]
        and not r["private"]
        and r["name"] not in EXCLUDED
        and (r["description"] or r["size"] > 0)
    ]

# ── Format repo as a spec block ──────────────────────────────────────
def format_repo(r):
    name        = r["name"]
    desc        = r["description"] or "No description."
    lang        = r["language"] or "—"
    stars       = r["stargazers_count"]
    updated     = r["pushed_at"][:10]
    url         = r["html_url"]
    topics      = r.get("topics", [])
    topic_str   = " · ".join(f"#{t}" for t in topics[:5]) if topics else ""

    star_str = f"★ {stars}" if stars > 0 else ""
    meta = "  ·  ".join(filter(None, [lang, star_str, f"updated {updated}"]))

    lines = [
        f"  ┌─ [{name}]({url})",
        f"  │  {desc}",
        f"  │  {meta}",
    ]
    if topic_str:
        lines.append(f"  │  {topic_str}")
    lines.append("  │")
    return "\n".join(lines)

# ── Generate the full repos block ────────────────────────────────────
def generate_repos_block(repos):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    blocks = "\n".join(format_repo(r) for r in repos)
    return f"""<!-- AUTO-REPOS:START — last updated {now} -->
```
01 / ENGINEERING  ─────────────────────────────────────────────────────

{blocks}
  └─ github.com/{USERNAME}
```
<!-- AUTO-REPOS:END -->"""

# ── Read / write README ──────────────────────────────────────────────
def update_readme(block):
    with open("README.md", "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"<!-- AUTO-REPOS:START.*?AUTO-REPOS:END -->"
    new_content = re.sub(pattern, block, content, flags=re.DOTALL)

    if new_content == content:
        print("No changes to README.")
    else:
        with open("README.md", "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"README updated with {len(repos)} repositories.")

# ── Main ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    repos = fetch_repos()
    print(f"Found {len(repos)} public repos.")
    block = generate_repos_block(repos)
    update_readme(block)
