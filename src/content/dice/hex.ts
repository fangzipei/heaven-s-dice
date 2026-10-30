// content/dice/hex.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'hex', name: '六合骰', setId: null, rarity: 'epic',
  probs: [0.10, 0.12, 0.10, 0.10, 0.28, 0.30],
  flavor: '六面里有两面刻得特别深，骰子自己也知道。',
  desc: '5、6 各 28% / 30%；计分含 5 或 6 时，本手分数 +30%。',
  bonus: { type: 'scorePercent', percent: 30, when: { kind: 'faceIn', faces: [5, 6] }, label: '六合：计分含 5 或 6 时 +30%' },
} satisfies DiceDef;
