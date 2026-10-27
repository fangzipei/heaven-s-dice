// content/items/straight_bell.ts — 被动物品：顺子得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'straight_bell', name: '顺风铃', type: 'passive', icon: 'scroll',
  rarity: 'epic', price: 150, charges: 0,
  desc: '顺子的得分 +20%。',
  flavor: '铃舌顺着风走，从不回头。',
  scoreRule: { hand: 'straight', multiplier: 1.20, label: '顺子 +20%' },
} satisfies ItemDef;
