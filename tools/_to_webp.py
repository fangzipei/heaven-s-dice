"""Convert the hall room plates from PNG to WebP.

The plates are 1600x1000 painted paper scenes: flat washes, thin ink lines and
a grain of paper texture. PNG keeps that grain losslessly but costs ~2.5 MB a
sheet; WebP carries it in a fraction of the bytes and every browser the game
targets (Edge/Chrome/Safari 14+) decodes it.

Usage:
    python tools/_to_webp.py --quality 82 --dry-run
    python tools/_to_webp.py --quality 82
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
SRC = ROOT / "assets" / "paper" / "tables"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--method", type=int, default=6)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pngs = sorted(SRC.glob("hall-*.png"))
    if not pngs:
        raise SystemExit("no hall-*.png found")

    png_total = 0
    webp_total = 0
    for p in pngs:
        out = p.with_suffix(".webp")
        if not args.dry_run:
            with Image.open(p) as im:
                im.save(out, "WEBP", quality=args.quality, method=args.method)
        png_total += p.stat().st_size
        webp_total += out.stat().st_size if out.exists() else 0

    print(f"quality={args.quality} method={args.method}")
    for p in pngs:
        out = p.with_suffix(".webp")
        before = p.stat().st_size
        after = out.stat().st_size if out.exists() else 0
        pct = (1 - after / before) * 100 if after else 0
        print(f"  {p.name:<20} {before/1024:8.0f}KB -> {after/1024:8.0f}KB  -{pct:5.1f}%")
    if webp_total:
        pct = (1 - webp_total / png_total) * 100
        print(f"  {'TOTAL':<20} {png_total/1024:8.0f}KB -> {webp_total/1024:8.0f}KB  -{pct:5.1f}%")


if __name__ == "__main__":
    main()
