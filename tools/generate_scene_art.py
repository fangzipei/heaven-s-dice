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

# Cups are drawn in their resting pose: inverted, mouth sealed against the
# table, closed end up - exactly how a dealer parks the cup between throws.
CUPS_THEMES = {
    "oak": dict(body="#6a4526", body2="#2b1a0d", rim="#c79758", band="#2a1d12", accent="#e6bb7c", emblem="wolf", finish="wood"),
    "lead": dict(body="#565c60", body2="#1a1e20", rim="#b9bdba", band="#121517", accent="#dfe3e0", emblem="heart", finish="metal"),
    "serpent": dict(body="#33624a", body2="#10261b", rim="#b3cf8d", band="#2b2114", accent="#e0cf85", emblem="serpent", finish="leather"),
    "astral": dict(body="#2c3a63", body2="#0d1230", rim="#c6d2f7", band="#171c30", accent="#e6eeff", emblem="star", finish="arcane"),
    "wolf-totem": dict(body="#6b4022", body2="#221407", rim="#e8a768", band="#2b1a0f", accent="#f8bf84", emblem="wolf", finish="leather"),
    "raven-totem": dict(body="#3a4862", body2="#131a2b", rim="#a8c9e2", band="#1d2436", accent="#c6e4f6", emblem="feather", finish="leather"),
    "demon-totem": dict(body="#4a2231", body2="#160a12", rim="#d1798f", band="#241018", accent="#f7a9bd", emblem="demon", finish="leather"),
    "pentagram": dict(body="#452a25", body2="#180c09", rim="#d8a072", band="#1f1310", accent="#f0c497", emblem="pentagram", finish="metal"),
    "vortex": dict(body="#1a4d57", body2="#071c22", rim="#9ee2ea", band="#0d2a31", accent="#c9fbfd", emblem="vortex", finish="arcane"),
}


def _rgb(color: str) -> tuple:
    c = color.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _hex(channels: tuple) -> str:
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in channels)


def mix(a: str, b: str, t: float) -> str:
    ca, cb = _rgb(a), _rgb(b)
    return _hex(tuple(ca[i] + (cb[i] - ca[i]) * t for i in range(3)))


def lighten(color: str, t: float) -> str:
    return mix(color, "#ffffff", t)


def darken(color: str, t: float) -> str:
    return mix(color, "#000000", t)


