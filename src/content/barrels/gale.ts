// content/barrels/gale.ts — 稀有骰桶：小概率多滚出一颗骰子。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'gale', name: '疾风桶', rarity: 'rare', type: 'extraDie',
  art: 'gale', price: 120, chance: 0.03,
  desc: '每次摇动有 3% 概率多滚出一颗骰子；多出的骰子只参与本次投掷。',
  short: '3% 多出一颗临时骰',
} satisfies BarrelDef;
