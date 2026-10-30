// content/barrels/guide.ts — 骰桶：自动补一张顺子。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'guide', name: '顺遂桶', rarity: 'legendary', type: 'straightFix',
  art: 'guide', price: 330, chance: 0.35,
  desc: '每次摇动有 35% 概率，把一颗骰子转到缺少的点数上，补成顺子。',
  short: '35% 概率自动补顺',
} satisfies BarrelDef;
