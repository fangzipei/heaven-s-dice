// content/dice/refrain.ts — 条子里的额外一次结算。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'refrain', name: '重奏骰', setId: null, rarity: 'rare',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '同一段旋律，它坚持再唱一遍。',
  desc: '六面均衡；此骰按条子（三条及以上）计分时，额外结算一次。',
  bonus: { type: 'retriggerKind', label: '重奏：按条子计分时额外结算一次' },
} satisfies DiceDef;
