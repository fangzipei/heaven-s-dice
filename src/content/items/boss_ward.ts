// content/items/boss_ward.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'boss_ward', name: '静默赦令', type: 'active', icon: 'edict',
  rarity: 'legendary', price: 260, charges: 1, consumable: true,
  desc: '消除下一次遇到的庄家被动。在庄家关首掷前使用可当场消除；一次性消耗。',
  flavor: '羊皮纸上只写了一句话：今晚，庄家闭嘴。落款处盖着一枚被划掉的王冠。',
} satisfies ItemDef;
