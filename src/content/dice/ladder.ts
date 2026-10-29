// content/dice/ladder.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'ladder', name: '拾级骰', setId: 'stargazer', rarity: 'common',
  probs: [0.14, 0.12, 0.14, 0.16, 0.22, 0.22],
  flavor: '每一级都比上一级更重，像有人在楼梯上等你。',
  desc: '概率沿 1→6 缓缓递增，5、6 各 22%。', bonus: null,
} satisfies DiceDef;
