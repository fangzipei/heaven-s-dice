// content/items/charm.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'charm', name: '赌徒护符', type: 'active', icon: 'amulet',
  rarity: 'epic', price: 120, charges: 1,
  desc: '本关目标分数降低 20%。',
  flavor: '据说它能让庄家忘掉一条规则。副作用是庄家会记住你的脸。',
} satisfies ItemDef;
