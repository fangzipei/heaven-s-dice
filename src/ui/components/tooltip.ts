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
import { $, uiZoom } from '../dom.ts';
import { app } from '../state.ts';

const TIP_SELECTOR = '[data-die-tip],[data-item-tip],[data-set-tip],[data-barrel-tip],[data-pattern-tip],[data-rule-tip]';

let tooltipCurrent: HTMLElement | null = null;

/** Stick the note just above the data it explains; a short tape strip sits at
 *  the top edge, so the note reads as taped onto the card. */
function positionTooltip(tip: HTMLElement, anchor: HTMLElement | null): void {
  const pad = 14;
  const gap = 9;
  const zoom = uiZoom(tip);
  const rect = tip.getBoundingClientRect();
  const box = anchor?.getBoundingClientRect();
  if (!box || box.width < 2) {
    tip.style.left = `${pad / zoom}px`;
    tip.style.top = `${pad / zoom}px`;
    return;
  }
  const center = box.left + box.width / 2;
  let left = center - rect.width / 2;
  left = Math.max(pad, Math.min(window.innerWidth - rect.width - pad, left));
  let top = box.top - rect.height - gap;
  const side = top < pad ? 'below' : 'above';
  if (side === 'below') top = Math.min(window.innerHeight - rect.height - pad, box.bottom + gap);
  tip.dataset.side = side;
  tip.style.left = `${left / zoom}px`;
  tip.style.top = `${top / zoom}px`;
}

/** Show arbitrary tooltip HTML (used by the legacy WebGL dice table). */
export function showTooltipHtml(html: string, x: number, y: number, anchor: HTMLElement | null = null): void {
  const tip = $('#tooltip');
  if (!tip || !html) return;
  tip.innerHTML = html;
  tip.hidden = false;
  if (anchor) positionTooltip(tip, anchor);
  else {
    // Cursor mode kept for the optional WebGL path.
    const zoom = uiZoom(tip);
    const rect = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(14, Math.min(window.innerWidth - rect.width - 14, x + 18)) / zoom}px`;
    tip.style.top = `${Math.max(14, Math.min(window.innerHeight - rect.height - 14, y + 18)) / zoom}px`;
    tip.dataset.side = 'above';
  }
}

/** Reposition the visible note against its anchor (or a viewport point). */
export function positionTooltipAt(x: number, y: number): void {
  const tip = $('#tooltip');
  if (!tip || tip.hidden) return;
  if (tooltipCurrent) positionTooltip(tip, tooltipCurrent);
  else {
    const zoom = uiZoom(tip);
    const rect = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(14, Math.min(window.innerWidth - rect.width - 14, x + 18)) / zoom}px`;
    tip.style.top = `${Math.max(14, Math.min(window.innerHeight - rect.height - 14, y + 18)) / zoom}px`;
  }
}

