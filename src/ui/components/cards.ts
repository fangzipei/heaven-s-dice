// ui/components/cards.ts — 卡片共用的小片段。
//
// 骰面概率条同时出现在市集骰卡与图鉴骰卡上，原来在 app.js 的 Shop 一节，
// 现在两边都要用，挪到组件层免得图鉴反向 import 市集。
import { rarityOf } from '../../content/index.ts';

export function probabilityBars(probs: number[], rarity: string): string {
  const peak = Math.max(...probs);
  return `<div class="prob-bars">${probs.map((p, i) => {
    const height = Math.max(3, Math.round(p * 34));
    const top = Math.abs(p - peak) < 1e-9 ? ' is-max' : '';
    return `<div class="prob-bar${top}" style="--rarity:${rarityOf({ rarity }).color}"><i style="height:${height}px"></i><span>${i + 1}</span><em>${Math.round(p * 100)}%</em></div>`;
  }).join('')}</div>`;
}
