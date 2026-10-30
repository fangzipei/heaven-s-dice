import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'chain_note', name: '连记骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '账房先生说，第一笔只是开场，第二笔才算利息。',
  desc: '六面均衡；此骰每成功参与一次计分，之后每一手计分都永久 +60（可叠加）。',
  bonus: { type: 'afterScoreFlat', value: 60, label: '连记：每次成功计分后，之后每一手 +60' },
} satisfies DiceDef;
