// content/barrels/gilded.ts — 骰桶：概率给一颗骰子染金。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'gilded', name: '鎏金桶', rarity: 'rare', type: 'gild',
  art: 'gilded', price: 90, chance: 0.10, coin: 100,
  desc: '每次摇动有 10% 概率让一颗骰子染上金痕；该骰计分时挂 100 银币，锁分时入账。',
  short: '10% 染金 · 金骰挂 100 银币',
} satisfies BarrelDef;
