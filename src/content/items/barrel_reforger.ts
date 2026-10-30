// content/items/barrel_reforger.ts — 被动物品：把下一只骰桶与当前骰桶熔合。
import type { ItemDef } from '../../core/types.ts';

export default {
  id: 'barrel_reforger', name: '重铸器', type: 'passive', icon: 'shelf-barrel',
  rarity: 'rare', price: 140, charges: 0,
  desc: '购买后，下一只购入的骰桶会与当前骰桶熔合为重铸桶，两者效果同时生效。当前骰桶已经是重铸桶时无法使用。',
  flavor: '两只桶的木板被敲进同一圈桶箍里，谁也说不清它现在算什么。',
} satisfies ItemDef;
