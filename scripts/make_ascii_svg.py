# make_ascii_svg.py
# ------------------
# Converts source-prepped.png into tushar-ascii.svg — a one-color ASCII
# portrait that prints row by row (left→right wipe with a small block
# cursor riding the edge), staggered top to bottom, and then freezes.
#
# Design rules that keep it clean instead of noisy:
#   · monochrome — a single light-gray fill; per-char rainbow is what makes
#     most ASCII portraits read as static
#   · high contrast — busy backgrounds wash out to the space glyph
#
# Needs: pillow + numpy (both portrait-only; not in the daily workflow).

import os
import sys

import numpy as np
from PIL import Image

BASE  = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
SRC   = os.path.join(BASE, "source-prepped.png")
OUT   = os.path.join(BASE, "tushar-ascii.svg")

# bright (sparse) -> dark (dense); the leading space clears the background
RAMP        = " .`:-=+*cs#%@"
GRID_COLS   = 100
GRID_ROWS   = 53
FILL        = "#a3adc2"       # one color for every glyph
FONT        = "JetBrains Mono, ui-monospace, monospace"
FONT_SIZE   = 8.4
CHAR_W      = 5.0             # advance per column
LINE_H      = 8.6             # advance per row

ROW_DELAY_MS = 22              # stagger between rows
WIPE_MS      = 480             # duration of each row's left→right wipe


def glyphs(img: Image.Image):
    """Downsample to a character grid and map brightness → glyph."""
    small = img.resize((GRID_COLS, GRID_ROWS), Image.LANCZOS)
    arr = np.asarray(small, dtype=np.float32) / 255.0   # 0 = black .. 1 = white
    n = len(RAMP) - 1
    idx = np.clip(((1.0 - arr) * n).round().astype(int), 0, n)
    return [[RAMP[i] for i in row] for row in idx]


def build(rows, static: bool = False) -> str:
    W = GRID_COLS * CHAR_W
    H = GRID_ROWS * LINE_H
    anim = "" if static else (
        f'.row{{animation:wipe {WIPE_MS}ms linear both;'
        f'animation-delay:calc(var(--r) * {ROW_DELAY_MS}ms)}}'
        '@keyframes wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}'
        '@media (prefers-reduced-motion: reduce){.row{animation:none}}'
    )

    body = []
    for r, row in enumerate(rows):
        text = "".join(row)
        cls = "" if static else f' class="row" style="--r:{r}"'
        body.append(
            f'<text x="0" y="{(r + 1) * LINE_H:.1f}"{cls} '
            f'font-size="{FONT_SIZE}" font-family="{FONT}" fill="{FILL}" '
            f'textLength="{W:.1f}" lengthAdjust="spacing" '
            f'xml:space="preserve">{_esc(text)}</text>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
        f'viewBox="0 0 {W:.0f} {H:.0f}">\n'
        f'<style>{anim}</style>\n'
        f'<rect width="{W:.0f}" height="{H:.0f}" fill="#0f0f1a"/>\n'
        f'{chr(10).join(body)}\n'
        f'</svg>\n'
    )


def _esc(text: str) -> str:
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;"))


if __name__ == "__main__":
    if os.path.exists(SRC):
        img = Image.open(SRC)
        static = os.environ.get("STATIC") == "1"
        svg = build(glyphs(img), static)
        with open(OUT, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"[ascii] wrote {OUT} ({len(svg)} bytes)")
    else:
        print(f"[ascii] {SRC} not found — run scripts/prep_photo.py first "
              f"(or generate a placeholder: python scripts/placeholder_portrait.py)")
        sys.exit(1)
