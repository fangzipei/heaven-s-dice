// content/dice/hex.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'hex', name: '六合骰', setId: null, rarity: 'epic',
  probs: [0.10, 0.12, 0.10, 0.10, 0.28, 0.30],
  flavor: '六面里有两面刻得特别深，骰子自己也知道。',
  desc: '5、6 各 28% / 30%；计分同时含 5 与 6 时 +300。',
  bonus: { type: 'fiveAndSix', value: 300, label: '六合：计分同时含 5 与 6 时 +300' },
} satisfies DiceDef;
