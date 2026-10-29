// content/dice/bias_two.ts — 一枚骰子：把 2 点的概率抬到 38%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_two', name: '贰面骰', setId: null, rarity: 'common',
  probs: [0.124, 0.380, 0.124, 0.124, 0.124, 0.124],
  flavor: '两面三刀的人最喜欢它。',
  desc: '2 点概率 38%，其余五面各 12.4%。', bonus: null,
} satisfies DiceDef;
