// content/dice/scavenger.ts — 普通骰：稳定的计分底薪，不依赖点型。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'scavenger', name: '拾荒骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '别人算完账离开后，它把桌缝里的零钱一枚枚捡起来。',
  desc: '六面均衡；此骰参与计分时额外 +280 分。',
  bonus: { type: 'flatScored', value: 280, label: '拾荒：此骰计分 +280' },
} satisfies DiceDef;
