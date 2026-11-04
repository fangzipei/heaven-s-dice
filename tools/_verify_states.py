"""Verify the enemy four-state portrait set is complete and installed correctly.

Checks every character slug from docs/enemy-prompts.md:
  assets/portraits/paper/states/<slug>/<state>.png        480x640 with real alpha
  assets/portraits/paper/states/<slug>/thumb-<state>.png  120x160
  vibe_images/enemies/<slug>/<state>_1200x1600.png        1200x1600 master

Usage:
    python tools/_verify_states.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
STAGE = ROOT / "vibe_images" / "enemies"
INSTALL = ROOT / "assets" / "portraits" / "paper" / "states"
STATES = ("idle", "attack", "hit", "critical")
SLUGS = [
    "rat", "gargoyle", "forge", "gilt", "crystal",
    "rotfang", "judge", "soulsmith", "ashclerk", "gildedking", "startax",
    "suspensor", "seraph", "lucifer", "twinsix", "toll", "mirror", "pairbane",
    "satan",
]


def alpha_stats(path: Path) -> tuple[str, float]:
    im = Image.open(path)
    if im.mode != "RGBA":
        return "no-alpha", 0.0
    a = np.asarray(im)[:, :, 3]
    return ("real" if int(a.min()) < 8 else "opaque"), float((a > 0).mean())


def main() -> None:
    bad: list[str] = []
    for slug in SLUGS:
        row = []
        for state in STATES:
            det = INSTALL / slug / f"{state}.png"
            thumb = INSTALL / slug / f"thumb-{state}.png"
            master = STAGE / slug / f"{state}_1200x1600.png"
            problems = []
            if not det.exists():
                problems.append("no detail")
            elif Image.open(det).size != (480, 640):
                problems.append(f"detail size {Image.open(det).size}")
            else:
                kind, cov = alpha_stats(det)
                if kind != "real":
                    problems.append(f"detail alpha {kind}")
                elif not 0.05 < cov < 0.85:
                    problems.append(f"coverage {cov:.2f}")
            if not thumb.exists():
                problems.append("no thumb")
            elif Image.open(thumb).size != (120, 160):
                problems.append(f"thumb size {Image.open(thumb).size}")
            if not master.exists():
                problems.append("no master")
            elif Image.open(master).size != (1200, 1600):
                problems.append(f"master size {Image.open(master).size}")
            row.append((state, problems))
            if problems:
                bad.append(f"{slug}/{state}: {', '.join(problems)}")
        flags = " ".join(f"{s}:{'ok' if not p else 'FAIL'}" for s, p in row)
        print(f"{slug:12s} {flags}")

    print()
    if bad:
        print(f"{len(bad)} problem(s):")
        for b in bad:
            print("  -", b)
        sys.exit(1)
    print(f"all {len(SLUGS)} slugs x {len(STATES)} states installed and valid")


if __name__ == "__main__":
    main()
