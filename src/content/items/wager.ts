// content/items/wager.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'wager', name: '加注契约', type: 'active', icon: 'scroll',
  rarity: 'rare', price: 85, charges: 1, consumable: true,
  desc: '本关 +1 次重投，且下一次计分 ×1.6。一次性消耗。',
  flavor: '空着的那一栏，是留给你自己签的。',
} satisfies ItemDef;
