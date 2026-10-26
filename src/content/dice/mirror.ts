// content/dice/mirror.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'mirror', name: '照面骰', setId: null, rarity: 'rare',
  probs: [0.25, 0.20, 0.05, 0.05, 0.20, 0.25],
  flavor: '两面光亮，两面模糊，另外两面从没被人看清。',
  desc: '1、6 各 25%，2、5 各 20%，3、4 各 5%。', bonus: null,
} satisfies DiceDef;
