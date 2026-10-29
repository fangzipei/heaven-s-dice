// content/barrels/brood.ts — 骰桶：概率多滚出一颗骰子。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'brood', name: '增殖桶', rarity: 'epic', type: 'extraDie',
  art: 'brood', price: 210, chance: 0.05,
  desc: '每次摇动有 5% 概率多滚出一颗骰子；多出的骰子只参与本次投掷。',
  short: '5% 多出一颗临时骰',
} satisfies BarrelDef;
