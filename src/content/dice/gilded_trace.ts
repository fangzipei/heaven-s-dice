// content/dice/gilded_trace.ts — 每次计分给银币。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'gilded_trace', name: '金痕骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '落桌时会在桌布上留下一道洗不掉的金痕。',
  desc: '六面均衡；此骰每次计分时，额外获得 20 银币。',
  bonus: { type: 'coinsPerScore', value: 20, label: '金痕：此骰计分 +20 银币' },
} satisfies DiceDef;
