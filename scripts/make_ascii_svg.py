"""
make_ascii_svg.py
─────────────────
Convert a prepped grayscale image into a self-typing monochrome
ASCII art SVG. Each row wipes in left-to-right with a cursor,
staggered top-to-bottom. Plays once, then freezes.

Usage:
    python scripts/make_ascii_svg.py [source_image]

If no image is provided, generates a placeholder "TK" ASCII logo.
"""

import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "tushar-ascii.svg"

# ASCII density ramp: bright (sparse) → dark (dense)
RAMP = " .`:-=+*cs#%@"

# Monochrome color
CHAR_COLOR = "#c9d1d9"
BG_COLOR   = "#0d1117"
CURSOR_CLR = "#58a6ff"
FONT       = "'JetBrains Mono', 'Fira Code', monospace"

# Grid dimensions
COLS = 80
ROWS = 40


def image_to_ascii(img_path: str):
    """Convert an image to an ASCII grid using PIL."""
    try:
        from PIL import Image
        img = Image.open(img_path).convert("L")  # Grayscale
        img = img.resize((COLS, ROWS))
        pixels = list(img.getdata())

        grid = []
        for r in range(ROWS):
            row = ""
            for c in range(COLS):
                brightness = pixels[r * COLS + c]
                # Map brightness (0=black, 255=white) to ramp index
                idx = int(brightness / 255 * (len(RAMP) - 1))
                row += RAMP[idx]
            grid.append(row)
        return grid
    except ImportError:
        print("PIL not available, generating placeholder.")
        return None


def placeholder_ascii():
    """Generate a stylized 'TK' placeholder when no image is available."""
    art = [
        "                                                                                ",
        "                                                                                ",
        "         ████████╗██╗   ██╗███████╗██╗  ██╗ █████╗ ██████╗                      ",
        "         ╚══██╔══╝██║   ██║██╔════╝██║  ██║██╔══██╗██╔══██╗                     ",
        "            ██║   ██║   ██║███████╗███████║███████║██████╔╝                      ",
        "            ██║   ██║   ██║╚════██║██╔══██║██╔══██║██╔══██╗                      ",
        "            ██║   ╚██████╔╝███████║██║  ██║██║  ██║██║  ██║                      ",
        "            ╚═╝    ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝                   ",
        "                                                                                ",
        "         ██╗  ██╗ █████╗ ██████╗  ██████╗  ██████╗ ██████╗                      ",
        "         ██║ ██╔╝██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗██╔══██╗                     ",
        "         █████╔╝ ███████║██████╔╝██║   ██║██║   ██║██████╔╝                     ",
        "         ██╔═██╗ ██╔══██║██╔═══╝ ██║   ██║██║   ██║██╔══██╗                     ",
        "         ██║  ██╗██║  ██║██║     ╚██████╔╝╚██████╔╝██║  ██║                     ",
        "         ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝                   ",
        "                                                                                ",
        "                    ╔══════════════════════════════╗                             ",
        "                    ║  AI / ML  ·  Computer Vision ║                             ",
        "                    ║  Agents   ·  Systems Builder ║                             ",
        "                    ╚══════════════════════════════╝                             ",
        "                                                                                ",
    ]
    # Pad to standard size
    while len(art) < ROWS:
        art.append(" " * COLS)
    return [line.ljust(COLS)[:COLS] for line in art]


def render_svg(grid):
    """Render ASCII grid as an animated SVG with row-by-row typing."""
    char_w = 7.8   # monospace char width at font-size 11
    char_h = 15    # line height
    font_size = 11

    width  = int(COLS * char_w) + 20
    height = int(len(grid) * char_h) + 20
    pad_x  = 10
    pad_y  = 14

    rows_svg = []
    for r, line in enumerate(grid):
        y = pad_y + r * char_h
        delay = r * 0.06  # stagger each row

        # Escape XML entities
        escaped = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

        # Each row in a group that wipes in
        rows_svg.append(
            f'<g class="row" style="animation-delay:{delay:.2f}s">'
            f'<text x="{pad_x}" y="{y}" font-family="{FONT}" font-size="{font_size}" '
            f'fill="{CHAR_COLOR}" xml:space="preserve">{escaped}</text>'
            f'</g>'
        )

    total_anim_time = len(grid) * 0.06 + 1.0  # total animation duration

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <style>
    .row {{
      opacity: 0;
      animation: typerow 0.15s ease-out forwards;
    }}
    @keyframes typerow {{
      0%   {{ opacity: 0; clip-path: inset(0 100% 0 0); }}
      100% {{ opacity: 1; clip-path: inset(0 0% 0 0); }}
    }}
  </style>
  <rect width="{width}" height="{height}" fill="{BG_COLOR}" rx="8" />
  {"".join(rows_svg)}
</svg>'''

    OUT.write_text(svg, encoding="utf-8")
    print(f"Wrote ASCII SVG -> {OUT} ({width}x{height}, {len(grid)} rows)")


def main():
    grid = None

    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        if Path(img_path).exists():
            grid = image_to_ascii(img_path)

    if grid is None:
        print("No source image provided or PIL unavailable. Using placeholder.")
        grid = placeholder_ascii()

    render_svg(grid)


if __name__ == "__main__":
    main()
