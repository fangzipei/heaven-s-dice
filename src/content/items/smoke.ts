// content/items/smoke.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'smoke', name: '烟雾弹', type: 'active', icon: 'smoke',
  rarity: 'epic', price: 200, charges: 1,
  desc: '免费重掷所有未计分骰子，不消耗重投次数；已经计分的骰子留在桌上。',
  flavor: '烟雾散去时，桌上少了一颗骰子，多了一个说法。',
} satisfies ItemDef;
