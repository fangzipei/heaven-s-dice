// content/bosses/rotfang.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'rotfang', art: 'boss-rat',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1, reward: 1.65 },
  name: '腐牙伯爵', title: '鼠群之主', accent: '#c25b5b',
  effectName: '鼠群噬点', effectKey: 'blankNinth',
  effectDesc: '每投出 8 颗骰子，接下来 1 颗会被啃成白骰：没有点数，不能计分。',
  intro: '小赌徒，坐吧。我的孩子们已经饿了一整个冬天。',
  taunts: [
    '它们不挑食。点数、运气，连骰子的脸都啃。',
    '数到八了吗？第九颗归我的孩子们。',
    '白骰也是骰。只是它什么也说不出来。',
  ],
  win: '不可能……我的孩子们明明已经闻到血腥味了。',
} satisfies BossContentDef;
