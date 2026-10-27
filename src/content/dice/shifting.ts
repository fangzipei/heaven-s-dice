// content/dice/shifting.ts — 每关重抽六面概率。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'shifting', name: '浮面骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '每关醒来，它都换一副面孔。',
  desc: '每关开始时随机重排六面概率；没有固定偏向。',
  bonus: { type: 'randomFaces', label: '浮面：每关随机六面概率' },
} satisfies DiceDef;
