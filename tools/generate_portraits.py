"""Generate ten original SVG character portraits.

The portraits are intentionally stylised, painterly vector busts. Each one is
built from bespoke shapes and a shared lighting language so the cast feels
like it belongs to the same world.
"""
from __future__ import annotations

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "portraits"
OUT.mkdir(parents=True, exist_ok=True)


def open_svg(accent: str, accent2: str, defs_extra: str = "") -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">
<defs>
  <radialGradient id="aura" cx=".5" cy=".46" r=".55">
    <stop offset="0" stop-color="{accent}" stop-opacity=".46"/>
    <stop offset=".5" stop-color="{accent2}" stop-opacity=".14"/>
    <stop offset="1" stop-color="{accent2}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="floorGlow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="{accent}" stop-opacity=".22"/>
    <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="cape" x1=".2" y1="0" x2=".8" y2="1">
    <stop offset="0" stop-color="#211a17"/><stop offset=".52" stop-color="#0d0a09"/><stop offset="1" stop-color="#050404"/>
  </linearGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="{accent}" stop-opacity=".9"/><stop offset=".5" stop-color="{accent}" stop-opacity=".14"/>
    <stop offset="1" stop-color="{accent2}" stop-opacity=".7"/>
  </linearGradient>
  <filter id="blur24" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="blur8" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="blur2" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.5"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" seed="17"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer>
    <feBlend in="SourceGraphic" mode="soft-light"/>
  </filter>
  {defs_extra}
</defs>
<ellipse cx="300" cy="330" rx="275" ry="335" fill="url(#aura)"/>
<ellipse cx="300" cy="715" rx="300" ry="80" fill="url(#floorGlow)"/>
"""


def close_svg(particles: str = "") -> str:
    return f"""{particles}
<rect x="0" y="0" width="600" height="760" fill="url(#aura)" opacity=".08"/>
<path d="M0 760 L0 720 Q300 680 600 720 L600 760Z" fill="#000" opacity=".35"/>
</svg>
"""


def glow_eyes(cx1, cy1, cx2, cy2, color="#ff5b51", rx=13, ry=8, angle=0):
    return f"""
<g filter="url(#blur8)" opacity=".9">
  <ellipse cx="{cx1}" cy="{cy1}" rx="{rx*2.4}" ry="{ry*2.8}" fill="{color}" opacity=".45"/>
  <ellipse cx="{cx2}" cy="{cy2}" rx="{rx*2.4}" ry="{ry*2.8}" fill="{color}" opacity=".45"/>
</g>
<g transform="rotate({angle} 300 300)">
  <path d="M{cx1-rx-10} {cy1} Q{cx1} {cy1-ry-5} {cx1+rx+10} {cy1} Q{cx1} {cy1+ry+5} {cx1-rx-10} {cy1}Z" fill="#060404"/>
  <path d="M{cx2-rx-10} {cy2} Q{cx2} {cy2-ry-5} {cx2+rx+10} {cy2} Q{cx2} {cy2+ry+5} {cx2-rx-10} {cy2}Z" fill="#060404"/>
  <ellipse cx="{cx1}" cy="{cy1}" rx="{rx*.62}" ry="{ry*.7}" fill="{color}"/>
  <ellipse cx="{cx2}" cy="{cy2}" rx="{rx*.62}" ry="{ry*.7}" fill="{color}"/>
  <circle cx="{cx1}" cy="{cy1}" r="2.8" fill="#fff8dc"/>
  <circle cx="{cx2}" cy="{cy2}" r="2.8" fill="#fff8dc"/>
</g>"""


def particles(colors: tuple[str, str], seed: int, count=28, y0=120, y1=650):
    import random
    rng = random.Random(seed)
    out = []
    for _ in range(count):
        x, y = rng.randint(40, 560), rng.randint(y0, y1)
        r = rng.uniform(.8, 3.2)
        color = colors[0] if rng.random() > .35 else colors[1]
        out.append(f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="{color}" opacity="{rng.uniform(.1,.6):.2f}"/>')
    return "\n".join(out)


# ═══════════════════════════════════════════════════════════════════════════
# MINIONS
# ═══════════════════════════════════════════════════════════════════════════

def minion_rat() -> str:
    return open_svg("#b76b58", "#2d1911") + f"""
<g>
  <path d="M80 760 L98 590 Q110 500 210 472 L248 452 Q300 488 352 452 L392 472 Q490 500 504 590 L522 760Z"
        fill="url(#cape)" stroke="#3b2417" stroke-width="3"/>
  <path d="M148 610 Q300 520 452 610 L470 760 L132 760Z" fill="#23140d"/>
  <path d="M150 604 Q300 548 450 604 Q300 650 150 604Z" fill="#4a2b1c"/>
  <path d="M190 584 Q300 548 410 584" fill="none" stroke="#7b5132" stroke-width="8" stroke-linecap="round"/>
  <!-- hood -->
  <path d="M165 300 Q180 160 300 142 Q420 160 435 300 L455 500 Q380 558 300 558 Q220 558 145 500Z"
        fill="#352116" stroke="#160d09" stroke-width="4"/>
  <path d="M187 304 Q205 190 300 174 Q395 190 413 304 L426 470 Q365 510 300 512 Q235 510 174 470Z"
        fill="#4a2f1f"/>
  <!-- ears -->
  <g>
    <ellipse cx="180" cy="246" rx="74" ry="92" fill="#6a4e3e" stroke="#251610" stroke-width="3" transform="rotate(-18 180 246)"/>
    <ellipse cx="180" cy="246" rx="44" ry="62" fill="#b57d6c" opacity=".58" transform="rotate(-18 180 246)"/>
    <ellipse cx="420" cy="246" rx="74" ry="92" fill="#6a4e3e" stroke="#251610" stroke-width="3" transform="rotate(18 420 246)"/>
    <ellipse cx="420" cy="246" rx="44" ry="62" fill="#b57d6c" opacity=".58" transform="rotate(18 420 246)"/>
  </g>
  <!-- head -->
  <ellipse cx="300" cy="320" rx="112" ry="118" fill="#8a6b57"/>
  <path d="M188 300 Q196 226 300 214 Q404 226 412 300 Q392 384 300 424 Q208 384 188 300Z" fill="#9c7a61"/>
  <path d="M300 424 L252 376 Q300 350 348 376Z" fill="#7b5c49"/>
  <!-- snout -->
  <path d="M236 342 L300 438 Q364 342 356 330 Q300 376 244 330Z" fill="#b08a6e"/>
  <path d="M262 382 Q300 426 338 382 Q300 402 262 382Z" fill="#5b3b2d"/>
  <ellipse cx="300" cy="398" rx="19" ry="13" fill="#24110d"/>
  <path d="M290 405 Q300 414 310 405" fill="none" stroke="#6d4434" stroke-width="3"/>
  {glow_eyes(250, 310, 350, 310, '#e5534c', 13, 8, -3)}
  <!-- brow, whiskers -->
  <path d="M210 276 Q252 254 280 278 M320 278 Q350 254 392 276" fill="none" stroke="#3a241b" stroke-width="8" stroke-linecap="round"/>
  <path d="M240 390 L168 370 M240 402 L160 404 M360 390 L432 370 M360 402 L440 404" fill="none" stroke="#d1b69a" stroke-width="2" opacity=".55"/>
  <path d="M272 414 L282 436 L292 414 M308 414 L318 436 L328 414" fill="#f4e8cc" opacity=".9"/>
  <!-- robe clasps -->
  <path d="M230 545 Q300 590 370 545" fill="none" stroke="#8f673d" stroke-width="9"/>
  <circle cx="300" cy="576" r="18" fill="#2a1a12" stroke="#b18a55" stroke-width="3"/>
  <path d="M292 576 L300 560 L308 576 L300 592Z" fill="#b18a55" opacity=".7"/>
  <!-- candle -->
  <g transform="translate(470 600)">
    <ellipse cx="0" cy="68" rx="45" ry="12" fill="#000" opacity=".4"/>
    <rect x="-17" y="-30" width="34" height="94" rx="4" fill="#d6c29c"/>
    <path d="M0 -78 C-15 -54 -8 -40 0 -34 C8 -44 12 -60 0 -78Z" fill="#f6b85e"/>
    <path d="M0 -68 C-7 -54 -4 -45 0 -42 C4 -49 5 -60 0 -68Z" fill="#fff4cc"/>
    <circle cx="0" cy="-48" r="50" fill="#f4a64c" opacity=".14" filter="url(#blur24)"/>
  </g>
  <path d="M160 500 Q210 470 246 490" fill="none" stroke="#9a6e45" stroke-width="2" opacity=".5"/>
