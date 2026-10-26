// content/items/salt.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'salt', name: '盐', type: 'active', icon: 'salt',
  rarity: 'epic', price: 105, charges: 1, consumable: true,
  desc: '本关下一次掷空不计：本轮未计入的分数照常转为已得。一次性消耗。',
  flavor: '洒在桌角，据说能挡住那些不该落下的骰子。',
} satisfies ItemDef;