def cup_emblem(kind: str, accent: str) -> str:
    if kind == "wolf":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.4" opacity=".8">
          <path d="M-18 12 L-22 -18 L-7 -7 L0 -24 L7 -7 L22 -18 L18 12 Q0 26 -18 12Z"/>
          <path d="M-9 2 L-3 6 M9 2 L3 6"/><path d="M-6 12 L0 8 L6 12"/>
        </g>"""
    if kind == "feather":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.2" opacity=".82">
          <path d="M0 22 C-16 8 -18 -12 -6 -22 C4 -30 16 -26 20 -14 C24 -1 12 12 0 22Z"/>
          <path d="M0 22 C-2 6 -1 -8 4 -18 M-6 8 C0 4 7 4 12 9 M-4 -4 C-8 -8 -13 -8 -16 -4"/>
        </g>"""
    if kind == "demon":
        return f"""<g fill="none" stroke="{accent}" stroke-width="2.4" opacity=".85">
          <path d="M-20 -10 C-26 -26 -12 -30 -6 -18 C-3 -24 3 -24 6 -18 C12 -30 26 -26 20 -10"/>
          <path d="M-16 6 C-8 -6 8 -6 16 6 C10 20 -10 20 -16 6Z"/>
          <path d="M-7 7 L-3 11 M7 7 L3 11"/><path d="M-9 16 C-4 20 4 20 9 16"/>
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
    finish = c["finish"]
    body, body2, rim = c["body"], c["body2"], c["rim"]
    accent, band = c["accent"], c["band"]
    hi = lighten(body, .30)
    deep = darken(body2, .38)
    edge = darken(body2, .62)
    cavity = darken(body2, .72)

    # Silhouette: tapered wall standing on its mouth, closed end facing up.
    # Mouth 128 wide, wall ~176 tall, closed cap 92 wide -> readable dice cup.
    silhouette = "M56 240 C58 202 62 140 74 92 L166 92 C178 140 182 202 184 240 A64 18 0 0 1 56 240 Z"

    pattern = ""
    if kind == "oak":
        pattern = '<path d="M-40 -44 C-14 -58 16 -34 34 -48 M-42 -2 C-10 -16 14 8 38 -8 M-40 40 C-12 26 14 48 36 34 M-38 80 C-8 66 16 88 38 74" fill="none" stroke="#1b0d05" stroke-opacity=".5" stroke-width="2.2"/><path d="M-30 -20 L-16 -30 M6 -12 L18 -22 M-24 26 L-10 16 M12 52 L26 42" fill="none" stroke="#1b0d05" stroke-opacity=".32" stroke-width="1.4"/>'
    elif kind == "serpent":
        pattern = '<g fill="none" stroke="#0c1e14" stroke-opacity=".6" stroke-width="1.8"><path d="M-46 -50 Q-24 -30 -48 -10 Q-70 10 -46 30 Q-24 50 -48 70"/><path d="M-16 -58 Q6 -38 -18 -18 Q-40 2 -16 22 Q6 42 -18 62"/><path d="M14 -50 Q36 -30 12 -10 Q-10 10 14 30 Q36 50 12 70"/><path d="M44 -58 Q66 -38 42 -18 Q20 2 44 22 Q66 42 42 62"/></g>'
    elif kind == "wolf-totem":
        pattern = '<path d="M-42 -52 L-26 -62 L-32 -46 L-16 -54 L-22 -38 L-6 -44 L-12 -28 L4 -32 L-2 -16 L14 -20 L8 -4 L24 -8 L18 8 L34 4" fill="none" stroke="#1a0d04" stroke-opacity=".62" stroke-width="2.2"/><path d="M42 -50 L28 -38 L38 -26 L24 -14 L34 -2 L20 10 L30 22 L16 34 L26 46" fill="none" stroke="#f8bf84" stroke-opacity=".24" stroke-width="2"/>'
    elif kind == "raven-totem":
        pattern = '<g fill="#eaf6ff" opacity=".7"><circle cx="-34" cy="-46" r="1.7"/><circle cx="14" cy="-58" r="1.2"/><circle cx="36" cy="-18" r="1.5"/><circle cx="-18" cy="16" r="1.3"/><circle cx="24" cy="44" r="1.6"/></g><path d="M-46 -50 Q-24 -30 0 -50 Q24 -70 46 -50 M-48 -6 Q-26 14 0 -6 Q26 -26 48 -6 M-46 38 Q-24 58 0 38 Q24 18 46 38" fill="none" stroke="#c6e4f6" stroke-opacity=".26" stroke-width="1.6"/>'
    elif kind == "astral":
        pattern = '<g fill="#f4f7ff" opacity=".78"><circle cx="-32" cy="-46" r="1.8"/><circle cx="16" cy="-60" r="1.2"/><circle cx="34" cy="-16" r="1.6"/><circle cx="-16" cy="20" r="1.3"/><circle cx="22" cy="46" r="1.7"/></g><path d="M-32 -46 L16 -60 L34 -16 L-16 20 L22 46 M-32 -46 L-16 20" fill="none" stroke="#e8efff" stroke-opacity=".28" stroke-width="1"/>'
    elif kind == "demon-totem":
        pattern = '<path d="M-36 -32 C-18 -20 -6 -34 0 -18 C6 -34 18 -20 36 -32 M-36 10 C-18 22 -6 8 0 24 C6 8 18 22 36 10 M-34 50 C-16 38 -4 52 2 36 C8 52 20 38 38 50" fill="none" stroke="#f0a0b4" stroke-opacity=".26" stroke-width="2"/><path d="M-30 -22 L-18 -14 M18 -14 L30 -22 M-30 20 L-18 28 M18 28 L30 20" stroke="#0d0509" stroke-opacity=".55" stroke-width="2"/>'
    elif kind == "pentagram":
        pattern = '<path d="M-40 -40 L40 -40 M-44 -2 L44 -2 M-40 36 L40 36" stroke="#120a07" stroke-opacity=".5" stroke-width="2.2"/>'
    elif kind == "vortex":
        pattern = '<path d="M0 -66 C28 -62 48 -36 46 -10 C44 20 20 44 -10 40 C-38 36 -54 10 -46 -16 C-38 -40 -14 -52 6 -44 C22 -37 24 -14 12 -4 C1 6 -16 0 -18 -14" fill="none" stroke="#c9fbfd" stroke-opacity=".3" stroke-width="2.4"/>'

    finish_extra = ""
    if finish == "metal":
        studs = "".join(
            f'<circle cx="{x}" cy="{y}" r="2.2"/>'
            for x, y in ((79, 145), (100, 149), (120, 150), (140, 149), (161, 145),
                         (66, 222), (93, 227), (120, 229), (147, 227), (174, 222))
        )
        finish_extra = (
            f'<g fill="{accent}" opacity=".38">{studs}</g>'
            f'<g fill="#fff" opacity=".16">'
            + "".join(f'<circle cx="{x}" cy="{y - 1.1}" r=".9"/>' for x, y in ((79, 145), (120, 150), (161, 145), (66, 222), (120, 229), (174, 222)))
            + '</g>'
        )
    elif finish == "leather":
        finish_extra = (
            f'<path d="M76 106 Q120 120 164 106" fill="none" stroke="{accent}" stroke-opacity=".3" stroke-width="1.2" stroke-dasharray="3 6"/>'
            f'<path d="M60 230 Q120 246 180 230" fill="none" stroke="{accent}" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="3 6"/>'
        )
    elif finish == "wood":
        finish_extra = (
            f'<path d="M78 96 C77 150 76 202 76 246 M104 94 C103 150 102 204 102 248 M136 94 C137 150 138 204 138 248 M162 96 C163 150 164 202 164 246" '
            f'fill="none" stroke="#150c05" stroke-opacity=".4" stroke-width="1.5"/>'
        )
    else:  # arcane
        finish_extra = (
            f'<ellipse cx="120" cy="176" rx="34" ry="34" fill="none" stroke="{accent}" stroke-opacity=".16" stroke-width="1"/>'
            f'<ellipse cx="120" cy="176" rx="25" ry="25" fill="none" stroke="{accent}" stroke-opacity=".12" stroke-width="1" stroke-dasharray="2 7"/>'
        )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <defs>
    <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{edge}"/>
      <stop offset=".07" stop-color="{deep}"/>
      <stop offset=".2" stop-color="{body}"/>
      <stop offset=".33" stop-color="{hi}"/>
      <stop offset=".52" stop-color="{body}"/>
      <stop offset=".78" stop-color="{body2}"/>
      <stop offset=".93" stop-color="{deep}"/>
      <stop offset="1" stop-color="{edge}"/>
    </linearGradient>
    <linearGradient id="cupVert" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".14"/>
      <stop offset=".28" stop-color="#fff" stop-opacity=".02"/>
      <stop offset=".62" stop-color="#000" stop-opacity=".08"/>
      <stop offset=".88" stop-color="#000" stop-opacity=".26"/>
      <stop offset="1" stop-color="#000" stop-opacity=".42"/>
    </linearGradient>
    <linearGradient id="cupRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{deep}"/>
      <stop offset=".24" stop-color="{rim}"/>
      <stop offset=".44" stop-color="{accent}"/>
      <stop offset=".72" stop-color="{rim}"/>
      <stop offset="1" stop-color="{deep}"/>
    </linearGradient>
    <linearGradient id="cupBand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".55"/>
      <stop offset=".3" stop-color="{rim}" stop-opacity=".55"/>
      <stop offset=".5" stop-color="{accent}" stop-opacity=".5"/>
      <stop offset=".8" stop-color="#000" stop-opacity=".45"/>
      <stop offset="1" stop-color="#000" stop-opacity=".7"/>
    </linearGradient>
    <radialGradient id="cupCap" cx=".36" cy=".28" r=".85">
      <stop offset="0" stop-color="{lighten(body, .38)}"/>
      <stop offset=".52" stop-color="{body}"/>
      <stop offset="1" stop-color="{body2}"/>
    </radialGradient>
    <radialGradient id="cupShadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="contact" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="streak" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.4"/></filter>
    <clipPath id="cupBodyClip"><path d="{silhouette}"/></clipPath>
  </defs>

  <!-- table contact -->
  <ellipse cx="121" cy="259" rx="82" ry="20" fill="url(#cupShadow)"/>
  <ellipse cx="120" cy="250" rx="66" ry="14" fill="#000" opacity=".6" filter="url(#contact)"/>

  <!-- wall -->
  <path d="{silhouette}" fill="url(#cupBody)"/>
  <g clip-path="url(#cupBodyClip)">
    <g transform="translate(120 166)">{pattern}</g>
    <path d="{silhouette}" fill="url(#cupVert)"/>
    <path d="M83 98 C86 152 88 202 90 248" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="8" filter="url(#streak)"/>
    <path d="M172 96 C169 152 167 202 165 250" fill="none" stroke="#000" stroke-opacity=".42" stroke-width="13" filter="url(#streak)"/>
    <path d="M62 228 Q120 250 178 228" fill="none" stroke="{accent}" stroke-opacity=".18" stroke-width="11" filter="url(#streak)"/>
    <path d="M71 138 Q120 152 169 138" fill="none" stroke="{band}" stroke-width="11"/>
    <path d="M71 138 Q120 152 169 138" fill="none" stroke="url(#cupBand)" stroke-width="11"/>
    <path d="M71 132.5 Q120 146.5 169 132.5" fill="none" stroke="{accent}" stroke-opacity=".34" stroke-width="1.3"/>
    <path d="M71 143.5 Q120 157.5 169 143.5" fill="none" stroke="#000" stroke-opacity=".42" stroke-width="1.5"/>
    <path d="M58 216 Q120 232 182 216" fill="none" stroke="{band}" stroke-width="13"/>
    <path d="M58 216 Q120 232 182 216" fill="none" stroke="url(#cupBand)" stroke-width="13"/>
    <path d="M58 209.5 Q120 225.5 182 209.5" fill="none" stroke="{accent}" stroke-opacity=".3" stroke-width="1.3"/>
    <path d="M58 222.5 Q120 238.5 182 222.5" fill="none" stroke="#000" stroke-opacity=".46" stroke-width="1.7"/>
    {finish_extra}
    <g transform="translate(120 176)">{cup_emblem(c['emblem'], accent)}</g>
    <circle cx="120" cy="176" r="31" fill="{accent}" opacity=".07" filter="url(#softGlow)"/>
  </g>

  <!-- rolled mouth resting on the table -->
  <path d="M56 240 A64 18 0 0 0 184 240" fill="none" stroke="url(#cupRim)" stroke-width="7" stroke-linecap="round"/>
  <path d="M58 238 A60 16 0 0 0 182 238" fill="none" stroke="{accent}" stroke-opacity=".4" stroke-width="1.3"/>
  <path d="M60 234 A56 14 0 0 0 180 234" fill="none" stroke="#000" stroke-opacity=".46" stroke-width="3"/>
  <ellipse cx="120" cy="252" rx="54" ry="8" fill="{cavity}" opacity=".55" filter="url(#contact)"/>

  <!-- closed end -->
  <ellipse cx="120" cy="92" rx="46" ry="13" fill="url(#cupCap)"/>
  <ellipse cx="120" cy="92" rx="46" ry="13" fill="none" stroke="{edge}" stroke-width="2"/>
  <ellipse cx="120" cy="92" rx="36" ry="9" fill="none" stroke="{accent}" stroke-opacity=".24" stroke-width="1.3"/>
  <ellipse cx="106" cy="86" rx="20" ry="5.5" fill="#fff" opacity=".1" transform="rotate(-6 106 86)"/>
  <path d="M74 92 A46 13 0 0 0 166 92" fill="none" stroke="{lighten(body, .34)}" stroke-opacity=".34" stroke-width="1.8"/>
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
    "scroll": '<path d="M-16 -28 L18 -28 L18 20 L-16 20Z" fill="none" stroke="#e6cb92" stroke-width="2.2"/><path d="M-16 -28 Q-25 -28 -25 -18 Q-25 -8 -16 -8" fill="none" stroke="#e6cb92" stroke-width="2"/><path d="M-16 20 Q-25 20 -25 10" fill="none" stroke="#e6cb92" stroke-width="2"/><path d="M-8 -16 L10 -16 M-8 -5 L10 -5 M-8 6 L3 6" stroke="#e6cb92" stroke-width="1.3" opacity=".65"/><circle cx="11" cy="14" r="6.5" fill="#a83737" opacity=".8"/><path d="M8 14 L11 11 L14 14 L11 17Z" fill="#f0c9a4" opacity=".8"/>',
    "powder": '<path d="M-14 -4 L14 -4 L18 24 L-18 24Z" fill="none" stroke="#e8c98a" stroke-width="2.2"/><path d="M-14 -4 Q0 -18 14 -4" fill="none" stroke="#e8c98a" stroke-width="2.2"/><path d="M-8 6 L8 6 M-9 13 L9 13" stroke="#e8c98a" stroke-width="1.2" opacity=".55"/><circle cx="-3" cy="-18" r="2" fill="#f2d79c"/><circle cx="6" cy="-25" r="1.5" fill="#f2d79c"/><circle cx="-10" cy="-27" r="1.2" fill="#f2d79c"/><circle cx="13" cy="-21" r="1" fill="#f2d79c"/>',
    "salt": '<path d="M-15 2 Q-19 -10 -8 -14 L-4 -22 L4 -22 L8 -14 Q19 -10 15 2 L13 22 L-13 22Z" fill="none" stroke="#dfe3e6" stroke-width="2.2"/><path d="M-8 -14 Q0 -6 8 -14" fill="none" stroke="#dfe3e6" stroke-width="1.6" opacity=".7"/><circle cx="-4" cy="-1" r="1.6" fill="#ffffff"/><circle cx="5" cy="3" r="1.2" fill="#ffffff"/><circle cx="-7" cy="9" r="1" fill="#ffffff"/><circle cx="7" cy="13" r="1.4" fill="#ffffff"/><circle cx="0" cy="-30" r="1.2" fill="#ffffff" opacity=".8"/>',
    "shelf-dice": '<path d="M-22 -22 L22 -22 M-22 -2 L22 -2 M-22 20 L22 20" stroke="#e0c081" stroke-width="2"/><path d="M-18 -22 L-18 20 M18 -22 L18 20" stroke="#e0c081" stroke-width="2"/><rect x="-14" y="-16" width="10" height="10" rx="2" fill="none" stroke="#f2d79c" stroke-width="1.5"/><rect x="3" y="-16" width="10" height="10" rx="2" fill="none" stroke="#f2d79c" stroke-width="1.5"/><rect x="-6" y="4" width="10" height="10" rx="2" fill="none" stroke="#f2d79c" stroke-width="1.5"/><circle cx="-9" cy="-11" r="1.4" fill="#f2d79c"/><circle cx="8" cy="-11" r="1.4" fill="#f2d79c"/>',
    "shelf-barrel": '<path d="M-22 -22 L22 -22 M-22 0 L22 0 M-22 22 L22 22" stroke="#d8b98a" stroke-width="2"/><path d="M-18 -22 L-18 22 M18 -22 L18 22" stroke="#d8b98a" stroke-width="2"/><path d="M-13 -16 Q-19 -8 -13 0 Q-7 -8 -13 -16Z" fill="none" stroke="#c39a63" stroke-width="1.6"/><path d="M4 -16 Q-2 -8 4 0 Q10 -8 4 -16Z" fill="none" stroke="#c39a63" stroke-width="1.6"/><path d="M-8 5 Q-14 13 -8 21 Q-2 13 -8 5Z" fill="none" stroke="#c39a63" stroke-width="1.6"/>',
    "shelf-item": '<path d="M-22 -22 L22 -22 M-22 0 L22 0 M-22 22 L22 22" stroke="#cbb7d9" stroke-width="2"/><path d="M-18 -22 L-18 22 M18 -22 L18 22" stroke="#cbb7d9" stroke-width="2"/><rect x="-13" y="-17" width="12" height="12" rx="1.5" fill="none" stroke="#e2cfee" stroke-width="1.5"/><rect x="2" y="-17" width="12" height="12" rx="1.5" fill="none" stroke="#e2cfee" stroke-width="1.5" opacity=".55"/><path d="M0 6 L3 14 L11 15 L5 21 L7 29 L0 25 L-7 29 L-5 21 L-11 15 L-3 14Z" fill="none" stroke="#e2cfee" stroke-width="1.4" transform="translate(0 -4) scale(.8)"/>',
    "cracked-pouch": '<path d="M-24 18 Q-30 -8 -12 -14 L-6 -24 L6 -24 L12 -14 Q30 -8 24 18 Q18 36 0 36 Q-18 36 -24 18Z" fill="none" stroke="#9f7bad" stroke-width="2.4"/><path d="M-12 -14 Q0 -4 12 -14" fill="none" stroke="#9f7bad" stroke-width="2"/><path d="M-2 -20 L4 -4 L-6 6 L2 18 L-4 34" fill="none" stroke="#d8b6e2" stroke-width="1.6"/><circle cx="-9" cy="10" r="5" fill="none" stroke="#9f7bad" stroke-width="1.4" opacity=".7"/><circle cx="11" cy="17" r="3.5" fill="none" stroke="#9f7bad" stroke-width="1.4" opacity=".7"/>',
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
        "cracked-pouch": ("#b3a1d6", "cracked-pouch"),
        "scroll": ("#e2c48c", "scroll"), "powder": ("#e6c786", "powder"),
        "salt": ("#d7dde1", "salt"), "shelf-dice": ("#dcc08a", "shelf-dice"),
        "shelf-barrel": ("#cfa871", "shelf-barrel"), "shelf-item": ("#c9b3dd", "shelf-item"),
    }
    for item_id, (color, icon) in items.items():
        (ITEMS / f"{item_id}.svg").write_text(item_svg(item_id, color, icon), encoding="utf-8")
    print(f"Generated {len(THEMES)} tables, {len(CUPS_THEMES)} cups, {len(items)} item icons.")


if __name__ == "__main__":
    main()
