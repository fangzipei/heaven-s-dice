"""Generate the original vector art used by Heaven's Dice.

Everything is deterministic: running this script again produces the same
tables, dice cups and item medallions. No external art or fonts required.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABLES = ROOT / "assets" / "tables"
ROOMS = ROOT / "assets" / "rooms"
CUPS = ROOT / "assets" / "cups"
ITEMS = ROOT / "assets" / "items"

THEMES = {
    "wood": {
        "wall_a": "#19120c", "wall_b": "#070504", "wall_c": "#2b1c12",
        "table_a": "#7c4b2a", "table_b": "#4a2b18", "table_c": "#24130b",
        "edge": "#9a6138", "accent": "#e0a366", "glow": "#e7944f",
        "dark": "#160c07", "banner": "#5b2119", "moss": "#4c5731",
        "rune": "#f0c48a", "sigil": "rat",
    },
    "stone": {
        "wall_a": "#11181b", "wall_b": "#050809", "wall_c": "#1e2a2e",
        "table_a": "#637074", "table_b": "#3b4548", "table_c": "#181f21",
        "edge": "#87969a", "accent": "#a9cbd5", "glow": "#7bb4c7",
        "dark": "#0a0f10", "banner": "#314d55", "moss": "#526648",
        "rune": "#bde5ef", "sigil": "eye",
    },
    "iron": {
        "wall_a": "#17120f", "wall_b": "#060506", "wall_c": "#281d18",
        "table_a": "#697175", "table_b": "#32383b", "table_c": "#101416",
        "edge": "#9aa1a2", "accent": "#f08b51", "glow": "#ff6a31",
        "dark": "#08090a", "banner": "#6b2e17", "moss": "#3d4138",
        "rune": "#ffc089", "sigil": "hammer",
    },
    "gold": {
        "wall_a": "#21180b", "wall_b": "#090603", "wall_c": "#3b2a11",
        "table_a": "#a67c35", "table_b": "#67491b", "table_c": "#2d1f0b",
        "edge": "#d8ad55", "accent": "#ffdf8f", "glow": "#f6c45b",
        "dark": "#130c04", "banner": "#721f25", "moss": "#4b4126",
        "rune": "#fff0ba", "sigil": "crown",
    },
    "diamond": {
        "wall_a": "#0c1b24", "wall_b": "#03080c", "wall_c": "#143544",
        "table_a": "#6a9aa7", "table_b": "#315a68", "table_c": "#0e2630",
        "edge": "#a4e0eb", "accent": "#d0f8ff", "glow": "#78e4f4",
        "dark": "#041015", "banner": "#1d5867", "moss": "#2d5b63",
        "rune": "#e6fdff", "sigil": "star",
    },
}


def defs(t: dict, theme: str) -> str:
    return f"""
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{t['wall_c']}"/>
    <stop offset=".52" stop-color="{t['wall_a']}"/>
    <stop offset="1" stop-color="{t['wall_b']}"/>
  </linearGradient>
  <radialGradient id="wallGlow" cx=".5" cy=".52" r=".56">
    <stop offset="0" stop-color="{t['glow']}" stop-opacity=".34"/>
    <stop offset=".55" stop-color="{t['glow']}" stop-opacity=".07"/>
    <stop offset="1" stop-color="{t['glow']}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="table" x1=".16" y1="0" x2=".82" y2="1">
    <stop offset="0" stop-color="{t['table_a']}"/>
    <stop offset=".4" stop-color="{t['table_b']}"/>
    <stop offset="1" stop-color="{t['table_c']}"/>
  </linearGradient>
  <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{t['accent']}" stop-opacity=".26"/>
    <stop offset=".3" stop-color="{t['accent']}" stop-opacity=".03"/>
    <stop offset="1" stop-color="{t['accent']}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="edgeGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{t['edge']}"/>
    <stop offset="1" stop-color="{t['dark']}"/>
  </linearGradient>
  <radialGradient id="vignette" cx=".5" cy=".48" r=".72">
    <stop offset=".42" stop-color="#000" stop-opacity="0"/>
    <stop offset=".8" stop-color="#000" stop-opacity=".38"/>
    <stop offset="1" stop-color="#000" stop-opacity=".82"/>
  </radialGradient>
  <radialGradient id="torch" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="{t['glow']}" stop-opacity=".8"/>
    <stop offset=".3" stop-color="{t['glow']}" stop-opacity=".3"/>
    <stop offset="1" stop-color="{t['glow']}" stop-opacity="0"/>
  </radialGradient>
  <filter id="blur30" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="30"/>
  </filter>
  <filter id="blur12" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="12"/>
  </filter>
  <filter id="blur4" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="4"/>
  </filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="{sum(ord(c) for c in theme) % 97}" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer>
    <feBlend in="SourceGraphic" mode="overlay"/>
  </filter>
  <pattern id="woodgrain" width="180" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(2)">
    <path d="M0 20 C55 4 96 35 180 16 M0 52 C50 39 110 66 180 44 M0 81 C56 68 120 92 180 70"
          fill="none" stroke="#180c05" stroke-opacity=".22" stroke-width="2"/>
  </pattern>
  <pattern id="scale" width="34" height="30" patternUnits="userSpaceOnUse">
    <path d="M0 15 Q17 0 34 15 Q17 30 0 15Z" fill="none" stroke="#0b100c" stroke-opacity=".35" stroke-width="1.5"/>
  </pattern>
  <pattern id="facet" width="170" height="150" patternUnits="userSpaceOnUse">
    <path d="M0 0 L85 38 L170 0 M0 75 L85 112 L170 75 M0 150 L85 112 L170 150"
          fill="none" stroke="#d6fbff" stroke-opacity=".12" stroke-width="1.4"/>
  </pattern>
