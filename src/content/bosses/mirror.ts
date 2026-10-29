// content/bosses/mirror.ts — 史诗庄家：本关目标分翻倍。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'mirror', art: 'boss-scale',
  curve: { target: 1.35, reward: 1.85 },
  rarity: 'epic',
  name: '双倍镜', title: '另一个你', accent: '#a8d8e8',
  effectName: '双倍倒影', effectKey: 'doubleTarget',
  effectDesc: '本关预期分数 ×2。',
  intro: '你看到的分数，只是镜子里的那一半。',
  taunts: [
    '再翻一倍，才够看见我。',
    '你以为你赢了？镜子里还没点头。',
    '两倍。很公平。',
  ],
  win: '镜子碎了。分数留下。',
} satisfies BossContentDef;
