/* ui/hud.ts 是从 src/legacy/app.js「Rendering — game」一节搬出来的牌桌 HUD。
   搬运时只允许改两件事：把 `Engine.` 前缀换成具名 import，以及补上 TS 需要的
   非空断言 —— 模板字符串与类名一字未改，因为 docs/screenshots 的基线和
   tools/boss-test.mjs 的文案断言都在比对这里渲染出的文本。

   这个测试用桩 DOM 跑真实引擎造出来的 run，做两层保护：
   1) 渲染函数在拆分后仍然能跑通（漏掉一个全局引用就会在这里炸，而不是
      开屏后 HUD 空白）；
   2) 写进节点的文案与搬运前逐字一致。 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';

import { BOSSES, DICE_SETS, LEVELS, LEVEL_COUNT, getOpponent } from '../../src/content/index.ts';
import { createRun } from '../../src/core/engine.ts';
import { num } from '../../src/core/util.ts';
import { app } from '../../src/ui/state.ts';
import {
  renderItems, renderLog, renderOpponentPlate, renderRail, renderScorePanel,
  renderSets, renderTopbar, showBustNotice,
} from '../../src/ui/hud.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;
let nodes;

beforeAll(() => {
  dom = installDomStub();
  nodes = dom.nodes;
});

beforeAll(() => {
  app.run = createRun({ rng: () => 0.5 });
  app.busy = false;
  app.rolling = false;
});

const text = (selector) => dom.text(selector);
const html = (selector) => dom.html(selector);

describe('HUD 渲染器搬到 ui/hud.ts 之后仍然写同样的文案', () => {
  test('顶栏：关卡序号与进度点', () => {
    renderTopbar();
    expect(text('#level-label')).toBe(`第 1 / ${LEVEL_COUNT} 关`);
    expect(text('#coin-value')).toBe(num(app.run.coins));
    const track = html('#level-track');
    expect((track.match(/class="level-pip/g) || []).length).toBe(LEVELS.length);
    expect((track.match(/is-boss/g) || []).length).toBe(BOSSES.length);
    expect((track.match(/is-current/g) || []).length).toBe(1);
    expect(track).toContain('title="第 1 关"');
  });

  test('计分板：未落袋的轮次分与进度条', () => {
    renderScorePanel();
    expect(text('#score-value')).toBe('0');
    expect(text('#secured-value')).toBe('0');
    expect(nodes.get('#score-pending').hidden).toBe(true);
    expect(nodes.get('#float-note').hidden).toBe(true);
    expect(nodes.get('#score-panel').classList.toggles).toContain('is-floating=false');
  });

  test('目标栏：桶、骰数与首掷提示原文', () => {
    renderRail();
    expect(text('#objective-dice')).toBe('6');
    expect(text('#objective-level')).toBe('第 1 关');
    expect(text('#reroll-note')).toBe(`剩余 ${app.run.rerolls} 次`);
    expect(html('#roll-hint')).toBe(
      '<strong>首掷免费。</strong>按住骰桶摇动，2 秒倒计时后落骰；仪式桶沿桌面轨迹描画。也可点下方「自动投掷」。',
    );
    expect(nodes.get('#gesture-button').hidden).toBe(true);
    expect(nodes.get('#barrel-thumb').src).toBe('assets/art/barrels/oak-cup.svg');
    expect(html('#passive-items')).toBe(
      '<span class="passive-empty">还没有被动物品 · <button data-action="open-compendium" data-tab="items">查看物品</button></span>',
    );
    expect(text('#item-slot-note')).toBe('1 件');
    expect(html('#active-items')).toContain('data-item-tip="lucky_coin"');
  });

  test('套组栏：一枚未集齐时的空槽文案', () => {
    renderSets();
    const list = html('#set-list');
    const sets = Object.keys(DICE_SETS).length;
    expect((list.match(/class="set-row/g) || []).length).toBe(sets);
    expect((list.match(/还差 2 枚激活 2 件套/g) || []).length).toBe(sets);
  });

  test('对手铭牌：普通关卡隐藏庄家效果卡', () => {
    renderOpponentPlate();
    expect(nodes.get('#boss-badge').hidden).toBe(true);
    expect(nodes.get('#boss-effect-card').hidden).toBe(true);
    expect(text('#opponent-name')).toBe(getOpponent(1).name);
    expect(text('#opponent-kicker')).toBe(getOpponent(1).title);
  });

  test('日志：最近五条', () => {
    renderLog();
    expect(html('#game-log')).toContain('type-good');
    expect(html('#game-log')).toContain('门房塞给你一枚幸运币');
  });

  test('爆掉本轮的提示文案', () => {
    showBustNotice(320);
    expect(text('#score-bust')).toBe('本轮 320 分作废');
    expect(nodes.get('#score-panel').classList.added).toContain('is-bust');
    expect(nodes.get('#toast-stack').children[0].textContent).toBe('没有可计分的组合，本轮 320 分作废。');
  });
});

describe('HUD 只有一份实现', () => {
  const legacy = legacyAppSource();
  const hud = readFileSync(new URL('../../src/ui/hud.ts', import.meta.url), 'utf8');
  const reward = readFileSync(new URL('../../src/ui/reward.ts', import.meta.url), 'utf8');

  for (const name of ['renderTopbar', 'renderScorePanel', 'renderRail', 'renderRollHint',
    'renderItems', 'renderSets', 'renderLog', 'renderOpponentPlate', 'showBustNotice']) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(hud).toMatch(new RegExp(`export function ${name}\\s*\\(`));
    });
  }

  test('app.js 从 ui/hud.ts 与 ui/reward.ts 取用', () => {
    const assembly = assemblySource();
    expect(assembly).toMatch(/from '\.\/hud\.ts'/);
    expect(assembly).toMatch(/from '\.\/reward\.ts'/);
  });

  test('奖励预估只存在于 ui/reward.ts', () => {
    for (const name of ['baseReward', 'projectedReward', 'cashOutHint']) {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(hud, `ui/hud.ts 复制了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(reward).toMatch(new RegExp(`export function ${name}\\s*\\(`));
    }
  });

  test('HUD 不回踩渲染层，也不重新拼骰面', () => {
    expect(hud).not.toMatch(/from '\.\.\/render\//);
    expect(hud).not.toMatch(/function (dieFacesHtml|pipsHtml|artDieHtml)/);
  });
});
