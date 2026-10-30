import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'twoface', name: '双面桶', rarity: 'legendary', type: 'twoFace',
  art: 'astral', price: 330, multiplier: 1.9,
  desc: '每关开始时选择两个点数；这两面的出现概率 ×1.9（各约 24.4%），其余四面各约 12.8%。',
  short: '选中两面各约 24.4%，其余各约 12.8%',
} satisfies BarrelDef;
