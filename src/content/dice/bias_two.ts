// content/dice/bias_two.ts — 一枚骰子：把 2 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_two', name: '贰面骰', setId: null, rarity: 'common',
  probs: [0.12, 0.4, 0.12, 0.12, 0.12, 0.12],
  flavor: '两面之间，它总是先看见这个数字。',
  desc: '2 点概率 40%，其余五面各 12%；此骰以 2 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 2, value: 100, label: '偏面：此骰以 2 计分 +100' },
} satisfies DiceDef;
