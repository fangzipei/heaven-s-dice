/* ui/tray.ts 是从 src/legacy/app.js「Dice tray — WebGL path」一节搬出来的牌桌胶水。
   骰面本体在 render/dice-dom.ts，动画在 render/motion.ts，three 的 DiceTable 仍旧按需
   动态 import——所以这里用假骰桌 + 假动画把它单独钉住：
   1) WebGL 没起来时 DOM 兜底和两处标签文案不能空；
   2) 无障碍行的文案与 disabled 规则（tools/pick-test.mjs 直接读 aria-pressed）；
   3) 点中骰子后只有引擎真的翻了选中态才回调注入的 repaint，tray 不反向 import 组装层。
   顺序有依赖：兜底用例必须先跑，因为 ensureDiceTable() 一旦成功，模块里的 diceTable
   就再也回不到 null。 */
import { readFileSync } from 'node:fs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';
import { beforeAll, describe, expect, test, vi } from 'vitest';

const recorder = vi.hoisted(() => ({
  tableCalls: [],
  picks: [],
  repaints: 0,
  onPick: null,
}));

vi.mock('../../src/render/dice-table.ts', () => {
  class FakeDiceTable {
    constructor(canvas, handlers) {
      recorder.tableCalls.push('construct');
      recorder.onPick = handlers.onPick;
      this.canvas = canvas;
      this.entries = [];
    }

    resize() { recorder.tableCalls.push('resize'); }

    setDice(dice) {
      this.entries = dice;
      recorder.tableCalls.push(`setDice:${dice.map((die) => die.value ?? 'x').join(',')}`);
    }

    applyStates(states) {
      recorder.tableCalls.push(`applyStates:${[...states].map(([uid, s]) => `${uid}:${Number(s.selected)}${Number(s.scored)}${Number(s.blank)}${Number(s.blocked)}`).join('|')}`);
    }

    pickAt() { return null; }
  }
  return { DiceTable: FakeDiceTable };
});

vi.mock('../../src/render/motion.ts', () => ({
  motion: {
    attach(table) { recorder.tableCalls.push(`attach:${Boolean(table)}`); },
    startClock() { recorder.tableCalls.push('clock'); },
    markDirty() {},
    tapDie(_table, uid) { recorder.tableCalls.push(`tap:${uid}`); },
    hoverDie() {},
    settle(_table, uids) { recorder.tableCalls.push(`settle:${uids.length}`); },
  },
}));

import { createRun } from '../../src/core/engine.ts';
import { app } from '../../src/ui/state.ts';
import {
  diceTable, ensureDiceTable, renderDiceTray, setTrayRepaint,
} from '../../src/ui/tray.ts';

/* ── 只支持 tray / dice-dom 真正用到的那点 DOM ───────────────────────────
   querySelector 只按 #id 在已挂载的子节点里找，找不到就返回 null：
   共享桩会自动造节点，那样「兜底行清掉了没有」就测不出来了。 */
function makeNode(name) {
  const node = {
    name,
    id: '',
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    hidden: false,
    dataset: {},
    children: [],
    listeners: {},
    attrs: {},
    style: { cursor: '', width: '', setProperty() {} },
    classList: {
      toggles: [],
      toggle(sel, on) { this.toggles.push(`${sel}=${Boolean(on)}`); },
      add(sel) { this.className = `${this.className} ${sel}`.trim(); },
      remove(sel) { this.className = this.className.split(/\s+/).filter((c) => c !== sel).join(' '); },
    },
    addEventListener(type, fn) { (node.listeners[type] ||= []).push(fn); },
    append(child) { node.children.push(child); child.parent = node; },
    remove() {
      const parent = node.parent;
      if (!parent) return;
      parent.children = parent.children.filter((child) => child !== node);
    },
    getAttribute(key) { return node.attrs[key] ?? null; },
    setAttribute(key, value) { node.attrs[key] = String(value); },
    querySelector(sel) {
      if (!sel.startsWith('#')) return null;
      const wanted = sel.slice(1);
      return node.children.find((child) => (child.id || child.name) === wanted) || null;
    },
  };
  return node;
}

let nodes;
let top;

beforeAll(() => {
  nodes = new Map();
  top = new Map();
  const nodeFor = (selector) => {
    if (!nodes.has(selector)) {
      const node = makeNode(selector);
      nodes.set(selector, node);
      top.set(selector, node);
    }
    return nodes.get(selector);
  };
  globalThis.document = {
    querySelector: (selector) => nodeFor(selector),
    querySelectorAll: () => [],
    createElement: () => makeNode('created'),
  };
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  app.run = createRun({ rng: () => 0.5 });
  app.busy = false;
  app.rolling = false;
  app.introOpen = false;
  setTrayRepaint(() => { recorder.repaints += 1; });
});

