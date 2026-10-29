import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'fuse', name: '引信桶', rarity: 'rare', type: 'fuse',
  art: 'marker', price: 100, value: 120,
  desc: '使用主动物品后，下一次计分额外 +120 分。',
  short: '主动物品后下一手 +120',
} satisfies BarrelDef;
