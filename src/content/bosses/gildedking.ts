// content/bosses/gildedking.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'gildedking', art: 'boss-gold',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1.35, reward: 1.85 },
  rarity: 'epic',
  name: '金冠赌王', title: '无冕之王', accent: '#e8c569',
  effectName: '只开一桌', effectKey: 'singleTypeOnly',
  effectDesc: '本关第一次计分会锁定一种骰型；之后只能继续使用同一种骰型，其他骰型得 0 分。',
  intro: '你听说过我。那就省掉自我介绍，直接开始交税吧。',
  taunts: [
    '一桌只开一种局。换牌型？那是另一张桌子的事。',
    '你的金币在我这里听起来像雨声。',
    '王冠很重，但你的分数更轻。',
  ],
  win: '拿走吧。王座上的灰尘，正好需要一点新的故事。',
} satisfies BossContentDef;