</g>
""" + close_svg(particles(("#d8a883", "#6d3f2e"), 11))


def minion_gargoyle() -> str:
    return open_svg("#8ec6d2", "#152023") + f"""
<g>
  <!-- wings -->
  <g fill="#263436" stroke="#10191b" stroke-width="4">
    <path d="M170 360 Q40 240 40 100 Q118 198 198 208 Q150 248 190 300 Q118 310 170 360Z"/>
    <path d="M430 360 Q560 240 560 100 Q482 198 402 208 Q450 248 410 300 Q482 310 430 360Z"/>
  </g>
  <g fill="none" stroke="#718c91" stroke-width="2" opacity=".5">
    <path d="M164 350 Q78 254 62 145 M162 346 Q96 300 62 286 M166 340 Q124 320 106 350"/>
    <path d="M436 350 Q522 254 538 145 M438 346 Q504 300 538 286 M434 340 Q476 320 494 350"/>
  </g>
  <!-- body -->
  <path d="M75 760 L96 586 Q110 490 208 458 L248 438 Q300 476 352 438 L392 458 Q490 490 504 586 L525 760Z"
        fill="#3a484a" stroke="#101819" stroke-width="5"/>
  <path d="M116 760 L128 604 Q140 534 228 500 Q300 550 372 500 Q460 534 472 604 L484 760Z" fill="#4d5e60"/>
  <path d="M188 548 Q300 596 412 548 L390 620 Q300 660 210 620Z" fill="#253134"/>
  <!-- neck / head -->
  <path d="M250 440 L252 518 Q300 548 348 518 L350 440Z" fill="#53686a"/>
  <path d="M168 330 Q168 200 300 184 Q432 200 432 330 Q432 450 300 500 Q168 450 168 330Z" fill="#687f82" stroke="#1a292b" stroke-width="4"/>
  <path d="M196 330 Q200 234 300 220 Q400 234 404 330 Q402 426 300 468 Q198 426 196 330Z" fill="#7b9395"/>
  <!-- horns -->
  <path d="M210 230 Q150 164 138 78 Q194 122 246 186Z" fill="#3c4c4e" stroke="#111b1c" stroke-width="4"/>
  <path d="M390 230 Q450 164 462 78 Q406 122 354 186Z" fill="#3c4c4e" stroke="#111b1c" stroke-width="4"/>
  <path d="M210 224 Q166 166 154 106 Q190 146 228 190Z" fill="#899fa1" opacity=".25"/>
  <path d="M390 224 Q434 166 446 106 Q410 146 372 190Z" fill="#899fa1" opacity=".25"/>
  <!-- ears -->
  <path d="M168 300 L110 270 L154 344Z" fill="#5b7073"/>
  <path d="M432 300 L490 270 L446 344Z" fill="#5b7073"/>
  {glow_eyes(250, 322, 350, 322, '#89edff', 16, 9, 0)}
  <path d="M222 286 Q250 264 278 284 M322 284 Q350 264 378 286" fill="none" stroke="#253b3d" stroke-width="7" stroke-linecap="round"/>
  <!-- broad nose / mouth -->
  <path d="M282 356 L270 384 L300 396 L330 384 L318 356Z" fill="#4f6466"/>
  <path d="M242 414 Q300 444 358 414 Q300 470 242 414Z" fill="#162325"/>
  <path d="M270 422 L282 444 L294 424 M306 424 L318 444 L330 422" fill="#d7d3bb"/>
  <path d="M194 346 Q188 406 226 452 M406 346 Q412 406 374 452" fill="none" stroke="#344a4c" stroke-width="5"/>
  <!-- cracks -->
  <path d="M238 244 L258 298 L236 326 L260 370 M354 238 L340 284 L362 310 L338 348" fill="none" stroke="#344a4c" stroke-width="3" opacity=".8"/>
  <path d="M286 470 L274 522 L296 548 M320 468 L336 518 L316 542" fill="none" stroke="#2d4143" stroke-width="3"/>
  <!-- collar rubble -->
  <path d="M118 610 L184 566 L232 630 L300 586 L366 632 L418 566 L482 610" fill="none" stroke="#748b8d" stroke-width="16" stroke-linejoin="round"/>
  <path d="M118 610 L184 566 L232 630 L300 586 L366 632 L418 566 L482 610" fill="none" stroke="#202f31" stroke-width="4"/>
  <g fill="#5d7476" opacity=".8">
    <path d="M130 706 L166 674 L192 716 L158 744Z"/><path d="M428 700 L466 668 L486 712 L452 740Z"/>
  </g>
</g>
""" + close_svg(particles(("#b4e9f2", "#55797e"), 12, 24, 160, 720))


def minion_forge() -> str:
    return open_svg("#f08a4e", "#28120a") + f"""
