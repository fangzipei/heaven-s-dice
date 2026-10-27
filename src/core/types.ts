// Heaven's Dice core domain model.
import type { ScoringAnalysis } from './scoring.ts';
import type { RunScoreBreakdown } from './engine.ts';

export type RarityId = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityInfo {
  id: RarityId;
  name: string;
  short: string;
  color: string;
  glow: string;
  order: number;
}

export type RarityTable = Record<RarityId, RarityInfo>;

export type DiceSetId = 'wolf' | 'demon';

export interface SetBonusDef {
  pieces: number;
  key: string;
  text: string;
}

export interface DiceSetDef {
  id: DiceSetId;
  name: string;
  icon: string;
  color: string;
  motto: string;
  bonuses: SetBonusDef[];
}

export type DieBonus =
  | { type: 'hasFace'; face: number; value: number; label: string }
  | { type: 'demon'; included: number; missing: number; label: string }
  | { type: 'wildFlat'; value: number; label: string }
  | { type: 'anyTriple'; value: number; label: string }
  | { type: 'faceFlat'; face: number; value: number; label: string }
  | { type: 'fiveAndSix'; value: number; label: string }
  | { type: 'dieMultiplier'; value: number; label: string }
  | { type: 'tripleFace'; face: number; value: number; label: string }
  | { type: 'straightFlat'; value: number; label: string };

export interface DiceDef {
  id: string;
  name: string;
  setId: DiceSetId | null;
  rarity: RarityId;
  probs: number[];
  flavor: string;
  desc: string;
  bonus: DieBonus | null;
  price?: number;
  isStandard?: boolean;
}

export type ById<T> = Record<string, T | undefined>;

/** Shop stock is always priced: every `DICE` entry gets `price` at load. */
export type PricedDie = DiceDef & { price: number };

export type BarrelDef =
  | {
      id: string; name: string; rarity: RarityId; type: 'none'; art: string;
      price: number; bias: number[]; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'probability'; art: string;
      price: number; bias: number[]; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'faceScore'; art: string;
      price: number; face: number; value: number; tripleValue: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'wildScore'; art: string;
      price: number; value: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'gesture'; art: string;
      price: number; gesture: string; desc: string; short: string;
    };

export type ItemDef =
  | {
      id: string; name: string; type: 'active'; icon: string; rarity: RarityId;
      price: number; charges: number; desc: string; flavor: string;
      consumable?: boolean; unique?: boolean;
    }
  | {
      id: string; name: string; type: 'passive'; icon: string; rarity: RarityId;
      price: number; charges: number; desc: string; flavor: string;
      consumable?: boolean; unique?: boolean;
    };

export interface TableDef {
  id: string;
  name: string;
  material: string;
  art: string;
  accent: string;
  glow: string;
  group: number;
  subtitle: string;
  desc: string;
}

export interface MinionDef {
  id: string;
  group: number;
  art: string;
  name: string;
  title: string;
  accent: string;
  intro: string;
  taunts: string[];
  win: string;
}

export interface BossCurve {
  target?: number;
  reward?: number;
}

export interface BossDef {
  id: string;
  art: string;
  curve: BossCurve;
  name: string;
  title: string;
  accent: string;
  effectName: string;
  effectKey: string;
  effectDesc: string;
  intro: string;
  taunts: string[];
  win: string;
  level: number;
  group: number;
}

/** A boss as authored in `content/bosses/<id>.ts`, before the level table is
 *  derived: `level`/`group` come from MINION_GAPS, so they are never hand-typed. */
export type BossContentDef = Omit<BossDef, 'level' | 'group'>;

export type Opponent = MinionDef | BossDef;

export interface LevelCurveDef {
  targetBase: number;
  targetGrowth: number;
  rewardBase: number;
  rewardGrowth: number;
  targetStep: number;
  rewardStep: number;
}

