// content/barrels/singles.ts — 骰桶：整轮只按单骰计分才有加成。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'singles', name: '独注桶', rarity: 'rare', type: 'singlesBonus',
  art: 'singles', price: 90, multiplier: 2.0,
  desc: '若本轮此前每次都只按单颗骰型计分，则本次计分 +100%。',
  short: '整轮只计单骰时 +100%',
} satisfies BarrelDef;
