// content/dice/lone_ember.ts — 传说骰：只剩它未计分时，也算一次全骰。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'lone_ember', name: '独燃骰', setId: null, rarity: 'legendary',
  probs: [0.10, 0.10, 0.10, 0.50, 0.10, 0.10],
  flavor: '火种只在最后一颗骰子上亮着；它烧完的那一瞬，桌面会当作整桌都算过了。',
  desc: '4 点概率 50%；当它是唯一一颗未计分的骰子时，本次计分算作全骰。触发后，下一手计分 -40%。',
  bonus: { type: 'loneHot', penalty: 40, label: '独燃：只剩它未计分时算作全骰，下一手 -40%' },
} satisfies DiceDef;
