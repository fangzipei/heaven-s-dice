// content/barrels/demon_pact.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'demon_pact', name: '恶魔契桶', rarity: 'epic', type: 'wildScore',
  art: 'demon-totem', price: 120, value: 60,
  desc: '每颗参与本次计分的恶魔赖子额外 +60 分。赖子不能单独计分，必须补进组合。',
  short: '每颗计分的恶魔赖子 +60 分',
} satisfies BarrelDef;
