/* ui/screens/compendium.ts 是从 app.js「Compendium」一节搬出来的图鉴屏。
   卡片 markup 与五个页签的文案被 tools/codex-test.mjs 和截图比对依赖，所以这里
   用桩 DOM 逐条钉住：页签名、每页的开场白、解锁/未解锁卡片、庄家与小兵的条目。
   probabilityBars 也搬到了 ui/components/cards.ts —— 市集与图鉴共用同一份柱子。 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';

import { app } from '../../src/ui/state.ts';
import { bindDiscovery } from '../../src/platform/storage.ts';
import { openCompendium, switchCompendiumTab } from '../../src/ui/screens/compendium.ts';
import { probabilityBars } from '../../src/ui/components/cards.ts';
import { BARRELS, BOSSES, DICE, ITEMS, MINIONS, TABLES } from '../../src/content/index.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeAll(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  app.introOpen = false;
  app.run = null;
  app.discovered = { dice: ['wolf_hunter'], barrels: ['oak'], items: ['lucky_coin'] };
  bindDiscovery(app);
});

const overlay = () => dom.html('#overlay-root');
const body = () => dom.html('#compendium-body');

describe('图鉴搬到 ui/screens/compendium.ts 之后仍然写同样的文案', () => {
  test('打开图鉴：五个页签、开场白与当前页高亮', () => {
    openCompendium();
    const html = overlay();
    expect(html).toContain("THE GAMBLER'S ARCHIVE");
    expect(html).toContain('<h2>赌徒图鉴</h2>');
    expect(html).toContain('五张桌子，二十枚秘骰，六只骰桶，十件物品，以及坐在对面的那些东西。');
    for (const [id, label] of [
      ['dice', '秘骰 20'], ['barrels', '骰桶 8'], ['items', `物品 ${ITEMS.length}`],
      ['tables', '赌桌 5'], ['bosses', '庄家与小兵'],
    ]) {
      expect(html, `${id} 页签`).toContain(`data-action="switch-compendium-tab" data-tab="${id}">${label}</button>`);
    }
    expect(html).toMatch(/compendium-tab is-active" data-action="switch-compendium-tab" data-tab="dice"/);
    expect(app.compendiumTab).toBe('dice');
  });

  test('秘骰页：解锁的骰子出卡，未解锁的只留占位卡', () => {
    openCompendium('dice');
    const html = overlay();
    expect(html).toContain('每一枚秘骰都像一张有偏向的牌：点数概率不同。');
    expect(html).toContain(`已遇见 1 / ${DICE.filter((die) => !die.isStandard).length}`);
    expect(html).toContain('data-die-tip="wolf_hunter"');
    expect(html).toContain('猎手骰');
    expect((html.match(/<article class="compendium-card is-locked" aria-label="这枚骰子尚未遇见">/g) || []).length)
      .toBe(DICE.filter((die) => !die.isStandard).length - 1);
    expect(html).toContain('<b>尚未遇见</b><span>在赌局或市集中遇见后解锁</span>');
  });

  test('换页签：只换 body，页签状态跟着走', () => {
    openCompendium('dice');
    switchCompendiumTab('barrels');
    expect(app.compendiumTab).toBe('barrels');
    expect(body()).toContain('骰桶决定骰子怎样离手。');
    expect(body()).toContain(`已遇见 1 / ${BARRELS.length}`);
    expect(body()).toContain('data-barrel-tip="oak"');
  });

  test('物品页：主动/被动/一次的计数与货架说明', () => {
    openCompendium('items');
    const active = ITEMS.filter((item) => item.type === 'active').length;
    const passive = ITEMS.filter((item) => item.type === 'passive').length;
    const consumable = ITEMS.filter((item) => item.consumable).length;
    expect(overlay()).toContain(`${active} 件主动物品、${passive} 件被动物品，其中 ${consumable} 件是一次性消耗品：幸运币、猎人印记、烈酒、加注契约、幸运粉、盐、静默赦令。`);
    expect(overlay()).toContain('data-item-tip="lucky_coin"');
    expect(overlay()).toContain(`已遇见 1 / ${ITEMS.length}`);
  });

  test('赌桌页：按章节标关号区间', () => {
    openCompendium('tables');
    const html = overlay();
    expect(html).toContain('五张赌桌，五种材质。关卡越深，桌面越昂贵，坐在对面的东西也越不像人。');
    expect(html).toContain('第 1–7 关');
    expect((html.match(/comp-table-bg/g) || []).length).toBe(TABLES.length);
  });

  test('庄家页：八位庄家 + 五位小兵，赏金系数照写', () => {
    openCompendium('bosses');
    const html = overlay();
    expect(html).toContain(`${BOSSES.length} 位庄家`);
    expect(html).toContain(`第 ${BOSSES.map((boss) => boss.level).join('、')} 关庄家亲自落座`);
    expect(html).toContain('（2、2、3、3、3、4、4、4）');
    expect(html).toContain('悬赏 ×1.45');
    expect(html).toContain('六点回炉');
    expect(html).toContain('五位小兵');
    expect((html.match(/comp-portrait/g) || []).length).toBe(BOSSES.length);
    expect((html.match(/assets\/portraits\//g) || []).length).toBe(BOSSES.length + MINIONS.length);
  });
});

describe('概率条搬到 ui/components/cards.ts 之后仍然是同样的柱子', () => {
  test('高度按概率取整，保底 3px，颜色跟着稀有度', () => {
    const html = probabilityBars([0.5, 0.02, 0, 0, 0, 0.48], 'epic');
    expect((html.match(/class="prob-bar"/g) || []).length).toBe(6);
    expect(html).toContain('<i style="height:17px"></i><span>1</span><em>50%</em>');
    expect(html).toContain('<i style="height:3px"></i><span>2</span><em>2%</em>');
    expect(html).toContain('<i style="height:3px"></i><span>3</span><em>0%</em>');
    expect(html).toContain('--rarity:#');
    expect(html.startsWith('<div class="prob-bars">')).toBe(true);
  });
});

describe('图鉴只有一份实现', () => {
  const legacy = legacyAppSource();
  const compendium = readFileSync(new URL('../../src/ui/screens/compendium.ts', import.meta.url), 'utf8');
  const cards = readFileSync(new URL('../../src/ui/components/cards.ts', import.meta.url), 'utf8');

  for (const name of [
    'openCompendium', 'switchCompendiumTab', 'compendiumLockedCard', 'compendiumProgress', 'compendiumBody',
  ]) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(compendium).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('app.js 不再自己声明概率条，也不再留 codexDice', () => {
    expect(legacy).not.toMatch(/function probabilityBars\s*\(/);
    expect(legacy).not.toMatch(/const codexDice\s*=/);
    expect(cards).toMatch(/export function probabilityBars\s*\(/);
    expect(compendium).toMatch(/const codexDice\s*=/);
  });

  test('app.js 取图鉴，图鉴取概率条', () => {
    expect(assemblySource()).toMatch(/from '\.\/screens\/compendium\.ts'/);
    expect(compendium).toMatch(/from '\.\.\/components\/cards\.ts'/);
  });

  test('图鉴不反向 import 市集屏', () => {
    expect(compendium).not.toMatch(/screens\/shop/);
  });
});
