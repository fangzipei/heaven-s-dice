// content/dice/aftershock.ts — 史诗骰：每一次成功计分都让后续更重。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'aftershock', name: '余响骰', setId: null, rarity: 'epic',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '骰子已经停了，桌面还在震；第二次响声比第一次更久。',
  desc: '六面均衡；此骰每成功参与一次计分，之后每一手计分都永久 +80（可叠加）。',
  bonus: { type: 'afterScoreFlat', value: 80, label: '余响：每次成功计分后，之后每一手 +80' },
} satisfies DiceDef;
