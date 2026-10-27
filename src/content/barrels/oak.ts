// content/barrels/oak.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'oak', name: '旧橡木桶', rarity: 'common', type: 'none',
  art: 'oak', price: 0, bias: [1, 1, 1, 1, 1, 1],
  desc: '被无数双手磨得发亮的老桶。不偏不倚，只负责让骰子落桌。',
  short: '没有额外效果',
} satisfies BarrelDef;
