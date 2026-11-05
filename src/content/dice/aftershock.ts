// content/dice/aftershock.ts — 史诗骰：每一次成功计分都让后续更重。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'aftershock', name: '余响骰', setId: null, rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '骰子已经停了，桌面还在震；第二次响声比第一次更久。',
  desc: '六面均衡；每关第一次参与计分后，此骰永久 +80；同关多颗余响只算第一颗。',
  bonus: { type: 'afterScoreFlat', value: 80, label: '余响：每关首次计分后 +80（仅第一颗）' },
} satisfies DiceDef;
