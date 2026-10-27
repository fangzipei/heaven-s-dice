// ui/tray.ts — 牌桌上的骰子：WebGL 骰桌的生命周期、拾取与无障碍替身行。
//
// 从 app.js「Dice tray — WebGL path」一节原样搬出。骰面本体在
// render/dice-dom.ts，动画在 render/motion.ts，这里只管「什么时候建桌、
// 什么时候把骰子交给桌」。three 依然是按需动态 import：没有 WebGL2
// （或 three 起不来）的浏览器会一直留在 DOM 渲染上，牌桌不能整块变白。
import {
  availableDice, getDieSpec, isBossDieBlocked, toggleDie,
} from '../core/engine.ts';
import type { BoardDie, RunState } from '../core/types.ts';
import { h } from '../core/util.ts';
import { renderDiceTrayDom } from '../render/dice-dom.ts';
import type { DiceTable as DiceTableRow } from '../render/dice-table.ts';
import { motion } from '../render/motion.ts';
import { hideTooltip, dieTooltip, positionTooltipAt, showTooltipHtml } from './components/tooltip.ts';
import { guideEvent } from './tutorial-guide.ts';
import { $ } from './dom.ts';
import { app } from './state.ts';

let DiceTable: (typeof DiceTableRow) | null = null;
let diceTablePromise: Promise<(typeof DiceTableRow) | null> | null = null;

function loadDiceTable(): Promise<(typeof DiceTableRow) | null> {
  if (!diceTablePromise) {
    diceTablePromise = import('../render/dice-table.ts')
      .then((mod) => { DiceTable = mod.DiceTable; return DiceTable; })
      .catch((error) => { console.warn('WebGL dice unavailable, falling back', error); return null; });
  }
  return diceTablePromise;
}

/* 点中一颗骰子之后要重画整张牌桌，但「重画什么」是组装层的决定
   （3c-3 起是 ui/app.ts）。留一个注入点，tray 不反向 import 上层。 */
let repaint: () => void = () => {};

export function setTrayRepaint(fn: () => void): void {
  repaint = fn;
}

function dieSpecFor(die: BoardDie) {
  return getDieSpec(die.dieId);
}

export let diceTable: DiceTableRow | null = null;

function dieStateOf(run: RunState, die: BoardDie) {
  const spec = dieSpecFor(die);
  const hidden = die.value == null;
  const blank = Boolean(die.blank);
  const blocked = !hidden && !blank && isBossDieBlocked(run, die);
  const selected = run.selected.includes(die.uid);
  return { spec, hidden, blank, blocked, selected, scored: Boolean(die.scored) };
}

export async function ensureDiceTable() {
  if (diceTable) return diceTable;
  const canvas = $<HTMLCanvasElement>('#dice-canvas');
  if (!canvas) return null;
  const Table = await loadDiceTable();
  if (!Table) return null;
  diceTable = new Table(canvas, { onPick: (uid) => handleDiePick(uid) });
  motion.attach(diceTable);
  motion.startClock();
  bindDiceCanvas(canvas);
  const ro = new ResizeObserver(() => { diceTable?.resize(); motion.markDirty(); });
  ro.observe(canvas);
  diceTable.resize();
  return diceTable;
}

function handleDiePick(uid: string | null) {
  if (!uid) return;
  if (!app.run || app.busy || app.introOpen) return;
  if (toggleDie(app.run, uid)) {
    motion.tapDie(diceTable, uid);
    repaint();
    guideEvent('selection', app.run);
  }
  hideTooltip();
}

function bindDiceCanvas(canvas: HTMLCanvasElement) {
  let downAt = 0;
  let downX = 0;
  let downY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressAt: { x: number; y: number } | null = null;
  let longPressFired = false;
  let hoverUid: string | null = null;

  const dieOf = (uid: string | null) => (uid && app.run
    ? app.run.dice.find((die) => die.uid === uid) || null
    : null);
  const showDieTip = (uid: string, x: number, y: number) => {
    const die = dieOf(uid);
    if (!die) return;
    showTooltipHtml(dieTooltip(die.dieId), x, y);
  };
  const clearLongPress = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressAt = null;
  };

  canvas.addEventListener('pointerdown', (event) => {
    downAt = performance.now();
    downX = event.clientX;
    downY = event.clientY;
    longPressFired = false;
    clearLongPress();
    if (event.pointerType !== 'touch') return;
    hideTooltip();
    const uid = diceTable?.pickAt(event.clientX, event.clientY) || null;
    if (!uid) return;
    longPressAt = { x: event.clientX, y: event.clientY };
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      showDieTip(uid, longPressAt!.x, longPressAt!.y);
    }, 420);
  });
  canvas.addEventListener('pointerup', (event) => {
    const wasLongPress = longPressFired;
    clearLongPress();
    // Treat a small, quick press as a tap so the cup drag never picks dice.
    if (wasLongPress) return;
    const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
    if (performance.now() - downAt > 900 || moved > 14) return;
    const uid = diceTable?.pickAt(event.clientX, event.clientY);
    if (uid) handleDiePick(uid);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (longPressAt && Math.hypot(event.clientX - longPressAt.x, event.clientY - longPressAt.y) > 12) {
      clearLongPress();
    }
    const uid = diceTable?.pickAt(event.clientX, event.clientY) || null;
    if (diceTable) motion.hoverDie(diceTable, uid);
    canvas.style.cursor = uid ? 'pointer' : 'default';
    if (event.pointerType === 'touch') return;
    if (uid) {
      if (uid !== hoverUid) {
        hoverUid = uid;
        showDieTip(uid, event.clientX, event.clientY);
      } else {
        positionTooltipAt(event.clientX, event.clientY);
      }
    } else if (hoverUid) {
      hoverUid = null;
      hideTooltip();
    }
  });
  canvas.addEventListener('pointerleave', (event) => {
    clearLongPress();
    hoverUid = null;
    if (diceTable) motion.hoverDie(diceTable, null);
    // A touch long-press keeps the card open until the next tap; the browser
    // fires pointerleave as the finger lifts, which would otherwise blink it.
    if (event.pointerType !== 'touch' || !longPressFired) hideTooltip();
  });
  canvas.addEventListener('pointercancel', clearLongPress);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/* Screen-reader + keyboard row. Invisible on purpose: it carries the labels
   and focus order, while the pointer path goes through the raycast. */
