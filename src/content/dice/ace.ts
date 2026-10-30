// content/dice/ace.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'ace', name: '双煞骰', setId: null, rarity: 'legendary',
  probs: [0.30, 0.06, 0.06, 0.06, 0.30, 0.22],
  flavor: '只掷一和五。这两面，是赌桌上唯一能单独换钱的面。',
  desc: '1、5 各 30%；此骰以 1 计分时，本手分数 +60%。',
  bonus: { type: 'scorePercent', percent: 60, when: { kind: 'face', face: 1 }, label: '双煞：此骰以 1 计分时 +60%' },
} satisfies DiceDef;
