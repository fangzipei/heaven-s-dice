// content/items/pairbane_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'pairbane_relic', name: '连理骨', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'pairbane',
  desc: '两颗同点骰组成「对子」：对子分数 = 对应点数三条分数 ÷ 2。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
