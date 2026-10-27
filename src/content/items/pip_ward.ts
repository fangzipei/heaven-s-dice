// content/items/pip_ward.ts — 被动物品：1/5 得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'pip_ward', name: '点金符', type: 'passive', icon: 'eye',
  rarity: 'epic', price: 140, charges: 0,
  desc: '一点或五点的得分 +10%。',
  flavor: '它不改变点数，只改变点数在账本上的重量。',
  scoreRule: { hand: 'oneOrFive', multiplier: 1.10, label: '一点/五点 +10%' },
} satisfies ItemDef;
