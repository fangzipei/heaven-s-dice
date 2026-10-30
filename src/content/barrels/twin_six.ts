// content/barrels/twin_six.ts — 普通骰桶：把 5、6 两面抬高。
import type { BarrelDef } from '../../core/types.ts';

export default {
  id: 'twin_six', name: '双六桶', rarity: 'common', type: 'probability',
  art: 'twin-six', price: 48, bias: [1, 1, 1, 1, 1.35, 1.35],
  desc: '桶底刻着两个并排的六。5 与 6 的出现率提高（各约 20.1%），其余四面各约 14.9%。',
  short: '5、6 各约 20.1%',
} satisfies BarrelDef;
