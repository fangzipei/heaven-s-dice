// content/dice/balance.ts — 均衡，但被选中计分时额外给分。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'balance', name: '衡心骰', setId: 'caravan', rarity: 'rare',
  probs: [0.25, 0.125, 0.125, 0.125, 0.25, 0.125],
  flavor: '它不偏向任何一面，只偏向选中它的人。',
  desc: '1、5 各 25%，其余各 12.5%；此骰参与计分时额外 +1000 分（每关一次）。',
  bonus: { type: 'flatScoredOnce', value: 1000, label: '衡心：此骰计分 +1000（每关一次）' },
} satisfies DiceDef;
