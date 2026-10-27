// content/items/epic_chest.ts — 一次性：随机开出一枚史诗骰。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'epic_chest', name: '史诗骰匣', type: 'active', icon: 'pouch',
  rarity: 'epic', price: 140, charges: 1, consumable: true,
  desc: '使用后消耗，随机获得 1 枚史诗骰子。',
  flavor: '匣子里只有一格，但那一格会呼吸。',
  grant: { rarity: 'epic', count: 1, choose: 1 },
} satisfies ItemDef;
