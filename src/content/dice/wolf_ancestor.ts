// content/dice/wolf_ancestor.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_ancestor', name: '狼祖骰', setId: 'wolf', rarity: 'legendary',
  probs: [0.12, 0.06, 0.50, 0.06, 0.12, 0.14],
  flavor: '第一头狼的牙床。三这个数字，是它先咬出来的。',
  desc: '3 点概率 50%；计分含至少一颗 3 时，本手分数 +25%。',
  bonus: { type: 'scorePercent', percent: 25, when: { kind: 'hasFace', face: 3 }, label: '狼祖：计分含至少一颗 3 时 +25%' },
} satisfies DiceDef;
