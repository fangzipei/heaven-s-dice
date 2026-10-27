// content/items/hourglass.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'hourglass', name: '时间沙漏', type: 'active', icon: 'hourglass',
  rarity: 'epic', price: 135, charges: 1,
  desc: '恢复 1 次重投，并立即获得 200 分。',
  flavor: '沙子倒着流。你多了一次机会，也少了一点耐心。',
} satisfies ItemDef;
