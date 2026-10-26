// content/dice/odd_eye.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

// ── 无套组 · 10 枚：形状本身就是规则 ────────────────────────────────
export default {
  id: 'odd_eye', name: '孤影骰', setId: null, rarity: 'rare',
  probs: [1 / 3, 0, 1 / 3, 0, 1 / 3, 0],
  flavor: '它只掷出奇数。影子总是一半。',
  desc: '只有 1、3、5 三种点数（各 1/3），永远不会掷出双数。', bonus: null,
} satisfies DiceDef;
