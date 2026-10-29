// content/dice/wolf_ancestor.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_ancestor', name: '狼祖骰', setId: 'wolf', rarity: 'legendary',
  probs: [0.153, 0.076, 0.37, 0.076, 0.153, 0.172],
  flavor: '第一头狼的牙床。三这个数字，是它先咬出来的。',
  desc: '3 点概率 37%；计分含至少一颗 3 时，本手分数 +35%。',
  bonus: { type: 'scorePercent', percent: 35, when: { kind: 'hasFace', face: 3 }, label: '狼祖：计分含至少一颗 3 时 +35%' },
} satisfies DiceDef;
