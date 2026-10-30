// content/dice/bystander.ts — 稀有骰：不计分时反而给本手加分。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'bystander', name: '看客骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它从不抢戏，只在别人算账的时候轻轻敲一下桌沿。',
  desc: '六面均衡；当它没有参与本次计分时，本手额外 +200 分。',
  bonus: { type: 'unselectedFlat', value: 200, label: '看客：未参与本次计分时，本手 +200' },
} satisfies DiceDef;
