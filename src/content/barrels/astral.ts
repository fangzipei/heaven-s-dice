// content/barrels/astral.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'astral', name: '星象桶', rarity: 'epic', type: 'probability',
  art: 'astral', price: 158, bias: [1, 1, 1, 1, 1.20, 1.40],
  desc: '桶身刻着逆行的星图。5 点概率 ×1.20（标准骰约 18.2%），6 点概率 ×1.40（约 21.2%）。',
  short: '5 点 18.2% · 6 点 21.2%',
} satisfies BarrelDef;
