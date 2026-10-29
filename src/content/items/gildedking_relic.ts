// content/items/gildedking_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'gildedking_relic', name: '无冕金冠', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'gildedking',
  desc: '最常用的骰型计分 +20%。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
