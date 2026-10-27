// content/items/courage.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

// ── 一次性消耗品 · 用掉就从行囊消失 ────────────────────────────────────
export default {
  id: 'courage', name: '烈酒', type: 'active', icon: 'bottle',
  rarity: 'common', price: 35, charges: 1, consumable: true,
  desc: '本关 +1 次重投。一次性消耗，喝完就没了。',
  flavor: '喝下去以后，桌子看起来更平了，骰子看起来更听话了。',
} satisfies ItemDef;
