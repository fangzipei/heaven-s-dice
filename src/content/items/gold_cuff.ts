// content/items/gold_cuff.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

// ── 被动物品 · 永久生效 ────────────────────────────────────────────────
export default {
  id: 'gold_cuff', name: '镀金袖扣', type: 'passive', icon: 'cuff',
  rarity: 'common', price: 50, charges: 0,
  desc: '每关胜利额外获得 15 银币，商店刷新费用 -20%。',
  flavor: '真正的财富不在钱袋里，而在别人看见你袖口时的表情里。',
  levelCoins: 15, refreshDiscount: 0.2,
} satisfies ItemDef;
