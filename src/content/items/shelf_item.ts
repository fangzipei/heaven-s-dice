// content/items/shelf_item.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'shelf_item', name: '暗格货架', type: 'passive', icon: 'shelf-item',
  rarity: 'epic', price: 190, charges: 0,
  desc: '商店物品货位 +1（默认 3 → 4）。',
  flavor: '最值钱的东西从来不在明面上。',
} satisfies ItemDef;
