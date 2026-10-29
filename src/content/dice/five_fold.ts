// content/dice/five_fold.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'five_fold', name: '五福骰', setId: null, rarity: 'epic',
  probs: [0.14, 0.12, 0.12, 0.10, 0.36, 0.16],
  flavor: '五枚铜钱串在一起，掷出来的永远是五。',
  desc: '5 点概率 36%；此骰以 5 计分时，本手分数 +15%。',
  bonus: { type: 'scorePercent', percent: 15, when: { kind: 'face', face: 5 }, label: '五福：此骰以 5 计分时 +15%' },
} satisfies DiceDef;
