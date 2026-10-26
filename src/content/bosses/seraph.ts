// content/bosses/seraph.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'seraph', art: 'boss-diamond',
  // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
  // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
  curve: { target: 1, reward: 1.45 },
  name: '钻石天使', title: '最后的庄家', accent: '#a8e8f1',
  effectName: '四成归天', effectKey: 'scoreTaxReroll',
  effectDesc: '所有计分减少 40%；作为补偿，本关重投次数 +1。',
  intro: '你走到了这里。很好。现在证明你的运气不是别人借给你的。',
  taunts: [
    '太轻了，轻得像一句没有重量的祷告。',
    '棱镜只放大真实。你的真实，只有这么一点吗？',
    '最后一把。你连后悔的时间都没有。',
  ],
  win: '……原来命运也会掷出六。离开吧，在天亮之前。',
} satisfies BossContentDef;
