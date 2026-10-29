import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'twoface', name: '双面桶', rarity: 'legendary', type: 'twoFace',
  art: 'astral', price: 330, multiplier: 2.4,
  desc: '每关开始时选择两个点数；这两面的出现概率大幅提高。',
  short: '每关选择两个偏重点数',
} satisfies BarrelDef;
