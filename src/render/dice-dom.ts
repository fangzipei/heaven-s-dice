/* render/dice-dom.ts — DOM 骰面渲染：WebGL 不可用时的骰盘兜底，外加商店/图鉴
   里那些不需要 3D 的静态骰子。
 *
 * 从 src/legacy/app.js 原样搬来（pipsHtml / faceValuesFor / dieFacesHtml /
 * dieMark / artDieHtml / renderDiceTrayDom），markup 一个字节都没改。
 * 唯一的行为差异：兜底渲染不再自己调 syncDiceTrayLabels —— 它唯一的调用方
 * renderDiceTray() 紧接着就会调，重复一次只是浪费。
 */
import { isBossDieBlocked, getDieSpec } from '../core/engine.ts';
import type { BoardDie, DiceDef, RunState } from '../core/types.ts';
import { h } from '../core/util.ts';
import { DICE_SETS, STANDARD_DIE } from '../content/index.ts';
import {
  dieMotifSvg, dieSkinStyle, favoredFaces, peakFace,
} from './dice-skins.ts';
import { pipIndexes } from './pip-layout.ts';

const FACE_ORDER = ['front', 'back', 'right', 'left', 'top', 'bottom'];

/** The one-character set badge a die wears; the demon set carves 魔. */
export function dieMark(spec: DiceDef): string {
  if (spec.id === 'standard') return '';
  if (spec.setId === 'demon') return '魔';
  const set = spec.setId ? DICE_SETS[spec.setId] : undefined;
  return set ? (set.name[0] ?? '') : '';
}

/* Explicit grid cells matter: CSS Grid auto-placement would collapse a
   diagonal 3 into three pips in the first row. Place each pip by row/column. */
export function pipsHtml(value: number): string {
  const positions = pipIndexes(value);
  return `<div class="pip-grid">${Array.from({ length: 9 }, (_, i) => positions.includes(i)
    ? `<span class="pip" style="grid-row:${Math.floor(i / 3) + 1};grid-column:${(i % 3) + 1}"></span>` : '').join('')}</div>`;
}

/* Keep the rolled value on the camera-facing face; the other faces use the
   opposite pair and two remaining standard pairs so the visible top/side
   faces still read as a legal die. */
export interface FaceValues {
  front: number; back: number; top: number; bottom: number; right: number; left: number;
}

export function faceValuesFor(value: number): FaceValues {
  const pairs: [number, number][] = [[1, 6], [2, 5], [3, 4]];
  const frontPair = pairs.find((pair) => pair.includes(value)) ?? pairs[0]!;
  const [upper, lower] = pairs.filter((pair) => pair !== frontPair) as [[number, number], [number, number]];
  return {
    front: value,
    back: frontPair[0] + frontPair[1] - value,
    top: upper[0],
    bottom: upper[1],
    right: lower[0],
    left: lower[1],
  };
}

/** One die as six CSS-3D faces. */
export function dieFacesHtml(
  value: number | null | undefined,
  spec: DiceDef = STANDARD_DIE,
  concealed = false,
  blank = false,
): string {
  const values: FaceValues = blank
    ? { front: 0, back: 0, top: 0, bottom: 0, right: 0, left: 0 }
    : faceValuesFor(value || 1);
  const favored = favoredFaces(spec);
  const peak = peakFace(spec);
  return FACE_ORDER.map((face) => {
    const faceValue = values[face as keyof FaceValues];
    const isFavored = !concealed && !blank && favored.includes(faceValue);
    const isPeak = isFavored && faceValue === peak;
    const classes = ['die-face', `face-${face}`, isFavored ? 'is-favored' : '', isPeak ? 'is-peak' : '', blank ? 'is-blank' : '']
      .filter(Boolean).join(' ');
    return `
    <div class="${classes}" data-face="${face}">
      <span class="die-sheen"></span>
      ${concealed ? '<span class="die-rune">✦</span>' : blank ? '' : `${dieMotifSvg(spec)}${pipsHtml(faceValue)}`}
    </div>`;
  }).join('');
}

/** Flat decorative die for shop cards, the replace modal and the compendium. */
export function artDieHtml(spec: DiceDef): string {
  const demon = spec.setId === 'demon';
  const rarity = spec.rarity || 'common';
  const probs = spec.probs || STANDARD_DIE.probs;
  const bestFace = probs.indexOf(Math.max(...probs)) + 1;
  const weighted = favoredFaces(spec).length > 0;
  const positions = pipIndexes(bestFace);
  const classes = ['art-die', `rarity-${rarity}`, demon ? 'is-demon' : '', weighted ? 'is-weighted' : '']
    .filter(Boolean).join(' ');
  return `<div class="${classes}" role="img" aria-label="${h(spec.name)}，${bestFace} 点" style="${dieSkinStyle(spec)}">
    <span class="die-sheen"></span>
    ${dieMotifSvg(spec)}
    <div class="mini-pips">${Array.from({ length: 9 }, (_, i) => positions.includes(i) ? `<span class="mini-pip" style="grid-row:${Math.floor(i / 3) + 1};grid-column:${(i % 3) + 1}"></span>` : '').join('')}</div>
  </div>`;
}