export function bindTooltip(): void {
  const tip = $('#tooltip');
  if (!tip) return;
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStart: { x: number; y: number } | null = null;
  const clearPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
    pressStart = null;
  };
  document.addEventListener('pointerdown', (event) => {
    clearPress();
    if (tooltipCurrent) {
      tooltipCurrent = null;
      tip.hidden = true;
    }
    const el = (event.target as Element | null)?.closest<HTMLElement>(TIP_SELECTOR) ?? null;
    if (!el || event.pointerType !== 'touch') return;
    pressStart = { x: event.clientX, y: event.clientY };
    pressTimer = setTimeout(() => {
      const html = tooltipFor(el);
      if (!html) return;
      tooltipCurrent = el;
      showTooltipHtml(html, pressStart!.x, pressStart!.y, el);
    }, 420);
  });
  document.addEventListener('pointermove', (event) => {
    if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 12) {
      clearPress();
    }
  });
  document.addEventListener('pointerup', clearPress);
  document.addEventListener('pointercancel', clearPress);
  document.addEventListener('contextmenu', (event) => {
    if ((event.target as Element | null)?.closest(TIP_SELECTOR)) event.preventDefault();
  });
  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const el = (event.target as Element | null)?.closest<HTMLElement>(TIP_SELECTOR) ?? null;
    if (!el) return;
    if (tooltipCurrent === el) return;
    tooltipCurrent = el;
    const html = tooltipFor(el);
    if (!html) return;
    showTooltipHtml(html, event.clientX, event.clientY, el);
  });
  document.addEventListener('pointerout', (event) => {
    if (!tooltipCurrent || event.pointerType === 'touch') return;
    const related = event.relatedTarget as Node | null;
    if (related && tooltipCurrent.contains(related)) return;
    const next = (related as Element | null)?.closest<HTMLElement>(TIP_SELECTOR);
    if (next === tooltipCurrent) return;
    tooltipCurrent = null;
    tip.hidden = true;
  });
  document.addEventListener('pointermove', (event) => {
    if (!tooltipCurrent || tip.hidden) return;
    positionTooltip(tip, tooltipCurrent);
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
  if (el.dataset.ruleTip) return ruleUsageTooltip(el.dataset.ruleTip);
  if (el.dataset.patternTip) return patternTooltip(el.dataset.patternTip, el.dataset.patternLabel || '骰型');
  return '';
}

const RULE_TIP_GROUPS: Record<string, { label: string; note: string; match?: (key: string) => boolean }> = {
  single: { label: '单颗 1 / 5', note: '只有 1 和 5 能单独计分。', match: (key) => key === 'single:1' || key === 'single:5' },
  triple: { label: '三条', note: '同点三颗 × 100；三条 1 记 1000。', match: (key) => /^nkind:\d:3$/.test(key) },
  quad: { label: '四条 / 五条 / 六条', note: '在三条的基础上翻倍。', match: (key) => /^nkind:\d:[456]$/.test(key) },
  straight: { label: '顺子', note: '五颗连号 500；2 起头 750；1-6 全顺 1500。', match: (key) => key.startsWith('straight:') },
  wild: { label: '恶魔赖子', note: '赖子替顺子或同点补位，不能单独计分。' },
};

/** Hover card for one rule row: how often this run has scored that shape. */
export function ruleUsageTooltip(group: string): string {
  const def = RULE_TIP_GROUPS[group];
  if (!def) return '';
  const usage = app.run?.comboUsage || {};
  const counted = def.match
    ? Object.entries(usage).filter(([key]) => def.match!(key)).reduce((sum, [, times]) => sum + times, 0)
    : (app.run?.flags.wildScored || 0);
  const body = group === 'wild'
    ? (counted ? `本局已有 ${counted} 颗赖子参与计分。` : `${def.note}这一局赖子还没有参与过计分。`)
    : (counted ? def.note : `${def.note}这一局还没有用这个骰型计过分。`);
  return `
    <h5>${h(def.label)}</h5>
    <div class="tip-sub">本局计分记录</div>
    <p class="tip-usage"><b>${counted}</b> 次</p>
    <p>${h(body)}</p>
  `;
}

export function patternTooltip(key: string, label: string): string {
  const used = app.run?.comboUsage?.[key] || 0;
  return `
    <h5>${h(label)}</h5>
    <div class="tip-sub">本局骰型记录</div>
    <p class="tip-usage"><b>${used}</b> 次</p>
    <p>${used ? '这一手已经算上你拥有的被动物品、套组与骰桶加成。' : '这一次牌局还没有用这个骰型计过分。'}</p>
  `;
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
  const setCount = set && app.run ? (setCounts(app.run)[set.id]?.count || 0) : 0;
  return `
    <h5>${h(spec.name)}</h5>
    <div class="tip-sub">${h(rarity.name)}${set ? ` · ${h(set.name)}套组` : spec.id === 'standard' ? ' · 标准骰' : ' · 无套组'}</div>
    <p>${h(spec.desc)}</p>
    <div class="tip-probs">${bars}</div>
    <p class="tip-note">当前骰桶「${h(barrel.name)}」修正后的点数概率</p>
    ${spec.bonus ? `<p class="tip-bonus">${h(spec.bonus.label)}</p>` : ''}
    ${set ? `<div class="tip-set"><div class="tip-set-head">${h(set.name)}套组 · ${setCount} / 4</div>${set.bonuses.map((bonus) => `<p class="${setCount >= bonus.pieces ? 'is-active' : ''}">${setCount >= bonus.pieces ? '✦ 已生效' : '◇ 未激活'} · ${bonus.pieces} 件：${h(bonus.text)}</p>`).join('')}</div>` : ''}
    ${set ? `<p class="tip-note">${h(set.motto)}</p>` : ''}
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
