// content/dice/neighbor.ts — 有概率贴到前一颗骰子的相邻点数。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'neighbor', name: '邻行骰', setId: null, rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它总想和左边那颗并排走。',
  desc: '六面均衡；落骰后有 50% 概率变成前一颗骰子的相邻点数（可能 +1，也可能 −1）。',
  bonus: { type: 'adjacentChance', chance: 0.5, label: '邻行：50% 变成前一颗的相邻点数' },
} satisfies DiceDef;
