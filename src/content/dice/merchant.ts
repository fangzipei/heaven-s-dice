// content/dice/merchant.ts — 商店重随会永久抬高它的计分加成。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'merchant', name: '商旅骰', setId: null, rarity: 'legendary',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它记得每一次讨价还价，也记得每一次你忍不住重随。',
  desc: '六面均衡；每次商店重随（每店最多一次）后，此骰计分永久 +10%。',
  bonus: { type: 'shopRerollMultiplier', value: 0.10, label: '商旅：每次商店重随，计分 +10%' },
} satisfies DiceDef;
