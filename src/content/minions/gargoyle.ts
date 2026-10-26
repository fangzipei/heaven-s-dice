// content/minions/gargoyle.ts — 一个小兵庄家。
import type { MinionDef } from '../../core/types.ts';

export default {
  id: 'gargoyle', group: 1, art: 'minion-gargoyle', name: '石砾', title: '审判官的影子',
  accent: '#89a7b2',
  intro: '坐下。审判官在看着。石头从不眨眼，所以你也别眨。',
  taunts: ['你的分数正在风化。', '每一道裂缝，都是一次失败的供词。', '我听见你筹码碎裂的声音。'],
  win: '喀……这些裂纹会作证。审判官不会喜欢这个结果。',
} satisfies MinionDef;
