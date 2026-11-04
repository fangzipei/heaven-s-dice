"""Side-by-side crop of the PNG plate against its WebP encode.

The room plates are flat washes with thin ink lines on a grained paper. That is
the worst case for lossy compression, so this crops the same window out of both
files and stacks them for eyeball comparison.

    python tools/_webp_compare.py hall-gold --crop 380,60,620,380
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
SRC = ROOT / "assets" / "paper" / "tables"


def font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("name", help="hall-<x> without extension")
    ap.add_argument("--crop", default="380,60,620,380", help="left,top,right,bottom in plate pixels")
    ap.add_argument("--out", default="")
    ap.add_argument("--scale", type=int, default=1)
    args = ap.parse_args()

    png = SRC / f"{args.name}.png"
    webp = SRC / f"{args.name}.webp"
    if not webp.exists():
        raise SystemExit(f"{webp} missing")

    l, t, r, b = (int(v) for v in args.crop.split(","))
    a = Image.open(png).convert("RGB").crop((l, t, r, b))
    c = Image.open(webp).convert("RGB").crop((l, t, r, b))
    if args.scale != 1:
        a = a.resize((a.width * args.scale, a.height * args.scale), Image.LANCZOS)
        c = c.resize((c.width * args.scale, c.height * args.scale), Image.LANCZOS)

    label_h = 34
    sheet = Image.new("RGB", (a.width * 2 + 12, a.height + label_h * 2), (24, 21, 18))
    d = ImageDraw.Draw(sheet)
    f = font(20)
    d.text((8, 6), "PNG (original)", fill=(226, 210, 178), font=f)
    d.text((a.width + 20, 6), "WebP", fill=(226, 210, 178), font=f)
    sheet.paste(a, (0, label_h))
    sheet.paste(c, (a.width + 12, label_h))

    out = Path(args.out) if args.out else ROOT / "vibe_images" / f"_webp_{args.name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"compare -> {out} {sheet.size}")


if __name__ == "__main__":
    main()
