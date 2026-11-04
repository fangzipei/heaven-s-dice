import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'satan', art: 'boss-satan',
  curve: { target: 1, reward: 2.0 },
  rarity: 'legendary',
  name: '撒旦', title: '掌骰人', accent: '#d8b56a',
  effectName: '撒旦的优待', effectKey: 'satanGift',
  effectDesc: '最终目标 100000 分；开局额外获得 2 次重投。',
  intro: '你看见了。很好——能走到这儿，说明运气一直站在你这边。我发了几十年骰子，头一回看见有人想自己掷。行，最后一把，掷吧。这一颗……不归我管了。',
  taunts: [
    '你一路赢到这里，不是为了跪下的。',
    '天堂的门是假的，但你走到门前的力气是真的。',
    '让我看看，一个从下坊爬上来的游魂，能不能掷得过我这一手。',
  ],
  win: '骰子到你手里了。……去掷吧。这一次，归你了。',
} satisfies BossContentDef;