</defs>"""


def candles(t: dict, x: int, y: int, scale: float = 1.0) -> str:
    w = 16 * scale
    h = 58 * scale
    return f"""
<g transform="translate({x} {y}) scale({scale})">
  <circle cx="0" cy="-66" r="100" fill="url(#torch)" filter="url(#blur12)" opacity=".75"/>
  <path d="M-7 0 Q-13 -26 -4 -54 Q0 -62 5 -54 Q12 -26 7 0Z" fill="{t['accent']}" opacity=".22" filter="url(#blur4)"/>
  <rect x="{-w/2}" y="{-h}" width="{w}" height="{h}" rx="5" fill="#d6c6a2"/>
  <rect x="{-w/2}" y="{-h}" width="{w/3}" height="{h}" rx="3" fill="#fff2d0" opacity=".28"/>
  <ellipse cx="0" cy="{-h}" rx="{w*.55}" ry="4" fill="#f6e4bd"/>
  <path d="M0 {-h-30} C-11 {-h-15} -8 {-h-5} 0 {-h-2} C8 {-h-8} 10 {-h-18} 0 {-h-30}Z" fill="{t['glow']}"/>
  <path d="M0 {-h-21} C-4 {-h-13} -3 {-h-7} 0 {-h-5} C4 {-h-10} 4 {-h-16} 0 {-h-21}Z" fill="#fff8dc"/>
</g>"""


def sigil(t: dict, x: int, y: int, scale: float, kind: str) -> str:
    if kind == "rat":
        return f"""<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{t['rune']}" stroke-width="3" opacity=".6">
          <path d="M-48 22 Q-38 -22 0 -24 Q40 -20 48 24"/><path d="M-32 -6 L-34 -28 M32 -6 L34 -28"/>
          <circle cx="-37" cy="22" r="7"/><circle cx="37" cy="22" r="7"/><path d="M-14 6 L0 16 L14 6"/>
        </g>"""
    if kind == "eye":
        return f"""<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{t['rune']}" stroke-width="3" opacity=".58">
          <path d="M-54 0 Q0 -44 54 0 Q0 44 -54 0Z"/><circle cx="0" cy="0" r="14"/><path d="M0 -44 L0 -28 M0 28 L0 44"/>
        </g>"""
    if kind == "hammer":
        return f"""<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{t['rune']}" stroke-width="3" opacity=".6">
          <path d="M-38 -30 L38 -30 L30 -12 L-30 -12Z"/><path d="M0 -12 L0 48"/><path d="M-18 48 L18 48"/>
          <path d="M-48 10 L-30 0 M48 10 L30 0"/>
        </g>"""
    if kind == "crown":
        return f"""<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{t['rune']}" stroke-width="3" opacity=".65">
          <path d="M-50 28 L-42 -20 L-16 2 L0 -34 L16 2 L42 -20 L50 28Z"/>
          <path d="M-50 28 L50 28"/><circle cx="0" cy="-34" r="4" fill="{t['rune']}"/>
        </g>"""
    return f"""<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{t['rune']}" stroke-width="3" opacity=".65">
      <path d="M0 -58 L17 -20 L58 -18 L25 8 L35 48 L0 26 L-35 48 L-25 8 L-58 -18 L-17 -20Z"/>
    </g>"""


def wall(theme: str, t: dict, rng: random.Random) -> str:
    arches = ""
    for cx in (235, 800, 1365):
        arches += f"""
        <path d="M{cx-176} 395 L{cx-176} 195 Q{cx} 62 {cx+176} 195 L{cx+176} 395Z"
              fill="{t['dark']}" opacity=".5"/>
        <path d="M{cx-176} 395 L{cx-176} 195 Q{cx} 62 {cx+176} 195 L{cx+176} 395"
              fill="none" stroke="{t['edge']}" stroke-opacity=".13" stroke-width="5"/>"""
    banners = f"""
    <path d="M100 120 L250 120 L238 318 L175 278 L112 318Z" fill="{t['banner']}" opacity=".5"/>
    <path d="M1350 120 L1500 120 L1488 318 L1425 278 L1362 318Z" fill="{t['banner']}" opacity=".5"/>
    {sigil(t, 175, 190, .82, t['sigil'])}
    {sigil(t, 1425, 190, .82, t['sigil'])}"""
    candles_html = candles(t, 70, 420, .85) + candles(t, 1530, 420, .85)
    stars = ""
    if theme == "diamond":
        for _ in range(110):
            x, y = rng.randint(0, 1600), rng.randint(0, 430)
            r = rng.uniform(.5, 2.2)
            stars += f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="#d9fbff" opacity="{rng.uniform(.15,.8):.2f}"/>'
    if theme == "iron":
        sparks = ""
        for _ in range(34):
            x, y = rng.randint(0, 1600), rng.randint(0, 420)
            sparks += f'<circle cx="{x}" cy="{y}" r="{rng.uniform(.8,2.4):.1f}" fill="{t["glow"]}" opacity="{rng.uniform(.15,.65):.2f}"/>'
    else:
        sparks = ""
    return f"""