<g>
  <!-- hammer behind -->
  <g transform="translate(478 390) rotate(18)" opacity=".9">
    <rect x="-22" y="20" width="36" height="280" rx="10" fill="#3a2b21" stroke="#15100c" stroke-width="4"/>
    <path d="M-74 -52 L64 -52 L82 26 L-90 26Z" fill="#4b4c4c" stroke="#151515" stroke-width="5"/>
    <path d="M-70 -44 L56 -44 L64 4 L-78 4Z" fill="#6b6b68" opacity=".4"/>
  </g>
  <!-- body -->
  <path d="M49 760 L77 580 Q97 472 214 440 L248 426 Q300 466 352 426 L388 440 Q505 472 523 580 L557 760Z"
        fill="#241d18" stroke="#0d0a08" stroke-width="5"/>
  <path d="M120 760 L132 604 Q146 528 234 496 Q300 540 366 496 Q454 528 468 604 L480 760Z" fill="#3b2c22"/>
  <!-- apron -->
  <path d="M208 512 L392 512 L420 760 L180 760Z" fill="#5a3a27" stroke="#1f130d" stroke-width="4"/>
  <path d="M218 526 L382 526" stroke="#c17a45" stroke-width="3" opacity=".4"/>
  <path d="M286 570 L314 570 L322 650 L278 650Z" fill="#2c1a10"/>
  <circle cx="300" cy="604" r="10" fill="#d7a05f" opacity=".55"/>
  <!-- shoulders / straps -->
  <path d="M100 590 Q170 530 238 534 L246 584 Q184 598 144 660Z" fill="#17120f"/>
  <path d="M500 590 Q430 530 362 534 L354 584 Q416 598 456 660Z" fill="#17120f"/>
  <!-- neck -->
  <path d="M248 418 Q246 474 266 500 Q300 526 334 500 Q354 474 352 418Z" fill="#714a34"/>
  <!-- head -->
  <path d="M196 310 Q196 190 300 176 Q404 190 404 310 Q404 430 300 480 Q196 430 196 310Z" fill="#7d5239"/>
  <path d="M218 308 Q220 222 300 210 Q380 222 382 308 Q380 402 300 442 Q220 402 218 308Z" fill="#966347"/>
  <!-- soot -->
  <path d="M206 290 Q232 246 266 242 Q244 292 252 350 Q228 336 206 290Z" fill="#2a1c16" opacity=".55"/>
  <path d="M358 266 Q382 294 386 332 Q362 344 350 314Z" fill="#2a1c16" opacity=".4"/>
  <!-- ears -->
  <path d="M198 306 Q164 276 158 244 Q194 250 214 276Z" fill="#7d5239"/>
  <path d="M402 306 Q436 276 442 244 Q406 250 386 276Z" fill="#7d5239"/>
  <!-- goggles -->
  <g>
    <path d="M192 294 Q196 250 248 250 Q300 250 300 294 Q300 338 248 338 Q196 338 192 294Z" fill="#28201a" stroke="#140e0a" stroke-width="6"/>
    <path d="M408 294 Q404 250 352 250 Q300 250 300 294 Q300 338 352 338 Q404 338 408 294Z" fill="#28201a" stroke="#140e0a" stroke-width="6"/>
    <circle cx="248" cy="294" r="34" fill="#1a0b04"/>
    <circle cx="352" cy="294" r="34" fill="#1a0b04"/>
    <circle cx="248" cy="294" r="28" fill="url(#rim)"/>
    <circle cx="352" cy="294" r="28" fill="url(#rim)"/>
    <circle cx="248" cy="294" r="23" fill="#f06d25" opacity=".8"/>
    <circle cx="352" cy="294" r="23" fill="#f06d25" opacity=".8"/>
    <circle cx="239" cy="284" r="8" fill="#fff3cf" opacity=".8"/>
    <circle cx="343" cy="284" r="8" fill="#fff3cf" opacity=".8"/>
    <path d="M300 294 L300 274" stroke="#9b774f" stroke-width="7"/>
  </g>
  <!-- nose, grin -->
  <path d="M284 358 L300 394 L318 356Z" fill="#5d3826"/>
  <path d="M248 412 Q300 450 354 412" fill="none" stroke="#2b1710" stroke-width="6" stroke-linecap="round"/>
  <path d="M266 420 Q300 438 334 420" fill="#e8dcc0" opacity=".9"/>
  <path d="M266 420 L300 438 L334 420 L332 430 Q300 450 268 430Z" fill="#e8dcc0"/>
  <!-- beard stubble -->
  <path d="M230 394 Q262 478 300 480 Q338 478 370 394 Q366 466 300 500 Q234 466 230 394Z" fill="#3a261c" opacity=".55"/>
  <!-- collar -->
  <path d="M202 500 Q300 552 398 500 L420 566 Q300 626 180 566Z" fill="#2a1b13" stroke="#0e0907" stroke-width="4"/>
  <g fill="#d18a50" opacity=".7"><circle cx="226" cy="536" r="5"/><circle cx="270" cy="554" r="5"/><circle cx="330" cy="554" r="5"/><circle cx="374" cy="536" r="5"/></g>
  <!-- embers -->
  <g fill="#ff9a51">
    <circle cx="126" cy="516" r="2.5" opacity=".7"/><circle cx="476" cy="486" r="2" opacity=".5"/>
    <circle cx="104" cy="610" r="1.8" opacity=".4"/><circle cx="492" cy="628" r="2.4" opacity=".55"/>
  </g>
</g>
""" + close_svg(particles(("#ffb067", "#8d3f1f"), 13, 40, 130, 720))


def minion_gilt() -> str:
    return open_svg("#e2c06b", "#2b1a12") + f"""
<g>
  <!-- high collar -->
  <path d="M80 760 L98 560 Q114 470 204 432 L160 260 Q230 212 300 212 Q370 212 440 260 L396 432 Q486 470 502 560 L520 760Z"
        fill="#261318" stroke="#12090b" stroke-width="4"/>
  <path d="M144 514 Q196 464 244 456 L300 520 L356 456 Q404 464 456 514 L430 600 Q300 654 170 600Z" fill="#7e2b36"/>
  <!-- ruff -->
  <g fill="#e7ddc7" stroke="#b9a88a" stroke-width="1">
    <circle cx="196" cy="486" r="34"/><circle cx="234" cy="464" r="34"/><circle cx="278" cy="454" r="33"/>
    <circle cx="322" cy="454" r="33"/><circle cx="366" cy="464" r="34"/><circle cx="404" cy="486" r="34"/>
    <circle cx="164" cy="508" r="28"/><circle cx="436" cy="508" r="28"/>
  </g>
  <!-- body coat -->
  <path d="M168 596 Q300 654 432 596 L456 760 L144 760Z" fill="#3c1720"/>
  <path d="M294 580 L306 580 L316 760 L284 760Z" fill="#1a0b0e"/>
  <g fill="#e2c06b"><circle cx="300" cy="620" r="7"/><circle cx="300" cy="668" r="7"/><circle cx="300" cy="716" r="7"/></g>
  <!-- gold trim -->
  <path d="M168 596 Q300 654 432 596" fill="none" stroke="#d7b25d" stroke-width="5" opacity=".8"/>
  <path d="M188 620 L174 760 M412 620 L426 760" stroke="#d7b25d" stroke-width="2" opacity=".4"/>
  <!-- neck -->
  <path d="M258 410 L256 482 Q300 518 344 482 L342 410Z" fill="#e4c8a8"/>
  <!-- head -->
  <ellipse cx="300" cy="326" rx="97" ry="118" fill="#ebd2b4"/>
  <path d="M207 320 Q214 224 300 214 Q386 224 393 320 Q386 424 300 454 Q214 424 207 320Z" fill="#f0d8ba"/>
  <!-- hair / cap -->
  <path d="M202 288 Q204 194 300 184 Q396 194 398 288 Q374 234 300 228 Q226 234 202 288Z" fill="#d8bd8b"/>
  <path d="M190 232 Q236 188 300 188 Q364 188 410 232 L390 260 Q344 220 300 220 Q256 220 210 260Z" fill="#4a2632"/>
  <path d="M196 222 Q254 166 306 170 Q368 176 412 222 Q350 198 300 198 Q248 198 196 222Z" fill="#2b1520"/>
  <path d="M390 222 Q456 176 484 106 Q474 198 430 262Z" fill="#dfc98e" opacity=".92"/>
  <path d="M390 222 Q448 186 470 128 Q450 204 414 244Z" fill="#f6e9bd" opacity=".5"/>
  <!-- mask -->
  <path d="M218 294 Q224 246 300 238 Q376 246 382 294 Q374 344 300 356 Q226 344 218 294Z" fill="#d9b45f" stroke="#7f5d22" stroke-width="2"/>
  <path d="M230 286 Q236 256 300 250 Q364 256 370 286 Q360 326 300 334 Q240 326 230 286Z" fill="#efd486"/>
  <path d="M238 284 Q252 262 290 266 L282 300 Q258 300 238 284Z" fill="#1a1310"/>
  <path d="M362 284 Q348 262 310 266 L318 300 Q342 300 362 284Z" fill="#1a1310"/>
  <path d="M256 284 Q270 276 282 284" fill="none" stroke="#f5df9b" stroke-width="2"/>
  <path d="M318 284 Q330 276 344 284" fill="none" stroke="#f5df9b" stroke-width="2"/>
  <path d="M300 292 L292 318 L300 326 L308 318Z" fill="#b28b3d"/>
  <path d="M260 330 Q300 344 340 330" fill="none" stroke="#9d7938" stroke-width="2"/>
  <!-- mouth -->
  <path d="M256 384 Q300 370 344 384 Q300 414 256 384Z" fill="#8f4a52"/>
  <path d="M258 384 Q300 398 342 384" fill="none" stroke="#f0d8ba" stroke-width="1" opacity=".6"/>
  <path d="M336 390 Q352 388 358 380" stroke="#b65a64" stroke-width="2" fill="none" opacity=".6"/>
  <!-- earring -->
  <circle cx="198" cy="360" r="9" fill="none" stroke="#e2c06b" stroke-width="3"/>
  <circle cx="198" cy="374" r="5" fill="#e2c06b"/>
  <!-- gloves + tray -->
  <g transform="translate(465 640)">
    <ellipse cx="0" cy="40" rx="92" ry="22" fill="#20100e"/>
    <path d="M-88 38 Q-80 -10 0 -14 Q80 -10 88 38Z" fill="#b7a98e" stroke="#6e624e" stroke-width="3"/>
    <path d="M-56 -10 Q-42 -46 -8 -36 Q14 -30 6 4Z" fill="#efe7d5"/>
    <path d="M32 -20 Q58 -42 68 -4 Q70 18 42 20Z" fill="#efe7d5"/>
    <g transform="translate(-12 20) rotate(-12)">
      <rect x="-22" y="-22" width="44" height="44" rx="8" fill="#e9dfc6" stroke="#917f5c" stroke-width="2"/>
      <circle cx="-8" cy="-6" r="4" fill="#2a1c17"/><circle cx="8" cy="-6" r="4" fill="#2a1c17"/><circle cx="0" cy="9" r="4" fill="#2a1c17"/>
    </g>
  </g>
  <!-- coat light -->
  <path d="M154 646 Q188 700 196 760" stroke="#f0d184" stroke-opacity=".18" stroke-width="12" fill="none"/>
