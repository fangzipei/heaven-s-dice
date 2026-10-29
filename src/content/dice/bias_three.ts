// content/dice/bias_three.ts — 一枚骰子：把 3 点的概率抬到 38%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_three', name: '叁面骰', setId: null, rarity: 'common',
  probs: [0.124, 0.124, 0.380, 0.124, 0.124, 0.124],
  flavor: '逢三则变，赌桌上也不例外。',
  desc: '3 点概率 38%，其余五面各 12.4%。', bonus: null,
} satisfies DiceDef;
