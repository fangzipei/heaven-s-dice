// content/items/twinsix_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'twinsix_relic', name: '双六骨', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'twinsix',
  desc: '单骰计分从 1/5 改为 2/6，分值 200/100；1、5 不再能单独计分。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
