// content/bosses/twinsix.ts — 稀有庄家：单骰计分从 1/5 改为 2/6。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'twinsix', art: 'boss-rat',
  curve: { target: 1.15, reward: 1.60 },
  rarity: 'rare',
  name: '双六赌徒', title: '只认两头', accent: '#9ed7b0',
  effectName: '二六为尊', effectKey: 'singlesTwoSix',
  effectDesc: '单个骰子只有 2 点和 6 点能计分；1 点和 5 点不再单独计分。',
  intro: '一和五是穷人的点数。今天只认二和六。',
  taunts: [
    '把一和五收起来。',
    '二，或者六。别的我不听。',
    '你手里那点小钱，不够买两头。',
  ],
  win: '两头都让你押中了……',
} satisfies BossContentDef;
