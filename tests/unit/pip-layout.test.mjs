/* render/pip-layout.ts is the single source for dice-face pip positions.
   The two tables are frozen here exactly as they were written in app.js (DOM)
   and dice-3d.js (WebGL texture) before the merge, so the dedup provably could
   not have moved a pip. Face 6 genuinely differed between the two paths — that
   difference is preserved on purpose and called out below. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  PIP_DOM, PIP_TEXTURE, pipCells, pipIndexes,
} from '../../src/render/pip-layout.ts';

/* 重构前 src/legacy/app.js:48 的字面量。 */
const LEGACY_PIP_MAP = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

/* 重构前 src/legacy/dice-3d.js:23 的字面量。 */
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
    test(`dom face ${face}`, () => {
      expect(pipIndexes(face), `face ${face}`).toEqual(LEGACY_PIP_MAP[face]);
    });
    test(`texture face ${face}`, () => {
      expect(pipCells(face), `face ${face}`).toEqual(LEGACY_PIP_LAYOUT[face]);
    });
  }

  test('unknown faces give the callers an empty table, like before', () => {
    expect(pipCells(0)).toEqual([]);
    expect(pipIndexes(7)).toEqual([]);
    expect(pipCells(null)).toEqual([]);
  });

  test('only face 6 disagrees between the two paths', () => {
    // Honest record of the inconsistency the merge surfaced: 1..5 are the same
    // drawing, face 6 is not. Unifying it changes how the texture atlas looks,
    // so it stays a decision instead of a silent side effect of the refactor.
    const agree = FACES.filter((face) => JSON.stringify(PIP_DOM[face]) === JSON.stringify(PIP_TEXTURE[face]));
    expect(agree).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('the duplicated tables are really gone', () => {
  test('app.js and dice-3d.js read the layout from src/render', () => {
    const app = readFileSync(new URL('../../src/legacy/app.js', import.meta.url), 'utf8');
    const gl = readFileSync(new URL('../../src/legacy/dice-3d.js', import.meta.url), 'utf8');
    for (const [name, source] of [['app.js', app], ['dice-3d.js', gl]]) {
      expect(source, `${name} must not keep its own pip table`).not.toMatch(/\bPIP_(MAP|LAYOUT)\s*=\s*\{/);
      expect(source, `${name} imports the shared layout`).toMatch(/render\/pip-layout\.ts/);
    }
  });
});
