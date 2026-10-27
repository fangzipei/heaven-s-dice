// content/dice/bias_six.ts — 一枚骰子：把 6 点的概率抬到 30%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_six', name: '陆面骰', setId: null, rarity: 'common',
  probs: [0.14, 0.14, 0.14, 0.14, 0.14, 0.30],
  flavor: '六面都刻着同一个小字：赢。',
  desc: '6 点概率 30%，其余五面各 14%。', bonus: null,
} satisfies DiceDef;
