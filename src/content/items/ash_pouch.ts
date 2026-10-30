// content/items/ash_pouch.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'ash_pouch', name: '灰烬袋', type: 'active', icon: 'powder',
  rarity: 'common', price: 32, charges: 1, consumable: true,
  desc: '立即获得 120 分。一次性消耗。',
  flavor: '袋口一松，烧剩下的东西也还是热的。',
} satisfies ItemDef;
