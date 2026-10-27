// content/items/rare_pair.ts — 一次性：两枚稀有骰里选一枚。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'rare_pair', name: '双择骰函', type: 'active', icon: 'scroll',
  rarity: 'rare', price: 90, charges: 1, consumable: true,
  desc: '使用后消耗，随机出现 2 枚稀有骰子，选择其中 1 枚。',
  flavor: '两封信，两个名字，只有一枚骰子会跟你走。',
  grant: { rarity: 'rare', count: 2, choose: 1 },
} satisfies ItemDef;
