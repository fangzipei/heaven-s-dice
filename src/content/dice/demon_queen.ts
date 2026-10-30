// content/dice/demon_queen.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'demon_queen', name: '无冠女王', setId: 'demon', rarity: 'legendary',
  probs: [0.14, 0.18, 0.18, 0.16, 0.18, 0.16],
  flavor: '她输掉了王冠，于是开始赢走别人的名字。',
  desc: '恶魔赖子 14%；计分含此骰 ×1.25，场上但未选中 ×0.80。',
  bonus: { type: 'demon', included: 1.25, missing: 0.8, label: '恶魔契约：含此骰 ×1.25；不含则 ×0.80' },
} satisfies DiceDef;
