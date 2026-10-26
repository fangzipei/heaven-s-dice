// content/bosses/index.ts — 注册表。
// 索引即登场顺序：第 i 位庄家的关卡号由 MINION_GAPS 累加得到，所以顺序决定整个关卡表。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import rotfang from './rotfang.ts';
import judge from './judge.ts';
import soulsmith from './soulsmith.ts';
import ashclerk from './ashclerk.ts';
import gildedking from './gildedking.ts';
import startax from './startax.ts';
import suspensor from './suspensor.ts';
import seraph from './seraph.ts';
import { BOSS_LEVELS, chapterForLevel } from '../levels/structure.ts';
import type { BossContentDef, BossDef } from '../../core/types.ts';

export const BOSS_DEFS: BossContentDef[] = [
  rotfang,
  judge,
  soulsmith,
  ashclerk,
  gildedking,
  startax,
  suspensor,
  seraph,
];

/* 庄家的关卡号与所属赌桌都由 levels/structure.ts 的空档表决定，条目里不手写。 */
export const BOSSES: BossDef[] = BOSS_DEFS.map((boss, index) => {
  const level = BOSS_LEVELS[index]!;
  return { ...boss, level, group: chapterForLevel(level) };
});
