// content/dice/demon_taxman.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'demon_taxman', name: '税吏骰', setId: 'demon', rarity: 'rare',
  probs: [0.14, 0.17, 0.17, 0.16, 0.18, 0.18],
  flavor: '税吏从不掷出运气，他只掷出应收的数目。',
  desc: '恶魔赖子 14%，5、6 略高。', bonus: null,
} satisfies DiceDef;
