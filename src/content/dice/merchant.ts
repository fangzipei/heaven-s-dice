// content/dice/merchant.ts — 商店重随会永久抬高它的计分加成。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'merchant', name: '商旅骰', setId: 'caravan', rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它记得每一次讨价还价，也记得每一次你忍不住重随。',
  desc: '六面均衡；初始计分 ×1.60，每间商店最多一次重随后永久再 +15%。',
  bonus: { type: 'shopRerollMultiplier', value: 0.15, label: '商旅：初始 +60%，每次商店重随再 +15%' },
} satisfies DiceDef;
