// content/dice/bias_four.ts — 一枚骰子：把 4 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_four', name: '肆面骰', setId: null, rarity: 'common',
  probs: [0.12, 0.12, 0.12, 0.4, 0.12, 0.12],
  flavor: '四角朝上，落桌时总是它先着地。',
  desc: '4 点概率 40%，其余五面各 12%；此骰以 4 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 4, value: 100, label: '偏面：此骰以 4 计分 +100' },
} satisfies DiceDef;
