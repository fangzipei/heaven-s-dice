// content/dice/last_road.ts — 没有重投时反而更强。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'last_road', name: '末路骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '没有退路时，它才肯认真。',
  desc: '六面均衡；本关没有重投次数时，此骰计分 ×1.5。',
  bonus: { type: 'noRerollMultiplier', value: 1.5, label: '末路：无重投时此骰 ×1.5' },
} satisfies DiceDef;
