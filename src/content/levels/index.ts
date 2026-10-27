// content/levels/index.ts — 关卡表与“这一关是谁、在哪张桌子”的查询。
// 这里的数据全部由 structure.ts 的节奏 + curve.ts 的曲线 + bosses/ 的系数推出来。
import { BOSSES } from '../bosses/index.ts';
import { MINION_DEFS } from '../minions/index.ts';
import { TABLE_DEFS } from '../tables/index.ts';
import { buildLevelTable, LEVEL_CURVE } from './curve.ts';
import { chapterForLevel } from './structure.ts';
import type { ChapterInfo, LevelRow, MinionDef, Opponent, TableDef } from '../../core/types.ts';

export const LEVELS: LevelRow[] = buildLevelTable();

let difficultyMultiplier = 1;
let levelTargets: Record<string, number> = {};

/** Applied once per run from GET /config; per-level targets win over the multiplier. */
export function setDifficultyConfig(config: { multiplier?: number; targets?: Record<string, number> }): void {
  difficultyMultiplier = Number(config.multiplier) > 0 ? Number(config.multiplier) : 1;
  levelTargets = config.targets || {};
}

export const LEVEL_COUNT = LEVELS.length;

export const CHAPTERS: ChapterInfo[] = TABLE_DEFS.map((table, group) => ({
  group,
  table,
  minion: MINION_DEFS[group] as MinionDef,
  boss: BOSSES.find((b) => b.group === group),
  bosses: BOSSES.filter((b) => b.group === group),
  levels: LEVELS.filter((l) => chapterForLevel(l.level) === group),
}));

export function chapterLevelSpan(chapter: number): [number, number] {
  const levels = LEVELS.filter((entry) => chapterForLevel(entry.level) === chapter).map((entry) => entry.level);
  if (!levels.length) return [1, LEVELS.length];
  return [Math.min(...levels), Math.max(...levels)];
}

export function getLevelConfig(level: number): LevelRow {
  const base = LEVELS[Math.min(level, LEVEL_COUNT) - 1]!;
  const override = Number(levelTargets[String(level)]);
  const target = override > 0
    ? Math.round(override)
    : Math.max(10, Math.round(base.target * difficultyMultiplier / 10) * 10);
  return target === base.target ? base : { ...base, target, curve: { ...base.curve, target } };
}

export function getOpponent(level: number): Opponent | null {
  const group = chapterForLevel(level);
  const cfg = getLevelConfig(level);
  if (!cfg.boss) return MINION_DEFS[group] ?? null;
  return BOSSES.find((boss) => boss.level === level) || BOSSES[group] || null;
}

export function getTable(level: number): TableDef {
  return TABLE_DEFS[chapterForLevel(level)]!;
}

export { buildLevelTable, LEVEL_CURVE };
export { MINION_GAPS, BOSS_LEVELS, LEVEL_TOTAL, CHAPTER_BOUNDS, chapterForLevel } from './structure.ts';
