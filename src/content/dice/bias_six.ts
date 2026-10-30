// content/dice/bias_six.ts — 一枚骰子：把 6 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_six', name: '陆面骰', setId: null, rarity: 'common',
  probs: [0.12, 0.12, 0.12, 0.12, 0.12, 0.4],
  flavor: '六面都刻着同一个小字：赢。',
  desc: '6 点概率 40%，其余五面各 12%；此骰以 6 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 6, value: 100, label: '偏面：此骰以 6 计分 +100' },
} satisfies DiceDef;
