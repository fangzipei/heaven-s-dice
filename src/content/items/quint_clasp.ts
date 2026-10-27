// content/items/quint_clasp.ts — 被动物品：五条得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'quint_clasp', name: '五指扣', type: 'passive', icon: 'cuff',
  rarity: 'epic', price: 170, charges: 0,
  desc: '五条的得分 +25%。',
  flavor: '五根手指扣住桌沿，谁也别想掀桌。',
  scoreRule: { hand: 'quint', multiplier: 1.25, label: '五条 +25%' },
} satisfies ItemDef;
