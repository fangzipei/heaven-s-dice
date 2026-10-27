// content/items/heaven_plate.ts — 被动物品：天地顺得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'heaven_plate', name: '天地盘', type: 'passive', icon: 'hourglass',
  rarity: 'legendary', price: 300, charges: 0,
  desc: '天地顺的得分 +20%。',
  flavor: '盘面刻着天与地，中间的缝隙刚好放下一颗骰子。',
  scoreRule: { hand: 'straight16', multiplier: 1.20, label: '天地顺 +20%' },
} satisfies ItemDef;
