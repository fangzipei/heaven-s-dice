// content/items/shelf_dice.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'shelf_dice', name: '三层骰架', type: 'passive', icon: 'shelf-dice',
  rarity: 'epic', price: 200, charges: 0,
  desc: '商店骰子货位 +1（默认 2 → 3）。',
  flavor: '多一层，就多一种贪心的方式。',
} satisfies ItemDef;
