// content/dice/shadow.ts — 复制桌面第一颗骰子。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'shadow', name: '随影骰', setId: null, rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '影子总是跟着第一颗落下的骰子。',
  desc: '六面均衡；落骰后总是复制桌面第一颗骰子的点数（自己排第一时失效）。',
  bonus: { type: 'copyFirst', label: '随影：复制桌面第一颗骰子' },
} satisfies DiceDef;
