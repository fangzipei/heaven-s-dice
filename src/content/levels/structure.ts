// content/levels/structure.ts — 关卡骨架：先定庄家节奏，再让一切从这里推出来。
import { TABLE_DEFS } from '../tables/index.ts';

/* ── 关卡结构：24 关，6 位庄家 ─────────────────────────────────────────
   庄家固定在 3 / 7 / 11 / 15 / 20 / 24 关：
   3、7 稀有；11、15 史诗；20、24 传说。 */
export const MINION_GAPS: number[] = [2, 3, 3, 3, 4, 3, 0];

/** 第 i 位庄家的关卡号 = 前面所有空档累加 + 每位庄家自己占的一关。 */
export const BOSS_LEVELS: number[] = (() => {
  let level = 0;
  return MINION_GAPS.map((gap) => (level += gap + 1));
})();

export const LEVEL_TOTAL = BOSS_LEVELS[BOSS_LEVELS.length - 1]!;

// 五张桌子平分全部关卡（24 关 → 5 / 5 / 5 / 5 / 4），章节归属也从这里推。
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
