// content/minions/crystal.ts — 一个小兵庄家。
import type { MinionDef } from '../../core/types.ts';

export default {
  id: 'crystal', group: 4, art: 'minion-crystal', name: '棱翼执事', title: '天使的抄录者',
  accent: '#a8e3ec',
  intro: '你的名字已经写在天平上。现在，请用骰子补充理由。',
  taunts: ['我看见了你所有可能的结局。它们都不太乐观。', '光穿过你，什么也没有留下。', '再掷一次吧。记录需要完整。'],
  win: '记录已修正。但天平不会忘记你刚才的重量。',
} satisfies MinionDef;
