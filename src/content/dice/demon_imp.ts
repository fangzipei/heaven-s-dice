// content/dice/demon_imp.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

// ── 恶魔 · 5 枚：掷出 1 就是赖子，不按 100 分算 ──────────────────────
export default {
  id: 'demon_imp', name: '小恶魔骰', setId: 'demon', rarity: 'common',
  probs: [0.13, 0.17, 0.18, 0.17, 0.18, 0.17],
  flavor: '它在桌下轻轻碰你的膝盖，提醒你：一可以不是一。',
  desc: '恶魔赖子 13%，其余面均衡。', bonus: null,
} satisfies DiceDef;
