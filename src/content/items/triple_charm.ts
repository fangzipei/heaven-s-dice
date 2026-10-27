// content/items/triple_charm.ts — 被动物品：三条得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'triple_charm', name: '三环坠', type: 'passive', icon: 'amulet',
  rarity: 'rare', price: 100, charges: 0,
  desc: '三条的得分 +15%。',
  flavor: '三个环扣在一起，第四个就再也解不开了。',
  scoreRule: { hand: 'triple', multiplier: 1.15, label: '三条 +15%' },
} satisfies ItemDef;