<rect width="1600" height="1000" fill="url(#wall)"/>
{stars}
<ellipse cx="800" cy="300" rx="700" ry="360" fill="url(#wallGlow)"/>
{arches}
<path d="M0 390 L1600 390 L1600 454 L0 454Z" fill="{t['dark']}" opacity=".6"/>
{banners}
{candles_html}
{sparks}
<path d="M0 0 L1600 0 L1600 250 Q800 330 0 250Z" fill="#000" opacity=".22"/>
"""


def tabletop(theme: str, t: dict, rng: random.Random) -> str:
    surface = "M-90 1000 L100 414 Q800 368 1500 414 L1690 1000Z"
    edge = "M100 414 Q800 368 1500 414 L1500 452 Q800 406 100 452Z"
    inner = ""
    # central inlay ring
    inner += f"""
    <ellipse cx="800" cy="690" rx="395" ry="188" fill="none" stroke="{t['accent']}" stroke-opacity=".17" stroke-width="3"/>
    <ellipse cx="800" cy="690" rx="370" ry="172" fill="none" stroke="{t['accent']}" stroke-opacity=".1" stroke-width="1.4"/>
    <ellipse cx="800" cy="690" rx="430" ry="206" fill="none" stroke="#000" stroke-opacity=".24" stroke-width="10"/>
    """
    if theme == "wood":
        for i in range(16):
            y = 440 + i * 34 + rng.uniform(-8, 8)
            inner += f'<path d="M-40 {y} Q500 {y-rng.uniform(2,16)} 1640 {y+rng.uniform(-8,8)}" stroke="#201007" stroke-opacity="{rng.uniform(.12,.32):.2f}" stroke-width="{rng.uniform(1,3):.1f}" fill="none"/>'
        for _ in range(10):
            x, y = rng.randint(80, 1520), rng.randint(440, 970)
            inner += f'<ellipse cx="{x}" cy="{y}" rx="{rng.randint(8,22)}" ry="{rng.randint(2,6)}" fill="none" stroke="#170b05" stroke-opacity=".3"/>'
        inner += f'<path d="M0 720 Q160 640 290 720 Q390 786 250 880 Q100 960 -20 890" fill="none" stroke="#1b0d06" stroke-opacity=".28" stroke-width="8"/>'
        inner += f'<path d="M1600 760 Q1460 690 1360 774 Q1290 856 1400 940" fill="none" stroke="#1b0d06" stroke-opacity=".24" stroke-width="6"/>'
        # spilled coins and bone
        inner += f"""
        <g transform="translate(1330 730) rotate(12)" opacity=".9">
          <ellipse cx="0" cy="0" rx="38" ry="14" fill="#b68a3d"/><ellipse cx="0" cy="-4" rx="38" ry="14" fill="#dcb762"/>
          <ellipse cx="0" cy="-4" rx="25" ry="8" fill="none" stroke="#6f4f1d" stroke-opacity=".7"/>
          <circle cx="-8" cy="-4" r="2.5" fill="#6f4f1d"/><circle cx="8" cy="-4" r="2.5" fill="#6f4f1d"/>
        </g>
        <g transform="translate(1278 754) rotate(-22)" opacity=".8">
          <ellipse cx="0" cy="0" rx="32" ry="12" fill="#9a722f"/><ellipse cx="0" cy="-3" rx="32" ry="12" fill="#cfa94e"/>
        </g>
        <g transform="translate(280 830) rotate(-9)" opacity=".5" fill="none" stroke="#d6c39b" stroke-width="7" stroke-linecap="round">
          <path d="M-60 0 L-18 -14 L16 12 L54 -2"/><circle cx="-66" cy="2" r="8"/><circle cx="60" cy="-4" r="7"/>
        </g>"""
    elif theme == "stone":
        for _ in range(14):
            x1, y1 = rng.randint(0, 1600), rng.randint(410, 990)
            pts = [(x1, y1)]
            for _ in range(rng.randint(2, 5)):
                pts.append((pts[-1][0] + rng.randint(-100, 100), pts[-1][1] + rng.randint(20, 80)))
            d = "M" + " L".join(f"{x} {y}" for x, y in pts)
            inner += f'<path d="{d}" fill="none" stroke="#0b1112" stroke-opacity="{rng.uniform(.2,.4):.2f}" stroke-width="{rng.uniform(1,3):.1f}"/>'
        for _ in range(28):
            x, y = rng.randint(0, 1600), rng.randint(430, 1000)
            rx, ry = rng.randint(12, 42), rng.randint(5, 15)
            inner += f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{t["moss"]}" opacity="{rng.uniform(.06,.2):.2f}"/>'
        inner += f"""
        <g transform="translate(260 760)" fill="none" stroke="{t['accent']}" stroke-opacity=".25" stroke-width="2">
          <path d="M0 -70 L50 -10 L15 0 L42 64 L-28 18 L-4 2Z"/>
        </g>
        <g transform="translate(1338 700)" fill="#8aa4a8" opacity=".22">
          <path d="M-38 0 L-20 -52 L18 -44 L40 2 L10 22Z"/><path d="M20 -42 L52 -30 L58 0 L32 -4Z"/>
        </g>"""
    elif theme == "iron":
        for i in range(7):
            x = 100 + i * 230
            inner += f'<path d="M{x} 420 L{x-38} 1000" stroke="#0b0c0d" stroke-opacity=".5" stroke-width="5"/>'
        for i in range(6):
            y = 492 + i * 92
            inner += f'<path d="M-30 {y} L1630 {y-8}" stroke="#0c0d0e" stroke-opacity=".38" stroke-width="3"/>'
        for _ in range(70):
            x, y = rng.randint(40, 1560), rng.randint(440, 980)
            inner += f'<circle cx="{x}" cy="{y}" r="{rng.uniform(2,4.4):.1f}" fill="#a2a7a8" opacity="{rng.uniform(.15,.4):.2f}"/>'
            inner += f'<circle cx="{x-1}" cy="{y-1}" r="1" fill="#e8e8e6" opacity=".3"/>'
        # molten cracks
        inner += f"""
        <g fill="none" stroke="{t['glow']}" stroke-linecap="round" filter="url(#blur4)" opacity=".5">
          <path d="M170 510 L260 600 L220 690 L330 790" stroke-width="4"/>
          <path d="M1300 530 L1220 620 L1280 704 L1180 840" stroke-width="3"/>
          <path d="M760 940 L810 870 L780 806" stroke-width="2"/>
        </g>
        <g fill="none" stroke="{t['accent']}" stroke-linecap="round" opacity=".42">
          <path d="M170 510 L260 600 L220 690 L330 790" stroke-width="1.4"/>
          <path d="M1300 530 L1220 620 L1280 704 L1180 840" stroke-width="1.2"/>
        </g>
        <g transform="translate(1370 820)" fill="none" stroke="#2b2d2e" stroke-width="12" stroke-linecap="round">
          <path d="M0 0 C-40 -22 -26 -82 20 -78 C60 -72 56 -24 24 -18 C-6 -12 -18 20 8 36"/>
        </g>"""
    elif theme == "gold":
        # ornate filigree
        inner += f"""
        <g fill="none" stroke="{t['accent']}" stroke-opacity=".32">
          <path d="M225 460 C120 550 130 680 250 730 C360 776 330 900 210 950" stroke-width="3"/>
          <path d="M1375 460 C1480 550 1470 680 1350 730 C1240 776 1270 900 1390 950" stroke-width="3"/>
          <path d="M330 520 C270 580 300 640 380 650 C460 660 460 740 380 760" stroke-width="1.5"/>
          <path d="M1270 520 C1330 580 1300 640 1220 650 C1140 660 1140 740 1220 760" stroke-width="1.5"/>
        </g>
        <g fill="none" stroke="#f8dda0" stroke-opacity=".18" stroke-width="1">
          <path d="M800 478 L870 620 L800 748 L730 620Z"/><path d="M800 500 L850 620 L800 720 L750 620Z"/>
          <circle cx="800" cy="620" r="18"/>
        </g>
        <g transform="translate(320 760)">
          <path d="M-36 -44 L36 -44 L28 52 L-28 52Z" fill="#5c1f25" stroke="#d7ae53" stroke-width="3"/>
          <path d="M-30 -44 Q-30 -76 0 -76 Q30 -76 30 -44" fill="none" stroke="#d7ae53" stroke-width="4"/>
          <ellipse cx="0" cy="-44" rx="36" ry="10" fill="#8c2b30" stroke="#e1bb64" stroke-width="2"/>
          <path d="M-20 -10 Q0 8 20 -10" stroke="#e1bb64" fill="none" stroke-width="2"/>
        </g>
        <g transform="translate(1310 800)" opacity=".85">
          <ellipse cx="0" cy="0" rx="64" ry="22" fill="#6d4a14"/><ellipse cx="0" cy="-6" rx="64" ry="22" fill="#e2b75a"/>
          <ellipse cx="0" cy="-6" rx="44" ry="13" fill="none" stroke="#8a611e" stroke-opacity=".7"/>
          <g fill="#8a611e"><circle cx="-20" cy="-6" r="3"/><circle cx="0" cy="-10" r="3"/><circle cx="20" cy="-6" r="3"/></g>
        </g>"""
    else:  # diamond
        inner += f'<path d="{surface}" fill="url(#facet)" opacity=".9"/>'
        for _ in range(22):
            x1, y1 = rng.randint(30, 1570), rng.randint(430, 980)
            x2, y2 = x1 + rng.randint(-230, 230), y1 + rng.randint(-100, 150)
            inner += f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#d8fbff" stroke-opacity="{rng.uniform(.05,.18):.2f}" stroke-width="1"/>'
        inner += f"""
        <g opacity=".5" fill="none" stroke="#d8fbff" stroke-width="1.2">
          <path d="M260 560 L340 500 L420 570 L350 660 Z"/><path d="M1240 560 L1320 500 L1400 570 L1330 660 Z"/>
          <path d="M650 900 L720 830 L790 900 L720 970 Z"/>
        </g>
        <g fill="#d6fbff" opacity=".35">
          <path d="M1330 470 L1344 520 L1392 534 L1344 550 L1330 600 L1316 550 L1268 534 L1316 520Z"/>
          <path d="M280 470 L288 500 L318 508 L288 516 L280 546 L272 516 L242 508 L272 500Z"/>
        </g>"""
    return f"""
