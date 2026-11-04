"""Compare hall candidates by the band the player actually sees.

A plate is never shown whole: the game crops it to rows 333..889 on the
desktop and 485..985 on a phone. Judging a candidate by its full source image
misleads - the top third of the source (ceiling, dome) never reaches the
screen. This composites each candidate into a real plate and stacks the
desktop band, so the comparison is apples to apples with the shipped game.

    python tools/_cmp_cands.py --src-root vibe_images/act1/r3 --acts act4,act5
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from _plate import EDGE_ROW_PLATE, compose, find_edge_row  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
DESKTOP_BAND = (333, 889)


def font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src-root", default="vibe_images/act1/r3")
    ap.add_argument("--acts", default="act4,act5")
    ap.add_argument("--cands", default="0,1,2")
    ap.add_argument("--edges", default="", help="act:cand=row,act:cand=row")
    ap.add_argument("--out", default="vibe_images/_cand_compare.png")
    ap.add_argument("--width", type=int, default=1000)
    args = ap.parse_args()

    src_root = ROOT / args.src_root
    edges = {}
    for item in filter(None, args.edges.split(",")):
        k, v = item.split("=")
        edges[k] = int(v)

    rows = []
    for act in args.acts.split(","):
        for cand in args.cands.split(","):
            p = src_root / act / f"{act}_cand{cand}.png"
            if not p.exists():
                continue
            img = Image.open(p).convert("RGB")
            row = edges.get(f"{act}:{cand}") or find_edge_row(img)
            plate = compose(img, row, EDGE_ROW_PLATE)
            band = plate.crop((0, DESKTOP_BAND[0], plate.width, DESKTOP_BAND[1]))
            band = band.resize((args.width, round(band.height * args.width / band.width)), Image.LANCZOS)
            rows.append((f"{act} cand{cand}  (edge row {row})", band))

    if not rows:
        raise SystemExit("nothing to compare")

    label_h = 28
    sheet = Image.new("RGB", (args.width, sum(b.height + label_h for _, b in rows)), (24, 21, 18))
    d = ImageDraw.Draw(sheet)
    f = font(18)
    y = 0
    for label, im in rows:
        d.text((8, 5), label, fill=(226, 210, 178), font=f)
        y += label_h
        sheet.paste(im, (0, y))
        y += im.height

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"compare -> {out} {sheet.size} ({len(rows)} bands)")


if __name__ == "__main__":
    main()
