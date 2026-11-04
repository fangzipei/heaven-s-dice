// content/dice/wolf_bloodmoon.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'wolf_bloodmoon', name: '血月骰', setId: 'wolf', rarity: 'rare',
  probs: [0.20, 0, 0.55, 0, 0.25, 0],
  flavor: '月全食那晚，森林里所有的狼一起叫了整夜。',
  desc: '只能掷出 1、3、5：3 点 55%，1 点 20%，5 点 25%。', bonus: null,
} satisfies DiceDef;
