// content/items/glove.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'glove', name: '魔术手套', type: 'active', icon: 'glove',
  rarity: 'common', price: 35, charges: 1, consumable: true,
  desc: '将当前选中的一颗骰子改为 1 点。一次性消耗。',
  flavor: '完全合法。只要没有人看见袖口里的第二只手。',
} satisfies ItemDef;