<path d="M100 414 Q800 368 1500 414 L1690 1000 L-90 1000Z" fill="#000" opacity=".4" transform="translate(0 22)"/>
<path d="{edge}" fill="url(#edgeGrad)"/>
<path d="M100 452 Q800 406 1500 452 L1500 484 Q800 438 100 484Z" fill="#000" opacity=".34"/>
<path d="{surface}" fill="url(#table)"/>
<path d="{surface}" fill="url(#topGlow)"/>
<path d="{surface}" fill="url(#woodgrain)" opacity="{'.75' if theme == 'wood' else '0'}"/>
<path d="{surface}" fill="url(#scale)" opacity="{'.6' if theme == 'serpent' else '0'}"/>
<path d="{surface}" fill="url(#facet)" opacity="{'.8' if theme == 'diamond' else '0'}"/>
{inner}
<!-- front rim -->
<path d="M-90 1000 L100 498 Q800 452 1500 498 L1690 1000 L1660 1000 L1490 520 Q800 474 110 520 L-60 1000Z"
      fill="{t['edge']}" opacity=".65"/>
<path d="M-40 1000 L108 520 Q800 474 1492 520 L1640 1000" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="18"/>
"""


def table_svg(theme: str) -> str:
    t = THEMES[theme]
    rng = random.Random(theme)
    motes = ""
    for _ in range(48):
        x, y = rng.randint(0, 1600), rng.randint(80, 950)
        motes += f'<circle cx="{x}" cy="{y}" r="{rng.uniform(.5,1.8):.1f}" fill="{t["accent"]}" opacity="{rng.uniform(.04,.22):.2f}"/>'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
{defs(t, theme)}
{wall(theme, t, rng)}
{tabletop(theme, t, rng)}
{motes}
<rect width="1600" height="1000" fill="url(#vignette)"/>
<rect y="850" width="1600" height="150" fill="#000" opacity=".24"/>
</svg>
"""


