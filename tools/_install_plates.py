"""Install the painted hall plates into the game.

Takes the generated scene art, composes it into the game's room plate (the
desk edge pinned to a fixed plate row, so the game's two crops both land it
under the dealer) and drops it in as assets/paper/tables/hall-<art>.webp. The
matching table definition is switched over to the new file.

    python tools/_install_plates.py act1:wood:0 act2:stone:0 ...
    python tools/_install_plates.py act1:wood:0,888   # explicit source row
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from _plate import EDGE_ROW_PLATE, compose, find_edge_row  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
# The plates ship as WebP; the game crops them hard, so the encode only has to
# survive a re-scale, not hold every paper grain losslessly.
WEBP_QUALITY = 82


def build_plate(src: Path, out: Path, edge_row: int | None) -> None:
    img = Image.open(src).convert("RGB")
    row = edge_row if edge_row is not None else find_edge_row(img)
    plate = compose(img, row, EDGE_ROW_PLATE)
    out.parent.mkdir(parents=True, exist_ok=True)
    plate.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    print(f"  edge row {row} -> {out.name} ({out.stat().st_size // 1024} KB)")


def set_art(table: str, art: str) -> None:
    path = ROOT / "src" / "content" / "tables" / f"{table}.ts"
    text = path.read_text(encoding="utf-8")
    old = f"art: '{table}'"
    new = f"art: 'hall-{art}'"
    if new in text:
        print(f"  {table}.ts already points at {new}")
        return
    if old not in text:
        raise SystemExit(f"{path}: cannot find {old!r}")
    path.write_text(text.replace(old, new), encoding="utf-8")
    print(f"  {table}.ts -> {new}")


def main() -> None:
    args = sys.argv[1:]
    src_root = ROOT / "vibe_images" / "act1" / "r2"
    if "--src-root" in args:
        i = args.index("--src-root")
        src_root = Path(args[i + 1])
        if not src_root.is_absolute():
            src_root = ROOT / src_root
        del args[i:i + 2]
    specs = args
    if not specs:
        raise SystemExit(__doc__)
    for spec in specs:
        act, table, cand = spec.split(":")
        edge_row = None
        if "," in cand:
            cand, edge_row = cand.split(",")
            edge_row = int(edge_row)
        src = src_root / act / f"{act}_cand{cand}.png"
        print(f"{act} -> {table}")
        build_plate(src, ROOT / "assets" / "paper" / "tables" / f"hall-{table}.webp", edge_row)
        set_art(table, table)


if __name__ == "__main__":
    main()
