"""
make_info_card.py
─────────────────
Generate a neofetch-style SVG info card with role, stack,
and highlights. Each line fades/slides in on a stagger.
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "info-card.svg"

# ── Content ───────────────────────────────────────────────────
TITLE_USER = "tushar"
TITLE_HOST = "github"
LINES = [
    ("", "-" * 38),
    ("OS",        "B.Tech CSE (AI & ML) · KRMU"),
    ("Host",      "Gurugram, India"),
    ("Kernel",    "Computer Vision · ML · Agents"),
    ("Shell",     "Python · C++ · JavaScript"),
    ("DE",        "TensorFlow · OpenCV · FastAPI"),
    ("WM",        "React · Vite · Next.js"),
    ("Terminal",  "VS Code · Linux · Git"),
    ("Cloud",     "IBM Watsonx · Azure AI · AWS"),
    ("", ""),
    ("Now",       "AuraControl gesture engine"),
    ("Prev",      "NPU Fit Checker · go-bric"),
    ("Award",     "GO BRICS 1st Place"),
    ("Focus",     "CV -> Cloud AI -> Intelligent Systems"),
]

# Colors
BG       = "#0d1117"
BORDER   = "#1a1f2e"
USER_CLR = "#58a6ff"
HOST_CLR = "#f0883e"
KEY_CLR  = "#58a6ff"
VAL_CLR  = "#c9d1d9"
SEP_CLR  = "#484f58"
TITLE_CLR= "#8b949e"

FONT     = "'JetBrains Mono', 'Fira Code', monospace"
FSIZE    = 13
LINE_H   = 22
PAD_X    = 28
PAD_Y    = 28


def build():
    n_lines = len(LINES) + 1  # +1 for title
    width  = 490
    height = PAD_Y * 2 + n_lines * LINE_H + 10

    lines_svg = []
    y = PAD_Y + LINE_H

    # Title line: user@host
    delay = 0.3
    lines_svg.append(
        f'<g class="line" style="animation-delay:{delay:.2f}s">'
        f'<text x="{PAD_X}" y="{y}" font-family="{FONT}" font-size="{FSIZE}">'
        f'<tspan fill="{USER_CLR}">{TITLE_USER}</tspan>'
        f'<tspan fill="{SEP_CLR}">@</tspan>'
        f'<tspan fill="{HOST_CLR}">{TITLE_HOST}</tspan>'
        f'</text></g>'
    )
    y += LINE_H

    for key, val in LINES:
        delay += 0.08

        if key == "" and val.startswith("─"):
            # Separator
            lines_svg.append(
                f'<g class="line" style="animation-delay:{delay:.2f}s">'
                f'<text x="{PAD_X}" y="{y}" font-family="{FONT}" font-size="{FSIZE}" fill="{SEP_CLR}">'
                f'{val}</text></g>'
            )
        elif key == "" and val == "":
            # Empty line
            pass
        else:
            lines_svg.append(
                f'<g class="line" style="animation-delay:{delay:.2f}s">'
                f'<text x="{PAD_X}" y="{y}" font-family="{FONT}" font-size="{FSIZE}">'
                f'<tspan fill="{KEY_CLR}">{key}</tspan>'
                f'<tspan fill="{SEP_CLR}"> ~ </tspan>'
                f'<tspan fill="{VAL_CLR}">{val}</tspan>'
                f'</text></g>'
            )
        y += LINE_H

    # Color bar (neofetch-style)
    delay += 0.1
    colors = ["#f85149","#f0883e","#d29922","#3fb950","#58a6ff","#bc8cff","#f778ba","#8b949e"]
    bar_y = y + 4
    bar_svg = f'<g class="line" style="animation-delay:{delay:.2f}s">'
    for i, c in enumerate(colors):
        bx = PAD_X + i * 20
        bar_svg += f'<rect x="{bx}" y="{bar_y}" width="16" height="16" rx="3" fill="{c}" />'
    bar_svg += '</g>'

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <style>
    .line {{
      opacity: 0;
      transform: translateX(-12px);
      animation: fadein 0.4s ease-out forwards;
    }}
    @keyframes fadein {{
      to {{
        opacity: 1;
        transform: translateX(0);
      }}
    }}
  </style>
  <rect width="{width}" height="{height}" fill="{BG}" rx="8" stroke="{BORDER}" stroke-width="1" />
  {"".join(lines_svg)}
  {bar_svg}
</svg>'''

    OUT.write_text(svg)
    print(f"Wrote info card -> {OUT} ({width}x{height})")


if __name__ == "__main__":
    build()
