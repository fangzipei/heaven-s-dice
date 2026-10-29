// content/dice/bias_four.ts — 一枚骰子：把 4 点的概率抬到 38%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_four', name: '肆面骰', setId: null, rarity: 'common',
  probs: [0.124, 0.124, 0.124, 0.380, 0.124, 0.124],
  flavor: '四方桌，四面风，四点的骰子最稳。',
  desc: '4 点概率 38%，其余五面各 12.4%。', bonus: null,
} satisfies DiceDef;
