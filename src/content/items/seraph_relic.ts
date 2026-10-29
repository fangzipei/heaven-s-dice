// content/items/seraph_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'seraph_relic', name: '天使羽', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'seraph',
  desc: '总得分 +10%。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
