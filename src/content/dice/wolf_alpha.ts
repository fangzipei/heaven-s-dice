// content/dice/wolf_alpha.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_alpha', name: '白狼王骰', setId: 'wolf', rarity: 'epic',
  probs: [0.16, 0.10, 0.30, 0.10, 0.18, 0.16],
  flavor: '它从不嚎叫。它只是看，群狼便知道该咬住哪一个数字。',
  desc: '3 点 30%；计分含至少一颗 3 时 +260。',
  bonus: { type: 'hasFace', face: 3, value: 260, label: '狼王：计分含至少一颗 3 时 +260' },
} satisfies DiceDef;
