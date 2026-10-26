// content/items/cracked_pouch.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'cracked_pouch', name: '裂痕骰袋', type: 'passive', icon: 'cracked-pouch',
  rarity: 'epic', price: 130, charges: 0, unique: true,
  desc: '可使用的骰子 -1，所有计分 +25%（永久，整局限获取一次）。',
  flavor: '少一颗骰子，少一条退路。裂缝里漏出来的不是骰子，是孤注一掷。',
} satisfies ItemDef;
