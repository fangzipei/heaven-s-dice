import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'pawn', name: '当铺桶', rarity: 'epic', type: 'pawn',
  art: 'gilded', price: 190, step: 10, cap: 80,
  desc: '每次计分时，每 10 银币让本手 +1 分，单次最多 +80 分。',
  short: '银币转分数，最多 +80',
} satisfies BarrelDef;
