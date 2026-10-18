# placeholder_portrait.py
# -------------------------
# Generates tushar-ascii.svg WITHOUT a photo — a procedural silhouette on
# the same 100×53 grid as the real pipeline, so the README layout can be
# previewed (and the daily README renders fine) until you supply a photo.
#
# ┌─ the moment you have your photo ─────────────────────────────────┐
# │  1. python scripts/prep_photo.py source-photo.jpg                 │
# │  2. python scripts/make_ascii_svg.py   (overwrites the placeholder)│
# └───────────────────────────────────────────────────────────────────┘

import os
import sys

BASE = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image, ImageDraw

from make_ascii_svg import OUT, build, glyphs


def synthetic_portrait() -> Image.Image:
    """Head + shoulders on a light field — dim enough to convert cleanly."""
    W, H = 600, 320
    img = Image.new("L", (W, H), 255)          # white field
    d = ImageDraw.Draw(img)

    # dark vignette frame so the subject reads as a single body
    d.rectangle([8, 8, W - 8, H - 8], outline=90, width=2)

    # shoulders — soft arc, darker
    d.ellipse([W * 0.18, H * 0.62, W * 0.82, H * 1.55], fill=70)

    # head — darker
    d.ellipse([W * 0.34, H * 0.10, W * 0.66, H * 0.78], fill=40)

    # subtle highlight on one cheek so CLAHE-style depth shows
    d.ellipse([W * 0.37, H * 0.26, W * 0.46, H * 0.42], fill=95)

    # faint scanline texture for the "terminal render" vibe
    for y in range(0, H, 6):
        d.line([(8, y), (W - 8, y)], fill=252, width=1)

    return img


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace") if hasattr(sys.stdout, "reconfigure") else None
    img = synthetic_portrait()
    static = os.environ.get("STATIC") == "1"
    svg = build(glyphs(img), static)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[ascii] placeholder portrait written -> {OUT}")
