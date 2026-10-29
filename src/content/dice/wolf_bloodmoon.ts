// content/dice/wolf_bloodmoon.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_bloodmoon', name: '血月骰', setId: 'wolf', rarity: 'rare',
  probs: [0.191, 0.067, 0.36, 0.057, 0.21, 0.115],
  flavor: '月全食那晚，整片森林都听见了骨头里的回声。',
  desc: '3 点概率 36%，1、5 各 20%。', bonus: null,
} satisfies DiceDef;
