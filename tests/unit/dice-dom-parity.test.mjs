/* render/dice-dom.ts 是从 src/legacy/app.js 搬出来的 DOM 骰面渲染。
   tests/fixtures/dice-dom-goldens.json 里的 markup 是搬运前（commit 269f1c9）
   那批函数逐字跑出来的产物，所以以后谁动了这个模块 —— 挪一个点、掉一个 class、
   换一层面序 —— 都会在这里失败，而不是在 33 关手测时靠肉眼发现。 */
import { readFileSync } from 'node:fs';
import { legacyAppSource } from '../helpers/legacy-app.mjs';
import { describe, expect, test } from 'vitest';

import { DICE_BY_ID, STANDARD_DIE } from '../../src/content/index.ts';
import {
  artDieHtml, dieFacesHtml, dieMark, faceValuesFor, pipsHtml, renderDiceTrayDom,
} from '../../src/render/dice-dom.ts';

const goldens = JSON.parse(
  readFileSync(new URL('../fixtures/dice-dom-goldens.json', import.meta.url), 'utf8'),
);

const specOf = (id) => (id === 'standard' ? STANDARD_DIE : DICE_BY_ID[id]);

describe('the ported DOM dice renderer still writes the same markup', () => {
  for (const [key, html] of Object.entries(goldens.dieFacesHtml)) {
    const [value, specId, concealed, blank] = key.split('|');
    test(`dieFacesHtml ${key}`, () => {
      expect(dieFacesHtml(Number(value), specOf(specId), concealed === 'true', blank === 'true')).toBe(html);
    });
  }

  test('pip grid of face 6', () => {
    expect(pipsHtml(6)).toBe(goldens.pipsHtml6);
  });

  test('opposite-face assignment', () => {
    expect(faceValuesFor(5)).toEqual(goldens.faceValuesFor5);
  });

  for (const [id, mark] of Object.entries(goldens.dieMark)) {
    test(`set badge ${id}`, () => {
      expect(dieMark(specOf(id))).toBe(mark);
    });
  }

  for (const [id, html] of Object.entries(goldens.artDieHtml)) {
    test(`artDieHtml ${id}`, () => {
      expect(artDieHtml(specOf(id))).toBe(html);
    });
  }
});

describe('the DOM tray renderer is the only one left', () => {
  const app = legacyAppSource();

  test('app.js no longer builds die markup itself', () => {
    for (const name of ['dieFacesHtml', 'pipsHtml', 'faceValuesFor', 'artDieHtml', 'dieMark', 'renderDiceTrayDom']) {
      expect(app, `app.js must not redeclare ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
    }
    /* 3c-3c 之后骰面卡片的最后一个读者（市集）也搬走了，现在由屏模块取用。 */
    const shop = readFileSync(new URL('../../src/ui/screens/shop.ts', import.meta.url), 'utf8');
    expect(shop).toMatch(/from '\.\.\/\.\.\/render\/dice-dom\.ts'/);
  });

  test('the pure helpers moved to core/util so render can use them too', () => {
    const dom = readFileSync(new URL('../../src/render/dice-dom.ts', import.meta.url), 'utf8');
    expect(dom).toMatch(/from '\.\.\/core\/util\.ts'/);
    expect(dom).not.toMatch(/const h = \(value\)/);
    expect(app).not.toMatch(/const h = \(value\)/);
  });

  test('the fallback renderer does not reach back into UI state', () => {
    const source = readFileSync(new URL('../../src/render/dice-dom.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/\bapp\.(rolling|busy|run)\b/);
    expect(source).toMatch(/view: DiceTrayView/);
    expect(typeof renderDiceTrayDom).toBe('function');
  });
});
