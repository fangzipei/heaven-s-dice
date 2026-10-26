// content/dice/demon_seal.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'demon_seal', name: '契约之印', setId: 'demon', rarity: 'rare',
  probs: [0.11, 0.17, 0.17, 0.17, 0.21, 0.17],
  flavor: '盖下去的那一刻，连点数都要补缴印花税。',
  desc: '恶魔赖子 11%，5 点偏高。', bonus: null,
} satisfies DiceDef;
