// content/items/quad_seal.ts — 被动物品：四条得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'quad_seal', name: '四方印', type: 'passive', icon: 'edict',
  rarity: 'epic', price: 160, charges: 0,
  desc: '四条的得分 +20%。',
  flavor: '四个角都盖了章，这张契才算数。',
  scoreRule: { hand: 'quad', multiplier: 1.20, label: '四条 +20%' },
} satisfies ItemDef;