</g>
""" + close_svg(particles(("#f6e3ab", "#a97b35"), 14))


def minion_crystal() -> str:
    return open_svg("#9fe7f0", "#0d2730") + f"""
<g>
  <!-- shard wings -->
  <g fill="#7ccbd8" stroke="#c8f9ff" stroke-width="1.5" opacity=".55">
    <path d="M176 350 L60 196 L132 322 L24 274 L132 386 L44 418 L168 442Z"/>
    <path d="M424 350 L540 196 L468 322 L576 274 L468 386 L556 418 L432 442Z"/>
  </g>
  <g fill="#d6fbff" opacity=".3">
    <path d="M176 350 L96 262 L146 338Z"/><path d="M424 350 L504 262 L454 338Z"/>
  </g>
  <!-- body robe -->
  <path d="M116 760 L136 566 Q152 486 232 456 L258 440 Q300 474 342 440 L368 456 Q448 486 464 566 L484 760Z"
        fill="#1d3d46" stroke="#0a1c21" stroke-width="4"/>
  <path d="M168 560 L300 636 L432 560 L456 760 L144 760Z" fill="#2c5963"/>
  <path d="M300 636 L328 760 L272 760Z" fill="#bdf8ff" opacity=".18"/>
  <path d="M168 560 L300 636 L432 560" fill="none" stroke="#bdf8ff" stroke-width="3" opacity=".5"/>
  <!-- neck / head base -->
  <path d="M266 432 L262 494 Q300 522 338 494 L334 432Z" fill="#7fc2cc"/>
  <path d="M218 330 Q218 218 300 200 Q382 218 382 330 Q382 428 300 474 Q218 428 218 330Z" fill="#8ed4dd"/>
  <!-- faceted head -->
  <g stroke="#e2fdff" stroke-width="1.2" opacity=".55" fill="none">
    <path d="M218 330 L300 248 L382 330 L300 474Z"/>
    <path d="M218 330 L300 364 L382 330 M300 200 L300 248 M300 364 L300 474"/>
    <path d="M258 272 L300 364 L342 272 M238 380 L300 364 L362 380"/>
  </g>
  <path d="M300 200 L382 330 L300 474 L218 330Z" fill="url(#rim)" opacity=".18"/>
  <!-- eyes / core -->
  <g filter="url(#blur8)" opacity=".85">
    <circle cx="266" cy="326" r="30" fill="#c9fbff" opacity=".3"/>
    <circle cx="334" cy="326" r="30" fill="#c9fbff" opacity=".3"/>
  </g>
  <path d="M246 326 Q266 312 286 326 Q266 340 246 326Z" fill="#062c34"/>
  <path d="M314 326 Q334 312 354 326 Q334 340 314 326Z" fill="#062c34"/>
  <circle cx="266" cy="326" r="6" fill="#e6ffff"/><circle cx="334" cy="326" r="6" fill="#e6ffff"/>
  <path d="M282 398 L300 386 L318 398 L300 420Z" fill="#d5fbff" opacity=".7"/>
  <!-- halo shards -->
  <g fill="none" stroke="#bdf8ff" stroke-width="2.5" opacity=".65">
    <circle cx="300" cy="204" r="90" stroke-dasharray="18 12"/>
    <circle cx="300" cy="204" r="112" stroke-dasharray="5 20" opacity=".5"/>
  </g>
  <g fill="#c9fbff" opacity=".55">
    <path d="M170 180 L182 150 L194 184 L182 198Z"/><path d="M410 158 L422 128 L434 162 L422 176Z"/>
  </g>
  <!-- collar crystals -->
  <g fill="#9fe7f0" stroke="#e0ffff" stroke-width="1" opacity=".8">
    <path d="M204 548 L224 506 L244 552 L224 574Z"/><path d="M356 548 L376 506 L396 552 L376 574Z"/>
    <path d="M292 556 L300 520 L308 556 L300 572Z"/>
  </g>
</g>
""" + close_svg(particles(("#d8fbff", "#5cb3c3"), 15, 36, 90, 720))


# ═══════════════════════════════════════════════════════════════════════════
# BOSSES
# ═══════════════════════════════════════════════════════════════════════════

def boss_rat() -> str:
    return open_svg("#b63b36", "#140606") + f"""
