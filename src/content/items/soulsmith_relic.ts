// content/items/soulsmith_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'soulsmith_relic', name: '熔炉余烬', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'soulsmith',
  desc: '5 点不再被熔；每个参与计分的 5 点额外 +25 分。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
