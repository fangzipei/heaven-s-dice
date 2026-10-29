// content/items/judge_relic.ts — 庄家专属掉落，不会出现在商店。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'judge_relic', name: '停审令牌', type: 'passive', icon: 'shelf-item',
  rarity: 'legendary', price: 0, charges: 0, unique: true, bossOnly: 'judge',
  desc: '每次「计分并重投」有 25% 概率不消耗重投；每关最多触发一次。',
  flavor: '只有击败这位庄家的人才会得到它。',
} satisfies ItemDef;
