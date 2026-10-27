// content/barrels/wolf_totem.ts — 一只骰桶。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'wolf_totem', name: '狼图腾桶', rarity: 'rare', type: 'faceScore',
  art: 'wolf-totem', price: 90, face: 3, value: 50, tripleValue: 150,
  desc: '每颗参与本次计分的 3 额外 +50 分；本次计分含三条 3 再 +150 分。',
  short: '每颗计分的 3 +50 分 · 三条 3 再 +150',
} satisfies BarrelDef;
