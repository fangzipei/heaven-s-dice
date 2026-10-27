// content/barrels/pentagram.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'pentagram', name: '五芒桶', rarity: 'epic', type: 'gesture',
  art: 'pentagram', price: 125, gesture: 'pentagram',
  desc: '每关完成一次五芒星仪式，本掷所有计分 +20%。',
  short: '五芒星仪式：每关一次，本掷计分 +20%',
} satisfies BarrelDef;