function renderDiceA11y(run: RunState) {
  const layer = $('#dice-a11y');
  if (!layer) return;
  const signature = run.dice.map((die) => {
    const state = dieStateOf(run, die);
    const disabled = state.scored || state.blank || state.blocked || app.busy || run.phase !== 'selecting';
    return `${die.uid}:${die.value ?? 'x'}:${state.selected ? 1 : 0}:${disabled ? 1 : 0}`;
  }).join('|');
  if (layer.dataset.signature !== signature) {
    layer.dataset.signature = signature;
    layer.innerHTML = run.dice.map((die) => {
      const state = dieStateOf(run, die);
      const disabled = state.scored || state.blank || state.blocked || app.busy || run.phase !== 'selecting';
      const label = state.hidden ? '未掷出的骰子'
        : state.blank ? '白骰，无法计分'
          : state.blocked ? '六点被庄家禁用'
            : `${state.spec.name}，${die.value} 点`;
      return `<button type="button" class="die-a11y-button" data-die-uid="${h(die.uid)}" data-die-tip="${h(state.spec.id)}"
        aria-disabled="${disabled ? 'true' : 'false'}" aria-pressed="${state.selected}" aria-label="${h(label)}"></button>`;
    }).join('');
  }
}

function renderDiceTrayGL(run: RunState, tray: HTMLElement) {
  // The DOM fallback may have painted before WebGL came up — clear it once
  // so the two renderers never stack.
  if (tray.querySelector('#dice-dom-fallback')) {
    tray.querySelector('#dice-dom-fallback')!.remove();
    delete tray.dataset.dieSignature;
  }
  const visible = run.dice.filter((die) => !die.scored);
  const dice = visible.map((die) => {
    const state = dieStateOf(run, die);
    return {
      uid: die.uid, value: die.value, hidden: state.hidden, blank: state.blank,
      spec: state.spec, gilded: Boolean(die.gilded), extra: Boolean(die.extra),
    };
  });
  const signature = dice.map((die) => `${die.uid}:${die.value ?? 'x'}:${die.spec.id}:${die.gilded ? 1 : 0}`).join('|');
  if (tray.dataset.dieSignature !== signature) {
    tray.dataset.dieSignature = signature;
    diceTable!.setDice(dice);
  }
  const states = new Map();
  visible.forEach((die) => {
    const state = dieStateOf(run, die);
    states.set(die.uid, {
      selected: state.selected, scored: state.scored, blank: state.blank, blocked: state.blocked,
    });
  });
  diceTable!.applyStates(states);
  motion.settle(diceTable, visible.map((die) => die.uid));
  renderDiceA11y(run);
  motion.markDirty();
}

export function renderDiceTray() {
  const run = app.run;
  const tray = $('#dice-tray');
  if (!tray) return;
  if (!run) return;
  if (diceTable) {
    renderDiceTrayGL(run, tray);
    syncDiceTrayLabels(run);
    return;
  }
  // First frame before WebGL comes up (or a browser without it): keep the
  // DOM renderer so the table is never empty.
  renderDiceTrayDom(run, tray, { rolling: app.rolling, busy: app.busy });
  syncDiceTrayLabels(run);
}

function syncDiceTrayLabels(run: RunState) {
  const selectedCount = run.selected.length;
  const available = availableDice(run);
  const tray = $('#dice-tray');
  tray?.classList.toggle('has-selection', selectedCount > 0);
  const stateLabel = run.phase === 'ready'
    ? '等待落骰'
    : run.phase === 'hot'
      ? '全骰归位'
      : run.phase === 'dead'
        ? '无分可计'
        : run.phase === 'selecting'
          ? '选择骰子'
          : run.phase === 'reroll-pending'
            ? '选择重投方式'
            : run.phase === 'cleared'
              ? '目标达成'
              : '本关结束';
  const throwLabel = run.throwNumber ? `第 ${run.throwNumber} 掷 · ${stateLabel}` : stateLabel;
  const throwNode = $('#throw-label');
  if (throwNode) {
    throwNode.textContent = selectedCount && run.phase === 'selecting'
      ? `${throwLabel} · 已选 ${selectedCount} 颗`
      : throwLabel;
    throwNode.classList.toggle('is-active', selectedCount > 0);
  }
  const availableCount = available.filter((die) => !die.scored).length;
  const countNode = $('#dice-count');
  if (countNode) {
    countNode.textContent = run.phase === 'hot'
      ? `${run.dice.length} 颗骰子 · 全骰`
      : selectedCount && run.phase === 'selecting'
        ? `${run.dice.length} 颗骰子 · 已选 ${selectedCount} 颗`
        : `${run.dice.length} 颗骰子 · 剩余 ${availableCount} 可掷`;
    countNode.classList.toggle('is-active', selectedCount > 0);
  }
}
