// content/dice/bias_five.ts — 一枚骰子：把 5 点的概率抬到 30%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_five', name: '伍面骰', setId: null, rarity: 'common',
  probs: [0.14, 0.14, 0.14, 0.14, 0.30, 0.14],
  flavor: '五根手指，五道抓痕。',
  desc: '5 点概率 30%，其余五面各 14%。', bonus: null,
} satisfies DiceDef;
