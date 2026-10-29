// content/items/mirror_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'mirror_relic', name: '双倍镜片', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'mirror',
  desc: '超过目标的分数保留至下一关，最多保留 800 分。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
