// content/bosses/startax.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'startax', art: 'boss-tax',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1.35, reward: 2.15 },
  rarity: 'legendary',
  name: '星辉税吏', title: '天穹的收税官', accent: '#8fcbd8',
  effectName: '三证成立', effectKey: 'minTripleScore',
  effectDesc: '只有使用 3 颗及以上骰子的组合才能计分；更小的组合仍可打出，但本次得 0 分。',
  intro: '每一次重投都要在天穹上记一笔。今天，只认三颗以上的证词。',
  taunts: [
    '三颗以下，没有资格上账。',
    '凑齐三颗，再和我说话。',
    '星星在数你的骰子。',
  ],
  win: '税已收讫。天穹会记住这笔账。',
} satisfies BossContentDef;
