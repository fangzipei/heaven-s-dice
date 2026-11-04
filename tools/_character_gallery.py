"""Gather every generated portrait into one browsable folder per character.

Each character ends up with a single directory that holds every tier of the
art, linked (not copied) so the 270 MB of masters stay on disk once:

    vibe_images/characters/<slug>/
      master/<state>.png    1200x1600 keyed cut-out
      raw/<state>.png       the model output before keying
      detail/<state>.png    480x640 runtime cut-out
      thumb/<state>.png     120x160 runtime thumb
      legacy/<art>.svg      the old single-pose portrait of the same art id
      sheet.png             2x2 contact sheet of the four states

Usage:
    python tools/_character_gallery.py
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
STAGE = ROOT / "vibe_images" / "enemies"
RUNTIME = ROOT / "assets" / "portraits" / "paper" / "states"
LEGACY = ROOT / "assets" / "portraits" / "paper"
OUT = ROOT / "vibe_images" / "characters"

STATES = ("idle", "attack", "hit", "critical")
LABELS = {"idle": "常态", "attack": "攻击", "hit": "受击", "critical": "残血"}

CELL_W, CELL_H = 380, 510
PAD = 10
HEADER_H = 78
FONT_PATH = r"C:\Windows\Fonts\msyh.ttc"


def link(src: Path, dst: Path) -> None:
    """Hard link src to dst, falling back to a copy across volumes."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() or dst.is_symlink():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def checkerboard(w: int, h: int, size: int = 16) -> Image.Image:
    img = Image.new("RGB", (w, h), (234, 234, 236))
    d = ImageDraw.Draw(img)
    for y in range(0, h, size):
        for x in range(0, w, size):
            if (x // size + y // size) % 2:
                d.rectangle([x, y, x + size - 1, y + size - 1], fill=(200, 200, 204))
    return img


def font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT_PATH, size)
    except OSError:
        return ImageFont.load_default()


def sheet_for(slug: str, name: str, kind: str, art: str, sources: dict[str, Path], out: Path) -> None:
    cols = 2
    rows = 2
    w = cols * (CELL_W + PAD) + PAD
    h = HEADER_H + rows * (CELL_H + 26 + PAD) + PAD
    canvas = Image.new("RGB", (w, h), (38, 38, 44))
    draw = ImageDraw.Draw(canvas)

    draw.text((PAD + 4, 12), f"{name}  ·  {kind}  ·  {slug}", font=font(30), fill=(245, 240, 228))
    draw.text((PAD + 4, 48), f"art id: {art}", font=font(17), fill=(170, 168, 178))

    for i, state in enumerate(STATES):
        r, c = divmod(i, cols)
        x = PAD + c * (CELL_W + PAD)
        y = HEADER_H + r * (CELL_H + 26 + PAD)
        cell = checkerboard(CELL_W, CELL_H)
        src = sources.get(state)
        if src and src.exists():
            im = Image.open(src).convert("RGBA")
            im.thumbnail((CELL_W - 10, CELL_H - 10), Image.LANCZOS)
            cell.paste(im, ((CELL_W - im.width) // 2, (CELL_H - im.height) // 2), im)
        canvas.paste(cell, (x, y))
        draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline=(92, 92, 102))
        draw.text((x + 4, y + CELL_H + 5), f"{LABELS[state]}  {state}", font=font(18), fill=(226, 226, 232))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)


def main() -> None:
    chars = json.loads((STAGE / "_characters.json").read_text(encoding="utf-8"))
    report = []
    no_legacy = []
    for c in chars:
        slug = c["slug"]
        name = c["name"]
        kind = "Boss" if c.get("kind") == "boss" else "Minion"
        art = c["art"]
        cdir = OUT / slug
        cdir.mkdir(parents=True, exist_ok=True)

        sources = {}
        for state in STATES:
            master = STAGE / slug / f"{state}_1200x1600.png"
            if master.exists():
                link(master, cdir / "master" / f"{state}.png")
            raw = STAGE / slug / f"raw_{state}.png"
            if not raw.exists():
                raw = STAGE / slug / f"raw_{state}.jpg"
            if raw.exists():
                link(raw, cdir / "raw" / f"{state}.png")
            detail = RUNTIME / slug / f"{state}.png"
            if detail.exists():
                link(detail, cdir / "detail" / f"{state}.png")
                sources[state] = detail
            thumb = RUNTIME / slug / f"thumb-{state}.png"
            if thumb.exists():
                link(thumb, cdir / "thumb" / f"{state}.png")

        legacy = LEGACY / f"{art}.svg"
        if legacy.exists():
            link(legacy, cdir / "legacy" / f"{art}.svg")
        else:
            no_legacy.append(f"{name}（`{art}`）")

        sheet_for(slug, name, kind, art, sources, cdir / "sheet.png")
        report.append((name, slug, kind, art))

    lines = [
        "# 角色立绘图库",
        "",
        "每个角色一个文件夹，汇总了同一角色的全部素材层级（硬链接，不额外占用磁盘）：",
        "",
        "```text",
        "vibe_images/characters/<slug>/",
        "  master/   1200x1600 抠图母版",
        "  raw/      模型原始输出（抠图前）",
        "  detail/   480x640 运行时详情图",
        "  thumb/    120x160 运行时缩略图",
        "  legacy/   旧版单张 SVG 画像（同 art id）",
        "  sheet.png 四态拼图（常态/攻击/受击/残血）",
        "```",
        "",
        "| 角色 | id | 类型 | art id | 四态拼图 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for name, slug, kind, art in report:
        lines.append(f"| {name} | `{slug}` | {kind} | `{art}` | [sheet]({slug}/sheet.png) |")
    lines += [
        "",
        "运行时的实际取图路径仍是 `assets/portraits/paper/states/<slug>/<state>.png`；",
        "本目录只是同一批文件的浏览/校对视图。",
        "",
    ]
    if no_legacy:
        lines += [
            "缺少旧版 SVG 的角色（该 art id 从未有过单张画像，只有四态图）：",
            "",
        ]
        lines += [f"- {x}" for x in no_legacy]
        lines.append("")
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"built {len(report)} character folders under {OUT}")


if __name__ == "__main__":
    sys.exit(main())
