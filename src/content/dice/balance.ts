// content/dice/balance.ts — 均衡，但被选中计分时额外给分。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'balance', name: '衡心骰', setId: 'caravan', rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它不偏向任何一面，只偏向选中它的人。',
  desc: '六面各 16.7%；此骰参与计分时额外 +100 分。',
  bonus: { type: 'flatScored', value: 100, label: '衡心：此骰计分 +100' },
} satisfies DiceDef;