<g>
  <!-- armchair / shoulders -->
  <path d="M22 760 L48 568 Q68 448 194 404 L234 376 Q300 430 366 376 L406 404 Q532 448 552 568 L578 760Z"
        fill="#1a0d0c" stroke="#0a0504" stroke-width="6"/>
  <path d="M72 760 L92 584 Q112 490 218 458 Q300 512 382 458 Q488 490 508 584 L528 760Z" fill="#3b1518"/>
  <path d="M142 760 L156 620 Q198 552 300 552 Q402 552 444 620 L458 760Z" fill="#5a1e23"/>
  <!-- fur mantle -->
  <path d="M110 560 Q182 482 254 506 Q300 540 346 506 Q418 482 490 560 Q420 620 300 638 Q180 620 110 560Z"
        fill="#463028" stroke="#170d0a" stroke-width="4"/>
  <g fill="none" stroke="#9c7c62" stroke-width="2" opacity=".35">
    <path d="M132 572 Q190 534 238 554 M462 572 Q404 534 356 554 M198 600 Q250 568 300 590 M402 600 Q350 568 300 590"/>
  </g>
  <!-- ragged fur along the shoulders -->
  <g fill="#3b2720" stroke="#150c09" stroke-width="2">
    <path d="M112 566 L88 546 L124 540 L100 512 L148 526 L140 496 L184 524 L198 494 L226 528Z"/>
    <path d="M488 566 L512 546 L476 540 L500 512 L452 526 L460 496 L416 524 L402 494 L374 528Z"/>
  </g>
  <!-- ears, torn by old fights -->
  <ellipse cx="158" cy="226" rx="96" ry="126" fill="#56423a" stroke="#1b0f0c" stroke-width="4" transform="rotate(-17 158 226)"/>
  <ellipse cx="158" cy="226" rx="59" ry="84" fill="#a16f60" opacity=".42" transform="rotate(-17 158 226)"/>
  <ellipse cx="442" cy="226" rx="96" ry="126" fill="#56423a" stroke="#1b0f0c" stroke-width="4" transform="rotate(17 442 226)"/>
  <ellipse cx="442" cy="226" rx="59" ry="84" fill="#a16f60" opacity=".42" transform="rotate(17 442 226)"/>
  <path d="M82 178 L112 216 L92 230 L120 254" fill="none" stroke="#b63b36" stroke-width="5" opacity=".28"/>
  <path d="M492 232 L462 258 L482 282" fill="none" stroke="#b63b36" stroke-width="4" opacity=".22"/>
  <g fill="none" stroke="#c9a15e" stroke-width="3" opacity=".65">
    <circle cx="131" cy="308" r="9"/><circle cx="469" cy="302" r="7"/>
  </g>
  <!-- head -->
  <path d="M172 312 Q176 184 300 168 Q424 184 428 312 Q428 432 300 496 Q172 432 172 312Z" fill="#6b4d40"/>
  <path d="M202 310 Q208 220 300 204 Q392 220 398 310 Q398 408 300 458 Q202 408 202 310Z" fill="#83614c"/>
  <!-- cheek fur tufts -->
  <g fill="#5a4035" stroke="#1d110d" stroke-width="2">
    <path d="M186 334 L150 344 L184 360 L158 382 L198 390 L196 420 L226 408Z"/>
    <path d="M414 334 L450 344 L416 360 L442 382 L402 390 L404 420 L374 408Z"/>
  </g>
  <!-- scars -->
  <path d="M226 250 L250 288 L238 322" fill="none" stroke="#3f201a" stroke-width="4" opacity=".85"/>
  <path d="M232 252 L244 290" fill="none" stroke="#b76a58" stroke-width="1.5" opacity=".45"/>
  <path d="M354 384 L374 368 L392 386" fill="none" stroke="#b63b36" stroke-width="2" opacity=".5"/>
  <!-- fur strokes -->
  <g fill="none" stroke="#4f372e" stroke-width="2" opacity=".7">
    <path d="M206 258 L224 274 M386 252 L370 270 M216 356 L236 364 M382 362 L362 370 M254 442 L270 452 M344 444 L330 452"/>
  </g>
  <!-- snout / snarl -->
  <path d="M236 342 L300 478 Q364 342 364 330 Q300 394 236 330Z" fill="#a87f63"/>
  <path d="M252 386 Q300 448 348 386 Q300 414 252 386Z" fill="#3b1d15"/>
  <path d="M242 382 Q300 434 358 382 Q300 408 242 382Z" fill="#24110d"/>
  <ellipse cx="300" cy="424" rx="29" ry="20" fill="#120706"/>
  <path d="M282 432 Q300 446 318 432" fill="none" stroke="#6d4434" stroke-width="3"/>
  {glow_eyes(248, 310, 352, 310, '#ff3b35', 22, 7, -4)}
  <path d="M196 274 Q246 242 288 274 M312 274 Q354 242 404 274" fill="none" stroke="#2c1812" stroke-width="12" stroke-linecap="round"/>
  <path d="M224 348 Q248 338 264 350 M376 348 Q352 338 336 350" fill="none" stroke="#6f4c3a" stroke-width="2" opacity=".7"/>
  <!-- fangs -->
  <path d="M258 408 L268 458 L282 412 M318 412 L332 458 L342 408" fill="#f3e5c8"/>
  <path d="M242 428 L254 474 L268 432 M332 432 L346 474 L358 428" fill="#e8d6b5" opacity=".92"/>
  <path d="M278 438 L286 462 L296 438 M304 438 L314 462 L322 438" fill="#c9b58f" opacity=".85"/>
  <!-- whiskers -->
  <path d="M250 390 L130 344 M250 404 L112 402 M350 390 L470 344 M350 404 L488 402" fill="none" stroke="#c6aa8c" stroke-width="3" opacity=".5"/>
  <!-- crown of teeth set in black iron -->
  <path d="M190 196 L208 112 L238 178 L258 90 L282 174 L300 68 L318 174 L342 90 L362 178 L392 112 L410 196 Q300 246 190 196Z"
        fill="#2b211d" stroke="#8a6c43" stroke-width="3"/>
  <g fill="#e2d1ac" stroke="#7a6244" stroke-width="1.5">
    <path d="M208 182 L222 128 L242 180Z"/><path d="M258 176 L268 104 L286 174Z"/><path d="M300 172 L300 82 L318 172Z"/>
    <path d="M314 174 L332 104 L344 178Z"/><path d="M358 180 L378 128 L392 184Z"/>
  </g>
  <g fill="#a84339" opacity=".9">
    <circle cx="300" cy="206" r="7"/><circle cx="224" cy="192" r="4"/><circle cx="376" cy="192" r="4"/>
  </g>
  <!-- bone necklace -->
  <path d="M230 514 Q300 584 370 514" fill="none" stroke="#7b5b3a" stroke-width="5"/>
  <g fill="#d9c8a5" stroke="#6d583a" stroke-width="1.5">
    <path d="M262 544 L270 572 L282 546Z"/><path d="M300 560 L310 592 L320 560Z"/><path d="M336 544 L344 570 L354 542Z"/>
  </g>
  <!-- goblet -->
  <g transform="translate(500 600)">
    <path d="M-48 -54 L48 -54 Q42 18 0 24 Q-42 18 -48 -54Z" fill="#7e282d" stroke="#d1a35d" stroke-width="4"/>
    <ellipse cx="0" cy="-54" rx="48" ry="13" fill="#a33d42" stroke="#d1a35d" stroke-width="3"/>
    <path d="M0 24 L0 74" stroke="#d1a35d" stroke-width="6"/>
    <path d="M-34 78 Q0 62 34 78 Q0 96 -34 78Z" fill="#b88945"/>
    <path d="M-28 -36 Q0 -20 28 -36" fill="none" stroke="#f2cf89" stroke-width="2" opacity=".5"/>
  </g>
</g>
""" + close_svg(particles(("#f06f61", "#6d201f"), 21, 40, 80, 740))


def boss_stone() -> str:
    return open_svg("#8cc7d4", "#101d20") + f"""
