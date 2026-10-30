// content/dice/cliff.ts — 1/5 几乎不出现，但一旦计分就值一大笔。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'cliff', name: '孤崖骰', setId: null, rarity: 'common',
  probs: [0.05, 0.225, 0.225, 0.225, 0.05, 0.225],
  flavor: '两边是悬崖，中间是窄路；掉下去的人才会想起它。',
  desc: '1、5 各 5%，其余四面对半分（各 22.5%）；此骰参与计分时额外 +400 分。',
  bonus: { type: 'flatScored', value: 400, label: '孤崖：此骰计分 +400' },
} satisfies DiceDef;
