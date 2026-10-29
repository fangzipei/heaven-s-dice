// content/dice/index.ts — 注册表。
// 顺序即数据：商店卡池按索引抽取、掷骰 RNG 也按这个顺序消耗权重，插队会改变平衡。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
//
// probs 是字面的六面权重，掷骰时才归一化：每颗特殊骰都要有一个读得懂的偏向，
// 而不是一句看不见的“运气值”。
import wolf_whelp from './wolf_whelp.ts';
import wolf_bloodmoon from './wolf_bloodmoon.ts';
import wolf_alpha from './wolf_alpha.ts';
import wolf_ancestor from './wolf_ancestor.ts';
import demon_imp from './demon_imp.ts';
import demon_taxman from './demon_taxman.ts';
import demon_queen from './demon_queen.ts';
import demon_devourer from './demon_devourer.ts';
import odd_eye from './odd_eye.ts';
import even_twin from './even_twin.ts';
import polar from './polar.ts';
import ladder from './ladder.ts';
import mirror from './mirror.ts';
import five_fold from './five_fold.ts';
import hex from './hex.ts';
import echo from './echo.ts';
import ace from './ace.ts';
import jack from './jack.ts';
import balance from './balance.ts';
import cliff from './cliff.ts';
import refrain from './refrain.ts';
import shifting from './shifting.ts';
import merchant from './merchant.ts';
import gilded_trace from './gilded_trace.ts';
import last_road from './last_road.ts';
import shadow from './shadow.ts';
import neighbor from './neighbor.ts';
import chain_note from './chain_note.ts';
import bias_one from './bias_one.ts';
import bias_two from './bias_two.ts';
import bias_three from './bias_three.ts';
import bias_four from './bias_four.ts';
import bias_five from './bias_five.ts';
import bias_six from './bias_six.ts';
import type { DiceDef } from '../../core/types.ts';

export const DICE_DEFS: DiceDef[] = [
  // ── 狼裔 · 5 枚：全部在把概率往 3 推 ─────────────────────────────────
  wolf_whelp,
  wolf_bloodmoon,
  wolf_alpha,
  wolf_ancestor,
  // ── 恶魔 · 5 枚：掷出 1 就是赖子，不按 100 分算 ──────────────────────
  demon_imp,
  demon_taxman,
  demon_queen,
  demon_devourer,
  // ── 无套组 · 10 枚：形状本身就是规则 ────────────────────────────────
  odd_eye,
  even_twin,
  polar,
  ladder,
  mirror,
  five_fold,
  hex,
  echo,
  ace,
  jack,
  // ── 新增：计分触发 / 顺序互动 / 商店成长 ────────────────────────────
  balance,
  cliff,
  refrain,
  shifting,
  merchant,
  gilded_trace,
  last_road,
  shadow,
  neighbor,
  chain_note,
  // ── 新增：六枚普通偏向骰，各把一面抬到 30% ─────────────────────────
  bias_one,
  bias_two,
  bias_three,
  bias_four,
  bias_five,
  bias_six,
];
