// content/dice/wolf_alpha.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_alpha', name: '白狼王骰', setId: 'wolf', rarity: 'epic',
  probs: [0.153, 0.096, 0.33, 0.096, 0.172, 0.153],
  flavor: '它从不嚎叫。它只是看，群狼便知道该咬住哪一个数字。',
  desc: '3 点 33%；计分含至少一颗 3 时，本手分数 +30%。',
  bonus: { type: 'scorePercent', percent: 30, when: { kind: 'hasFace', face: 3 }, label: '狼王：计分含至少一颗 3 时 +30%' },
} satisfies DiceDef;
