"""Locate the far edge of the table in a generated room plate.

The composition is judged by one number: the row (as a fraction of the image
height) where the tabletop's far edge sits. The art must place it so the
dealer's card lands on the other side of it.

    python tools/_find_table_edge.py vibe_images/act1/d/act1_cand0.png
"""
from __future__ import annotations

import sys

import numpy as np
from PIL import Image


def edge_profile(img: Image.Image) -> np.ndarray:
    """Mean absolute vertical luminance change per row."""
    a = np.asarray(img.convert("L"), dtype=np.float32)
    grad = np.abs(np.diff(a, axis=0))
    # Ignore the outer 6% so a paper border does not dominate.
    cols = grad[:, int(grad.shape[1] * 0.06):int(grad.shape[1] * 0.94)]
    return cols.mean(axis=1)


def main() -> None:
    for path in sys.argv[1:]:
        img = Image.open(path)
        prof = edge_profile(img)
        h = img.height
        # The table edge is the strongest horizontal line in the lower half.
        lo = int(len(prof) * 0.30)
        hi = int(len(prof) * 0.92)
        window = prof[lo:hi]
        row = lo + int(window.argmax())
        # A second, looser pass: strongest line in the middle third.
        lo2, hi2 = int(len(prof) * 0.35), int(len(prof) * 0.75)
        row2 = lo2 + int(prof[lo2:hi2].argmax())
        print(f"{path}")
        print(f"  size {img.size}")
        print(f"  strongest lower edge : row {row} ({row / h:.1%})")
        print(f"  strongest mid edge   : row {row2} ({row2 / h:.1%})")


if __name__ == "__main__":
    main()
