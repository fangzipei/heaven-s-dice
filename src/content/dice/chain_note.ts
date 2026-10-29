import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'chain_note', name: '连记骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '账房先生说，第一笔只是开场，第二笔才算利息。',
  desc: '六面均衡；此骰每成功参与一次非浮动计分，之后它再参与计分就永久 +100（可叠加）。',
  bonus: { type: 'afterScoreFlat', value: 100, label: '连记：每成功参与一次计分，后续此骰 +100' },
} satisfies DiceDef;
