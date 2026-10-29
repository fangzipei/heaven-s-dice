// content/items/ashclerk_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'ashclerk_relic', name: '复写灰烬', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'ashclerk',
  desc: '每种骰型每关第一次计分 +25%。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
