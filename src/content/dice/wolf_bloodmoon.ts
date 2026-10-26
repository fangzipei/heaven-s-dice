// content/dice/wolf_bloodmoon.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_bloodmoon', name: '血月骰', setId: 'wolf', rarity: 'rare',
  probs: [0.20, 0.07, 0.33, 0.06, 0.22, 0.12],
  flavor: '月全食那晚，整片森林都听见了骨头里的回声。',
  desc: '3 点概率 33%，1、5 各 20%。', bonus: null,
} satisfies DiceDef;