/** What the WebGL path reads off `app`: whether a roll animation is playing
    and whether input is locked. Passed in so this module stays UI-free. */
export interface DiceTrayView {
  rolling: boolean;
  busy: boolean;
}

function dieFaceState(run: RunState, die: BoardDie) {
  const spec = getDieSpec(die.dieId);
  const hidden = die.value == null;
  const blank = Boolean(die.blank);
  const blocked = !hidden && !blank && isBossDieBlocked(run, die);
  const selected = run.selected.includes(die.uid);
  return { spec, hidden, blank, blocked, selected, scored: Boolean(die.scored) };
}

function dieClasses(state: ReturnType<typeof dieFaceState>, rolling: boolean): string {
  return [
    'die', `rarity-${state.spec.rarity || 'common'}`,
    state.hidden ? 'is-hidden' : '', state.selected ? 'is-selected' : '',
    state.scored ? 'is-scored' : '', state.spec.setId === 'demon' ? 'is-demon' : '',
    state.blank ? 'is-blank' : '', state.blocked ? 'is-boss-blocked' : '',
    rolling && !state.hidden && !state.scored ? 'is-rolling' : '',
  ].filter(Boolean).join(' ');
}

function dieLabel(state: ReturnType<typeof dieFaceState>, die: BoardDie): string {
  return state.hidden ? '未掷出的骰子'
    : state.blank ? '白骰，无法计分'
      : state.blocked ? '六点被庄家禁用'
        : `${state.spec.name}，${die.value} 点`;
}

/**
 * Dice tray — DOM fallback (kept for browsers without WebGL).
 */
export function renderDiceTrayDom(run: RunState, tray: HTMLElement, view: DiceTrayView): void {
  tray.classList.toggle('has-selection', run.selected.length > 0);
  /* Rebuilding the 3D dice DOM on every tap is the single hottest path on
     phones (≈200 nodes × dozens of preserve-3d layers per click). Only
     rebuild when the dice set / face values actually change; otherwise just
     sync classes and attributes in place. */
  const signature = run.dice.map((die) => {
    const state = dieFaceState(run, die);
    return `${die.uid}:${die.value ?? 'x'}:${state.scored ? 1 : 0}:${state.blank ? 1 : 0}:${state.blocked ? 1 : 0}:${view.rolling ? 1 : 0}`;
  }).join('|');
  if (tray.dataset.dieSignature !== signature) {
    tray.dataset.dieSignature = signature;
    // The canvas lives in this tray too, so the DOM fallback gets its own
    // host instead of wiping the tray's children.
    let host = tray.querySelector<HTMLElement>('#dice-dom-fallback');
    if (!host) {
      host = document.createElement('div');
      host.id = 'dice-dom-fallback';
      tray.append(host);
    }
    host.innerHTML = run.dice.map((die, index) => {
      const state = dieFaceState(run, die);
      const disabled = state.scored || state.blank || state.blocked || view.busy || run.phase !== 'selecting';
      return `
      <button class="${dieClasses(state, view.rolling)}" data-die-uid="${h(die.uid)}" data-die-tip="${h(state.spec.id)}"
        ${disabled ? 'disabled' : ''} aria-pressed="${state.selected}" aria-label="${h(dieLabel(state, die))}"
        style="animation-delay:${view.rolling ? index * 45 : 0}ms;${dieSkinStyle(state.spec)}">
        <span class="die-roller"><span class="die-cube">${dieFacesHtml(die.value, state.spec, state.hidden, state.blank)}</span></span>
        ${state.hidden ? '<span class="die-mark" style="left:50%;top:50%;transform:translate(-50%,-50%);font-size:12px;color:rgba(231,190,104,.7)">✦</span>' : state.blank ? `
          <span class="die-mark" style="left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px;color:#6f6253">白</span>
        ` : state.blocked ? `
          <span class="die-mark" style="left:50%;top:50%;transform:translate(-50%,-50%);font-size:12px;color:#c47768">禁</span>
        ` : `
          <span class="die-mark">${h(dieMark(state.spec))}</span>
          <span class="die-check">${state.scored ? '◆' : '✓'}</span>
        `}
      </button>`;
    }).join('');
  }
  /* in-place class/attribute sync — no DOM rebuild on selection changes */
  for (const die of run.dice) {
    const element = tray.querySelector<HTMLButtonElement>(`[data-die-uid="${die.uid}"]`);
    if (!element) continue;
    const state = dieFaceState(run, die);
    const disabled = state.scored || state.blank || state.blocked || view.busy || run.phase !== 'selecting';
    const classes = dieClasses(state, view.rolling);
    if (element.className !== classes) element.className = classes;
    if (element.disabled !== disabled) element.disabled = disabled;
    if (element.getAttribute('aria-pressed') !== String(state.selected)) element.setAttribute('aria-pressed', String(state.selected));
  }
}
