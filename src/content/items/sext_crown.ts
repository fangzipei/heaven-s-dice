// content/items/sext_crown.ts — 被动物品：六条得分加成。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'sext_crown', name: '六芒冠', type: 'passive', icon: 'amulet',
  rarity: 'legendary', price: 280, charges: 0,
  desc: '六条的得分 +50%。',
  flavor: '六道光芒同时照下来时，连庄家也要眯眼。',
  scoreRule: { hand: 'sext', multiplier: 1.50, label: '六条 +50%' },
} satisfies ItemDef;
