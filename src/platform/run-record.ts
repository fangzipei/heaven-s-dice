// platform/run-record.ts — 一局历程的结构化记录。
//
// 这里只收集事实，不做统计；后端会按这些事实聚合骰子/骰桶/物品强度。
import { getLevelConfig, getOpponent, getTable } from '../content/index.ts';
import type { RunState } from '../core/types.ts';
import { saveGame } from './save.ts';

export type RecordedValue = number | string;
export type RunResult = 'win' | 'loss' | 'forfeit' | 'abandoned';

export interface RecordedLoadout {
  dice: string[];
  barrel: string;
  activeItems: string[];
  passiveItems: string[];
}

export interface RecordedDiceChoice {
  uid: string;
  dieId: string;
  value: RecordedValue;
}

export interface RecordedThrow {
  at: number;
  values: RecordedValue[];
  selected: RecordedValue[];
  selectedDice: RecordedDiceChoice[];
  combos: string[];
  points: number;
  action: string | null;
  score: number;
  roundScore: number;
  rerolls: number;
  hot: boolean;
  bust: number;
}

export interface RecordedShopChoice {
  at: number;
  level: number;
  action: string;
  kind?: string;
  id?: string;
  name?: string;
  price?: number;
  coinsAfter: number;
}

export interface RecordedLevel {
  level: number;
  opponent: string;
  table: string;
  target: number;
  startedAt: string;
  endedAt: string | null;
  loadout: RecordedLoadout;
  throws: RecordedThrow[];
  shop: RecordedShopChoice[];
  score: number;
}

export interface RunRecord {
  clientRunId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  /** Active play time, excluding time spent closed/backgrounded. */
  elapsedMs?: number;
  segmentStartedAt?: string | null;
  result: RunResult | null;
  levelReached: number;
  /** First level actually recorded; 1 means a complete run history. */
  recordedFromLevel?: number;
  /** True when the record contains every level from 1 to levelReached. */
  complete?: boolean;
  finalScore: number;
  coins: number;
  levels: RecordedLevel[];
  summary: {
    throws: number;
    busts: number;
    hotThrows: number;
    shopPurchases: number;
    rerollsSpent: number;
  };
}

let active: RunRecord | null = null;

function persist(run: RunState): void {
  saveGame(run, active);
}

