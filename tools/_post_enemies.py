"""Post-process the enemy portraits: key the backdrop, build masters, install.

Reads <slug>/raw_<state>.png from vibe_images/enemies, produces
  assets/portraits/paper/states/<slug>/<state>.png        480x640
  assets/portraits/paper/states/<slug>/thumb-<state>.png  120x160
and keeps the 1200x1600 master in the staging folder.

Usage:
    python tools/_post_enemies.py                 # every slug that has raws
    python tools/_post_enemies.py --slug judge
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
STAGE = ROOT / "vibe_images" / "enemies"
GRAYPAW = ROOT / "vibe_images" / "graypaw"
INSTALL = ROOT / "assets" / "portraits" / "paper" / "states"
STATES = ("idle", "attack", "hit", "critical")

sys.path.insert(0, str(STAGE))
sys.path.insert(0, str(Path(__file__).parent))
import pipeline as P  # noqa: E402
import _keying  # noqa: E402


def has_alpha(im: Image.Image) -> bool:
    if im.mode != "RGBA":
        return False
    lo, _ = im.getchannel("A").getextrema()
    return lo < 8


def to_rgba(path: Path) -> Image.Image:
    """Return the subject as RGBA, keying the backdrop when necessary."""
    im = Image.open(path).convert("RGBA")
    if has_alpha(im):
        return im
    return _keying.key(path)


def fit_master(rgba: Image.Image, tw: int = 1200, th: int = 1600) -> Image.Image:
    s = min(tw / rgba.width, th / rgba.height)
    nw, nh = max(1, round(rgba.width * s)), max(1, round(rgba.height * s))
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.alpha_composite(rgba.resize((nw, nh), Image.LANCZOS), ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def detail(rgba: Image.Image, tw: int = 480, th: int = 640, margin: float = 0.94) -> Image.Image:
    """Bottom-aligned cut-out sized for the in-game detail frame."""
    bbox = rgba.getbbox()
    if bbox is None:
        return Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    cut = rgba.crop(bbox)
    s = min(tw * margin / cut.width, th * margin / cut.height)
    nw, nh = max(1, round(cut.width * s)), max(1, round(cut.height * s))
    cut = cut.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.alpha_composite(cut, ((tw - nw) // 2, th - nh))
    return canvas


def install(slug: str, state: str, source: Path) -> None:
    rgba = to_rgba(source)
    master = fit_master(rgba)
    sdir = STAGE / slug
    sdir.mkdir(parents=True, exist_ok=True)
    master.save(sdir / f"{state}_1200x1600.png")

    det = detail(master)
    adir = INSTALL / slug
    adir.mkdir(parents=True, exist_ok=True)
    det.save(adir / f"{state}.png")
    det.resize((120, 160), Image.LANCZOS).save(adir / f"thumb-{state}.png")
    cover = np.asarray(det.convert("RGBA"))[:, :, 3]
    pct = float((cover > 0).mean()) * 100
    print(f"installed {slug}/{state}  alpha-coverage {pct:.1f}%")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", default=None)
    args = ap.parse_args()

    slugs = [args.slug] if args.slug else [c["slug"] for c in P.CHARS]

    # graypaw is the in-game `rat` minion: reuse the existing reference art.
    rat_stage = STAGE / "rat"
    for state in STATES:
        src = GRAYPAW / state / f"graypaw-{state}_1200x1600.png"
        if src.exists():
            rat_stage.mkdir(parents=True, exist_ok=True)
            shutil_copy = src
            shutil_copy_dest = rat_stage / f"raw_{state}.png"
            if not shutil_copy_dest.exists():
                Image.open(src).convert("RGBA").save(shutil_copy_dest)
            install("rat", state, shutil_copy_dest)

    for slug in slugs:
        if slug == "rat":
            continue
        for state in STATES:
            raw = STAGE / slug / f"raw_{state}.png"
            if not raw.exists():
                print(f"missing raw {slug}/{state}")
                continue
            try:
                install(slug, state, raw)
            except Exception as exc:  # noqa: BLE001
                print(f"  FAILED {slug}/{state}: {exc}")


if __name__ == "__main__":
    main()
