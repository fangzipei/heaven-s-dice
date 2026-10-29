import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'loan', name: '借运桶', rarity: 'epic', type: 'loan',
  art: 'oak', price: 180, cost: 40,
  desc: '每关第一次掷空时，可以支付 40 银币重投一次。',
  short: '掷空时付 40 银币重投',
} satisfies BarrelDef;
