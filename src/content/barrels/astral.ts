// content/barrels/astral.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'astral', name: '星象桶', rarity: 'epic', type: 'probability',
  art: 'astral', price: 158, bias: [1, 1, 1, 1, 1.20, 1.40],
  desc: '桶身刻着逆行的星图。6 与 5 的出现率显著提高。',
  short: '5、6 概率 +',
} satisfies BarrelDef;
