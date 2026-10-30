// content/dice/wolf_whelp.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

// ── 狼裔 · 5 枚：全部在把概率往 3 推 ─────────────────────────────────
export default {
  id: 'wolf_whelp', name: '乳狼骰', setId: 'wolf', rarity: 'common',
  probs: [0.16, 0.08, 0.50, 0.06, 0.14, 0.06],
  flavor: '森林里第一颗掉落的乳牙，只认一个数字。',
  desc: '3 点概率 50%，其余点数薄。', bonus: null,
} satisfies DiceDef;
