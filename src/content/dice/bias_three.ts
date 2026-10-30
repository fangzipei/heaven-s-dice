// content/dice/bias_three.ts — 一枚骰子：把 3 点的概率抬到 40%。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bias_three', name: '叁面骰', setId: null, rarity: 'common',
  probs: [0.12, 0.12, 0.4, 0.12, 0.12, 0.12],
  flavor: '三这一面被摸得最亮。',
  desc: '3 点概率 40%，其余五面各 12%；此骰以 3 计分时，本手 +100 分。',
  bonus: { type: 'faceFlat', face: 3, value: 100, label: '偏面：此骰以 3 计分 +100' },
} satisfies DiceDef;
