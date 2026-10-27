// content/barrels/guide.ts — 骰桶：自动补一张顺子。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'guide', name: '顺遂桶', rarity: 'legendary', type: 'straightFix',
  art: 'guide', price: 220,
  desc: '若本次摇出的骰型只差一颗就能组成顺子，桶会转动其中一颗骰子，补成顺子。',
  short: '差一颗成顺时自动补顺',
} satisfies BarrelDef;
