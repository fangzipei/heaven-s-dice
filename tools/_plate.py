"""Compose an AI scene into the 1600x1000 room plate the game actually uses.

The game crops the room art, so a plate is not a picture that gets shown
whole:

    desktop   `background-size: 150% auto` / `center 75%`  -> plate rows 344..892
    phone     `background-size: auto 200%` / `center 97%`  -> plate rows 485..985

Only rows 344..985 are ever on screen, so that band has to hold the whole
composition. The desk's far edge is pinned to plate row 600 (60% down), which
puts it under the dealer's portrait on the desktop and under the dealer's name
tag on a phone.

    python tools/_plate.py --src vibe_images/act1/r2/act1/act1_cand0.png \
        --out vibe_images/act1/act1_plate.png
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

PLATE_W, PLATE_H = 1600, 1000
# Row of the tabletop's far edge inside the plate.
EDGE_ROW_PLATE = 600
# The band the game can ever show.
VISIBLE = (344, 985)


def find_edge_row(img: Image.Image) -> int:
    """Row of the tabletop's far edge: strongest horizontal line in the lower half."""
    import numpy as np

    a = np.asarray(img.convert("L"), dtype=np.float32)
    grad = np.abs(np.diff(a, axis=0))
    cols = grad[:, int(grad.shape[1] * 0.06):int(grad.shape[1] * 0.94)]
    prof = cols.mean(axis=1)
    lo, hi = int(len(prof) * 0.30), int(len(prof) * 0.92)
    return lo + int(prof[lo:hi].argmax())


def compose(img: Image.Image, edge_row: int, edge_row_plate: int = EDGE_ROW_PLATE) -> Image.Image:
    """Scale the scene to the plate width and slide it so the desk edge lands
    on `edge_row_plate`. Anything the shift leaves empty is filled by
    continuing the neighbouring rows, which on this art means plain wall or
    plain tabletop.

    The bottom is the tricky one: the source is 16:9 and the plate is 16:10, so
    the tabletop almost never reaches the bottom of the plate. Stretching the
    last rows into the gap would repeat that band and leave a hard seam across
    the foreground, so the gap is filled with a *continuous* stretch of the
    tabletop instead: the tail rows are resampled past the edge and only the
    part below the edge is kept, which keeps the plank grain running through
    the join.
    """
    scale = PLATE_W / img.width
    scaled = img.resize((PLATE_W, max(1, round(img.height * scale))), Image.LANCZOS)

    shift = edge_row_plate - edge_row * scale
    top_cut = max(0, -int(round(shift)))
    body = scaled.crop((0, top_cut, PLATE_W, scaled.height))
    y = max(0, int(round(shift + top_cut)))

    if body.height + y < PLATE_H:
        need = PLATE_H - y - body.height
        original = body
        # Resample a band that reaches past the join and keep only the part
        # below it, so the texture runs through the seam instead of jumping.
        src_h = min(original.height, max(need, need * 2))
        src = original.crop((0, original.height - src_h, PLATE_W, original.height))
        stretched = src.resize((PLATE_W, src_h + need), Image.LANCZOS)
        tail = stretched.crop((0, src_h, PLATE_W, src_h + need))
        body = Image.new("RGB", (PLATE_W, original.height + need))
        body.paste(original, (0, 0))
        body.paste(tail, (0, original.height))
    elif body.height + y > PLATE_H:
        body = body.crop((0, 0, PLATE_W, PLATE_H - y))

    plate = Image.new("RGB", (PLATE_W, PLATE_H), (24, 18, 14))
    plate.paste(body, (0, max(0, y)))
    return plate


def build(src: Path, out: Path, edge_row: int | None, edge_row_plate: int) -> None:
    img = Image.open(src).convert("RGB")
    row = edge_row if edge_row is not None else find_edge_row(img)
    plate = compose(img, row, edge_row_plate)
    out.parent.mkdir(parents=True, exist_ok=True)
    plate.save(out)
    preview = plate.crop((0, VISIBLE[0], PLATE_W, VISIBLE[1]))
    preview_path = out.with_name(out.stem + "_visible.png")
    preview.save(preview_path)
    print(f"plate   -> {out} {plate.size} (desk edge pinned to row {edge_row_plate})")
    print(f"visible -> {preview_path} {preview.size}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--edge-row", type=int, default=None, help="source row of the desk edge")
    ap.add_argument("--edge-row-plate", type=int, default=EDGE_ROW_PLATE)
    args = ap.parse_args()
    build(Path(args.src), Path(args.out), args.edge_row, args.edge_row_plate)


if __name__ == "__main__":
    main()
