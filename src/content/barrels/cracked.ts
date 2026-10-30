// content/barrels/cracked.ts — 普通骰桶：偶尔把一颗骰子钉成 1。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'cracked', name: '裂口桶', rarity: 'common', type: 'forceOne',
  art: 'cracked', price: 42, chance: 0.08,
  desc: '每次摇动有 8% 概率指定一颗骰子的点数为 1。',
  short: '8% 指定一颗骰子为 1',
} satisfies BarrelDef;
