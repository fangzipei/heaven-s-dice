// content/items/powder.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'powder', name: '幸运粉', type: 'active', icon: 'powder',
  rarity: 'common', price: 40, charges: 1, consumable: true,
  desc: '免费重掷所有未计分骰子，并立即获得 80 分。一次性消耗。',
  flavor: '吹上去的时候像金粉，落在桌面上的时候像灰尘。',
} satisfies ItemDef;
