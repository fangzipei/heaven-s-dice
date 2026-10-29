// content/bosses/index.ts — 庄家池与每局随机排班。
import rotfang from './rotfang.ts';
import judge from './judge.ts';
import soulsmith from './soulsmith.ts';
import ashclerk from './ashclerk.ts';
import gildedking from './gildedking.ts';
import startax from './startax.ts';
import suspensor from './suspensor.ts';
import seraph from './seraph.ts';
import lucifer from './lucifer.ts';
import twinsix from './twinsix.ts';
import toll from './toll.ts';
import mirror from './mirror.ts';
import pairbane from './pairbane.ts';
import { BOSS_LEVELS, chapterForLevel } from '../levels/structure.ts';
import type { BossContentDef, BossDef, RarityId } from '../../core/types.ts';

export const BOSS_DEFS: BossContentDef[] = [
  rotfang,
  judge,
  soulsmith,
  ashclerk,
  gildedking,
  startax,
  suspensor,
  seraph,
  lucifer,
  twinsix,
  toll,
  mirror,
  pairbane,
];

export const BOSS_BY_ID: Record<string, BossContentDef> = Object.fromEntries(
  BOSS_DEFS.map((boss) => [boss.id, boss]),
);

/** Boss slots are fixed; the boss in each slot is rolled when the run starts. */
export const BOSS_SLOTS: { level: number; rarity: RarityId }[] = BOSS_LEVELS.map((level, index) => ({
  level,
  rarity: index < 2 ? 'rare' : index < 4 ? 'epic' : 'legendary',
}));

const pools: Record<RarityId, BossContentDef[]> = {
  common: [],
  rare: BOSS_DEFS.filter((boss) => boss.rarity === 'rare'),
  epic: BOSS_DEFS.filter((boss) => boss.rarity === 'epic'),
  legendary: BOSS_DEFS.filter((boss) => boss.rarity === 'legendary'),
};

/** Stable default used for the compendium and for code paths without a run. */
export const DEFAULT_BOSS_PLAN: Record<number, string> = {
  3: 'rotfang',
  7: 'judge',
  11: 'soulsmith',
  15: 'ashclerk',
  20: 'startax',
  24: 'seraph',
};

function shuffle<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Random boss assignment for one run: one boss per slot, no repeats inside a tier. */
export function rollBossPlan(rng: () => number): Record<number, string> {
  const queues: Record<RarityId, BossContentDef[]> = {
    common: [],
    rare: shuffle(pools.rare, rng),
    epic: shuffle(pools.epic, rng),
    legendary: shuffle(pools.legendary, rng),
  };
  const plan: Record<number, string> = {};
  for (const slot of BOSS_SLOTS) {
    const pick = queues[slot.rarity].shift();
    if (pick) plan[slot.level] = pick.id;
  }
  return plan;
}

export function bossForLevel(level: number, plan: Record<number, string> = DEFAULT_BOSS_PLAN): BossDef | null {
  const id = plan[level];
  const def = id ? BOSS_BY_ID[id] : undefined;
  if (!def) return null;
  return { ...def, level, group: chapterForLevel(level) };
}

/** The six default bosses, kept for static screens that are not inside a run. */
export const BOSSES: BossDef[] = BOSS_SLOTS
  .map((slot) => bossForLevel(slot.level))
  .filter((boss): boss is BossDef => Boolean(boss));

/** All eight bosses, grouped by rarity, for the compendium and run rolling. */
export const BOSS_CATALOG: BossContentDef[] = BOSS_DEFS;
