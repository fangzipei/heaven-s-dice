// content/bosses/startax.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'startax', art: 'boss-tax',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1, reward: 1.30 },
  name: '星辉税吏', title: '天穹的收税官', accent: '#8fcbd8',
  effectName: '少一次机会', effectKey: 'rerollMinus',
  effectDesc: '本关重投次数减少 1 次。',
  intro: '每一次重投都要在天穹上记一笔。今天，先扣掉一次。',
  taunts: [
    '机会也要纳税。',
    '少一次，也够你后悔。',
    '星星在数你的重投。',
  ],
  win: '税已收讫。天穹会记住这笔账。',
} satisfies BossContentDef;
