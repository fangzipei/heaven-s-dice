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

export type DiceSetId = 'wolf' | 'demon' | 'stargazer' | 'caravan';

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

/** What has to land for a percentage bonus to pay out. */
export type ScoreCondition =
  | { kind: 'wild' }
  | { kind: 'face'; face: number }
  | { kind: 'hasFace'; face: number }
  | { kind: 'faceTriple'; face: number }
  | { kind: 'anyTriple' }
  | { kind: 'fiveAndSix' }
  | { kind: 'straight' };

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
  /* Percentage of the whole hand, added when this die is scored. */
  | { type: 'scorePercent'; percent: number; label: string; when?: ScoreCondition }
  /* Scores one extra share when this die is part of a 条子 (3+ identical). */
  | { type: 'retriggerKind'; label: string }
  /* Coins paid each time this die is scored. */
  | { type: 'coinsPerScore'; value: number; label: string }
  | { type: 'afterScoreFlat'; value: number; label: string }
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
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'pawn'; art: string;
      price: number; step: number; cap: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'nightwatch'; art: string;
      price: number; keep: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'fuse'; art: string;
      price: number; value: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'rotation'; art: string;
      price: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'twoFace'; art: string;
      price: number; multiplier: number; desc: string; short: string;
    }
  | {
      id: string; name: string; rarity: RarityId; type: 'loan'; art: string;
      price: number; cost: number; desc: string; short: string;
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
      bossOnly?: string;
      /** Consumable dice-granting items: roll N dice of a rarity, choose one. */
      grant?: { rarity: RarityId; count: number; choose: number };
    }
  | {
      id: string; name: string; type: 'passive'; icon: string; rarity: RarityId;
      price: number; charges: number; desc: string; flavor: string;
      consumable?: boolean; unique?: boolean;
      /** Drop-only boss relic; value is the owning boss id. */
      bossOnly?: string;
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
  rarity: RarityId;
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
  /** Explicit no-boss target for each level; takes precedence over the formula. */
  nonBossTargets?: number[];
  /** Percentage growth bands for the no-boss curve. */
  targetSegments?: { untilLevel: number; growth: number }[];
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

export type HandType = 'single' | 'pair' | 'triple' | 'quad' | 'quint' | 'sext' | 'straight' | 'mixed';

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
  bossBannedType?: HandType | null;
  ratCrownProc?: boolean;
  judgeRelicUsed?: boolean;
  ashTypes?: string[];
  suspensorRelicUsed?: boolean;
  luciferRelicUsed?: boolean;
  bossDisabled?: boolean;
  /** 独注桶：this round has only scored single-die combinations so far. */
  roundSinglesOnly?: boolean;
  /** 本局赖子骰参与计分的次数，用于骰型规则的悬停提示。 */
  wildScored?: number;
  /** 守夜桶：本关的防爆保分是否已用。 */
  nightwatchUsed?: boolean;
  /** 引信桶：主动物品后的下一手是否带 +120。 */
  fuseArmed?: boolean;
  /** 借运桶：本关是否已经借过一次重投。 */
  loanUsed?: boolean;
  /** 借运桶：当前掷空正在等待玩家决定是否付钱重投。 */
  loanOffer?: boolean;
  /** 双面桶：本关选择的两面。 */
  twoFaceFaces?: number[];
  /** 双面桶：本关还没确认两面。 */
  twoFacePending?: boolean;
  /** 烟雾弹：本次免费重投只处理未计分骰子。 */
  smokeReroll?: boolean;
  /** 悬秤人：浮动分掷空后先挂起，等真正重投时再清零。 */
  floatingBustPending?: boolean;
  /** 星轨套：本关第一次重投已经免费。 */
  stargazerRerollUsed?: boolean;
  /** 悬秤人：浮动分已经被一次计分并重投/结算锁定。 */
  floatingLocked?: boolean;
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
  relic?: { id: string; name: string } | null;
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
  /** 整局触发全骰的次数（跨关累计，记录用）。 */
  hotDice: number;
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
  /** 本关挂账的银币（金痕骰 / 鎏金桶）；锁分时才入账。 */
  roundCoins?: number;
  /** 连记骰：每颗骰子成功参与非浮动计分的累计次数，按 bagUid 记录。 */
  dieStacks?: Record<string, number>;
  /** 本局已经向魔鬼支付过几次重来。 */
  retryCount?: number;
  /** 本局支付给魔鬼的重来银币总额。 */
  devilPaid?: number;
  /** 商旅套：本局免费重来是否已用。 */
  caravanFreeRetryUsed?: boolean;
  /** 本关触发的全骰次数；左上角计数与连击倍率都读它。 */
  hotCount?: number;
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
  /** Boss id assigned to each boss level when this run started. */
  bossPlan?: Record<number, string>;
  /** Pre-rolled dice choices for purchased dice packs; first array is the active pack. */
  grantRolls?: Record<string, string[][]>;
  /** 双倍镜片 carry-over, spent on the next level. */
  carryScore?: number;
  runWon?: boolean;
}
