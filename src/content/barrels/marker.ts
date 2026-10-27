// content/barrels/marker.ts — 骰桶：概率把一颗骰子定为 1。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'marker', name: '定一桶', rarity: 'rare', type: 'forceOne',
  art: 'marker', price: 90, chance: 0.10,
  desc: '每次摇动有 10% 概率指定一颗骰子的点数为 1。',
  short: '10% 指定一颗骰子为 1',
} satisfies BarrelDef;
