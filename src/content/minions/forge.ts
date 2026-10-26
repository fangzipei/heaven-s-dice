// content/minions/forge.ts — 一个小兵庄家。
import type { MinionDef } from '../../core/types.ts';

export default {
  id: 'forge', group: 2, art: 'minion-forge', name: '炭手', title: '熔炉学徒',
  accent: '#d47b4f',
  intro: '师父说，输掉的骰子要回炉。我看你这一袋，都挺适合。',
  taunts: ['炉温够了。你的运气还差得远。', '这一把要是输了，我帮你把骨头也锻一锻。', '别看我的面具，看骰子。'],
  win: '啧。炉子今天不饿。带着你的分滚吧。',
} satisfies MinionDef;