def room_svg(theme: str) -> str:
    """Wall-only backdrop used as the back plane of the CSS 3D room."""
    t = THEMES[theme]
    rng = random.Random(theme + "-room")
    motes = ""
    for _ in range(34):
        x, y = rng.randint(0, 1600), rng.randint(60, 700)
        motes += f'<circle cx="{x}" cy="{y}" r="{rng.uniform(.5,1.7):.1f}" fill="{t["accent"]}" opacity="{rng.uniform(.04,.2):.2f}"/>'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="760" viewBox="0 0 1600 760" preserveAspectRatio="xMidYMid slice">
{defs(t, theme + '-room')}
{wall(theme, t, rng)}
{motes}
<rect width="1600" height="760" fill="url(#vignette)"/>
<path d="M0 710 L1600 710 L1600 760 L0 760Z" fill="#000" opacity=".5"/>
</svg>
"""


# ── Dice cups ───────────────────────────────────────────────────────────────

CUPS_THEMES = {
    "oak": dict(body="#5b3922", body2="#2a180c", rim="#c19057", band="#26201a", accent="#d9a96f", emblem="wolf"),
    "lead": dict(body="#4b4f52", body2="#1d2022", rim="#aeb2b0", band="#141617", accent="#d7d9d4", emblem="heart"),
    "serpent": dict(body="#2f5b42", body2="#10251a", rim="#a9c486", band="#31251a", accent="#d4c07b", emblem="serpent"),
    "astral": dict(body="#273255", body2="#0c1126", rim="#b9c7f0", band="#161a2b", accent="#dbe6ff", emblem="star"),
    "pentagram": dict(body="#3a2320", body2="#160b09", rim="#c98b62", band="#1d1210", accent="#e3b087", emblem="pentagram"),
    "vortex": dict(body="#16434b", body2="#071a1f", rim="#91d8df", band="#0c252a", accent="#b9f7fb", emblem="vortex"),
}


def cup_emblem(kind: str, accent: str) -> str:
    if kind == "wolf":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.4" opacity=".8">
          <path d="M-18 12 L-22 -18 L-7 -7 L0 -24 L7 -7 L22 -18 L18 12 Q0 26 -18 12Z"/>
          <path d="M-9 2 L-3 6 M9 2 L3 6"/><path d="M-6 12 L0 8 L6 12"/>
        </g>"""
    if kind == "heart":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.5" opacity=".75">
          <path d="M0 19 C-32 -2 -20 -25 0 -12 C20 -25 32 -2 0 19Z"/><path d="M0 -6 L0 9"/>
        </g>"""
    if kind == "serpent":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.4" opacity=".8">
          <path d="M-20 18 C-2 12 10 14 15 2 C19 -8 6 -14 -3 -8 C-13 -1 -7 12 5 12 C18 12 24 2 19 -9"/>
          <circle cx="19" cy="-9" r="2.5" fill="{accent}"/><path d="M21 -11 L28 -16 M21 -8 L28 -4"/>
        </g>"""
    if kind == "star":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2" opacity=".85">
          <path d="M0 -24 L7 -7 L25 -6 L11 6 L15 24 L0 14 L-15 24 L-11 6 L-25 -6 L-7 -7Z"/>
          <circle cx="0" cy="0" r="3" fill="{accent}"/>
        </g>"""
    if kind == "pentagram":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2" opacity=".85">
          <circle cx="0" cy="0" r="24"/><path d="M0 -24 L14 19 L-23 -8 L23 -8 L-14 19Z"/>
        </g>"""
    return f"""<g fill="none" stroke="{accent}" stroke-width="2.2" opacity=".8">
      <path d="M0 22 C-26 12 -23 -10 -8 -17 C0 -21 8 -19 14 -12 C23 -2 17 14 0 22Z"/>
      <path d="M0 22 C1 8 3 -4 8 -12 M-3 8 C3 4 9 4 14 8 M0 -4 C-5 -8 -10 -7 -14 -3"/>
    </g>"""


