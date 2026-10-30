// content/barrels/vortex.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'vortex', name: '旋涡桶', rarity: 'legendary', type: 'gesture',
  art: 'vortex', price: 248, gesture: 'circle',
  desc: '顺时针画满一圈，本掷计分 +50%，并在此关获得 1 次额外重投（每关一次）。',
  short: '旋涡仪式：本掷 +50% 且每关 +1 重投',
} satisfies BarrelDef;
