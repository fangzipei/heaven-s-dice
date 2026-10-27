// content/dice/bias_two.ts — 一枚骰子：把 2 点的概率抬到 30%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_two', name: '贰面骰', setId: null, rarity: 'common',
  probs: [0.14, 0.30, 0.14, 0.14, 0.14, 0.14],
  flavor: '两面三刀的人最喜欢它。',
  desc: '2 点概率 30%，其余五面各 14%。', bonus: null,
} satisfies DiceDef;
