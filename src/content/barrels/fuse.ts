import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'fuse', name: '引信桶', rarity: 'rare', type: 'fuse',
  art: 'marker', price: 150, value: 1000,
  desc: '使用主动物品后，下一次计分额外 +1000 分。',
  short: '主动物品后下一手 +1000',
} satisfies BarrelDef;
