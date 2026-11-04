// content/bosses/pairbane.ts — 史诗庄家：任何对子都让本次投掷无法计分。
import type { BossContentDef } from '../../core/types.ts';

export default {
  id: 'pairbane', art: 'boss-scale',
  curve: { target: 0.8, reward: 1.85 },
  rarity: 'epic',
  name: '成双之忌', title: '不许成对', accent: '#c9b7d9',
  effectName: '成双即罪', effectKey: 'banPairs',
  effectDesc: '一次投掷中只要出现恰好两颗同点骰子（一组或两组对子），本次投掷无法计分。',
  intro: '这桌上不兴成双。一模一样的两颗，不算一手。',
  taunts: [
    '两颗一样？这一手不算。',
    '我不拆对子。整手都不算。',
    '成双，就是不合规矩。',
  ],
  win: '连成双都拦不住你。',
} satisfies BossContentDef;
