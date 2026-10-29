// content/items/lucifer_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'lucifer_relic', name: '晨星角', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'lucifer',
  desc: '每关第一次被封禁的骰型仍可正常计分一次。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
