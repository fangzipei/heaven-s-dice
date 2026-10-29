// content/bosses/ashclerk.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'ashclerk', art: 'boss-ash',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1.35, reward: 1.85 },
  rarity: 'epic',
  name: '灰烬书记官', title: '熔炉的记录员', accent: '#d98a56',
  effectName: '不许复写', effectKey: 'noRepeatType',
  effectDesc: '本关不能连续使用同一种骰型；重复上一手的骰型本次得 0 分。',
  intro: '熔炉只认新的证词。上一页写过的牌型，这一页不许再写。',
  taunts: [
    '重复的供词，连灰都不如。',
    '换一种写法。否则这一页作废。',
    '我记录每一次掷骰；你最好每次都不一样。',
  ],
  win: '……这一页，我记下了。笔尖也该换新的了。',
} satisfies BossContentDef;
