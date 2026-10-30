// content/barrels/ember.ts — 稀有骰桶：把 1 点变成稳定的分数。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'ember', name: '余烬桶', rarity: 'rare', type: 'faceScore',
  art: 'ember', price: 80, face: 1, value: 35, tripleValue: 100,
  desc: '每颗参与本次计分的 1 额外 +35 分；本次计分含三条 1 再 +100 分。',
  short: '每颗计分的 1 +35 分 · 三条 1 再 +100',
} satisfies BarrelDef;
