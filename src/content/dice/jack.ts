// content/dice/jack.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'jack', name: '骰王', setId: null, rarity: 'legendary',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '它看起来毫无偏私。可它记得每一个三条。',
  desc: '六面完全均衡；计分含任意三条时，本手分数 +35%（靠组合吃饭，不靠点数偏好）。',
  bonus: { type: 'scorePercent', percent: 35, when: { kind: 'anyTriple' }, label: '骰王：计分含任意三条时 +35%' },
} satisfies DiceDef;
