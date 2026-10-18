"""
render_heatmap_svg.py
─────────────────────
Read data/contributions.json and render a GitHub-style
contribution heatmap as an animated SVG.

The grid uses a diagonal slide-in animation (CSS keyframes),
plays once on load, then freezes.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "contributions.json"
OUT  = ROOT / "contrib-heatmap.svg"

# GitHub-ish green palette (level 0 → 5)
PALETTE = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353", "#69f0a0"]
BG      = "#0d1117"
TEXT    = "#8b949e"
MUTED   = "#484f58"

CELL    = 13        # px
GAP     = 3         # px between cells
RADIUS  = 2         # corner radius
STEP    = CELL + GAP

WEEKS   = 53
DAYS    = 7

MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


def load():
    with open(DATA) as f:
        return json.load(f)


def build_grid(days):
    """Return a 53×7 grid of {date, count, level}."""
    grid = [[None]*DAYS for _ in range(WEEKS)]

    if not days:
        return grid

    from datetime import datetime, timedelta

    # Find the Sunday of the week containing the earliest date
    first = datetime.strptime(days[0]["date"], "%Y-%m-%d")
    # GitHub grid starts on Sunday
    start_offset = first.weekday()  # Monday=0 ... Sunday=6
    # Adjust to start on Sunday
    start = first - timedelta(days=(start_offset + 1) % 7)

    by_date = {d["date"]: d for d in days}

    for w in range(WEEKS):
        for d in range(DAYS):
            dt = start + timedelta(weeks=w, days=d)
            key = dt.strftime("%Y-%m-%d")
            if key in by_date:
                grid[w][d] = by_date[key]
            else:
                grid[w][d] = {"date": key, "count": 0, "level": 0}

    return grid, start


def render(data):
    grid, start = build_grid(data["days"])
    stats = data["stats"]

    PAD_LEFT   = 30    # for day-of-week labels
    PAD_TOP    = 22    # for month labels
    PAD_RIGHT  = 10
    PAD_BOTTOM = 48    # for legend + stats

    width  = PAD_LEFT + WEEKS * STEP + PAD_RIGHT
    height = PAD_TOP + DAYS * STEP + PAD_BOTTOM

    cells_svg = []
    month_labels_svg = []
    seen_months = set()

    for w in range(WEEKS):
        for d in range(DAYS):
            cell = grid[w][d]
            if cell is None:
                continue

            x = PAD_LEFT + w * STEP
            y = PAD_TOP + d * STEP
            level = min(cell["level"], len(PALETTE) - 1)
            color = PALETTE[level]

            # Diagonal delay for the slide-in animation
            delay = (w + d) * 0.012  # seconds

            cells_svg.append(
                f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="{RADIUS}" '
                f'fill="{color}" class="cell" '
                f'style="animation-delay:{delay:.3f}s">'
                f'<title>{cell["date"]}: {cell["count"]} contributions</title>'
                f'</rect>'
            )

            # Month labels
            from datetime import datetime
            dt = datetime.strptime(cell["date"], "%Y-%m-%d")
            month_key = f"{dt.year}-{dt.month}"
            if d == 0 and month_key not in seen_months:
                seen_months.add(month_key)
                month_labels_svg.append(
                    f'<text x="{x}" y="{PAD_TOP - 6}" fill="{TEXT}" '
                    f'font-size="10" font-family="monospace">'
                    f'{MONTH_LABELS[dt.month - 1]}</text>'
                )

    # Day-of-week labels
    day_labels = ["", "Mon", "", "Wed", "", "Fri", ""]
    day_labels_svg = []
    for i, label in enumerate(day_labels):
        if label:
            y = PAD_TOP + i * STEP + CELL - 2
            day_labels_svg.append(
                f'<text x="{PAD_LEFT - 6}" y="{y}" fill="{TEXT}" '
                f'font-size="9" font-family="monospace" text-anchor="end">'
                f'{label}</text>'
            )

    # Legend (Less → More)
    legend_y = PAD_TOP + DAYS * STEP + 16
    legend_x_start = width - PAD_RIGHT - len(PALETTE) * (CELL + 2) - 60
    legend_svg = [
        f'<text x="{legend_x_start}" y="{legend_y + 10}" fill="{TEXT}" '
        f'font-size="10" font-family="monospace">Less</text>'
    ]
    for i, color in enumerate(PALETTE):
        lx = legend_x_start + 32 + i * (CELL + 2)
        legend_svg.append(
            f'<rect x="{lx}" y="{legend_y}" width="{CELL}" height="{CELL}" '
            f'rx="{RADIUS}" fill="{color}" />'
        )
    legend_svg.append(
        f'<text x="{legend_x_start + 32 + len(PALETTE) * (CELL + 2) + 4}" '
        f'y="{legend_y + 10}" fill="{TEXT}" font-size="10" font-family="monospace">More</text>'
    )

    # Stats footer
    stats_svg = (
        f'<text x="{PAD_LEFT}" y="{legend_y + 10}" fill="{TEXT}" '
        f'font-size="11" font-family="monospace">'
        f'{stats["total"]:,} contributions in the last year'
        f'</text>'
    )

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <style>
    .cell {{
      opacity: 0;
      transform: translateY(-8px) scale(0.5);
      animation: reveal 0.3s ease-out forwards;
    }}
    @keyframes reveal {{
      to {{
        opacity: 1;
        transform: translateY(0) scale(1);
      }}
    }}
  </style>
  <rect width="{width}" height="{height}" fill="{BG}" rx="6" />
  {"".join(month_labels_svg)}
  {"".join(day_labels_svg)}
  {"".join(cells_svg)}
  {"".join(legend_svg)}
  {stats_svg}
</svg>'''

    OUT.write_text(svg)
    print(f"Wrote heatmap -> {OUT} ({width}x{height})")


def main():
    data = load()
    render(data)


if __name__ == "__main__":
    main()
