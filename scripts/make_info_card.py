# make_info_card.py
# ------------------
# Hand-authors info-card.svg — a neofetch-style panel: title bar, then
# glowing key/value rows (Now, Prev, Stack, Focus, Cloud, Uni, Loc, Open to).
# Each line fades and slides in on a short stagger so the panel looks like
# it is printing next to the ASCII portrait.
#
# STATIC=1 emits a frozen frame for local previews.

import os
import sys
from datetime import date

BASE  = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
OUT   = os.path.join(BASE, "info-card.svg")

ROWS_N   = 8
W, PAD   = 520, 20
LINE_H   = 26
BODY_TOP = 46
H        = BODY_TOP + ROWS_N * LINE_H + 26

BG      = "#0f0f1a"
BEZEL   = "#1d1d3a"
BAR     = "#15152a"
FG      = "#e2e8f0"
KEY_A   = "#7b6cff"      # bright indigo — pushes past #4f46e5 for glow headroom
KEY_B   = "#22d3ee"
DIM     = "#64748b"
FONT    = "JetBrains Mono, ui-monospace, monospace"

# ── Content (edit freely, then re-run) ─────────────────────────────────

ROWS = [
    ("Now",     "AuraControl gesture engine · air-signature",     KEY_A),
    ("Prev",    "GO BRICS intern — 1st place · LoR",              KEY_B),
    ("Stack",   "Python · C++ · TS · React · FastAPI",            KEY_A),
    ("Focus",   "Computer Vision · ML · Agents",                  KEY_B),
    ("Cloud",   "IBM Watsonx · Azure AI",                         KEY_A),
    ("Uni",     "B.Tech CSE (AI & ML) · K.R. Mangalam",           KEY_B),
    ("Loc",     "Gurugram, India · UTC+5:30",                     KEY_A),
    ("Open to", "Internships · Hackathons · Research",            KEY_B),
]
TITLE = "tushar@github ~ $ neofetch"
FOOT  = f"calendar :: {date.today().strftime('%Y-%m')} · data local · zero external services"


def is_static() -> bool:
    return os.environ.get("STATIC") == "1"


def esc(text: str) -> str:
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;"))


def build() -> str:
    lines = []
    for i, (key, value, color) in enumerate(ROWS):
        y = BODY_TOP + i * LINE_H
        cls = "" if is_static() else f' class="row" style="--i:{i}"'
        lines.append(
            f'<text x="{PAD}" y="{y}"{cls}>'
            f'<tspan class="k" fill="{color}" font-weight="bold">{key:>8}</tspan>'
            f'<tspan fill="{DIM}"> → </tspan>'
            f'<tspan fill="{FG}">{esc(value)}</tspan></text>'
        )
    lines.append(f'<text class="dim" x="{PAD}" y="{H - 12}">{FOOT}</text>')

    body_h = ROWS_N * LINE_H + 18
    anim = "" if is_static() else (
        '.row{animation:print .38s ease-out both;'
        'animation-delay:calc(var(--i) * 70ms)}'
        '.k{text-shadow:0 0 9px rgba(123,108,255,.55),0 0 3px rgba(34,211,238,.35)}'
        '@keyframes print{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}'
        '@media (prefers-reduced-motion: reduce){.row{animation:none}.k{text-shadow:none}}'
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" font-family="{FONT}" font-size="12.5">\n'
        f'<defs>'
        f'<linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="#4f46e5"/>'
        f'<stop offset="1" stop-color="#22d3ee"/>'
        f'</linearGradient>'
        f'<filter id="glow" x="-40%" y="-40%" width="180%" height="180%">'
        f'<feGaussianBlur stdDeviation="2.2" result="b"/>'
        f'<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
        f'</filter>'
        f'</defs>\n'
        f'<style>'
        f'.dim{{font-size:9px;fill:{DIM}}}'
        f'{anim}'
        f'</style>\n'
        f'<rect width="{W}" height="{H}" rx="10" fill="{BG}" stroke="{BEZEL}"/>\n'
        f'<rect x="0" y="0" width="{W}" height="26" rx="10" fill="{BAR}"/>\n'
        f'<rect x="0" y="16" width="{W}" height="10" fill="{BAR}"/>\n'
        f'<circle cx="14" cy="13" r="4" fill="#ff5f57"/>'
        f'<circle cx="30" cy="13" r="4" fill="#febc2e"/>'
        f'<circle cx="46" cy="13" r="4" fill="#28c840"/>\n'
        f'<text x="{W / 2}" y="17" text-anchor="middle" fill="{DIM}" font-size="10">{TITLE}</text>\n'
        f'<rect x="0" y="{BODY_TOP - 12}" width="2.5" height="{body_h}" fill="url(#rail)" opacity="0.85" rx="1.2"/>\n'
        f'{chr(10).join(lines)}\n'
        f'</svg>\n'
    )


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace") if hasattr(sys.stdout, "reconfigure") else None
    svg = build()
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[card] wrote {OUT} ({len(svg)} bytes)")
