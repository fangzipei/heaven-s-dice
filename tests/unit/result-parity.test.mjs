/* ui/screens/result.ts 是从 app.js「Victory / defeat」一节搬出来的结算弹窗。
   过关、庄家关、终局与失败四种形态的文案和按钮都是 campaign 脚本与截图比对
   依赖的对象，这里用桩 DOM 逐种钉住。 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';

import { app } from '../../src/ui/state.ts';
import { showDefeat, showVictory } from '../../src/ui/screens/result.ts';
import { createRun } from '../../src/core/engine.ts';
import { LEVEL_COUNT, getLevelConfig, getOpponent, getTable } from '../../src/content/index.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  app.run = createRun({ rng: () => 0.5 });
  app.busy = false;
  app.resultShown = false;
  app.pendingReplace = null;
});

const overlay = () => dom.html('#overlay-root');

describe('结算弹窗搬到 ui/screens/result.ts 之后仍然写同样的文案', () => {
  test('普通过关：目标、得分、奖励与下一站', () => {
    const run = app.run;
    run.score = 500;
    showVictory();
    const html = overlay();
    const opponent = getOpponent(run.level);
    expect(app.resultShown).toBe(true);
    expect(html).toContain(`TABLE CLEARED · ${getTable(run.level).subtitle}`);
    expect(html).toContain('<h2>本关告捷</h2>');
    expect(html).toContain(`${opponent.name}放下了骰子。第 ${run.level} 关达成。`);
    expect(html).toContain('<span>本关得分</span>');
    expect(html).toContain('data-action="go-shop">前往市集');
    expect(html).toContain(`下一站：${getTable(run.level + 1).name} · 第 ${run.level + 1} 关`);
    expect(html).not.toContain('夺下庄家徽记');
  });

  test('庄家关：换标题但不再承诺重投上限 +1', () => {
    const run = app.run;
    run.level = 10;
    expect(getLevelConfig(10).boss, '第 10 关是庄家关').toBeTruthy();
    run.score = run.target;
    showVictory();
    const html = overlay();
    expect(html).toContain('<h2>庄家败北</h2>');
    expect(html).not.toContain('夺下庄家徽记');
    expect(html).not.toContain('重投上限 +1');
  });

  test('终局：通关摘要与再来一局', () => {
    const run = app.run;
    run.level = LEVEL_COUNT;
    run.phase = 'run-won';
    showVictory();
    const html = overlay();
    expect(html).toContain('THE HOUSE HAS FALLEN');
    expect(html).toContain('<h2>天穹已破</h2>');
    expect(html).toContain('你击败了钻石天使，赢下了整座天国骰局。');
    expect(html).toContain(`<span>通关关卡</span><b>${LEVEL_COUNT} / ${LEVEL_COUNT}</b>`);
    expect(html).toContain('data-action="confirm-home">返回首页');
    expect(html).toContain('data-action="restart-run">再来一局');
  });

  test('失败：三条去向与半价银币的警告', () => {
    app.run.score = 10;
    showDefeat();
    const html = overlay();
    expect(html).toContain('THE HOUSE COLLECTS');
    expect(html).toContain('<h2>赌局结束</h2>');
    expect(html).toContain('收走了桌上的银币。你没能达到');
    expect(html).toContain('卷土重来会保留骰子、骰桶与物品，但会失去一半银币。');
    expect(html).toContain('data-action="retry-level">卷土重来');
    expect(html).toContain('data-action="confirm-home">离开赌桌');
    expect(html).toContain('data-action="restart-run">重新开始');
  });

  test('一局只弹一次：resultShown 挡住第二次调用', () => {
    showVictory();
    const first = overlay();
    app.run.level = 10;
    showVictory();
    expect(overlay()).toBe(first);
    showDefeat();
    expect(overlay()).toBe(first);
  });
});

describe('结算弹窗只有一份实现', () => {
  const legacy = legacyAppSource();
  const result = readFileSync(new URL('../../src/ui/screens/result.ts', import.meta.url), 'utf8');

  for (const name of ['showVictory', 'showDefeat']) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(result).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('app.js 从 ui/screens/result.ts 取用', () => {
    expect(assemblySource()).toMatch(/from '\.\/screens\/result\.ts'/);
  });
});
