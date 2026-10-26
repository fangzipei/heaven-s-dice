// content/items/hunter_mark.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'hunter_mark', name: '猎人印记', type: 'active', icon: 'eye',
  rarity: 'rare', price: 75, charges: 1,
  desc: '本关下一次计分翻倍。',
  flavor: '狼群不追错猎物。你只需要让下一次落下足够重。',
} satisfies ItemDef;
