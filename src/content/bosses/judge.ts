// content/bosses/judge.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'judge', art: 'boss-stone',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1.15, reward: 1.60 },
  rarity: 'rare',
  name: '石心审判官', title: '无言法庭', accent: '#9ab9c4',
  effectName: '少一次机会', effectKey: 'rerollMinus',
  effectDesc: '本关重投次数减少 1 次。',
  intro: '骰子不会说谎。但你会。现在，让我们开始取证。',
  taunts: [
    '先扣掉一次机会。证词要慢慢问。',
    '少一次重投，够不够你想清楚？',
    '法庭不赶时间。你赶。',
  ],
  win: '……判决暂缓。石头的记忆比你想的长。',
} satisfies BossContentDef;
