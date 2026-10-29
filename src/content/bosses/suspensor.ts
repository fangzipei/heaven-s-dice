// content/bosses/suspensor.ts — 一位庄家。关卡号与章节由 bosses/index.ts 推出，不要在这里手写。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'suspensor', art: 'boss-scale',
  curve: { target: 1.35, reward: 1.85 },
  rarity: 'epic',
  name: '悬秤人', title: '未落定之数', accent: '#c3b4e6',
  effectName: '浮筹未决', effectKey: 'floatingScore',
  effectDesc: '本关所有得分都是漂浮分：计分与重投都不会真正入账，只有离开这张桌子时才结算；一旦掷出无法计分的骰型，全部漂浮分立刻消散。',
  intro: '别急着把筹码放进兜里。在这张桌上，它们还没落地。',
  taunts: [
    '你看，它浮着。像所有还没被承认的运气。',
    '记下来了吗？记下来也没用，它还没落定。',
    '秤在等一个结果。要不要继续，随你。',
  ],
  win: '……落了。原来你的运气，是有重量的。',
} satisfies BossContentDef;
