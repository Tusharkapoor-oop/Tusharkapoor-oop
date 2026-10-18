# render_heatmap_svg.py
# ----------------------
# Renders data/contributions.json as contrib-heatmap.svg — the classic
# 53-week × 7-day calendar of rounded boxes on a dark shell, revealed
# week-column after week-column with CSS keyframes that play on load and
# freeze (no looping glow).
#
# STATIC=1 emits a single frozen frame (handy for local Quick Look previews).

import json
import os
import sys
from datetime import date, timedelta

# ── Configuration ──────────────────────────────────────────────────────

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(BASE, "data", "contributions.json")
OUT  = os.path.join(BASE, "contrib-heatmap.svg")

PALETTE = ["#1a1b31", "#262752", "#393b7f", "#4f46e5", "#7b6cff", "#a5a6ff"]
#          none -> brightest (indigo ramp, matches the profile's #4f46e5 family)

CELL          = 11   # day square
GAP           = 3    # gap between squares
PAD_LEFT      = 32   # room for the Mo/We/Fr labels
PAD_TOP       = 8
WEEK_DELAY_MS = 22

BG      = "#0f0f1a"
FG_DIM  = "#64748b"
FG_MAIN = "#e2e8f0"
ACCENT  = "#4f46e5"
FONT    = "JetBrains Mono, ui-monospace, monospace"


# ── Level mapping ──────────────────────────────────────────────────────

def level_for(count: int) -> int:
    if count == 0:  return 0
    if count <= 2:  return 1
    if count <= 5:  return 2
    if count <= 9:  return 3
    if count <= 15: return 4
    return 5


# ── Calendar → week columns ────────────────────────────────────────────

def iso_weeks(days):
    """Group day counts into left→right week columns (Sun→Sat, GitHub-style)."""
    if not days:
        return [[0] * 7]

    counts = {d["date"]: d["count"] for d in days}
    start = date.fromisoformat(days[0]["date"])
    end   = date.fromisoformat(days[-1]["date"])

    # shift back so column 0 begins on a Sunday
    start -= timedelta(days=(start.weekday() + 1) % 7)

    weeks, cur = [], start
    while cur <= end:
        column = []
        for _ in range(7):
            column.append(counts.get(cur.isoformat(), 0))
            cur += timedelta(days=1)
        weeks.append(column)
    return weeks


# ── Render ─────────────────────────────────────────────────────────────

def render(static: bool = False) -> str:
    with open(DATA, encoding="utf-8") as f:
        payload = json.load(f)
    stats = payload["stats"]
    weeks = iso_weeks(payload["days"])

    n_weeks = len(weeks)
    grid_w = n_weeks * (CELL + GAP) - GAP
    W = PAD_LEFT + grid_w + 34   # right margin so the "More" label never clips
    H = PAD_TOP + 7 * (CELL + GAP) + 36

    body = []
    for wi, week in enumerate(weeks):
        gx = PAD_LEFT + wi * (CELL + GAP)
        # outer <g> owns the position; inner <g class="wk"> owns the CSS
        # motion — a CSS transform would override the translate attribute
        # if they lived on the same node.
        body.append(f'<g transform="translate({gx},{PAD_TOP})">')
        cls = "" if static else ' class="wk" style="--i:%d"' % wi
        body.append(f"<g{cls}>") if cls else body.append("<g>")
        for di, count in enumerate(week):
            body.append(
                f'<rect class="c" x="0" y="{di * (CELL + GAP)}" '
                f'width="{CELL}" height="{CELL}" rx="2.5" '
                f'fill="{PALETTE[level_for(count)]}"/>'
            )
        body.append("</g></g>")

    # weekday labels — Monday / Wednesday / Friday rows only (GitHub style)
    labels = []
    for di, label in [(1, "Mo"), (3, "We"), (5, "Fr")]:
        labels.append(
            f'<text class="lb" x="{PAD_LEFT - 8}" y="{PAD_TOP + di * (CELL + GAP) + CELL}" '
            f'text-anchor="end">{label}</text>'
        )

    # legend, right-aligned under the grid
    legend_x = PAD_LEFT + grid_w - 5 * (CELL + GAP)
    legend = [f'<text class="lb" x="{legend_x - 42}" y="{H - 18}">Less</text>']
    for i, color in enumerate(PALETTE):
        legend.append(
            f'<rect x="{legend_x + i * (CELL + GAP)}" y="{H - 26}" width="{CELL}" '
            f'height="{CELL}" rx="2.5" fill="{color}"/>'
        )
    legend.append(
        f'<text class="lb" x="{legend_x + 5 * (CELL + GAP) + CELL + 5}" y="{H - 18}">More</text>'
    )

    days_total = len(payload["days"]) or 1
    footer = (
        f'<text class="ft" x="{PAD_LEFT}" y="{H - 18}">'
        f'{stats["total"]:,} contributions'
        f' · streak {stats["current_streak"]}d / longest {stats["longest_streak"]}d'
        f' · best day {stats["best_day"]["count"]}'
        f' · active {stats["active_days"]}/{days_total}d'
        f'</text>'
    )

    anim = ""
    if not static:
        anim = (
            f'.wk{{animation:rise .5s ease-out both;'
            f'animation-delay:calc(var(--i) * {WEEK_DELAY_MS}ms)}}'
            f'@keyframes rise{{from{{opacity:0;transform:translateY(5px)}}'
            f'to{{opacity:1;transform:none}}}}'
            f'@media (prefers-reduced-motion: reduce){{.wk{{animation:none}}}}'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="{FONT}">\n'
        f'<style>'
        f'.lb{{font-size:7.5px;fill:{FG_DIM}}}'
        f'.ft{{font-size:8px;fill:{FG_MAIN}}}'
        f'{anim}'
        f'</style>\n'
        f'<rect width="{W}" height="{H}" rx="8" fill="{BG}"/>\n'
        f'{"".join(body)}\n'
        f'{"".join(labels)}\n'
        f'{"".join(legend)}\n'
        f'{footer}\n'
        f'</svg>\n'
    )


if __name__ == "__main__":
    static = os.environ.get("STATIC") == "1"
    svg = render(static)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[render] wrote {OUT} ({len(svg)} bytes)")