<g>
  <!-- broken halo -->
  <g fill="none" stroke="#a9d8df" stroke-width="5" opacity=".35">
    <circle cx="300" cy="152" r="146" stroke-dasharray="60 28"/>
    <circle cx="300" cy="152" r="170" stroke-dasharray="20 60" opacity=".5"/>
    <path d="M160 64 L128 34 M440 64 L472 34"/>
  </g>
  <!-- shoulders / robe -->
  <path d="M8 760 L34 564 Q58 436 190 396 L232 362 Q300 418 368 362 L410 396 Q542 436 566 564 L592 760Z"
        fill="#192226" stroke="#080d0e" stroke-width="7"/>
  <path d="M72 760 L94 590 Q116 494 222 458 L246 438 Q300 480 354 438 L378 458 Q484 494 506 590 L528 760Z"
        fill="#303e42"/>
  <path d="M152 760 L170 620 Q204 548 300 548 Q396 548 430 620 L448 760Z" fill="#3b4b4f"/>
  <!-- stone mantle -->
  <path d="M106 580 Q170 494 246 516 L300 552 L354 516 Q430 494 494 580 Q414 642 300 658 Q186 642 106 580Z"
        fill="#526466" stroke="#141d1f" stroke-width="4"/>
  <g fill="none" stroke="#26393c" stroke-width="3" opacity=".8">
    <path d="M148 590 L190 558 L216 606 L254 572 M452 590 L410 558 L384 606 L346 572"/>
  </g>
  <!-- hood -->
  <path d="M164 308 Q170 154 300 132 Q430 154 436 308 L470 500 Q386 570 300 570 Q214 570 130 500Z"
        fill="#2b373a" stroke="#0c1314" stroke-width="5"/>
  <path d="M190 306 Q200 192 300 176 Q400 192 410 306 L432 484 Q366 526 300 526 Q234 526 168 484Z"
        fill="#465a5d"/>
  <!-- face mask -->
  <path d="M204 310 Q210 230 300 220 Q390 230 396 310 Q394 414 300 458 Q206 414 204 310Z"
        fill="#708589" stroke="#1a292b" stroke-width="4"/>
  <path d="M222 308 Q230 250 300 242 Q370 250 378 308 Q374 386 300 422 Q226 386 222 308Z" fill="#8a9fa1"/>
  <!-- blindfold -->
  <path d="M192 300 Q300 270 408 300 L404 350 Q300 322 196 350Z" fill="#b6c8c7" stroke="#3b4b4d" stroke-width="3"/>
  <path d="M216 314 L384 314" stroke="#7d5d42" stroke-width="2" opacity=".5"/>
  <path d="M300 288 L310 306 L300 322 L290 306Z" fill="#34484b"/>
  <path d="M278 316 Q300 306 322 316" fill="none" stroke="#cfe7e8" stroke-width="2" opacity=".35"/>
  <!-- glow through blindfold -->
  <g filter="url(#blur8)" opacity=".85">
    <ellipse cx="258" cy="318" rx="32" ry="10" fill="#b4ecf3" opacity=".65"/>
    <ellipse cx="342" cy="318" rx="32" ry="10" fill="#b4ecf3" opacity=".65"/>
  </g>
  <path d="M232 318 Q258 310 282 318 Q258 326 232 318Z" fill="#cdf6fb"/>
  <path d="M318 318 Q342 310 368 318 Q342 326 318 318Z" fill="#cdf6fb"/>
  <!-- nose, mouth -->
  <path d="M286 354 L300 396 L316 354Z" fill="#52676a"/>
  <path d="M242 410 Q300 434 358 410" fill="none" stroke="#26383b" stroke-width="5" stroke-linecap="round"/>
  <path d="M266 414 L300 430 L334 414" fill="none" stroke="#b9c8c6" stroke-width="3" opacity=".5"/>
  <!-- cracks -->
  <g fill="none" stroke="#304649" stroke-width="3">
    <path d="M236 236 L254 284 L232 312 L256 344"/>
    <path d="M366 230 L348 280 L368 306"/>
    <path d="M254 448 L242 500 M330 452 L348 498 L330 528"/>
    <path d="M174 430 L202 454 L188 486"/>
  </g>
  <g fill="none" stroke="#bde9ef" stroke-width="1.2" opacity=".4">
    <path d="M236 236 L254 284 L232 312 L256 344"/><path d="M366 230 L348 280 L368 306"/>
  </g>
  <!-- judge collar -->
  <path d="M230 520 L300 592 L370 520 L390 566 L300 628 L210 566Z" fill="#d5d6c8" stroke="#5b625b" stroke-width="3"/>
  <path d="M300 576 L300 640" stroke="#2d3638" stroke-width="5"/>
  <!-- gavel -->
  <g transform="translate(505 600) rotate(18)">
    <rect x="-24" y="-8" width="112" height="26" rx="5" fill="#4a3b2c" stroke="#1b130d" stroke-width="3"/>
    <rect x="-58" y="-46" width="92" height="100" rx="14" fill="#5b6a6c" stroke="#1b2728" stroke-width="4"/>
    <path d="M-46 -34 L22 -34 L22 -22 L-46 -22Z" fill="#8a9a9b" opacity=".35"/>
  </g>
  <!-- chains -->
  <g fill="none" stroke="#718689" stroke-width="8" opacity=".6">
    <path d="M76 640 Q110 690 92 760"/><path d="M524 640 Q490 690 508 760"/>
  </g>
</g>
""" + close_svg(particles(("#bdebf1", "#507b82"), 22, 34, 90, 740))


def boss_iron() -> str:
    return open_svg("#ff7a3d", "#250b05") + f"""
<g>
  <!-- furnace aura -->
  <ellipse cx="300" cy="610" rx="220" ry="150" fill="#ff5a1f" opacity=".13" filter="url(#blur24)"/>
  <!-- massive shoulders -->
  <path d="M-10 760 L22 544 Q48 404 188 366 L232 338 Q300 400 368 338 L412 366 Q552 404 578 544 L610 760Z"
        fill="#171719" stroke="#080808" stroke-width="7"/>
  <path d="M44 760 L68 566 Q90 464 204 428 Q300 488 396 428 Q510 464 532 566 L556 760Z" fill="#292a2c"/>
  <!-- pauldrons -->
  <path d="M36 566 Q72 468 196 444 L220 526 Q130 546 100 640Z" fill="#3a3b3d" stroke="#101011" stroke-width="5"/>
  <path d="M564 566 Q528 468 404 444 L380 526 Q470 546 500 640Z" fill="#3a3b3d" stroke="#101011" stroke-width="5"/>
  <g fill="#77797a" opacity=".45">
    <circle cx="96" cy="520" r="7"/><circle cx="128" cy="490" r="5"/><circle cx="504" cy="520" r="7"/><circle cx="472" cy="490" r="5"/>
  </g>
  <!-- chest furnace -->
  <path d="M188 590 Q300 646 412 590 L430 760 L170 760Z" fill="#1c1c1e"/>
  <path d="M224 612 Q300 650 376 612 L392 730 L208 730Z" fill="#0d0c0b" stroke="#5d5a54" stroke-width="4"/>
  <g fill="none" stroke="#d65d27" stroke-width="3">
    <path d="M240 700 L240 636 M270 716 L270 626 M300 722 L300 620 M330 716 L330 626 M360 700 L360 636"/>
    <path d="M232 636 L368 636 M232 672 L368 672 M232 708 L368 708"/>
  </g>
  <ellipse cx="300" cy="680" rx="72" ry="44" fill="#ff6b28" opacity=".28" filter="url(#blur8)"/>
  <!-- neck / mask -->
  <path d="M244 346 L244 438 Q300 476 356 438 L356 346Z" fill="#3b3430"/>
  <path d="M190 278 Q190 154 300 136 Q410 154 410 278 Q410 414 300 472 Q190 414 190 278Z" fill="#3e3e40" stroke="#111112" stroke-width="5"/>
  <path d="M212 276 Q214 186 300 170 Q386 186 388 276 Q386 386 300 432 Q214 386 212 276Z" fill="#545456"/>
  <!-- horns -->
  <path d="M206 214 Q142 144 126 44 Q188 104 246 176Z" fill="#2e2d2e" stroke="#0d0d0e" stroke-width="4"/>
  <path d="M394 214 Q458 144 474 44 Q412 104 354 176Z" fill="#2e2d2e" stroke="#0d0d0e" stroke-width="4"/>
  <path d="M206 206 Q158 144 144 70 Q190 124 232 180Z" fill="#7d756b" opacity=".25"/>
  <path d="M394 206 Q442 144 456 70 Q410 124 368 180Z" fill="#7d756b" opacity=".25"/>
  <!-- mask seams -->
  <path d="M300 170 L300 432" stroke="#242426" stroke-width="4"/>
  <path d="M214 266 L386 266" stroke="#242426" stroke-width="3"/>
  <g fill="#8e8a80" opacity=".35">
    <circle cx="236" cy="238" r="5"/><circle cx="364" cy="238" r="5"/><circle cx="220" cy="314" r="4"/><circle cx="380" cy="314" r="4"/>
    <circle cx="258" cy="396" r="4"/><circle cx="342" cy="396" r="4"/>
  </g>
  {glow_eyes(252, 292, 348, 292, '#ff7a35', 19, 9, -4)}
  <path d="M206 262 Q246 232 288 258 M312 258 Q354 232 394 262" fill="none" stroke="#222224" stroke-width="10" stroke-linecap="round"/>
  <!-- nose ridge + mouth grill -->
  <path d="M288 312 L300 364 L314 312Z" fill="#2b2b2d"/>
  <path d="M248 386 Q300 414 352 386 L342 422 Q300 444 258 422Z" fill="#18181a" stroke="#6d6961" stroke-width="3"/>
  <g stroke="#8e887d" stroke-width="2" opacity=".65"><path d="M276 392 L276 426 M300 396 L300 434 M324 392 L324 426"/></g>
  <!-- molten cracks -->
  <g fill="none" stroke="#ff6929" stroke-width="2.4" filter="url(#blur2)" opacity=".85">
    <path d="M232 326 L252 354 L240 390 L260 420"/>
    <path d="M366 310 L352 346 L366 374"/>
    <path d="M300 440 L292 474 L310 500"/>
  </g>
  <!-- chains -->
  <g fill="none" stroke="#5f5c57" stroke-width="9" opacity=".85">
    <path d="M96 600 Q130 660 104 760"/><path d="M504 600 Q470 660 496 760"/>
  </g>
  <g fill="none" stroke="#9a948a" stroke-width="2" opacity=".4">
    <path d="M96 600 Q130 660 104 760"/><path d="M504 600 Q470 660 496 760"/>
  </g>
  <!-- collar -->
  <path d="M196 486 Q300 548 404 486 L424 552 Q300 620 176 552Z" fill="#232325" stroke="#0b0b0c" stroke-width="4"/>
  <g fill="#ff7a35" opacity=".35"><circle cx="230" cy="528" r="4"/><circle cx="300" cy="556" r="5"/><circle cx="370" cy="528" r="4"/></g>
