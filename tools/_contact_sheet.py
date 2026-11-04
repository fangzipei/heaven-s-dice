"""Build a contact sheet (拼图) of portraits so a whole batch can be reviewed in one read.

Each cell sits on a checkerboard so a missing/partial alpha cut is obvious, and
each cell is captioned with its slug and state.

Usage:
    python tools/_contact_sheet.py --out sheet.png --src vibe_images/enemies --pattern "*/*_1200x1600.png"
    python tools/_contact_sheet.py --out sheet.png --src assets/portraits/paper/states --pattern "*/idle.png"
    python tools/_contact_sheet.py --out sheet.png --files a.png b.png
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
CELL_W, CELL_H = 300, 400
PAD = 8
LABEL_H = 26
COLS = 6


def checkerboard(w: int, h: int, size: int = 16) -> Image.Image:
    img = Image.new("RGB", (w, h), (232, 232, 232))
    d = ImageDraw.Draw(img)
    for y in range(0, h, size):
        for x in range(0, w, size):
            if (x // size + y // size) % 2:
                d.rectangle([x, y, x + size - 1, y + size - 1], fill=(198, 198, 198))
    return img


def collect(src: Path, pattern: str) -> list[Path]:
    if src.is_file():
        return [src]
    files = [p for p in sorted(src.glob(pattern)) if p.is_file()]
    return files


def build(files: list[Path], out: Path, cols: int = COLS) -> None:
    if not files:
        raise SystemExit("no files matched")
    rows = (len(files) + cols - 1) // cols
    w = cols * (CELL_W + PAD) + PAD
    h = rows * (CELL_H + LABEL_H + PAD) + PAD
    sheet = Image.new("RGB", (w, h), (40, 40, 46))
    draw = ImageDraw.Draw(sheet)

    for i, f in enumerate(files):
        r, c = divmod(i, cols)
        x = PAD + c * (CELL_W + PAD)
        y = PAD + r * (CELL_H + LABEL_H + PAD)
        cell = checkerboard(CELL_W, CELL_H)
        try:
            im = Image.open(f).convert("RGBA")
            im.thumbnail((CELL_W - 8, CELL_H - 8), Image.LANCZOS)
            cell.paste(im, ((CELL_W - im.width) // 2, (CELL_H - im.height) // 2), im)
        except Exception as exc:  # noqa: BLE001
            draw.text((x + 6, y + 6), f"ERR {exc}", fill=(255, 80, 80))
        sheet.paste(cell, (x, y))
        draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(90, 90, 100))
        label = f"{f.parent.name}/{f.stem.replace('_1200x1600', '').replace('thumb-', '')}"
        draw.text((x + 4, y + CELL_H + 6), label[:44], fill=(235, 235, 240))

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{out}  {len(files)} cells  {sheet.width}x{sheet.height}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "vibe_images" / "enemies"))
    ap.add_argument("--pattern", default="*/*_1200x1600.png")
    ap.add_argument("--files", nargs="*", default=None)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cols", type=int, default=COLS)
    args = ap.parse_args()

    files = [Path(x) for x in args.files] if args.files else collect(Path(args.src), args.pattern)
    build(files, Path(args.out), args.cols)


if __name__ == "__main__":
    main()
