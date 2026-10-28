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
  | { type: 'straightFlat'; value: number; label: string }
  /* Flat points whenever this die is part of the scoring selection. */
  | { type: 'flatScored'; value: number; label: string }
  /* Scores one extra share when this die is part of a 条子 (3+ identical). */
  | { type: 'retriggerKind'; label: string }
  /* Coins paid each time this die is scored. */
  | { type: 'coinsPerScore'; value: number; label: string }
  /* Multiplier while the level has no rerolls left. */
  | { type: 'noRerollMultiplier'; value: number; label: string }
  /* Permanent multiplier growth when the shop is rerolled (once per shop). */
  | { type: 'shopRerollMultiplier'; value: number; label: string }
  /* Copies the first die on the table (does nothing when it is first). */
  | { type: 'copyFirst'; label: string }
  /* Chance to snap to the previous die's face ±1. */
  | { type: 'adjacentChance'; chance: number; label: string }
  /* Re-rolls its own six-face weights at the start of every level. */
  | { type: 'randomFaces'; label: string };

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
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'gild'; art: string;
      price: number; chance: number; coin: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'forceOne'; art: string;
      price: number; chance: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'straightFix'; art: string;
      price: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'extraDie'; art: string;
      price: number; chance: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'singlesBonus'; art: string;
      price: number; multiplier: number; desc: string; short: string;
    };

export type HandTag =
  | 'triple' | 'quad' | 'quint' | 'sext'
  | 'straight' | 'straight16' | 'oneOrFive';

export interface ItemScoreRule {
  hand: HandTag;
  multiplier: number;
  label: string;
}

export type ItemDef =
  | {
      id: string; name: string; type: 'active'; icon: string; rarity: RarityId;
      price: number; charges: number; desc: string; flavor: string;
      consumable?: boolean; unique?: boolean;
      /** Consumable dice-granting items: roll N dice of a rarity, choose one. */
      grant?: { rarity: RarityId; count: number; choose: number };
    }
  | {
      id: string; name: string; type: 'passive'; icon: string; rarity: RarityId;
      price: number; charges: number; desc: string; flavor: string;
      consumable?: boolean; unique?: boolean;
      /** Passive hand-type multipliers, applied to the whole score. */
      scoreRule?: ItemScoreRule;
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
  /** Multiplier applied to every level after the first (1 = old curve). */
  targetAfterFirst?: number;
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
  /** Per-level face weights for dice that re-roll their own distribution. */
  probs?: number[];
  /** How many shop rerolls this die has witnessed (shopRerollMultiplier). */
  shopRerolls?: number;
  /** The shop level already counted, so a reroll only pays once per shop. */
  lastShopRerollLevel?: number;
}

export interface BoardDie {
  uid: string;
  bagUid: string;
  dieId: string;
  value: number | null;
  blank: boolean;
  wild: boolean;
  scored: boolean;
  /** Per-level face weights copied from the bag entry. */
  probs?: number[];
  /** Gilded by a cup: pays coins the next time it scores. */
  gilded?: boolean;
  /** Temporary extra die granted by a cup for this throw only. */
  extra?: boolean;
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
  /** 独注桶：this round has only scored single-die combinations so far. */
  roundSinglesOnly?: boolean;
  /** 本局赖子骰参与计分的次数，用于骰型规则的悬停提示。 */
  wildScored?: number;
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

/** One scored combo, kept so the table can show what each hand was worth. */
export interface ScoredComboEntry {
  key: string;
  label: string;
  faces: (number | 'wild')[];
  points: number;
  level: number;
  throw: number;
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
  /** How many scoring actions used each combo shape this run. */
  comboUsage?: Record<string, number>;
  /** Scored combos this run, newest last, with their faces and points. */
  scoreHistory?: ScoredComboEntry[];
  rng: () => number;
  throwNumber?: number;
  bossDiceRolled?: number;
  lastRoll?: (number | string)[];
  levelReward: LevelRewardInfo | null;
  pendingReward: LevelRewardInfo | null;
  pendingCoinGain: LevelRewardInfo | null;
  runWon?: boolean;
}
