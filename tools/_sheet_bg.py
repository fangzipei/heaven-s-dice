"""Stack the Act 1 background mockups into one labelled sheet for review."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")

LABELS = [
    ("{p}_0_plate", "0 · 底板（不加 UI）"),
    ("{p}_2_ui", "2 · 加 UI"),
    ("{p}_3_enemy", "3 · 加敌人"),
    ("{p}_4_dice", "4 · 加骰子"),
    ("{p}_3b_enemy_only", "3b · 只有敌人（无 UI）"),
    ("{p}_4b_dice_only", "4b · 只有骰子（无 UI）"),
    ("{p}_5_full", "5 · 完整 UI（情报栏展开）"),
]


def font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="vibe_images/act1")
    ap.add_argument("--out", default="vibe_images/act1/_review_sheet.png")
    ap.add_argument("--prefix", default="act1")
    ap.add_argument("--width", type=int, default=1200)
    args = ap.parse_args()

    src = ROOT / args.dir
    shots = []
    for stem, label in LABELS:
        p = src / f"{stem.format(p=args.prefix)}.png"
        if p.exists():
            shots.append((label, Image.open(p).convert("RGB")))
    if not shots:
        raise SystemExit("no mockups found")

    w = args.width
    label_h = 40
    scaled = [im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) for _, im in shots]
    total_h = sum(im.height + label_h for im in scaled) + label_h
    sheet = Image.new("RGB", (w, total_h), (24, 21, 18))
    draw = ImageDraw.Draw(sheet)
    f = font(22)
    y = 0
    for (label, _), im in zip(shots, scaled):
        draw.text((16, y + 8), label, fill=(226, 210, 178), font=f)
        y += label_h
        sheet.paste(im, (0, y))
        y += im.height
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"sheet -> {out} {sheet.size} ({len(shots)} shots)")


if __name__ == "__main__":
    main()
