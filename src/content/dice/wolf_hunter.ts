// content/dice/wolf_hunter.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_hunter', name: '猎手骰', setId: 'wolf', rarity: 'rare',
  probs: [0.20, 0.09, 0.31, 0.07, 0.21, 0.12],
  flavor: '狼群追猎时，猎手总会把三枚爪印留在雪里。',
  desc: '3 点概率 31%，1、5 各 20%。', bonus: null,
} satisfies DiceDef;
