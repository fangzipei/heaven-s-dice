/* render/pip-layout.ts is the single source for dice-face pip positions.
   Both goldens below are the literals as they were written in app.js (DOM) and
   dice-3d.js (WebGL texture) before the merge, so the dedup provably could not
   have moved a pip — except on face 6, where the two paths genuinely disagreed
   and the texture drawing was chosen as the winner on 2026-10-26. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  PIP_CELLS, pipCells, pipIndexes, pipPoints,
} from '../../src/render/pip-layout.ts';

/* 重构前 src/legacy/app.js:48 的字面量（DOM 九宫格序号）。 */
const LEGACY_PIP_MAP = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

/* 重构前 src/legacy/dice-3d.js:23 的字面量 —— 统一后就是它。 */
const LEGACY_PIP_LAYOUT = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

const FACES = [1, 2, 3, 4, 5, 6];

describe('pip layout keeps every pip where it was', () => {
  for (const face of FACES) {
    test(`texture face ${face} is untouched`, () => {
      expect(pipCells(face), `face ${face}`).toEqual(LEGACY_PIP_LAYOUT[face]);
    });
  }

  for (const face of [1, 2, 3, 4, 5]) {
    test(`dom face ${face} is untouched`, () => {
      expect(pipIndexes(face), `face ${face}`).toEqual(LEGACY_PIP_MAP[face]);
    });
  }

  test('dom face 6 moved to the texture drawing (approved art change)', () => {
    // 唯一一处故意制造的差异：DOM 从“两列各三颗”改成“上下各三颗”。
    expect(pipIndexes(6)).not.toEqual(LEGACY_PIP_MAP[6]);
    expect(pipIndexes(6)).toEqual([0, 1, 2, 6, 7, 8]);
  });

  test('the two render paths can no longer disagree', () => {
    for (const face of FACES) {
      expect(pipIndexes(face), `face ${face}`)
        .toEqual(pipCells(face).map(([row, col]) => row * 3 + col));
    }
    expect(Object.keys(PIP_CELLS).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  test('unknown faces give the callers an empty table, like before', () => {
    expect(pipCells(0)).toEqual([]);
    expect(pipIndexes(7)).toEqual([]);
    expect(pipCells(null)).toEqual([]);
    expect(pipPoints(0)).toEqual([]);
  });

  test('pipPoints maps the same grid into the 100x100 codex viewBox', () => {
    expect(pipPoints(1)).toEqual([[50, 50]]);
    expect(pipPoints(6)).toEqual([[26, 26], [50, 26], [74, 26], [26, 74], [50, 74], [74, 74]]);
  });
});

describe('the duplicated tables are really gone', () => {
  test('app.js and dice-3d.js read the layout from src/render', () => {
    const app = readFileSync(new URL('../../src/legacy/app.js', import.meta.url), 'utf8');
    const gl = readFileSync(new URL('../../src/legacy/dice-3d.js', import.meta.url), 'utf8');
    for (const [name, source] of [['app.js', app], ['dice-3d.js', gl]]) {
      expect(source, `${name} must not keep its own pip table`).not.toMatch(/\bPIP_(MAP|LAYOUT)\s*=\s*\{/);
    }
    /* app.js 原本是 DOM 侧唯一的读取方；3c 之后点字排版在教程屏，骰面在
       render/dice-dom.ts，两边都必须走共享表。 */
    const tutorial = readFileSync(new URL('../../src/ui/screens/tutorial.ts', import.meta.url), 'utf8');
    const dom = readFileSync(new URL('../../src/render/dice-dom.ts', import.meta.url), 'utf8');
    for (const [name, source] of [['tutorial.ts', tutorial], ['dice-dom.ts', dom], ['dice-3d.js', gl]]) {
      expect(source, `${name} imports the shared layout`).toMatch(/pip-layout\.ts/);
    }
  });

  test('the codex builder derives its faces from the same table', () => {
    const codex = readFileSync(new URL('../../tools/build-codex.mjs', import.meta.url), 'utf8');
    expect(codex, 'build-codex must not hand-place pips a third time').not.toMatch(/\bconst PIPS\s*=/);
    expect(codex).toMatch(/render\/pip-layout\.ts/);
  });
});
