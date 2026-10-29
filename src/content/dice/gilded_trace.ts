// content/dice/gilded_trace.ts — 计分后挂账银币，锁分时才真正入账。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'gilded_trace', name: '金痕骰', setId: 'caravan', rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '落桌时会在桌布上留下一道洗不掉的金痕。',
  desc: '六面均衡；此骰计分时先把 20 银币挂在本轮，锁分（计分并重投 / 计分并结算）时一并入账，掷空则作废。',
  bonus: { type: 'coinsPerScore', value: 20, label: '金痕：计分挂 20 银币，锁分时入账' },
} satisfies DiceDef;
