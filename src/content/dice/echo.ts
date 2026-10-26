// content/dice/echo.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'echo', name: '回声骰', setId: null, rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它把上一次落桌的声音也一起掷了出来。',
  desc: '六面均衡；计分含此骰时，本次计分 ×1.14。',
  bonus: { type: 'dieMultiplier', value: 1.14, label: '回声：计分含此骰时 ×1.14' },
} satisfies DiceDef;
