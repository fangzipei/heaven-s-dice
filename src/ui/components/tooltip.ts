// ui/components/tooltip.ts — 悬停卡片：骰子 / 物品 / 套组 / 骰桶四种。
//
// 从 app.js 的 Tooltips 一节原样搬出。文案与概率条算法一字未改，因为
// tools/boss-test.mjs 与商店截图都在比对这段文本。
import {
  BARRELS, BARREL_BY_ID, DICE_BY_ID, DICE_SETS, ITEM_BY_ID, STANDARD_DIE, rarityOf,
} from '../../content/index.ts';
import { effectiveProbs, getBarrel, setCounts } from '../../core/engine.ts';
import type { BarrelDef, DiceDef } from '../../core/types.ts';
import { h } from '../../core/util.ts';
import { $ } from '../dom.ts';
import { app } from '../state.ts';

const TIP_SELECTOR = '[data-die-tip],[data-item-tip],[data-set-tip],[data-barrel-tip]';

let tooltipCurrent: HTMLElement | null = null;

function positionTooltip(tip: HTMLElement, event: MouseEvent): void {
  const pad = 16;
  const rect = tip.getBoundingClientRect();
  let left = event.clientX + 18;
  let top = event.clientY + 18;
  if (left + rect.width + pad > window.innerWidth) left = event.clientX - rect.width - 18;
  if (top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
  tip.style.left = `${Math.max(pad, left)}px`;
  tip.style.top = `${Math.max(pad, top)}px`;
}

export function bindTooltip(): void {
  const tip = $('#tooltip');
  if (!tip) return;
  document.addEventListener('pointerover', (event) => {
    const el = (event.target as Element | null)?.closest<HTMLElement>(TIP_SELECTOR) ?? null;
    if (!el) return;
    if (tooltipCurrent === el) return;
    tooltipCurrent = el;
    const html = tooltipFor(el);
    if (!html) return;
    tip.innerHTML = html;
    tip.hidden = false;
    positionTooltip(tip, event);
  });
  document.addEventListener('pointerout', (event) => {
    if (!tooltipCurrent) return;
    const related = event.relatedTarget as Node | null;
    if (related && tooltipCurrent.contains(related)) return;
    const next = (related as Element | null)?.closest<HTMLElement>(TIP_SELECTOR);
    if (next === tooltipCurrent) return;
    tooltipCurrent = null;
    tip.hidden = true;
  });
  document.addEventListener('pointermove', (event) => {
    if (!tooltipCurrent || tip.hidden) return;
    positionTooltip(tip, event);
  });
  document.addEventListener('scroll', () => { tooltipCurrent = null; tip.hidden = true; }, true);
}

export function hideTooltip(): void {
  tooltipCurrent = null;
  const tip = $('#tooltip');
  if (tip) tip.hidden = true;
}

export function tooltipFor(el: HTMLElement): string {
  if (el.dataset.dieTip) return dieTooltip(el.dataset.dieTip);
  if (el.dataset.itemTip) return itemTooltip(el.dataset.itemTip);
  if (el.dataset.setTip) return setTooltip(el.dataset.setTip);
  if (el.dataset.barrelTip) return barrelTooltip(el.dataset.barrelTip);
  return '';
}

export function dieTooltip(dieId: string): string {
  const spec: DiceDef = DICE_BY_ID[dieId] || STANDARD_DIE;
  const rarity = rarityOf(spec);
  const set = spec.setId ? DICE_SETS[spec.setId] : null;
  const barrel: BarrelDef = app.run ? getBarrel(app.run) : BARRELS[0]!;
  const override = app.run
    ? (app.run.dice.find((die) => die.dieId === spec.id)?.probs
      ?? app.run.bag.find((entry) => entry.dieId === spec.id)?.probs)
    : undefined;
  const probs = effectiveProbs(spec.id, barrel.id, override);
  const bars = probs.map((p, i) => {
    const height = Math.max(3, Math.round(p * 30));
    return `<div class="tip-prob"><i style="height:${height}px"></i><span>${i + 1}</span><em>${Math.round(p * 100)}%</em></div>`;
  }).join('');
  return `
    <h5>${h(spec.name)}</h5>
    <div class="tip-sub">${h(rarity.name)}${set ? ` · ${h(set.name)}套组` : ' · 标准骰'}</div>
    <p>${h(spec.desc)}</p>
    <div class="tip-probs">${bars}</div>
    <p style="color:#756755;font-size:8px">当前骰桶「${h(barrel.name)}」修正后的点数概率</p>
    ${spec.bonus ? `<p class="tip-bonus">${h(spec.bonus.label)}</p>` : ''}
    ${set ? `<p style="color:#8d7c64;font-size:8px">${h(set.motto)}</p>` : ''}
  `;
}

export function itemTooltip(itemId: string): string {
  const item = ITEM_BY_ID[itemId];
  if (!item) return '';
  const rarity = rarityOf(item);
  return `
    <h5>${h(item.name)}</h5>
    <div class="tip-sub">${h(rarity.name)} · ${item.consumable ? '一次性物品' : item.type === 'active' ? '主动物品' : '被动物品'}</div>
    <p>${h(item.desc)}</p>
    <p class="tip-bonus">${h(item.flavor)}</p>
  `;
}

export function setTooltip(setId: string): string {
  const set = DICE_SETS[setId as keyof typeof DICE_SETS];
  if (!set) return '';
  const counts = app.run ? setCounts(app.run) : { [setId]: { count: 0 } };
  const count = counts[setId]?.count || 0;
  return `
    <h5>${h(set.name)}套组</h5>
    <div class="tip-sub">${count} / 4 枚 · ${h(set.motto)}</div>
    ${set.bonuses.map((bonus) => `<p class="${count >= bonus.pieces ? 'tip-bonus' : ''}">${count >= bonus.pieces ? '✦' : '◇'} ${bonus.pieces} 件：${h(bonus.text)}</p>`).join('')}
  `;
}

export function barrelTypeLabel(barrel: BarrelDef): string {
  if (barrel.type === 'gesture') return '仪式';
  if (barrel.type === 'probability') return '概率';
  if (barrel.type === 'faceScore') return '点数加成';
  if (barrel.type === 'wildScore') return '赖子加成';
  if (barrel.type === 'gild') return '染金';
  if (barrel.type === 'forceOne') return '定点';
  if (barrel.type === 'straightFix') return '补顺';
  if (barrel.type === 'extraDie') return '增殖';
  if (barrel.type === 'singlesBonus') return '单骰加成';
  return '普通';
}

export function barrelTooltip(barrelId: string): string {
  const barrel = BARREL_BY_ID[barrelId];
  if (!barrel) return '';
  return `
    <h5>${h(barrel.name)}</h5>
    <div class="tip-sub">${h(rarityOf(barrel).name)} · ${barrelTypeLabel(barrel)}骰桶</div>
    <p>${h(barrel.desc)}</p>
    ${barrel.type === 'probability' ? `<p class="tip-bonus">偏向：${h(barrel.short)}</p>` : ''}
    ${barrel.type === 'faceScore' ? `<p class="tip-bonus">指定点数：${h(barrel.short)}</p>` : ''}
    ${barrel.type === 'wildScore' ? `<p class="tip-bonus">赖子加成：${h(barrel.short)}</p>` : ''}
    ${['gild', 'forceOne', 'straightFix', 'extraDie', 'singlesBonus'].includes(barrel.type) ? `<p class="tip-bonus">${h(barrel.short)}</p>` : ''}
    ${'gesture' in barrel && barrel.gesture ? '<p class="tip-bonus">完成仪式后，本次投掷获得加成。</p>' : ''}
  `;
}
