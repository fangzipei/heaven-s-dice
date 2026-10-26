// content/barrels/serpent.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'serpent', name: '蛇纹桶', rarity: 'rare', type: 'probability',
  art: 'serpent', price: 70, bias: [0.70, 1.30, 1.25, 1.25, 1, 1],
  desc: '鳞片在掌心下滑动。2、3、4 的出现率提高，1 更少。',
  short: '2、3、4 概率 + / 1 概率 −',
} satisfies BarrelDef;
