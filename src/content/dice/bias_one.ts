// content/dice/bias_one.ts — 一枚骰子：把 1 点的概率抬到 30%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_one', name: '壹面骰', setId: null, rarity: 'rare',
  probs: [0.30, 0.14, 0.14, 0.14, 0.14, 0.14],
  flavor: '它只认最左边的那一面。',
  desc: '1 点概率 30%，其余五面各 14%。', bonus: null,
} satisfies DiceDef;
