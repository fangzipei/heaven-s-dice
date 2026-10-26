// Browser-side persistence: the sound preference and the codex ("图鉴")
// unlock list. Both keys are part of the shipped contract — old saves must
// stay readable — so the key names live here, once.
// Extracted from app.js in Phase 2a; behaviour is unchanged.
import type { RunState } from '../core/types.ts';

export const SOUND_KEY = 'heavens-dice-sound';
export const CODEX_KEY = 'heavensDice.codex.v1';

export type DiscoveryKind = 'dice' | 'barrels' | 'items';

export interface Discovery {
  dice: string[];
  barrels: string[];
  items: string[];
}

/** The holder app.js keeps its unlock list in, so saving stays a single write. */
export interface DiscoveryHolder {
  discovered: Discovery;
}

export function emptyDiscovery(): Discovery {
  return { dice: [], barrels: [], items: [] };
}

export function readSoundPref(): boolean {
  try {
    const value = localStorage.getItem(SOUND_KEY);
    return value === null ? true : value === '1';
  } catch { return true; }
}

export function saveSoundPref(value: boolean): void {
  try { localStorage.setItem(SOUND_KEY, value ? '1' : '0'); } catch { /* ignore */ }
}

export function loadDiscovery(): Discovery {
  try {
    const raw = JSON.parse(localStorage.getItem(CODEX_KEY) || '{}') as Record<string, unknown>;
    const clean = emptyDiscovery();
    (Object.keys(clean) as DiscoveryKind[]).forEach((kind) => {
      const list = raw[kind];
      if (Array.isArray(list)) {
        clean[kind] = [...new Set(list.filter((id): id is string => typeof id === 'string'))];
      }
    });
    return clean;
  } catch { return emptyDiscovery(); }
}

let holder: DiscoveryHolder | null = null;
let isStandardDie: (dieId: string) => boolean = () => false;

/**
 * Wire the store to app.js' state object. `resolveStandard` keeps this module
 * out of the dice registry: the standard die is the one loadout slot that
 * should never light up the codex.
 */
export function bindDiscovery(nextHolder: DiscoveryHolder, resolveStandard?: (dieId: string) => boolean): void {
  holder = nextHolder;
  if (resolveStandard) isStandardDie = resolveStandard;
}

function list(): Discovery | null {
  return holder?.discovered || null;
}

export function saveDiscovery(): void {
  const state = list();
  if (!state) return;
  try { localStorage.setItem(CODEX_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export function isDiscovered(kind: DiscoveryKind, id: string | null | undefined): boolean {
  return Boolean(id && list()?.[kind]?.includes(id));
}

export function discover(kind: DiscoveryKind, id: string | null | undefined): boolean {
  const state = list();
  if (!id || !state || !state[kind]) return false;
  if (state[kind].includes(id)) return false;
  state[kind].push(id);
  saveDiscovery();
  return true;
}

export function discoverLoadout(run: RunState | null): void {
  if (!run) return;
  run.bag?.forEach((entry) => {
    if (!isStandardDie(entry.dieId)) discover('dice', entry.dieId);
  });
  if (run.barrelId) discover('barrels', run.barrelId);
  run.ownedBarrels?.forEach((id) => discover('barrels', id));
  run.activeItems?.forEach((id) => discover('items', id));
  run.passiveItems?.forEach((id) => discover('items', id));
}

export function discoverShop(run: RunState | null): void {
  if (!run?.shop) return;
  run.shop.dice?.forEach((entry) => entry.id && discover('dice', entry.id));
  run.shop.barrel?.forEach((entry) => entry.id && discover('barrels', entry.id));
  run.shop.item?.forEach((entry) => entry.id && discover('items', entry.id));
}
