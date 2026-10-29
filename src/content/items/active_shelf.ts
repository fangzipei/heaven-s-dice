// content/items/active_shelf.ts — 被动物品：增加一个可携带主动物品的格子。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'active_shelf', name: '夹层行囊', type: 'passive', icon: 'shelf-item',
  rarity: 'epic', price: 190, charges: 0, unique: true,
  desc: '可同时携带的主动物品 +1（默认 3 → 4）。',
  flavor: '缝在行囊内侧的一层薄袋，专门用来多塞一件不该被看见的东西。',
} satisfies ItemDef;
