import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'chain_note', name: '连记骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '账房先生说，第一笔只是开场，第二笔才算利息。',
  desc: '六面均衡；每关第一次参与计分后，此骰永久 +60；同关多颗连记只算第一颗。',
  bonus: { type: 'afterScoreFlat', value: 60, label: '连记：每关首次计分后 +60（仅第一颗）' },
} satisfies DiceDef;
