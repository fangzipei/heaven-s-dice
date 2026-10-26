// content/items/shelf_barrel.ts — 一件物品。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'shelf_barrel', name: '双孔桶架', type: 'passive', icon: 'shelf-barrel',
  rarity: 'rare', price: 110, charges: 0,
  desc: '商店骰桶货位 +1（默认 1 → 2）。',
  flavor: '行商嫌你挑得太慢，索性把第二个洞也凿开了。',
} satisfies ItemDef;
