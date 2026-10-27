// content/dice/bias_three.ts — 一枚骰子：把 3 点的概率抬到 30%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_three', name: '叁面骰', setId: null, rarity: 'common',
  probs: [0.14, 0.14, 0.30, 0.14, 0.14, 0.14],
  flavor: '逢三则变，赌桌上也不例外。',
  desc: '3 点概率 30%，其余五面各 14%。', bonus: null,
} satisfies DiceDef;
