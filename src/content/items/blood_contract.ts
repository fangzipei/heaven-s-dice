// content/items/blood_contract.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'blood_contract', name: '血契', type: 'active', icon: 'dagger',
  rarity: 'legendary', price: 190, charges: 1,
  desc: '本关后续每次计分 +35%，但每次计分后失去 100 分。',
  flavor: '签名用的不是墨水。落款之后，骰子开始闻起来像铁。',
} satisfies ItemDef;
