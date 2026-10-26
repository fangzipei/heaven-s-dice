/* ui/game.ts 是牌桌上的对局控制（画桌面、摇桶、计分、物品、拖桶）。
   动画本身要 WebGL 与 GSAP，没法在桩 DOM 里跑；这里钉住的是搬完之后仍必须成立的
   装配契约：renderGame 一次画齐所有面板，beginRoll / handleScore 的前置检查
   仍然用原来那句话拦人，弃局直接落到失败结算。 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const record = vi.hoisted(() => ({ calls: [] }));

vi.mock('../../src/ui/hud.ts', () => ({
  renderTopbar: () => record.calls.push('topbar'),
  renderScorePanel: () => record.calls.push('score'),
  renderRail: () => record.calls.push('rail'),
  renderOpponentPlate: () => record.calls.push('opponent'),
  showBustNotice: () => record.calls.push('bust'),
}));
vi.mock('../../src/ui/dock.ts', () => ({
  renderComboPreview: () => record.calls.push('combo'),
  renderActionDock: () => record.calls.push('dock'),
  renderAutoButton: () => record.calls.push('auto'),
  renderDangerStrip: () => record.calls.push('danger'),
}));
vi.mock('../../src/ui/tray.ts', () => ({
  diceTable: null,
  renderDiceTray: () => record.calls.push('tray'),
}));
vi.mock('../../src/ui/screens/result.ts', () => ({
  showVictory: () => record.calls.push('victory'),
  showDefeat: () => record.calls.push('defeat'),
}));
vi.mock('../../src/render/motion.ts', () => ({
  motion: {
    attach() {}, startClock() {}, markDirty() {}, cupCue() {}, cupRattle() {}, cupDrop() {},
    gsap: null, tumble: async () => {}, gather: async () => {}, rollDice: async () => {},
  },
}));

import { app } from '../../src/ui/state.ts';
import { beginRoll, handleScore, forfeitRun, renderGame, useItem, setSpeech } from '../../src/ui/game.ts';
import { createRun } from '../../src/core/engine.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  record.calls.length = 0;
  app.run = createRun({ rng: () => 0.5 });
  app.busy = false;
  app.rolling = false;
  app.introOpen = false;
  app.resultShown = false;
  app.cupHoldStarted = false;
});

const toast = () => dom.node('#toast-stack').children.at(-1)?.textContent ?? '';

describe('renderGame 一次画齐所有面板', () => {
  test('顺序：顶栏 → 计分 → 侧栏 → 骰盘 → 操作坞 → 对手', () => {
    renderGame();
    expect(record.calls).toEqual([
      'topbar', 'score', 'rail', 'tray', 'combo', 'dock', 'auto', 'danger', 'opponent',
    ]);
  });

  test('没有对局时什么都不画', () => {
    app.run = null;
    renderGame();
    expect(record.calls).toEqual([]);
  });
});

describe('摇骰与计分的前置检查仍然拦得住', () => {
  test('重投耗尽时摇骰只报错，不进入落桌', () => {
    app.run.phase = 'dead';
    app.run.rerolls = 0;
    beginRoll();
    expect(toast()).toBe('没有剩余重投次数。');
    expect(app.busy).toBe(false);
  });

  test('没选骰子就计分会被拦下', () => {
    app.run.phase = 'selecting';
    app.run.selected = [];
    handleScore('continue');
    expect(toast()).toBe('先选择要计分的骰子。');
    expect(app.busy).toBe(false);
  });

  test('忙碌时既不摇骰也不计分', () => {
    app.run.phase = 'selecting';
    app.busy = true;
    beginRoll();
    handleScore('reroll');
    expect(record.calls).toEqual([]);
    expect(dom.node('#toast-stack').children.length).toBe(0);
  });
});

describe('物品与弃局', () => {
  test('用不了的物品只报错', () => {
    app.run.phase = 'selecting';
    app.run.activeItems = [];
    useItem('lucky_coin');
    expect(toast()).toContain('没有');
    expect(record.calls).toEqual([]);
  });

  test('弃局直接落到失败结算', () => {
    forfeitRun();
    expect(record.calls).toEqual(['topbar', 'score', 'rail', 'tray', 'combo', 'dock', 'auto', 'danger', 'opponent', 'defeat']);
  });

  test('台词写进气泡', async () => {
    setSpeech('六点太圆滑。');
    expect(dom.node('#speech-bubble').classList.added).toContain('is-changing');
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(dom.node('#speech-text').textContent).toBe('六点太圆滑。');
  });
});

describe('对局控制只有一份实现', () => {
  const legacy = legacyAppSource();
  const game = readFileSync(new URL('../../src/ui/game.ts', import.meta.url), 'utf8');

  for (const name of [
    'renderGame', 'beginRoll', 'startCupHold', 'cancelCupHold', 'handleScore',
    'advanceCurrentLevel', 'useItem', 'forfeitRun', 'bindCupDrag', 'performCupRoll',
  ]) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(game).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('app.js 从 ui/game.ts 取用', () => {
    expect(assemblySource()).toMatch(/from '\.\/game\.ts'/);
  });
});
