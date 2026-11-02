// content/dice/pilgrim.ts — 稀有骰：顺子路线的稳定收益。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'pilgrim', name: '朝圣骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它只往一个方向走：把散落的点数连成一条朝圣的路。',
  desc: '六面均衡；本手以顺子计分时，额外 +500 分。',
  bonus: { type: 'straightFlat', value: 500, label: '朝圣：顺子计分 +500' },
} satisfies DiceDef;
