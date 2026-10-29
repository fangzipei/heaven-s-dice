// content/bosses/soulsmith.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'soulsmith', art: 'boss-iron',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1.35, reward: 1.85 },
  rarity: 'epic',
  name: '铁面铸魂师', title: '熔炉之主', accent: '#e07d4d',
  effectName: '五点回炉', effectKey: 'noFive',
  effectDesc: '所有 5 点骰子被熔毁：不能选择，也不能计分。',
  intro: '多骰的组合最容易被烧软。今天，六点先回炉。',
  taunts: [
    '六点太圆滑，熔炉不喜欢圆滑的东西。',
    '你的六点已经变成铁水了。换一颗。',
    '铁会记住锤子。骰子会记住你。',
  ],
  win: '……看来这一炉，淬过头了。',
} satisfies BossContentDef;
