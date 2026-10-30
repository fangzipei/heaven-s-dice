// content/items/tin_cuff.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'tin_cuff', name: '锡袖扣', type: 'passive', icon: 'cuff',
  rarity: 'common', price: 32, charges: 0,
  desc: '每关胜利额外获得 8 银币，商店刷新费用 -10%。',
  flavor: '镀金的是给客人看的，锡的才是自己留着吃饭的。',
  levelCoins: 8, refreshDiscount: 0.1,
} satisfies ItemDef;