</g>
""" + close_svg(particles(("#ff9c58", "#8a2d0e"), 23, 52, 80, 740))


def boss_gold() -> str:
    return open_svg("#f2ca67", "#2a1806") + f"""
<g>
  <!-- coin halo -->
  <g fill="none" stroke="#e6bd5b" stroke-width="2" opacity=".3">
    <circle cx="300" cy="260" r="232" stroke-dasharray="4 14"/>
    <circle cx="300" cy="260" r="258" stroke-dasharray="1 20"/>
  </g>
  <g fill="#e6bd5b" opacity=".55">
    <circle cx="86" cy="210" r="6"/><circle cx="512" cy="178" r="4"/><circle cx="526" cy="336" r="7"/><circle cx="64" cy="382" r="4"/>
  </g>
  <!-- body -->
  <path d="M12 760 L38 556 Q62 428 192 392 L236 362 Q300 420 364 362 L408 392 Q538 428 562 556 L588 760Z"
        fill="#170d09" stroke="#080403" stroke-width="6"/>
  <path d="M70 760 L94 580 Q114 486 218 452 Q300 506 382 452 Q486 486 506 580 L530 760Z" fill="#4c161b"/>
  <!-- fur collar -->
  <path d="M96 570 Q174 478 258 510 Q300 544 342 510 Q426 478 504 570 Q432 642 300 660 Q168 642 96 570Z"
        fill="#2a1c15" stroke="#0e0907" stroke-width="4"/>
  <g fill="none" stroke="#b28c5e" stroke-width="2" opacity=".35">
    <path d="M126 586 Q188 540 238 560 M474 586 Q412 540 362 560 M196 618 Q250 580 300 606 M404 618 Q350 580 300 606"/>
  </g>
  <!-- robe gold trim -->
  <path d="M152 620 L300 700 L448 620" fill="none" stroke="#d7ae53" stroke-width="5" opacity=".5"/>
  <g fill="#d7ae53" opacity=".7"><circle cx="300" cy="700" r="7"/><circle cx="242" cy="670" r="4"/><circle cx="358" cy="670" r="4"/></g>
  <!-- neck -->
  <path d="M260 390 L258 470 Q300 506 342 470 L340 390Z" fill="#9b7154"/>
  <!-- head -->
  <path d="M208 282 Q212 166 300 152 Q388 166 392 282 Q390 402 300 454 Q210 402 208 282Z" fill="#a87a5b"/>
  <path d="M226 280 Q232 192 300 180 Q368 192 374 280 Q372 376 300 418 Q228 376 226 280Z" fill="#bd8d68"/>
  <!-- cheekbone shadows -->
  <path d="M226 316 Q252 354 234 388 Q216 356 226 316Z" fill="#83583f" opacity=".55"/>
  <path d="M374 316 Q348 354 366 388 Q384 356 374 316Z" fill="#83583f" opacity=".55"/>
  <!-- crown -->
  <g>
    <path d="M168 190 L180 70 L232 146 L268 34 L300 132 L332 34 L368 146 L420 70 L432 190 Q300 244 168 190Z"
          fill="#e4bd5f" stroke="#7d5b1d" stroke-width="4"/>
    <path d="M190 178 L198 96 L236 158 L264 70 L286 146 L300 92 L314 146 L336 70 L364 158 L402 96 L410 178 Q300 218 190 178Z"
          fill="#f3d276"/>
    <g fill="#b83c3e"><circle cx="300" cy="154" r="10"/><circle cx="237" cy="154" r="7"/><circle cx="363" cy="154" r="7"/></g>
    <g fill="#ffecaa" opacity=".65"><circle cx="291" cy="146" r="3"/><circle cx="230" cy="148" r="2"/><circle cx="356" cy="148" r="2"/></g>
  </g>
  <!-- mask -->
  <path d="M220 288 Q226 236 300 228 Q374 236 380 288 Q374 344 300 356 Q226 344 220 288Z" fill="#d8ae51" stroke="#7b5a1e" stroke-width="2"/>
  <path d="M232 280 Q238 246 300 240 Q362 246 368 280 Q358 326 300 334 Q242 326 232 280Z" fill="#edc86b"/>
  <path d="M240 284 Q256 258 292 264 L286 300 Q260 300 240 284Z" fill="#17110c"/>
  <path d="M360 284 Q344 258 308 264 L314 300 Q340 300 360 284Z" fill="#17110c"/>
  <!-- coin eyes -->
  <circle cx="268" cy="282" r="15" fill="#f4d47c" stroke="#7d5a20" stroke-width="3"/>
  <circle cx="332" cy="282" r="15" fill="#f4d47c" stroke="#7d5a20" stroke-width="3"/>
  <circle cx="268" cy="282" r="7" fill="#8a6422"/><circle cx="332" cy="282" r="7" fill="#8a6422"/>
  <circle cx="264" cy="278" r="2.5" fill="#fff4c2"/><circle cx="328" cy="278" r="2.5" fill="#fff4c2"/>
  <path d="M300 294 L290 322 L300 330 L310 322Z" fill="#9a742e"/>
  <path d="M244 358 Q300 344 356 358 Q300 402 244 358Z" fill="#6f3138"/>
  <path d="M248 358 Q300 380 352 358" fill="none" stroke="#e9cf9e" stroke-width="2" opacity=".55"/>
  <path d="M338 368 Q356 364 364 352" fill="none" stroke="#8c3d46" stroke-width="2" opacity=".6"/>
  <!-- earrings / rings -->
  <circle cx="206" cy="326" r="10" fill="none" stroke="#e8c56c" stroke-width="3"/>
  <path d="M198 336 L194 354" stroke="#e8c56c" stroke-width="2"/>
  <circle cx="194" cy="360" r="4" fill="#b83c3e"/>
  <circle cx="394" cy="326" r="7" fill="none" stroke="#e8c56c" stroke-width="2"/>
  <!-- hand with cards -->
  <g transform="translate(474 628) rotate(-8)">
    <g transform="translate(-30 0) rotate(-18)">
      <rect x="-34" y="-58" width="68" height="100" rx="7" fill="#efe3c8" stroke="#9e7e42" stroke-width="2"/>
      <path d="M0 -38 L10 -16 L34 -12 L16 4 L20 28 L0 16 L-20 28 L-16 4 L-34 -12 L-10 -16Z" fill="#a63b3f"/>
    </g>
    <g transform="translate(22 0) rotate(12)">
      <rect x="-34" y="-58" width="68" height="100" rx="7" fill="#efe3c8" stroke="#9e7e42" stroke-width="2"/>
      <text x="0" y="4" font-family="Georgia, serif" font-size="42" fill="#6d2229" text-anchor="middle">K</text>
    </g>
    <path d="M-58 18 Q-24 40 16 38 Q54 34 64 8 Q76 42 38 60 Q-8 74 -54 48Z" fill="#bd8d68" stroke="#7b5238" stroke-width="3"/>
    <g fill="#e8c56c"><circle cx="-26" cy="44" r="5"/><circle cx="2" cy="50" r="5"/><circle cx="32" cy="44" r="5"/></g>
  </g>
