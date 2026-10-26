// content/dice/demon_devourer.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'demon_devourer', name: '噬名者', setId: 'demon', rarity: 'legendary',
  probs: [0.20, 0.14, 0.15, 0.13, 0.18, 0.20],
  flavor: '它不吞骰子，它只把骰子的名字吃掉，留下一个空壳。',
  desc: '恶魔赖子 20%；此骰作为赖子计分时 +140。',
  bonus: { type: 'wildFlat', value: 140, label: '噬名：此骰作为恶魔赖子计分时 +140' },
} satisfies DiceDef;
