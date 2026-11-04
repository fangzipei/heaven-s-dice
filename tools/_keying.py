"""Key a bright studio backdrop out of a paper-puppet render.

The generator answers "isolated on a fully transparent background" with a flat
white (or near-white) studio card.  Simple thresholding is not enough: some
enemies are pale enough that parts of their body are the same value as the
backdrop.  So the backdrop is found by *connectivity* instead of by colour
alone: only the bright regions that actually reach the image border are
backdrop.  Bright pockets trapped inside the figure stay opaque.

Connected components are computed with a row-run union-find, which keeps the
whole thing vectorised enough to run on 1792x2400 renders.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

# a candidate backdrop pixel must be this close to the backdrop colour ...
DIST_TOL = 14.0
# ... this bright ...
MIN_LUM = 205.0
# ... and this unsaturated
MAX_SAT = 30.0
# an enclosed bright pocket is a see-through gap when it is this flat ...
GAP_MEAN_DIST = 8.0
# ... this neutral ...
GAP_MEAN_SAT = 4.0
# ... and this large (fraction of the frame).  Anything smaller is treated as a
# pale highlight on the figure instead of a hole.
GAP_MIN_FRACTION = 0.005
# specks smaller than this (as a fraction of the frame) are dropped
SPECK_FRACTION = 0.0004


def _row_runs(row: np.ndarray) -> list[tuple[int, int]]:
    """True runs of a 1-D boolean array as inclusive (start, end) pairs."""
    if not row.any():
        return []
    padded = np.concatenate(([0], row.astype(np.int8), [0]))
    diff = np.diff(padded)
    starts = np.flatnonzero(diff == 1)
    ends = np.flatnonzero(diff == -1) - 1
    return list(zip(starts.tolist(), ends.tolist()))


class _Union:
    def __init__(self) -> None:
        self.parent: list[int] = []

    def make(self) -> int:
        self.parent.append(len(self.parent))
        return len(self.parent) - 1

    def find(self, x: int) -> int:
        p = self.parent
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[max(ra, rb)] = min(ra, rb)


def _label(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """Label 4-connected components of a boolean mask.

    Returns (labels, count).  Label 0 means "not in the mask"; components are
    numbered from 1.
    """
    h, w = mask.shape
    uf = _Union()
    labels = np.zeros((h, w), np.int32)
    prev: list[tuple[int, int, int]] = []  # (start, end, label)
    for y in range(h):
        runs = _row_runs(mask[y])
        cur: list[tuple[int, int, int]] = []
        for s, e in runs:
            lab = -1
            for ps, pe, pl in prev:
                if ps <= e and s <= pe:
                    if lab < 0:
                        lab = pl
                    else:
                        uf.union(lab - 1, pl - 1)
            if lab < 0:
                lab = uf.make() + 1
            cur.append((s, e, lab))
            labels[y, s:e + 1] = lab
        prev = cur
    n = len(uf.parent)
    roots = sorted({uf.find(i) for i in range(n)})
    remap = {r: idx + 1 for idx, r in enumerate(roots)}
    lookup = np.zeros(n + 1, np.int32)
    for i in range(n):
        lookup[i + 1] = remap[uf.find(i)]
    return lookup[labels], len(roots)


def _dilate(mask: np.ndarray, r: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(r):
        nxt = out.copy()
        nxt[1:] |= out[:-1]
        nxt[:-1] |= out[1:]
        nxt[:, 1:] |= out[:, :-1]
        nxt[:, :-1] |= out[:, 1:]
        out = nxt
    return out


def _backdrop_color(rgb: np.ndarray) -> np.ndarray:
    """Median colour of the frame border."""
    h, w, _ = rgb.shape
    strips = [
        rgb[:3, :, :].reshape(-1, 3),
        rgb[-3:, :, :].reshape(-1, 3),
        rgb[:, :3, :].reshape(-1, 3),
        rgb[:, -3:, :].reshape(-1, 3),
    ]
    return np.median(np.concatenate(strips), axis=0)


def _min_filter(a: np.ndarray, r: int) -> np.ndarray:
    """Separable min filter; non-finite entries are ignored."""
    big = np.inf
    h, w = a.shape
    pad = np.pad(a, r, constant_values=big)
    rows = pad[:h, :]
    for d in range(2 * r + 1):
        rows = np.minimum(rows, pad[d:d + h, :])
    cols = np.pad(rows, ((0, 0), (r, r)), constant_values=big)
    out = cols[:, :w]
    for d in range(2 * r + 1):
        out = np.minimum(out, cols[:, d:d + w])
    return out


def _mask_from_labels(labels: np.ndarray, count: int, keep) -> np.ndarray:
    """Boolean mask of the label ids in `keep` (O(N), unlike np.isin with a list)."""
    lut = np.zeros(count + 1, bool)
    ids = [int(i) for i in keep]
    if ids:
        lut[ids] = True
    return lut[labels]


def key(path) -> Image.Image:
    """Return the figure as RGBA with the studio backdrop removed."""
    im = Image.open(path)
    if im.mode == "RGBA" and im.getchannel("A").getextrema()[0] < 8:
        return im  # already transparent
    rgb = np.asarray(im.convert("RGB")).astype(np.float64)
    h, w, _ = rgb.shape

    b_col = _backdrop_color(rgb)
    dist = np.linalg.norm(rgb - b_col, axis=2)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    cand = (dist < DIST_TOL) & (lum > MIN_LUM) & (sat < MAX_SAT)

    # only the bright regions that reach the frame border are backdrop
    labels, count = _label(cand)
    border_labels = set()
    for edge in (labels[0], labels[-1], labels[:, 0], labels[:, -1]):
        border_labels.update(int(v) for v in np.unique(edge) if v)
    bg = _mask_from_labels(labels, count, border_labels) if border_labels else np.zeros_like(cand)

    # A bright pocket enclosed by the figure is either a see-through gap or a
    # pale highlight.  A gap shows the flat neutral backdrop over a large area;
    # a highlight is shaded, tinted, or small.  Only clear gaps are removed.
    pockets = cand & ~bg
    if pockets.any():
        plabels, pcount = _label(pockets)
        counts = np.bincount(plabels.ravel(), minlength=pcount + 1)
        sums = np.bincount(plabels.ravel(), weights=dist.ravel(), minlength=pcount + 1)
        sats = np.bincount(plabels.ravel(), weights=sat.ravel(), minlength=pcount + 1)
        min_area = max(64, int(GAP_MIN_FRACTION * h * w))
        gaps = []
        for i in range(1, pcount + 1):
            n = counts[i]
            if n < min_area:
                continue
            if sums[i] / n < GAP_MEAN_DIST and sats[i] / n < GAP_MEAN_SAT:
                gaps.append(i)
        if gaps:
            bg |= _mask_from_labels(plabels, pcount, gaps)

    subject = ~bg

    # drop specks, keep the figure and any detached shards
    slabels, scount = _label(subject)
    if scount:
        areas = np.bincount(slabels.ravel(), minlength=scount + 1)
        areas[0] = 0
        min_area = max(24, int(SPECK_FRACTION * h * w))
        keep = [i for i in range(1, scount + 1) if areas[i] >= min_area]
        subject = _mask_from_labels(slabels, scount, keep) if keep else np.zeros_like(subject)

    # ---- soft edge + white-fringe removal -------------------------------
    band = _dilate(bg, 2) & subject
    # local "solid" luminance: the darkest subject pixel in a small window,
    # which for this ink-outlined art is the interior colour just inside the
    # edge.  C = a*S + (1-a)*B  =>  a = (C-B)/(S-B).
    solid = _min_filter(np.where(subject, lum, np.inf), 3)
    b_lum = float(b_col.mean())
    den = np.maximum(b_lum - solid, 1.0)
    a_est = np.clip((b_lum - lum) / den, 0.0, 1.0)

    alpha = np.where(subject, 255.0, 0.0)
    alpha[band] = a_est[band] * 255.0

    out_rgb = rgb.copy()
    edge = band & (alpha > 0) & (alpha < 255)
    if edge.any():
        a = alpha[edge] / 255.0
        safe = np.maximum(a, 1e-3)
        out_rgb[edge] = np.clip(
            (rgb[edge] - (1 - a)[:, None] * b_col[None, :]) / safe[:, None], 0, 255
        )

    return Image.fromarray(np.dstack([out_rgb, alpha]).astype(np.uint8), "RGBA")
