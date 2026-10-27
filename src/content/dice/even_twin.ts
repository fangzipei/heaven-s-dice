// content/dice/even_twin.ts — 一枚骰子：改概率/风味/加成只需要动这个文件。
import type { DiceDef } from '../../core/types.ts';

export default {
  id: 'even_twin', name: '双生骰', setId: null, rarity: 'epic',
  probs: [0, 0.22, 0, 0.18, 0, 0.60],
  flavor: '它只掷出偶数。成双的东西从不独自计分。',
  desc: '只有 2、4、6（22% / 18% / 60%）；单颗不能计分，是纯组合骰，但三连极好凑。计分含任意三连时 +520。',
  bonus: { type: 'anyTriple', value: 520, label: '双生：计分含任意三连时 +520' },
} satisfies DiceDef;
