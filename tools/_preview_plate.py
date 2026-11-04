"""Preview the two bands the game can actually show, for one hall plate.

    desktop  plate rows 333..889   (background-size: auto 180%)
    phone    plate rows 485..985   (background-size: auto 200%)

Stacking the two bands shows the desk edge, the dealer's seat and any seam the
compositor left in the tabletop, without booting the game.

    python tools/_preview_plate.py hall-gold --out vibe_images/_preview_gold.png
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
SRC = ROOT / "assets" / "paper" / "tables"

BANDS = [("desktop  rows 333-889", (333, 889)), ("phone  rows 485-985", (485, 985))]


def font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--out", default="")
    ap.add_argument("--width", type=int, default=900)
    args = ap.parse_args()

    plate = Image.open(SRC / f"{args.name}.webp").convert("RGB")
    w = args.width
    label_h = 30
    pieces = []
    for _, (lo, hi) in BANDS:
        band = plate.crop((0, lo, plate.width, hi))
        pieces.append(band.resize((w, round(band.height * w / band.width)), Image.LANCZOS))

    sheet = Image.new("RGB", (w, sum(p.height + label_h for p in pieces)), (24, 21, 18))
    d = ImageDraw.Draw(sheet)
    f = font(18)
    y = 0
    for (label, _), im in zip(BANDS, pieces):
        d.text((8, 6), label, fill=(226, 210, 178), font=f)
        y += label_h
        sheet.paste(im, (0, y))
        y += im.height

    out = Path(args.out) if args.out else ROOT / "vibe_images" / f"_preview_{args.name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"preview -> {out} {sheet.size}")


if __name__ == "__main__":
    main()
