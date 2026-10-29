// content/items/toll_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'toll_relic', name: '抽头账簿', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'toll',
  desc: '单次计分包含 3 颗及以上骰子时，金币 +10。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
