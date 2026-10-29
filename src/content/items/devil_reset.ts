import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'devil_reset', name: '魔鬼的收据', type: 'active', icon: 'salt',
  rarity: 'epic', price: 444, charges: 1, consumable: true,
  desc: '使用后清空本局的重来次数；下一次与魔鬼交易从 100 银币重新开始。',
  flavor: '一张被烧焦的收据。魔鬼收回了利息，但没收回名字。',
} satisfies ItemDef;
