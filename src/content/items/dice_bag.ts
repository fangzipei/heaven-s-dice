// content/items/dice_bag.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'dice_bag', name: '丰饶骰袋', type: 'passive', icon: 'pouch',
  rarity: 'epic', price: 240, charges: 0, unique: true,
  desc: '可使用的骰子 +1（永久，整局限获取一次）；第七位骰子参与计分时，其对应分数 -50%。',
  flavor: '袋口永远比看起来深。你甚至不确定里面有没有别的东西。',
} satisfies ItemDef;
