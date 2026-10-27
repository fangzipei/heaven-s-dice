/* ui/dock.ts 是从 src/legacy/app.js 搬出来的操作坞渲染（预计分 + 行动按钮）。
   按钮文案和 data-action 名是 handleAction 的字典，也是 tools/campaign-test.mjs
   一路点到底的依据，所以这里用桩 DOM 把它们逐条钉住：搬运动画之外的任何改写
   都会在这里失败。 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';

import { createRun } from '../../src/core/engine.ts';
import { app } from '../../src/ui/state.ts';
import {
  renderActionDock, renderComboPreview, renderDangerStrip,
} from '../../src/ui/dock.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeAll(() => {
  dom = installDomStub();
  app.run = createRun({ rng: () => 0.5 });
  app.busy = false;
  app.cupAnimating = false;
});

const html = (selector) => dom.html(selector);

describe('操作坞搬到 ui/dock.ts 之后仍然写同样的文案', () => {
  test('首掷：摇桶按钮 + 计分常识提示', () => {
    app.run.phase = 'ready';
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toBe(
      '<span class="combo-placeholder">1 与 5 总能计分 · 三连、四连与顺子会带来大分</span>',
    );
    expect(html('#action-dock')).toContain('data-action="manual-roll"');
    expect(html('#action-dock')).toContain('<b>自动投掷</b>');
  });

  test('忙碌：按钮锁死并显示落桌中', () => {
    app.busy = true;
    renderActionDock();
    expect(html('#action-dock')).toContain('骰子正在落桌…');
    expect(html('#action-dock')).toContain('<b>结算中</b>');
    expect(html('#action-dock')).toContain('disabled');
    app.busy = false;
  });

  test('全骰：免费重投与 HOT DICE 提示', () => {
    app.run.phase = 'hot';
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toContain('<em>HOT DICE</em>');
    expect(html('#action-dock')).toContain('全骰 · 免费重投全部骰子，不消耗重投次数');
  });

  test('掷空：有票时给重投，无票时按钮禁用', () => {
    app.run.phase = 'dead';
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toBe(
      '<span class="combo-warning">没有合法计分组合。重投剩余骰子，或使用物品改变骰面。</span>',
    );
    expect(html('#action-dock')).toContain('重投剩余骰子');

    const keep = app.run.rerolls;
    app.run.rerolls = 0;
    renderActionDock();
    renderDangerStrip();
    expect(html('#action-dock')).toContain('没有可计分的组合，重投已经耗尽');
    expect(html('#action-dock')).toContain('<b>重投已耗尽</b>');
    expect(dom.node('#danger-strip').hidden).toBe(false);
    app.run.rerolls = keep;
  });

  test('准备重投：自己摇桶或系统代劳', () => {
    app.run.phase = 'reroll-pending';
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toContain('拖动骰桶自己摇，或自动投掷');
    expect(html('#action-dock')).toContain('data-action="auto-roll"');
    expect(html('#action-dock')).toContain('<b>自动投掷</b>');
    expect(html('#action-dock')).not.toContain('data-action="cue-cup"');
  });

  test('目标达成：只剩下一关按钮', () => {
    app.run.phase = 'cleared';
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toContain('可继续得分 · 点击左上角「下一关」收手');
    expect(html('#action-dock')).toContain('data-action="advance-level"');
    expect(html('#action-dock')).toContain('进入下一关');
  });

  test('结算与结束：坞里不再给动作', () => {
    for (const phase of ['won', 'run-won', 'lost', 'shop']) {
      app.run.phase = phase;
      renderActionDock();
      expect(html('#action-dock'), phase).toBe(
        '<div class="action-dock-inner"><div class="action-hint">本关已结束。</div></div>',
      );
    }
  });

  test('选择中：没有选骰子时两个按钮都禁用', () => {
    app.run.phase = 'selecting';
    app.run.selected = [];
    renderComboPreview();
    renderActionDock();
    expect(html('#combo-preview')).toBe(
      '<span class="combo-placeholder">选择要计分的骰子 · 1 和 5 总能计分</span>',
    );
    expect(html('#action-dock')).toContain('先选择要计分的骰子');
    expect((html('#action-dock').match(/disabled/g) || []).length).toBe(2);
    expect(html('#action-dock')).toContain('data-action="score-continue"');
    expect(html('#action-dock')).toContain('data-action="score-reroll"');
  });

  test('重投耗尽：只剩计分并结算，分值占位是破折号', () => {
    app.run.phase = 'selecting';
    const keep = app.run.rerolls;
    app.run.rerolls = 0;
    renderActionDock();
    expect(html('#action-dock')).toContain('先选择要计分的骰子');
    expect(html('#action-dock')).toContain('data-action="score-bank"');
    expect(html('#action-dock')).toContain('<b>计分并结算</b>');
    expect(html('#action-dock')).toContain('+—<small>计分</small>');
    expect(html('#action-dock')).not.toContain('data-action="score-reroll"');
    app.run.rerolls = keep;
  });
});

describe('操作坞只有一份实现', () => {
  const legacy = legacyAppSource();
  const dock = readFileSync(new URL('../../src/ui/dock.ts', import.meta.url), 'utf8');

  for (const name of ['renderComboPreview', 'renderActionDock', 'renderDangerStrip']) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(dock).toMatch(new RegExp(`export function ${name}\\s*\\(`));
    });
  }

  test('牌桌控制从 ui/dock.ts 取用', () => {
    // renderGame 搬到 ui/game.ts 之后，操作坞由它装配，组装层不再直接 import。
    const game = readFileSync(new URL('../../src/ui/game.ts', import.meta.url), 'utf8');
    expect(game).toMatch(/from '\.\/dock\.ts'/);
  });
});
