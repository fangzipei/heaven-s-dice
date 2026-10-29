// content/items/suspensor_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'suspensor_relic', name: '悬秤砣', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'suspensor',
  desc: '漂浮分掷空时保留 50%；每关一次。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
