// content/dice/bystander.ts — 普通骰：没被选中时反而给分。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bystander', name: '看客骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它从不抢戏，只在别人算账的时候轻轻敲一下桌沿。',
  desc: '六面均衡；它没有被包含进本次计分时，本手 +200 分。',
  bonus: { type: 'unselectedFlat', value: 200, label: '看客：未被计分时，本手 +200' },
} satisfies DiceDef;
