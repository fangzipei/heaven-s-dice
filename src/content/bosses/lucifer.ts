// content/bosses/lucifer.ts — 传说庄家：每次投掷封禁一种骰型。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'lucifer', art: 'boss-seraph',
  curve: { target: 1.5, reward: 2.15 },
  rarity: 'legendary',
  name: '路西法', title: '晨星', accent: '#d9c2ff',
  effectName: '禁声令', effectKey: 'banTypeEachThrow',
  effectDesc: '每次投掷随机封禁一种骰型，本投不能用该骰型计分；三条、四条、五条、六条分别计算。',
  intro: '别急着开口。先让我看看，这一手你准备怎么解释。',
  taunts: [
    '这一手，禁声。',
    '换一种说法。你还有机会。',
    '光越亮，影子里的规矩越多。',
  ],
  win: '……你居然真的把话说完。',
} satisfies BossContentDef;
