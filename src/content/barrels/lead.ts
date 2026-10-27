// content/barrels/lead.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'lead', name: '铅心桶', rarity: 'rare', type: 'probability',
  art: 'lead', price: 70, bias: [1.35, 1, 1, 1, 1.30, 1],
  desc: '桶底灌了铅，也灌了赌徒的贪心。1 与 5 的出现率提高。',
  short: '1、5 概率 +',
} satisfies BarrelDef;
