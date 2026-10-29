// content/items/straight_bell.ts — 被动物品：顺子得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'straight_bell', name: '顺风铃', type: 'passive', icon: 'scroll',
  rarity: 'epic', price: 180, charges: 0,
  desc: '顺子的得分 +12%。',
  flavor: '铃舌顺着风走，从不回头。',
  scoreRule: { hand: 'straight', multiplier: 1.12, label: '顺子 +12%' },
} satisfies ItemDef;
