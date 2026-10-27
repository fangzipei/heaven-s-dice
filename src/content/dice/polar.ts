// content/dice/polar.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'polar', name: '阴阳骰', setId: null, rarity: 'rare',
  probs: [0.30, 0, 0, 0, 0, 0.70],
  flavor: '不是一，就是六。它拒绝中间的那些妥协。',
  desc: '只有 1 和 6（30% / 70%）。', bonus: null,
} satisfies DiceDef;