/** 直接摆一副可控的骰子：标准、已计分、异族、六点、白骰、未掷出各一颗。 */
function setBoard({ phase = 'selecting', throwNumber = 1, selected = [] } = {}) {
  app.run.phase = phase;
  app.run.throwNumber = throwNumber;
  app.run.dice = [
    { uid: 'd1', bagUid: 'b1', dieId: 'standard', value: 1, blank: false, wild: false, scored: false },
    { uid: 'd2', bagUid: 'b2', dieId: 'standard', value: 5, blank: false, wild: false, scored: true },
    { uid: 'd3', bagUid: 'b3', dieId: 'wolf_hunter', value: 3, blank: false, wild: false, scored: false },
    { uid: 'd4', bagUid: 'b4', dieId: 'standard', value: 6, blank: false, wild: false, scored: false },
    { uid: 'd5', bagUid: 'b5', dieId: 'standard', value: 2, blank: true, wild: false, scored: false },
    { uid: 'd6', bagUid: 'b6', dieId: 'standard', value: null, blank: false, wild: false, scored: false },
  ];
  app.run.selected = [...selected];
}

const text = (selector) => nodes.get(selector).textContent;
const toggles = (selector) => nodes.get(selector).classList.toggles;

describe('牌桌胶水搬到 ui/tray.ts 之后仍然写同样的文案', () => {
  test('WebGL 还没起来：走 DOM 兜底，两处标签同步照写', () => {
    expect(diceTable).toBeNull();
    setBoard({ selected: ['d1', 'd3'] });
    renderDiceTray();
    expect(text('#throw-label')).toBe('第 1 掷 · 选择骰子 · 已选 2 颗');
    expect(text('#dice-count')).toBe('6 颗骰子 · 已选 2 颗');
    expect(toggles('#dice-tray')).toContain('has-selection=true');
    expect(toggles('#throw-label')).toContain('is-active=true');
    // 兜底行确实挂上了，而且只挂一次。
    const tray = nodes.get('#dice-tray');
    expect(tray.children.filter((child) => child.id === 'dice-dom-fallback').length).toBe(1);
    expect(tray.querySelector('#dice-dom-fallback').innerHTML).toContain('data-die-uid="d3"');
  });

  test('标签按阶段换词，没选中时报剩余可掷', () => {
    setBoard({ phase: 'ready', throwNumber: 0, selected: [] });
    renderDiceTray();
    expect(text('#throw-label')).toBe('等待落骰');
    expect(text('#dice-count')).toBe('6 颗骰子 · 剩余 5 可掷');
    for (const [phase, label] of [
      ['hot', '全骰归位'], ['dead', '无分可计'], ['reroll-pending', '选择重投方式'],
      ['cleared', '目标达成'], ['lost', '本关结束'],
    ]) {
      setBoard({ phase, throwNumber: 2 });
      renderDiceTray();
      expect(text('#throw-label'), `${phase} 的阶段文案`).toBe('第 2 掷 · ' + label);
    }
    setBoard({ phase: 'hot', throwNumber: 3 });
    renderDiceTray();
    expect(text('#dice-count')).toBe('6 颗骰子 · 全骰');
  });
});

