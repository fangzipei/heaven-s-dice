import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'nightwatch', name: '守夜桶', rarity: 'epic', type: 'nightwatch',
  art: 'guide', price: 200, keep: 0.5,
  desc: '每关第一次掷空时，保留本轮 50% 的挂账分数。',
  short: '每关第一次掷空保留一半',
} satisfies BarrelDef;
