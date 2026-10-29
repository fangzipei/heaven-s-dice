/* ui/screens/tutorial.ts 是从 app.js「Rules」与「Tutorial / first-run briefing」
   两节搬出来的新手引导屏。教程正文、计分示例和规则表是新手体验与截图验收的
   对象，所以这里用桩 DOM 把页签、小节、示例卡片与规则表逐条钉住。 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';

import { app } from '../../src/ui/state.ts';
import { openRules, openTutorial, scrollTutorial, showStartPrompt } from '../../src/ui/screens/tutorial.ts';
import { BOSS_CATALOG, DICE, ITEMS, LEVEL_COUNT, REROLL_BONUS_RATE, TABLES } from '../../src/content/index.ts';
import { SCORING_ROWS } from '../../src/core/scoring.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeAll(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  app.introOpen = true;
  app.run = null;
});

const overlay = () => dom.html('#overlay-root');

describe('图解教程搬到 ui/screens/tutorial.ts 之后仍然写同样的正文', () => {
  test('五个章节页签、标题与开场白', () => {
    app.introOpen = true;
    openTutorial();
    const html = overlay();
    expect(app.introOpen, '打开教程会收起关卡骰语').toBe(false);
    expect(html).toContain('THE FIRST NIGHT AT THE TABLE');
    expect(html).toContain('<h2>图解赌桌教程</h2>');
    expect((html.match(/tutorial-nav-button/g) || []).length).toBe(5);
    for (const target of ['tut-goal', 'tut-score', 'tut-risk', 'tut-gear', 'tut-start']) {
      expect(html).toContain(`data-target="${target}"`);
    }
    expect((html.match(/class="tut-section"/g) || []).length).toBe(5);
  });

  test('计分示例：三条与四条的点数与骰面都照写', () => {
    openTutorial();
    const html = overlay();
    expect(html).toContain('三个 3 = 300 分');
    expect(html).toContain('<b>三个 3（三条）</b><strong>300<small>分</small></strong>');
    expect(html).toContain('<b>四个 3（四条）</b><strong>600<small>分</small></strong>');
    expect(html).toContain('300 × 2 = 600');
    expect(html).toContain('三个 1 = 1000 分，所以四个 1 = 2000、五个 1 = 4000、六个 1 = 8000');
    // 三颗 3 的骰面：纸片骰从标准骰六面图集里取点。
    expect((html.match(/aria-label="3 点"/g) || []).length).toBeGreaterThan(0);
    expect((html.match(/class="tut-die"/g) || []).length).toBeGreaterThan(30);
    expect((html.match(/standard-faces-cut\.svg/g) || []).length).toBeGreaterThan(30);
  });

  test('目标与装备页引用真实内容数量', () => {
    openTutorial();
    const html = overlay();
    expect(html).toContain(`${LEVEL_COUNT} 关 · ${BOSS_CATALOG.length} 位庄家`);
    expect(html).toContain(`骰子 · ${DICE.length} 枚 · 两套 + 无套`);
    expect(html).toContain(`物品 · ${ITEMS.length} 件`);
    expect(html).toContain(`赌桌 · ${TABLES.length} 张`);
    expect(html).toContain(`基础赏金的 ${Math.round(REROLL_BONUS_RATE * 100)}%`);
    expect(html).toContain(`${BOSS_CATALOG.length} 位庄家的桌规`);
    expect(html).toContain('五点回炉');
  });

  test('scrollTutorial 把章节滚到视口顶部并收起偏差', () => {
    openTutorial();
    dom.node('#tut-score').offsetTop = 120;
    scrollTutorial('tut-score');
    expect(dom.node('#tutorial-body').scrolled).toEqual({ top: 116, behavior: 'smooth' });
    dom.node('#tut-score').offsetTop = 0;
  });
});

describe('规则表与开始页提示', () => {
  test('简版规则：计分表行数来自 SCORING_ROWS，庄家与市集都在', () => {
    app.introOpen = true;
    openRules();
    const html = overlay();
    expect(app.introOpen).toBe(false);
    expect(html).toContain('THE RULES OF THE TABLE');
    expect(html).toContain('<h2>赌桌规矩</h2>');
    expect((html.match(/<tr><td>/g) || []).length).toBe(SCORING_ROWS.length);
    expect(html).toContain(`<h3>${BOSS_CATALOG.length} 位庄家</h3>`);
    expect(html).toContain(`${DICE.length} 枚秘骰分为普通、稀有、史诗、传说`);
    expect(html).toContain('运气是赌桌上唯一诚实的谎言。');
    expect(html).toContain('data-action="close-overlay">看懂了');
  });

  test('开始页：两条去向的文案', () => {
    showStartPrompt();
    const html = overlay();
    expect(html).toContain('data-action="open-tutorial">进入图解教程');
    expect(html).toContain('data-action="start-direct">不用了，直接开局');
    expect(html).toContain('开局后也可以随时点右上角规则查看简版');
  });
});

describe('教程与规则只有一份实现', () => {
  const legacy = legacyAppSource();
  const tutorial = readFileSync(new URL('../../src/ui/screens/tutorial.ts', import.meta.url), 'utf8');

  for (const name of [
    'tutorialDieHtml', 'tutorialDice', 'tutorialCombo', 'tutorialHtml',
    'showStartPrompt', 'openTutorial', 'scrollTutorial', 'openRules',
  ]) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(tutorial).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('app.js 从 ui/screens/tutorial.ts 取用', () => {
    expect(assemblySource()).toMatch(/from '\.\/screens\/tutorial\.ts'/);
  });
});
