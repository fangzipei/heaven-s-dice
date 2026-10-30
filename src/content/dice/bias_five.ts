// content/dice/bias_five.ts — 一枚骰子：把 5 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_five', name: '伍面骰', setId: null, rarity: 'rare',
  probs: [0.12, 0.12, 0.12, 0.12, 0.4, 0.12],
  flavor: '五这一面刻得最深。',
  desc: '5 点概率 40%，其余五面各 12%；此骰以 5 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 5, value: 100, label: '偏面：此骰以 5 计分 +100' },
} satisfies DiceDef;
