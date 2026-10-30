// content/dice/bias_one.ts — 一枚骰子：把 1 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_one', name: '壹面骰', setId: null, rarity: 'rare',
  probs: [0.4, 0.12, 0.12, 0.12, 0.12, 0.12],
  flavor: '它只认最左边的那一面。',
  desc: '1 点概率 40%，其余五面各 12%；此骰以 1 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 1, value: 100, label: '偏面：此骰以 1 计分 +100' },
} satisfies DiceDef;
