// content/items/side_bet.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'side_bet', name: '边注铜牌', type: 'passive', icon: 'coin',
  rarity: 'rare', price: 85, charges: 0,
  desc: '计分包含 1 或 5 时，本次计分 +15%。',
  flavor: '主桌的输赢归主桌，边桌上的铜牌只认自己的账。',
  scoreRule: { hand: 'oneOrFive', multiplier: 1.15, label: '边注 +15%' },
} satisfies ItemDef;
