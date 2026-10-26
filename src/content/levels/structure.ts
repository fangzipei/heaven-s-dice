// content/levels/structure.ts — 关卡骨架：先定庄家节奏，再让一切从这里推出来。
import { TABLE_DEFS } from '../tables/index.ts';

/* ── 关卡结构：先定庄家，再让一切从庄家推出来 ───────────────────────────
   每位庄家前面留 gap 个小兵关。gap 只增不减（2 / 2 / 3 / 3 / 3 / 4 / 4 / 4），
   所以庄家越往后越像里程碑，而不是隔关撞见的减速带。

   关卡总数、每位庄家的关卡号、他坐哪张桌子，全部从这张表推出来——加一位
   庄家只需要往 bosses/ 里加一条、在 MINION_GAPS 里补一个空档，关卡表、
   章节划分、赏金会自己重排。 */
export const MINION_GAPS: number[] = [2, 2, 3, 3, 3, 4, 4, 4];

/** 第 i 位庄家的关卡号 = 前面所有空档累加 + 每位庄家自己占的一关。 */
export const BOSS_LEVELS: number[] = (() => {
  let level = 0;
  return MINION_GAPS.map((gap) => (level += gap + 1));
})();

export const LEVEL_TOTAL = BOSS_LEVELS[BOSS_LEVELS.length - 1]!;

// 五张桌子平分全部关卡（33 关 → 7 / 7 / 7 / 6 / 6），章节归属也从这里推。
export const CHAPTER_BOUNDS: number[] = (() => {
  const chapters = TABLE_DEFS.length;
  const base = Math.floor(LEVEL_TOTAL / chapters);
  const extra = LEVEL_TOTAL % chapters;
  const bounds: number[] = [];
  let sum = 0;
  for (let i = 0; i < chapters; i += 1) {
    sum += base + (i < extra ? 1 : 0);
    bounds.push(sum);
  }
  return bounds;
})();

export function chapterForLevel(level: number): number {
  const index = CHAPTER_BOUNDS.findIndex((bound) => level <= bound);
  return index === -1 ? CHAPTER_BOUNDS.length - 1 : index;
}
