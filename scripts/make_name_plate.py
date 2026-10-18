# make_name_plate.py
# ------------------
# Generates tushar-ascii.svg as a terminal NAME PLATE — pixel-block art of
# "TUSHAR" / "KAPOOR" (5x7 font rendered as SVG rects, so it renders
# identically everywhere, no font dependency), printed row by row with a
# blinking cursor. Replaces the procedural photo-silhouette placeholder;
# when a real photo arrives, make_ascii_svg.py still overwrites this file.
#
# STATIC=1 emits a frozen frame for previews.

import os
import sys

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
OUT  = os.path.join(BASE, "tushar-ascii.svg")

W, H    = 340, 268
CELL    = 9     # pixel-cell size for the 5x7 font
ADVANCE = 6     # 5 cols + 1 space between letters

# ── 5x7 pixel font (only the letters we need) ──────────────────────────

FONT5x7 = {
    "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"],
    "S": ["01110","10001","10000","01110","00001","10001","01110"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"],
    "A": ["01110","10001","10001","11111","10001","10001","10001"],
    "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "K": ["10001","10010","10100","11000","10100","10010","10001"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"],
    "O": ["01110","10001","10001","10001","10001","10001","01110"],
}

WORD1, WORD2 = "TUSHAR", "KAPOOR"
C1, C2       = "#22d3ee", "#4f46e5"          # cyan / indigo pair, card-matched
ROLE         = "AI/ML \u00b7 CV \u00b7 AGENTS"

BG, BEZEL, DIM, FG = "#0f0f1a", "#1d1d3a", "#64748b", "#8b93a7"
FONT = "JetBrains Mono, ui-monospace, monospace"


def word_rows(word: str):
    """[(row_index 0..6, [(x_rel, y_rel) filled cells ...]) ...] for a word."""
    rows = []
    for r in range(7):
        cells = []
        for li, ch in enumerate(word):
            bitmap = FONT5x7[ch]
            for c, bit in enumerate(bitmap[r]):
                if bit == "1":
                    cells.append((li * ADVANCE * CELL + c * CELL, r * CELL))
        rows.append((r, cells))
    return rows


def word_fragment(word, y_top, fill, word_index, static):
    """Per-row <g> fragments for one word (each row is one print step)."""
    frags = []
    for r, cells in word_rows(word):
        i = word_index * 7 + r
        cls = "" if static else f' class="row" style="--i:{i}"'
        rects = "".join(
            f'<rect class="p" x="{x:.1f}" y="{y_top + y:.1f}" '
            f'width="{CELL}" height="{CELL}" rx="1.4" fill="{fill}"/>'
            for x, y in cells
        )
        frags.append(f'<g{cls}>{rects}</g>')
    width = len(word) * ADVANCE * CELL
    return frags, width


def build(static: bool = False) -> str:
    y1 = 48
    y2  = y1 + 7 * CELL + 16          # KAPOOR sits 16px below TUSHAR
    div_y = y2 + 7 * CELL + 22
    role_y = div_y + 32

    w1, w_w = word_fragment(WORD1, y1, C1, 0, static)
    w2, w2w = word_fragment(WORD2, y2, C2, 1, static)
    x_center = (W - max(w_w, w2w)) / 2

    role = (
        f'<text class="row" style="--i:16" x="{W/2}" y="{role_y}" '
        f'text-anchor="middle" fill="{FG}" font-size="12.5" '
        f'font-family="{FONT}">$ {ROLE}</text>'
        f'<rect class="cur" x="{W/2 + 80:.1f}" y="{role_y - 11}" '
        f'width="6.5" height="13" fill="{C1}"/>'
    )

    corner = (
        f'<text class="dim" x="16" y="26" font-family="{FONT}" font-size="8">\u007e/tushar-kapoor</text>'
        f'<text class="dim" x="{W-16}" y="26" text-anchor="end" font-family="{FONT}" font-size="8">profile \u00b7 live</text>'
    )

    anim = "" if static else (
        ".row{animation:print .34s ease-out both;"
        "animation-delay:calc(var(--i) * 48ms)}"
        ".cur{animation:blink 1.05s linear infinite;animation-delay:1.4s}"
        "@keyframes print{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}"
        "@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}"
        "@media (prefers-reduced-motion: reduce){.row,.cur{animation:none}}"
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}">\n'
        f'<defs>'
        f'<filter id="npg" x="-20%" y="-20%" width="140%" height="140%">'
        f'<feGaussianBlur stdDeviation="1.3" result="b"/>'
        f'<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
        f'</filter></defs>\n'
        f'<style>'
        f'.p{{shape-rendering:crispEdges}}'
        f'.dim{{fill:{DIM}}}'
        f'{anim}'
        f'</style>\n'
        f'<rect width="{W}" height="{H}" rx="12" fill="{BG}" stroke="{BEZEL}"/>\n'
        f'{corner}\n'
        f'<g filter="url(#npg)" transform="translate({x_center:.1f},0)">{"".join(w1)}</g>\n'
        f'<g filter="url(#npg)" transform="translate({x_center:.1f},0)">{"".join(w2)}</g>\n'
        f'<rect x="16" y="{div_y}" width="{W-32}" height="1.5" fill="{BEZEL}"/>\n'
        f'{role}\n'
        f'</svg>\n'
    )


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace") if hasattr(sys.stdout, "reconfigure") else None
    svg = build(os.environ.get("STATIC") == "1")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[plate] wrote {OUT} ({len(svg)} bytes)")