function newId(): string {
  try { return crypto.randomUUID(); } catch {
    return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadoutOf(run: RunState): RecordedLoadout {
  return {
    dice: run.bag.map((entry) => entry.dieId),
    barrel: run.barrelId,
    activeItems: [...run.activeItems],
    passiveItems: [...run.passiveItems],
  };
}

export function beginRunRecord(run: RunState, userId: string): RunRecord {
  active = {
    clientRunId: newId(),
    userId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: 0,
    elapsedMs: 0,
    segmentStartedAt: new Date().toISOString(),
    result: null,
    levelReached: run.level,
    recordedFromLevel: run.level,
    complete: false,
    finalScore: run.score,
    coins: run.coins,
    levels: [],
    summary: { throws: 0, busts: 0, hotThrows: 0, shopPurchases: 0, rerollsSpent: 0 },
  };
  beginLevelRecord(run);
  return active;
}

export function restoreRunRecord(record: RunRecord): void {
  active = record;
  if (!Array.isArray(active.levels)) active.levels = [];
  active.elapsedMs = Math.max(active.elapsedMs || 0, active.durationMs || 0);
  // The gap between saving and reopening is not play time.
  active.segmentStartedAt = null;
  if (!active.levels.length) beginLevelRecordFromShape(active, 1);
}

export function pauseRunRecord(): void {
  if (!active?.segmentStartedAt) return;
  const now = Date.now();
  active.elapsedMs = (active.elapsedMs || 0) + Math.max(0, now - Date.parse(active.segmentStartedAt));
  active.durationMs = active.elapsedMs;
  active.segmentStartedAt = null;
}

export function resumeRunRecord(): void {
  if (!active || active.result || active.segmentStartedAt) return;
  active.segmentStartedAt = new Date().toISOString();
}

export function getRunRecord(): RunRecord | null {
  return active;
}

export function clearRunRecord(): void {
  active = null;
}

export function setRecordUser(userId: string): void {
  if (active) active.userId = userId;
}

function beginLevelRecordFromShape(record: RunRecord, level: number): void {
  const cfg = getLevelConfig(level);
  const opponent = getOpponent(level);
  record.levels.push({
    level,
    opponent: opponent?.name || '',
    table: getTable(level).name,
    target: cfg.target,
    startedAt: new Date().toISOString(),
    endedAt: null,
    loadout: { dice: [], barrel: 'oak', activeItems: [], passiveItems: [] },
    throws: [],
    shop: [],
    score: 0,
  });
}

export function beginLevelRecord(run: RunState): void {
  if (!active) return;
  const now = new Date().toISOString();
  const previous = active.levels[active.levels.length - 1];
  if (previous && previous.level === run.level) {
    previous.target = run.target;
    return;
  }
  if (previous && !previous.endedAt) previous.endedAt = now;
  active.levels.push({
    level: run.level,

    opponent: getOpponent(run.level, run)?.name || '',
    table: getTable(run.level).name,
    target: run.target,
    startedAt: now,
    endedAt: null,
    loadout: loadoutOf(run),
    throws: [],
    shop: [],
    score: run.score,
  });
  persist(run);
}

function currentLevel(run: RunState): RecordedLevel | null {
  if (!active) return null;
  let level: RecordedLevel | null = active.levels.find((item) => item.level === run.level && !item.endedAt) || null;
  if (!level) {
    beginLevelRecord(run);
    level = active.levels[active.levels.length - 1] || null;
  }
  return level;
}

export function recordThrow(run: RunState, data: {
  values: RecordedValue[]; hot: boolean; bust: number;
}): void {
  const level = currentLevel(run);
  if (!level) return;
  level.throws.push({
    at: Date.now(),
    values: [...data.values],
    selected: [],
    selectedDice: [],
    combos: [],
    points: 0,
    action: null,
    score: run.score,
    roundScore: run.roundScore || 0,
    rerolls: run.rerolls,
    hot: Boolean(data.hot),
    bust: Number(data.bust) || 0,
  });
  level.score = run.score;
  persist(run);
}

export function recordScore(run: RunState, data: {
  selectedValues: RecordedValue[];
  selectedDice: RecordedDiceChoice[];
  combos: string[];
  points: number;
  action: string;
}): void {
  const level = currentLevel(run);
  if (!level) return;
  const target = [...level.throws].reverse().find((item) => item.action === null)
    || level.throws[level.throws.length - 1];
  if (target) {
    target.selected = [...data.selectedValues];
    target.selectedDice = [...data.selectedDice];
    target.combos = [...data.combos];
    target.points = data.points;
    target.action = data.action;
    target.score = run.score;
    target.roundScore = run.roundScore || 0;
    target.rerolls = run.rerolls;
  }
  level.score = run.score;
  persist(run);
}

export function recordShop(run: RunState, data: {
  action: string; kind?: string; id?: string; name?: string; price?: number;
}): void {
  const level = currentLevel(run);
  if (!level) return;
  level.shop.push({
    at: Date.now(),
    level: run.level,
    action: data.action,
    kind: data.kind,
    id: data.id,
    name: data.name,
    price: data.price,
    coinsAfter: run.coins,
  });
  level.score = run.score;
  persist(run);
}

export function endLevelRecord(run: RunState): void {
  const level = currentLevel(run);
  if (!level) return;
  level.endedAt = level.endedAt || new Date().toISOString();
  level.score = run.score;
  level.loadout = loadoutOf(run);
  persist(run);
}

export function finishRunRecord(run: RunState, result: RunResult): RunRecord | null {
  if (!active) return null;
  const now = new Date();
  const level = currentLevel(run);
  if (level) {
    level.endedAt = level.endedAt || now.toISOString();
    level.score = run.score;
    level.loadout = loadoutOf(run);
  }
  pauseRunRecord();
  active.endedAt = now.toISOString();
  active.durationMs = Math.max(0, active.elapsedMs || active.durationMs || 0);
  active.result = result;
  active.levelReached = run.level;
  active.recordedFromLevel = active.levels[0]?.level ?? run.level;
  active.complete = active.levels.length >= run.level
    && active.levels[0]?.level === 1
    && active.levels[active.levels.length - 1]?.level === run.level;
  active.finalScore = run.score;
  active.coins = run.coins;
  const throws = active.levels.flatMap((item) => item.throws);
  active.summary = {
    throws: throws.length,
    busts: throws.filter((item) => item.bust > 0).length,
    hotThrows: throws.filter((item) => item.hot).length,
    shopPurchases: active.levels.reduce((sum, item) => sum + item.shop.filter((choice) => choice.action.includes('buy')).length, 0),
    rerollsSpent: Math.max(0, run.maxRerolls - run.rerolls),
  };
  return active;
}

export function snapshotRecord(): RunRecord | null {
  if (!active) return null;
  return JSON.parse(JSON.stringify(active)) as RunRecord;
}