export interface LevelRow {
  level: number;
  target: number;
  reward: number;
  curve: { target: number; reward: number };
  boss?: boolean;
}

export interface OvershootTierDef {
  ratio: number;
  value: number;
  key: string;
  label: string;
}

export interface ShopWeightBand {
  untilLevel: number;
  weights: Partial<Record<RarityId, number>>;
}

export interface ChapterInfo {
  group: number;
  table: TableDef;
  minion: MinionDef;
  boss: BossDef | undefined;
  bosses: BossDef[];
  levels: LevelRow[];
}

export interface BagEntry {
  uid: string;
  dieId: string;
}

export interface BoardDie {
  uid: string;
  bagUid: string;
  dieId: string;
  value: number | null;
  blank: boolean;
  wild: boolean;
  scored: boolean;
}

export type HandType = 'single' | 'triple' | 'quad' | 'quint' | 'sext' | 'straight' | 'mixed';

export interface RunFlags {
  hunterMark?: boolean;
  bloodContract?: boolean;
  wagerMark?: boolean;
  saltOffer?: boolean;
  starBonus?: boolean;
  starArmed?: boolean;
  vortexArmed?: boolean;
  vortexScore?: boolean;
  charm?: boolean;
  vortexUsed?: boolean;
  starUsed?: boolean;
  gestureUsedThisThrow?: boolean;
  hotDice?: boolean;
  rerollAll?: boolean;
  bossLastType?: HandType | null;
  bossLockedType?: HandType | null;
  bossDisabled?: boolean;
}

export interface LogEntry {
  id: string;
  text: string;
  type: string;
  level: number;
  at: number;
}

export interface LevelRewardInfo {
  base: number;
  curveBase: number;
  bossPremium: number;
  bossName: string | null;
  bossScale: number;
  bonuses: { label: string; value: number }[];
  total: number;
}

export interface ShopOffer {
  kind: string;
  id: string;
  sold: boolean;
}

export interface ShopState {
  dice: ShopOffer[];
  barrel: ShopOffer[];
  item: ShopOffer[];
  refreshes: Record<string, number>;
}

// Combo/RunScoreBreakdown are declared via imports in run-state fields below.

export interface LastScoreInfo {
  total: number;
  action: string;
  values: (number | string)[];
  combos: ScoringAnalysis['combos'];
  breakdown: RunScoreBreakdown | null;
  critical: boolean;
}

export type RunPhase =
  | 'ready' | 'selecting' | 'reroll-pending' | 'hot' | 'dead'
  | 'cleared' | 'won' | 'run-won' | 'lost' | 'shop';

export interface RunStats {
  rolls: number;
  scored: number;
  levelRolls: number;
  levelScore: number;
  bestHit: number;
  wins: number;
}

export interface RunState {
  version: number;
  level: number;
  coins: number;
  bag: BagEntry[];
  barrelId: string;
  ownedBarrels: string[];
  activeItems: string[];
  passiveItems: string[];
  acquiredItemIds: string[];
  dice: BoardDie[];
  selected: string[];
  score: number;
  roundScore: number;
  targetReached: boolean;
  overshootTierKey: string | null;
  lastBust: { lost?: number; floating?: boolean; saved?: number } | null;
  lastScore: LastScoreInfo | null;
  target: number;
  targetBase: number;
  rerolls: number;
  maxRerolls: number;
  levelStartRerolls?: number;
  phase: RunPhase;
  bossWardArmed: boolean;
  flags: RunFlags;
  itemCharges: Record<string, number>;
  history: unknown[];
  shop: ShopState | null;
  log: LogEntry[];
  rngState?: number;
  stats: RunStats;
  rng: () => number;
  throwNumber?: number;
  bossDiceRolled?: number;
  lastRoll?: (number | string)[];
  levelReward: LevelRewardInfo | null;
  pendingReward: LevelRewardInfo | null;
  pendingCoinGain: LevelRewardInfo | null;
  runWon?: boolean;
}
