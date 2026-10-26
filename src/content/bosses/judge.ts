// content/bosses/judge.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'judge', art: 'boss-stone',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1, reward: 1.50 },
  name: '石心审判官', title: '无言法庭', accent: '#9ab9c4',
  effectName: '三证成立', effectKey: 'minTripleScore',
  effectDesc: '只有使用 3 颗及以上骰子的组合才能计分；更小的组合仍可打出，但本次得 0 分。',
  intro: '骰子不会说谎。但你会。现在，让我们开始取证。',
  taunts: [
    '一颗、两颗，都只是零碎的证词。',
    '三颗以上，才配写进判决书。',
    '你可以继续。但这一页不会记分。',
  ],
  win: '……判决暂缓。石头的记忆比你想的长。',
} satisfies BossContentDef;
