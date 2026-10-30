// content/items/whetstone.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'whetstone', name: '磨刀石', type: 'active', icon: 'hourglass',
  rarity: 'rare', price: 90, charges: 1,
  desc: '每关一次，立即获得 1 次重投。',
  flavor: '磨的不是骰子，是你下一次还敢不敢掷的手。',
} satisfies ItemDef;