describe('WebGL 骰桌：建桌、签名缓存与无障碍行', () => {
  beforeAll(() => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
  });

  test('ensureDiceTable 用 canvas 建桌、挂动画、绑指针并 resize', async () => {
    const table = await ensureDiceTable();
    expect(table).not.toBeNull();
    expect(recorder.onPick).toBeTypeOf('function');
    expect(recorder.tableCalls).toContain('resize');
    expect(recorder.tableCalls).toContain('attach:true');
    const canvas = nodes.get('#dice-canvas');
    expect(Object.keys(canvas.listeners).sort()).toEqual(['contextmenu', 'pointercancel', 'pointerdown', 'pointerleave', 'pointermove', 'pointerup']);
    // 再叫一次不会重建第二张桌。
    expect(await ensureDiceTable()).toBe(table);
    expect(recorder.tableCalls.filter((call) => call === 'construct').length).toBe(1);
    // 建桌后下一次渲染会把兜底行摘掉，两套渲染不能叠着。
    recorder.tableCalls.length = 0;
    renderDiceTray();
    expect(nodes.get('#dice-tray').querySelector('#dice-dom-fallback')).toBeNull();
  });

  test('骰面签名没变就不重发 setDice，只补状态', () => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
    renderDiceTray();
    const before = recorder.tableCalls.filter((call) => call.startsWith('setDice')).length;
    expect(recorder.tableCalls).toContain('setDice:1,3,6,2,x');
    app.run.selected = ['d1', 'd3'];
    renderDiceTray();
    expect(recorder.tableCalls.filter((call) => call.startsWith('setDice')).length, '选中变化不该重建骰子').toBe(before);
    const stateCalls = recorder.tableCalls.filter((call) => call.startsWith('applyStates')).slice(-2);
    expect(stateCalls.length).toBe(2);
    expect(stateCalls[0]).toContain('d1:1000');
    expect(stateCalls[1]).toContain('d1:1000');
    expect(stateCalls[1]).toContain('d3:1000');
    expect(recorder.tableCalls).toContain('settle:5');
  });

  test('无障碍行：每颗骰子一个按钮，文案按 hidden/blank/blocked 分支', () => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
    renderDiceTray();
    const html = nodes.get('#dice-a11y').innerHTML;
    expect((html.match(/die-a11y-button/g) || []).length).toBe(6);
    expect(html).toContain('aria-label="标准骰，1 点"');
    expect(html).toContain('aria-label="猎手骰，3 点"');
    expect(html).toContain('aria-label="白骰，无法计分"');
    expect(html).toContain('aria-label="未掷出的骰子"');
    expect(html).toContain('aria-pressed="true"');
    // 已计分的骰子和白骰都要 disabled。
    expect(html).toMatch(/data-die-uid="d2"[^>]*disabled/);
    expect(html).toMatch(/data-die-uid="d5"[^>]*disabled/);
  });

  test('铁面铸魂师的五点回炉：5 点骰子禁用并说明原因', () => {
    // level 11 是 soulsmith（effectKey noFive）；换了节奏表这条会先在这里失败，
    // 而不是让断言静默跳过。
    app.run.level = 11;
    setBoard({ phase: 'selecting', selected: ['d1'] });
    app.run.dice[3].value = 5;
    renderDiceTray();
    const html = nodes.get('#dice-a11y').innerHTML;
    expect(html).toContain('aria-label="5 点被庄家禁用"');
    expect(html).toMatch(/data-die-uid="d4"[^>]*disabled/);
    app.run.level = 1;
  });

  test('无障碍行的缓存签名是 uid:值:选中:禁用', () => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
    const layer = nodes.get('#dice-a11y');
    renderDiceTray();
    expect(layer.dataset.signature).toBe('d1:1:1:0|d2:5:0:1|d3:3:0:0|d4:6:0:0|d5:2:0:1|d6:x:0:0');
    const before = layer.innerHTML;
    renderDiceTray();
    expect(layer.innerHTML, '签名没变就不该重写这一行').toBe(before);
    app.run.selected = ['d3'];
    renderDiceTray();
    expect(layer.innerHTML).not.toBe(before);
    expect(layer.dataset.signature).toBe('d1:1:0:0|d2:5:0:1|d3:3:1:0|d4:6:0:0|d5:2:0:1|d6:x:0:0');
  });
});

describe('点骰子：只有真的翻了选中态才重画', () => {
  test('选中的一颗能取消，busy 与开场动画期间不响应', () => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
    recorder.repaints = 0;
    recorder.onPick('d1');
    expect(app.run.selected).toEqual([]);
    expect(recorder.repaints).toBe(1);
    expect(recorder.tableCalls).toContain('tap:d1');

    recorder.repaints = 0;
    app.busy = true;
    recorder.onPick('d3');
    expect(recorder.repaints, '落桌动画期间不翻转选中').toBe(0);
    app.busy = false;

    app.introOpen = true;
    recorder.onPick('d3');
    expect(recorder.repaints, '开场骰语期间不翻转选中').toBe(0);
    app.introOpen = false;
  });

  test('已计分 / 白骰 / 未掷出的骰子点了不算，也不重画', () => {
    setBoard({ phase: 'selecting', selected: [] });
    recorder.repaints = 0;
    for (const uid of ['d2', 'd5', 'd6']) recorder.onPick(uid);
    expect(app.run.selected).toEqual([]);
    expect(recorder.repaints).toBe(0);
  });

  test('没有 uid 的拾取（点到桌面）什么都不做', () => {
    setBoard({ phase: 'selecting', selected: ['d1'] });
    recorder.repaints = 0;
    recorder.onPick(null);
    expect(recorder.repaints).toBe(0);
    expect(app.run.selected).toEqual(['d1']);
  });
});

describe('牌桌胶水只有一份实现', () => {
  const legacy = legacyAppSource();
  const tray = readFileSync(new URL('../../src/ui/tray.ts', import.meta.url), 'utf8');

  for (const name of [
    'loadDiceTable', 'dieSpecFor', 'dieStateOf', 'ensureDiceTable', 'handleDiePick',
    'bindDiceCanvas', 'renderDiceA11y', 'renderDiceTrayGL', 'renderDiceTray', 'syncDiceTrayLabels',
  ]) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(tray).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('three 仍旧按需动态 import，兜底路径不能拖进主包', () => {
    expect(tray).toMatch(/import\('\.\.\/render\/dice-table\.ts'\)/);
    expect(legacy).not.toMatch(/from '\.\.\/render\/dice-table\.ts'/);
  });

  test('app.js 从 ui/tray.ts 取用，且不反向持有骰桌', () => {
    const assembly = assemblySource();
    expect(assembly).toMatch(/from '\.\/tray\.ts'/);
    expect(assembly).toMatch(/setTrayRepaint\(renderGame\)/);
    expect(tray, 'tray 不能 import 组装层').not.toMatch(/from '\.\.\/ui\/|from '\.\/app/);
  });
});
