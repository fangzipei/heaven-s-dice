// content/items/lucky_coin.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

// ── 主动物品 · 每关恢复一次 ────────────────────────────────────────────
export default {
  id: 'lucky_coin', name: '幸运币', type: 'active', icon: 'coin',
  rarity: 'common', price: 35, charges: 1, consumable: true,
  desc: '立即获得 150 分。一次性消耗。',
  flavor: '正面是国王，反面也是国王。这枚硬币从来不做选择。',
} satisfies ItemDef;
