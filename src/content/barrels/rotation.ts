import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'rotation', name: '轮转桶', rarity: 'rare', type: 'rotation',
  art: 'serpent', price: 100,
  desc: '每次重投后，随机一颗未计分骰子点数 +1；6 点回到 1。',
  short: '每次重投随机一颗骰子 +1',
} satisfies BarrelDef;
