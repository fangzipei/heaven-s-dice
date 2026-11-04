"""Check the hall plates against the table definitions they are supposed to match.

Each table in src/content/tables has a name, a material and an accent colour.
The plate has to agree with all three: a 钻石 table should read cool and
faceted, a 黄金 table should read gold, and the wall behind the dealer should
sit near the accent rather than fight it.

This reports, per plate:
  * the pure-black band the compositor left at the top (rows never shown in
    game, but dead weight in the asset)
  * the horizontal seam the compositor left at the bottom when it stretched the
    tabletop to fill the plate
  * the mean hue/saturation of the wall band the player actually sees
  * how far that wall is from the table's accent hue
"""
from __future__ import annotations

import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
TABLES = ROOT / "assets" / "paper" / "tables"

# art -> (act name, material, accent hex)
META = {
    "hall-wood": ("第一幕 · 门前的长队", "橡木", "#c0824d"),
    "hall-stone": ("第二幕 · 核销的窗口", "青石", "#93a4ac"),
    "hall-iron": ("第三幕 · 回炉重铸", "黑铁", "#d27146"),
    "hall-gold": ("第四幕 · 金漆告示", "黄金", "#e4bd61"),
    "hall-diamond": ("终幕 · 归处公示", "钻石", "#9ad8e7"),
}
# The band the player actually sees on a phone (the widest crop).
WALL_ROWS = (485, 600)
# Sample the wall itself, well above the desk edge: the counter and the lamp
# sit low in the frame and would drag the mean off the wall's own colour.
WALL_SAMPLE = (340, 500)


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def main() -> None:
    out = {}
    for art, (act, material, accent) in META.items():
        p = TABLES / f"{art}.webp"
        if not p.exists():
            p = TABLES / f"{art}.png"
        a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)

        # 1. black band at the top: rows whose pixels are all near-black
        dark = (a.max(axis=2) < 28).mean(axis=1)
        black_rows = 0
        for r in range(a.shape[0]):
            if dark[r] > 0.97:
                black_rows += 1
            else:
                break

        # 2. horizontal seam: the row with the sharpest brightness step
        lum = a.mean(axis=2)
        step = np.abs(np.diff(lum, axis=0)).mean(axis=1)
        seam = int(step[600:].argmax()) + 600

        # 3. wall band colour. A mean over the band is dragged around by one
        # bright lamp or one dark corner, so take the median hue of the
        # non-shadow pixels instead: that is the wall's own colour.
        lo, hi = WALL_SAMPLE
        wall = a[lo:hi].reshape(-1, 3)
        lum = wall.sum(axis=1)
        wall = wall[lum > np.percentile(lum, 20)]
        hues = []
        sats = []
        for px in wall:
            h, s, v = colorsys.rgb_to_hsv(*(int(c) / 255 for c in px))
            if s > 0.05:
                hues.append(h * 360)
                sats.append(s)
        hue = float(np.median(hues)) / 360 if hues else 0.0
        sat = float(np.median(sats)) if sats else 0.0
        val = 1.0
        r = g = b = 0

        ar, ag, ab = hex_to_rgb(accent)
        ahue, asat, aval = colorsys.rgb_to_hsv(ar / 255, ag / 255, ab / 255)
        dh = abs(hue - ahue) * 360
        dh = min(dh, 360 - dh)

        out[art] = {
            "act": act,
            "material": material,
            "accent": accent,
            "wall_mean_rgb": (r, g, b),
            "wall_hue_deg": round(hue * 360, 1),
            "wall_sat": round(sat, 3),
            "accent_hue_deg": round(ahue * 360, 1),
            "hue_delta_deg": round(dh, 1),
            "black_band_rows": black_rows,
            "brightness_seam_row": seam,
            "seam_step": round(float(step[seam - 600]), 2),
        }

    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
