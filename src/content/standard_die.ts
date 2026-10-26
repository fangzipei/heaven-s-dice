// content/standard_die.ts — 标准骰。
// 它不进商店卡池（所以不在 dice/index.ts 里），只是开局行囊与各种兜底用到的
// 那颗“什么都不会”的骰子：没有 price，也没有 isStandard 之外的特殊字段。
import type { DiceDef } from '../core/types.ts';

export const STANDARD_DIE: DiceDef = {
  id: 'standard', name: '标准骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '客栈里最普通、也最诚实的骨头骰。',
  desc: '每个点数概率相同。', bonus: null, isStandard: true,
};
