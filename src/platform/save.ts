// platform/save.ts — 本地自动存档、已结算历程与待同步队列。
import type { RunState } from '../core/types.ts';
import type { RunRecord } from './run-record.ts';

export const SAVE_KEY = 'heavensDice.save.v2';
export const HISTORY_KEY = 'heavensDice.history.v2';
export const PENDING_KEY = 'heavensDice.pendingSync.v2';
const MAX_HISTORY = 50;

export interface SavedGame {
  version: 2;
  savedAt: number;
  run: Record<string, unknown>;
  record: RunRecord | null;
}

function plainRun(run: RunState): Record<string, unknown> {
  const copy = { ...run } as Record<string, unknown>;
  delete copy.rng;
  return JSON.parse(JSON.stringify(copy)) as Record<string, unknown>;
}

export function saveGame(run: RunState, record: RunRecord | null): void {
  try {
    const payload: SavedGame = {
      version: 2,
      savedAt: Date.now(),
      run: plainRun(run),
      record: record ? JSON.parse(JSON.stringify(record)) as RunRecord : null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch { /* private mode / quota */ }
}

export function loadGame(): { run: RunState; record: RunRecord | null; savedAt: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as SavedGame | null;
    if (!raw || raw.version !== 2 || !raw.run || typeof raw.run !== 'object') return null;
    const run = raw.run as unknown as RunState;
    if (!run.level || !run.phase || !Array.isArray(run.dice)) return null;
    if (run.phase === 'run-won' || run.phase === 'lost') return null;
    run.rng = Math.random;
    return { run, record: raw.record || null, savedAt: Number(raw.savedAt) || 0 };
  } catch { return null; }
}

export function clearGameSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function readHistory(): RunRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is RunRecord => Boolean(item && typeof item === 'object' && 'clientRunId' in item));
  } catch { return []; }
}

export function saveHistory(record: RunRecord): void {
  try {
    const history = readHistory().filter((item) => item.clientRunId !== record.clientRunId);
    history.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

export function readPending(): RunRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is RunRecord => Boolean(item && typeof item === 'object' && 'clientRunId' in item));
  } catch { return []; }
}

export function queuePending(record: RunRecord): void {
  try {
    const list = readPending().filter((item) => item.clientRunId !== record.clientRunId);
    list.push(record);
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-50)));
  } catch { /* ignore */ }
}

export function clearPending(clientRunId?: string): void {
  try {
    if (!clientRunId) localStorage.removeItem(PENDING_KEY);
    else {
      const list = readPending().filter((item) => item.clientRunId !== clientRunId);
      localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    }
  } catch { /* ignore */ }
}
