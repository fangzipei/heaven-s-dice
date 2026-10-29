// content/items/startax_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'startax_relic', name: '三证铜印', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'startax',
  desc: '3 颗及以上组合计分 +25%。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
