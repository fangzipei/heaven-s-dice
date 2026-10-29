// content/bosses/toll.ts — 稀有庄家：每颗参与计分的骰子抽 2 银币。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'toll', art: 'boss-gold',
  curve: { target: 1.15, reward: 1.60 },
  rarity: 'rare',
  name: '抽头鬼', title: '按骰收税', accent: '#c7a6e8',
  effectName: '按骰抽税', effectKey: 'coinTaxPerDie',
  effectDesc: '每有一颗骰子成功参与计分，本关银币 -2。',
  intro: '你每动一颗骰子，我就抽一份头钱。',
  taunts: [
    '一颗两颗，都是钱。',
    '别数了，我替你数。',
    '你越会算，我越高兴。',
  ],
  win: '这桌的税，今天收不成了。',
} satisfies BossContentDef;