</g>
""" + close_svg(particles(("#ffe293", "#b27c28"), 24, 46, 70, 740))


def boss_diamond() -> str:
    defs = """
  <linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#effeff"/><stop offset=".38" stop-color="#a9e8f2"/>
    <stop offset=".72" stop-color="#4b9eb3"/><stop offset="1" stop-color="#d9fbff"/>
  </linearGradient>
  <linearGradient id="crystal2" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#3a7d91" stop-opacity=".35"/><stop offset=".55" stop-color="#cdf9ff" stop-opacity=".7"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity=".2"/>
  </linearGradient>
  <linearGradient id="robe" x1=".2" y1="0" x2=".8" y2="1">
    <stop offset="0" stop-color="#386e7c"/><stop offset=".55" stop-color="#153540"/><stop offset="1" stop-color="#07171e"/>
  </linearGradient>
"""
    return open_svg("#b7f2fa", "#08222b", defs) + f"""
<g>
  <!-- six wings -->
  <g opacity=".82">
    <g fill="url(#crystal2)" stroke="#d6fbff" stroke-width="2" opacity=".55">
      <path d="M196 380 Q18 286 12 86 Q100 172 196 228 Q148 284 196 380Z"/>
      <path d="M404 380 Q582 286 588 86 Q500 172 404 228 Q452 284 404 380Z"/>
      <path d="M216 432 Q28 420 0 286 Q104 332 228 336Z"/>
      <path d="M384 432 Q572 420 600 286 Q496 332 372 336Z"/>
    </g>
    <g fill="#d9fbff" opacity=".35">
      <path d="M182 344 Q66 272 54 140 Q108 204 178 252Z"/>
      <path d="M418 344 Q534 272 546 140 Q492 204 422 252Z"/>
    </g>
    <g fill="none" stroke="#e6fdff" stroke-width="1.4" opacity=".55">
      <path d="M196 380 L64 178 M196 380 L112 308 M404 380 L536 178 M404 380 L488 308"/>
      <path d="M216 432 L84 366 M384 432 L516 366"/>
    </g>
  </g>
  <!-- body robe -->
  <path d="M118 760 L138 566 Q154 486 234 454 L260 438 Q300 474 340 438 L366 454 Q446 486 462 566 L482 760Z"
        fill="url(#robe)" stroke="#07151b" stroke-width="4"/>
  <path d="M170 560 L300 650 L430 560 L458 760 L142 760Z" fill="#2d6473" opacity=".65"/>
  <path d="M300 650 L334 760 L266 760Z" fill="#c9f8ff" opacity=".2"/>
  <g fill="none" stroke="#d6fbff" stroke-width="1.4" opacity=".4">
    <path d="M170 560 L300 650 L430 560"/><path d="M212 620 L300 650 M388 620 L300 650"/>
  </g>
  <!-- chest core -->
  <circle cx="300" cy="562" r="34" fill="#c9fbff" opacity=".2" filter="url(#blur8)"/>
  <path d="M300 526 L326 562 L300 598 L274 562Z" fill="url(#crystal)" stroke="#ecfeff" stroke-width="2"/>
  <circle cx="300" cy="562" r="8" fill="#ffffff" opacity=".9"/>
  <!-- neck / head -->
  <path d="M266 432 L262 494 Q300 520 338 494 L334 432Z" fill="#6fb6c3"/>
  <path d="M300 156 L394 306 L300 486 L206 306Z" fill="url(#crystal)" stroke="#e6feff" stroke-width="2.5"/>
  <path d="M300 156 L300 486 L206 306Z" fill="#dffbff" opacity=".22"/>
  <path d="M300 156 L394 306 L300 486Z" fill="#032a35" opacity=".16"/>
  <g fill="none" stroke="#f4feff" stroke-width="1.2" opacity=".5">
    <path d="M206 306 L300 366 L394 306 M300 156 L300 486 M250 228 L300 366 L350 228"/>
  </g>
  <!-- inner light / eye slit -->
  <path d="M300 244 L312 306 L300 348 L288 306Z" fill="#ffffff" opacity=".8" filter="url(#blur2)"/>
  <path d="M300 258 L305 306 L300 330 L295 306Z" fill="#eafeff"/>
  <!-- halo -->
  <g fill="none" stroke="#d8fbff" opacity=".65">
    <ellipse cx="300" cy="150" rx="132" ry="34" stroke-width="3"/>
    <ellipse cx="300" cy="150" rx="168" ry="48" stroke-width="1.2" stroke-dasharray="8 12" opacity=".7"/>
    <ellipse cx="300" cy="150" rx="98" ry="23" stroke-width="1" opacity=".4"/>
  </g>
  <!-- shards -->
  <g fill="url(#crystal)" stroke="#e6feff" stroke-width="1.2" opacity=".7">
    <path d="M114 214 L134 164 L154 218 L136 242Z"/>
    <path d="M450 196 L470 142 L492 200 L470 224Z"/>
    <path d="M132 500 L148 462 L164 504 L148 526Z"/>
    <path d="M448 490 L466 448 L484 492 L466 516Z"/>
  </g>
  <!-- collar -->
  <path d="M194 500 L300 590 L406 500 L430 566 L300 650 L170 566Z" fill="#0a222b" stroke="#8fe0ec" stroke-width="2" opacity=".9"/>
  <g fill="none" stroke="#b9f4fb" stroke-width="2" opacity=".4">
    <path d="M206 522 L300 594 L394 522"/>
  </g>
</g>
""" + close_svg(particles(("#dcfcff", "#4ea9bb"), 25, 60, 40, 740))


PORTRAITS = {
    "minion-rat": minion_rat,
    "minion-gargoyle": minion_gargoyle,
    "minion-forge": minion_forge,
    "minion-gilt": minion_gilt,
    "minion-crystal": minion_crystal,
    "boss-rat": boss_rat,
    "boss-stone": boss_stone,
    "boss-iron": boss_iron,
    "boss-gold": boss_gold,
    "boss-diamond": boss_diamond,
}


def main() -> None:
    for name, builder in PORTRAITS.items():
        (OUT / f"{name}.svg").write_text(builder(), encoding="utf-8")
    print(f"Generated {len(PORTRAITS)} portraits.")


if __name__ == "__main__":
    main()
