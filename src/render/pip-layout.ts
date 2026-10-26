// render/pip-layout.ts — 骰面点位的唯一来源。
//
// 3×3 网格，行列都从 0 开始。DOM 兜底渲染要的是格子序号（row * 3 + col），
// WebGL 贴画要的是 [row, col]。以前两张表分别写在 app.js 和 dice-3d.js 里，
// 改一处忘另一处就会出现“屏幕上和贴图上点位不一样”。
//
// 注意：搬运时发现这两份并不完全相同 —— **6 点**在 DOM 里是经典骰子的
// “两列各三颗”，在贴图上却是“上下各三颗”。其余 1..5 完全一致。
// 这里先如实保留两套（行为零变化），要不要统一成一套属于美术决定，
// 见 tests/unit/pip-layout.test.mjs 里冻结的两份金标准。
export type PipCell = readonly [row: number, col: number];

/** WebGL 贴图（dice-3d.js 画的六面）用的点位。 */
export const PIP_TEXTURE: Record<number, PipCell[]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

/** DOM 兜底渲染（.die-face 的九宫格）用的点位。 */
export const PIP_DOM: Record<number, PipCell[]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/** 贴图：[row, col] 列表；未知点数返回空表（调用方自己兜底）。 */
export function pipCells(value: number): PipCell[] {
  return PIP_TEXTURE[value] ?? [];
}

/** DOM：3×3 宫格序号（0..8），与旧 app.js 的 PIP_MAP 逐项相同。 */
export function pipIndexes(value: number): number[] {
  return (PIP_DOM[value] ?? []).map(([row, col]) => row * 3 + col);
}