def cup_svg(kind: str) -> str:
    c = CUPS_THEMES[kind]
    pattern = ""
    if kind == "oak":
        pattern = '<path d="M-34 -30 C-12 -42 18 -22 34 -34 M-36 8 C-8 -4 12 12 38 -2 M-34 46 C-8 32 16 52 36 40" fill="none" stroke="#1b0d05" stroke-opacity=".45" stroke-width="2"/>'
    elif kind == "serpent":
        pattern = '<path d="M-38 -36 Q-16 -16 0 -36 Q16 -56 38 -36 M-40 6 Q-18 26 0 6 Q18 -14 40 6 M-38 46 Q-16 66 0 46 Q16 26 38 46" fill="none" stroke="#0a1a12" stroke-opacity=".65" stroke-width="2"/>'
    elif kind == "astral":
        pattern = '<g fill="#f4f7ff" opacity=".8"><circle cx="-24" cy="-30" r="1.8"/><circle cx="12" cy="-48" r="1.1"/><circle cx="27" cy="-6" r="1.6"/><circle cx="-12" cy="26" r="1.2"/><circle cx="18" cy="48" r="1.7"/></g><path d="M-24 -30 L12 -48 L27 -6 L-12 26 L18 48 M-24 -30 L-12 26" fill="none" stroke="#e8efff" stroke-opacity=".3" stroke-width="1"/>'
    elif kind == "pentagram":
        pattern = '<path d="M-30 -32 L30 -32 M-34 10 L34 10 M-30 50 L30 50" stroke="#0f0705" stroke-opacity=".5" stroke-width="2"/>'
    elif kind == "vortex":
        pattern = '<path d="M0 -48 C26 -44 45 -20 43 4 C41 32 18 54 -8 50 C-34 46 -48 22 -40 -2 C-32 -24 -10 -34 8 -26 C23 -19 25 2 14 12 C4 21 -12 16 -14 2" fill="none" stroke="#bffaff" stroke-opacity=".35" stroke-width="2.4"/>'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <defs>
    <linearGradient id="cupBody" x1=".2" y1="0" x2=".8" y2="1">
      <stop offset="0" stop-color="{c['body']}"/>
      <stop offset=".52" stop-color="{c['body2']}"/>
      <stop offset="1" stop-color="{c['body']}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{c['rim']}"/><stop offset=".45" stop-color="{c['accent']}"/>
      <stop offset="1" stop-color="{c['body2']}"/>
    </linearGradient>
    <radialGradient id="cupShadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".65"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <ellipse cx="122" cy="262" rx="84" ry="22" fill="url(#cupShadow)"/>
  <ellipse cx="120" cy="208" rx="58" ry="14" fill="#000" opacity=".32"/>
  <path d="M58 54 Q56 70 62 92 L84 226 Q90 246 120 246 Q150 246 156 226 L178 92 Q184 70 182 54Z" fill="url(#cupBody)" stroke="#0c0907" stroke-width="2"/>
  <path d="M73 60 Q71 84 78 104 L98 222 Q104 233 120 233 L120 64Z" fill="#fff" opacity=".06"/>
  {pattern}
  <ellipse cx="120" cy="54" rx="62" ry="18" fill="url(#rim)" stroke="#0a0705" stroke-width="2"/>
  <ellipse cx="120" cy="54" rx="50" ry="12" fill="#080604"/>
  <ellipse cx="120" cy="51" rx="44" ry="8" fill="{c['accent']}" opacity=".12"/>
  <path d="M62 92 Q120 106 178 92" fill="none" stroke="{c['band']}" stroke-width="13"/>
  <path d="M62 92 Q120 106 178 92" fill="none" stroke="{c['rim']}" stroke-opacity=".5" stroke-width="2"/>
  <path d="M85 216 Q120 228 155 216" fill="none" stroke="{c['band']}" stroke-width="10"/>
  <path d="M85 216 Q120 228 155 216" fill="none" stroke="{c['rim']}" stroke-opacity=".38" stroke-width="1.5"/>
  <g transform="translate(120 154)">{cup_emblem(c['emblem'], c['accent'])}</g>
  <circle cx="120" cy="154" r="36" fill="{c['accent']}" opacity=".06" filter="url(#softGlow)"/>
  <path d="M68 118 Q72 172 94 220" fill="none" stroke="#fff" stroke-opacity=".11" stroke-width="3"/>
  <path d="M170 106 Q166 164 148 216" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="5"/>
  <g fill="{c['accent']}" opacity=".4"><circle cx="58" cy="54" r="2"/><circle cx="182" cy="54" r="2"/></g>
</svg>
"""


# ── Item medallions ─────────────────────────────────────────────────────────

ITEM_ICONS = {
    "coin": '<circle cx="0" cy="0" r="24" fill="none" stroke="#f5d279" stroke-width="3"/><path d="M-12 -8 L-8 -18 L0 -10 L8 -18 L12 -8 L10 12 L-10 12Z" fill="none" stroke="#f5d279" stroke-width="2"/><path d="M-10 17 L10 17" stroke="#f5d279" stroke-width="2"/>',
    "bottle": '<path d="M-8 -25 L8 -25 L8 -10 L18 4 L16 24 L-16 24 L-18 4 L-8 -10Z" fill="none" stroke="#f0a273" stroke-width="2.5"/><path d="M-16 8 L16 8 L14 23 L-14 23Z" fill="#a83e3e" opacity=".65"/><path d="M-9 -25 L-9 -32 L9 -32 L9 -25" fill="none" stroke="#f0a273" stroke-width="2"/><circle cx="-6" cy="14" r="2" fill="#ffd7b8"/><circle cx="5" cy="18" r="1.5" fill="#ffd7b8"/>',
    "eye": '<path d="M-30 0 Q0 -25 30 0 Q0 25 -30 0Z" fill="none" stroke="#e8a06a" stroke-width="2.5"/><circle cx="0" cy="0" r="9" fill="none" stroke="#e8a06a" stroke-width="2"/><circle cx="0" cy="0" r="3" fill="#e8a06a"/><path d="M0 -25 L0 -36 M0 25 L0 36 M-30 0 L-42 0 M30 0 L42 0" stroke="#e8a06a" stroke-width="1.5" opacity=".7"/>',
    "glove": '<path d="M-18 24 L-22 -4 Q-22 -10 -16 -10 Q-11 -10 -10 -4 L-8 -18 Q-7 -24 -1 -24 Q5 -24 6 -18 L8 -8 Q9 -16 15 -15 Q21 -14 20 -7 L17 10 L12 24Z" fill="none" stroke="#d8b3de" stroke-width="2.3"/><path d="M-8 10 L8 10 M-9 16 L9 16" stroke="#d8b3de" stroke-width="1.2" opacity=".6"/>',
    "smoke": '<circle cx="-7" cy="12" r="15" fill="none" stroke="#b6c4c9" stroke-width="2.5"/><path d="M4 2 L16 -24" stroke="#b6c4c9" stroke-width="2"/><path d="M18 -27 C8 -34 20 -42 28 -34 C40 -44 50 -28 40 -20 C50 -12 36 -4 28 -10" fill="none" stroke="#b6c4c9" stroke-width="2" opacity=".75"/><path d="M4 -2 L10 -10" stroke="#f2c46d" stroke-width="2"/>',
    "amulet": '<path d="M-22 -30 Q-18 4 0 12 Q18 4 22 -30" fill="none" stroke="#e8c371" stroke-width="2"/><path d="M0 10 L18 30 L0 50 L-18 30Z" fill="none" stroke="#e8c371" stroke-width="2.5"/><path d="M-8 31 Q0 23 8 31 Q0 40 -8 31Z" fill="none" stroke="#e8c371" stroke-width="1.8"/><circle cx="0" cy="31" r="2" fill="#e8c371"/>',
    "hourglass": '<path d="M-18 -28 L18 -28 M-18 28 L18 28 M-14 -28 L-14 -14 Q-14 -2 0 2 Q14 -2 14 -14 L14 -28 M-14 28 L-14 14 Q-14 2 0 -2 Q14 2 14 14 L14 28" fill="none" stroke="#e4bc75" stroke-width="2.2"/><path d="M-9 18 L0 10 L9 18Z" fill="#e4bc75"/><path d="M-7 -20 Q0 -14 7 -20" fill="none" stroke="#e4bc75" opacity=".7" stroke-width="2"/>',
    "dagger": '<path d="M0 -36 L7 -12 L3 14 L-3 14 L-7 -12Z" fill="none" stroke="#d9bcc3" stroke-width="2"/><path d="M-16 10 L16 10 M0 14 L0 34" stroke="#d9bcc3" stroke-width="2.5"/><path d="M0 34 L-5 27 L0 20 L5 27Z" fill="#a83737"/><path d="M10 -4 C18 6 12 16 5 18" fill="none" stroke="#a83737" stroke-width="2"/>',
    "pouch": '<path d="M-24 18 Q-30 -8 -12 -14 L-6 -24 L6 -24 L12 -14 Q30 -8 24 18 Q18 36 0 36 Q-18 36 -24 18Z" fill="none" stroke="#d9b56f" stroke-width="2.4"/><path d="M-12 -14 Q0 -4 12 -14" fill="none" stroke="#d9b56f" stroke-width="2"/><circle cx="-8" cy="8" r="6" fill="none" stroke="#d9b56f" stroke-width="1.5"/><circle cx="9" cy="16" r="4" fill="none" stroke="#d9b56f" stroke-width="1.5"/>',
    "cuff": '<path d="M-28 -20 L22 -20 L28 20 L-22 20Z" fill="none" stroke="#eac66f" stroke-width="2.4"/><circle cx="4" cy="0" r="12" fill="none" stroke="#eac66f" stroke-width="2.4"/><path d="M-6 -6 Q4 -12 14 -6 Q4 0 -6 -6Z" fill="#eac66f"/><path d="M-24 12 L18 12" stroke="#eac66f" stroke-width="1" opacity=".6"/>',
}


def item_svg(item_id: str, color: str, icon: str) -> str:
    body = ITEM_ICONS[icon]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".42" r=".62">
      <stop offset="0" stop-color="{color}" stop-opacity=".28"/>
      <stop offset="1" stop-color="#0b0907" stop-opacity=".96"/>
    </radialGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <circle cx="60" cy="60" r="53" fill="url(#bg)" stroke="{color}" stroke-opacity=".5" stroke-width="1.5"/>
  <circle cx="60" cy="60" r="45" fill="none" stroke="{color}" stroke-opacity=".18" stroke-width="1"/>
  <circle cx="60" cy="60" r="48" fill="none" stroke="{color}" stroke-opacity=".12" stroke-width="6" stroke-dasharray="1 7"/>
  <g transform="translate(60 58) scale(1.15)">{body}</g>
  <path d="M22 88 Q60 108 98 88" fill="none" stroke="{color}" stroke-opacity=".22" stroke-width="1"/>
</svg>
"""


def main() -> None:
    for path in (TABLES, ROOMS, CUPS, ITEMS):
        path.mkdir(parents=True, exist_ok=True)
    for theme in THEMES:
        (TABLES / f"{theme}.svg").write_text(table_svg(theme), encoding="utf-8")
        (ROOMS / f"{theme}.svg").write_text(room_svg(theme), encoding="utf-8")
    for kind in CUPS_THEMES:
        (CUPS / f"{kind}.svg").write_text(cup_svg(kind), encoding="utf-8")
    items = {
        "coin": ("#f2c76a", "coin"), "bottle": ("#d9825f", "bottle"),
        "eye": ("#e5a06c", "eye"), "glove": ("#c69bd1", "glove"),
        "smoke": ("#aebfc5", "smoke"), "amulet": ("#e5bd62", "amulet"),
        "hourglass": ("#e2bb72", "hourglass"), "dagger": ("#c47b83", "dagger"),
        "pouch": ("#d4ae68", "pouch"), "cuff": ("#e7c471", "cuff"),
    }
    for item_id, (color, icon) in items.items():
        (ITEMS / f"{item_id}.svg").write_text(item_svg(item_id, color, icon), encoding="utf-8")
    print(f"Generated {len(THEMES)} tables, {len(CUPS_THEMES)} cups, {len(items)} item icons.")


if __name__ == "__main__":
    main()
