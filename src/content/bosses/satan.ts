import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'satan', art: 'boss-satan',
  curve: { target: 1, reward: 2.0 },
  rarity: 'legendary',
  name: '撒旦', title: '天堂的主人', accent: '#d8b56a',
  effectName: '撒旦的恩赐', effectKey: 'satanGift',
  effectDesc: '最终目标 100000 分；开局额外获得 2 次重投。',
  intro: '你看见了。很好——能走到这里，靠的不只是运气。我欣赏你的实力，也欣赏你敢看穿这场天堂的胆子。现在，赌上你最原始的那一手。',
  taunts: [
    '你一路赢到这里，不是为了跪下的。',
    '天堂的门是假的，但你走到门前的力气是真的。',
    '让我看看，一个从地狱爬上来的赌徒，能不能赢过天堂的主人。',
  ],
  win: '王座裂了。你终于听见了真正的钟声。',
} satisfies BossContentDef;
