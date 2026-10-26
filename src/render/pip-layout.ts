// render/pip-layout.ts — 骰面点位的唯一来源。
//
// 3×3 网格，行列都从 0 开始。DOM 兜底渲染要的是格子序号（row * 3 + col），
// WebGL 贴画要的是 [row, col]。以前两张表分别写在 app.js 和 dice-3d.js 里，
// 改一处忘另一处就会出现“屏幕上和贴图上点位不一样”。
//
// 搬运时发现那两份在 **6 点**上确实不同：DOM 是经典骰子的“两列各三颗”，
// 贴图是“上下各三颗”。2026-10-26 已定：统一按贴图那套，DOM 跟着改。
// 其余 1..5 两边本来就一致。金标准见 tests/unit/pip-layout.test.mjs。
export type PipCell = readonly [row: number, col: number];

export const PIP_CELLS: Record<number, PipCell[]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

/** 贴图与 DOM 共用：[row, col] 列表；未知点数返回空表（调用方自己兜底）。 */
export function pipCells(value: number): PipCell[] {
  return PIP_CELLS[value] ?? [];
}

/** DOM：3×3 宫格序号（0..8）。 */
export function pipIndexes(value: number): number[] {
  return pipCells(value).map(([row, col]) => row * 3 + col);
}

/** 一格在 0..100 视图里的中心坐标；骰面画布和图鉴 SVG 都按这个摆点。 */
export const PIP_GRID_STOPS = [26, 50, 74] as const;

/** 100×100 视图里的点位坐标 [x, y]，图鉴页画骰面用。 */
export function pipPoints(value: number): [number, number][] {
  return pipCells(value).map(([row, col]) => [
    PIP_GRID_STOPS[col] as number,
    PIP_GRID_STOPS[row] as number,
  ]);
}
