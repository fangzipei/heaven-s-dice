// TS port of legacy engine.js (Phase 1). Mutating-style pure core: zero DOM.
import {
  BARRELS, BARREL_BY_ID, DICE, DICE_BY_ID, ITEMS, ITEM_BY_ID,
  LEVEL_COUNT, STANDARD_DIE, REROLL_BONUS_RATE, OVERSHOOT_RATIO, OVERSHOOT_BONUS_RATE,
  rarityShopWeight, exceedsOvershoot, activeSetBonuses, chapterForLevel,
  getLevelConfig, getOpponent, getTable,
} from '../content/index.ts';
import {
  analyzeSelection, bestSelection, hasScoringSelection, WILD_VALUE,
  type ScoringAnalysis, type Combo, type PlayableDie, type FaceCount, type NKindCombo,
} from './scoring.ts';
import type {
  RunState, BoardDie, BagEntry, DiceDef, PricedDie, BarrelDef, ItemDef, BossDef,
  MinionDef, Opponent, HandType, LevelRewardInfo, ShopOffer, ShopState, ById,
} from './types.ts';

export interface RunScoreBreakdown {
  base: number;
  flats: { label: string; value: number }[];
  flatAdd: number;
  multipliers: { label: string; value: number | string }[];
  notes: { label: string; value?: number | string }[];
  costs: { label: string; value: number }[];
  preBoss: number;
  total: number;
}

export const BASE_REROLLS = 3;
export const STARTING_COINS = 0;
export const DEBUG = false;
/** 最近一次平衡调整：所有商店货品在标价基础上再上浮 25%。 */
export const SHOP_PRICE_MULTIPLIER = 1.25;

let uidCounter = 0;
function uid(prefix = 'id'): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

export function makeRng(seed = 0x9e3779b9): () => number {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickMany<T>(list: T[], count: number, rng: () => number): T[] {
  const copy = list.slice();
  const out: T[] = [];
  while (copy.length && out.length < count) {
    const index = Math.floor(rng() * copy.length);
    out.push(copy.splice(index, 1)[0]!);
  }
  return out;
}

function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return sum > 0 ? weights.map((w) => w / sum) : [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
}

/** 浮面骰：每关重新抽一副可读的六面权重（不会出现极端 0%）。 */
function randomFaceWeights(rng: () => number): number[] {
  return normalizeWeights(Array.from({ length: 6 }, () => 0.05 + rng() * 0.30));
}

function shuffleInPlace<T>(list: T[], rng: () => number): T[] {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

function dieBonus(dieId: string): DiceDef['bonus'] {
  return getDieSpec(dieId).bonus;
}

function prepareRandomFaces(entry: BagEntry, rng: () => number): void {
  if (dieBonus(entry.dieId)?.type === 'randomFaces') {
    entry.probs = randomFaceWeights(rng);
  }
}

function standardEntry(): BagEntry {
  return { uid: uid('bag'), dieId: 'standard' };
}

export function getDiceCapacity(state: RunState): number {
  const extra = (state.passiveItems.includes('dice_bag') ? 1 : 0)
    - (state.passiveItems.includes('cracked_pouch') ? 1 : 0);
  return Math.max(4, 6 + extra);
}

export function syncBag(state: RunState): RunState {
  const capacity = getDiceCapacity(state);
  while (state.bag.length < capacity) state.bag.push(standardEntry());
  while (state.bag.length > capacity) state.bag.pop();
  return state;
}

export function getDieSpec(dieId: string): DiceDef {
  return DICE_BY_ID[dieId] || STANDARD_DIE;
}

export function getBarrel(state: RunState): BarrelDef {
  return BARREL_BY_ID[state.barrelId] || BARRELS[0]!;
}

export function effectiveProbs(dieId: string, barrelId: string, override?: number[]): number[] {
  const die = getDieSpec(dieId);
  const barrel = BARREL_BY_ID[barrelId] || BARRELS[0]!;
  const bias = 'bias' in barrel && barrel.bias ? barrel.bias : [1, 1, 1, 1, 1, 1];
  const base = override && override.length === 6 ? override : die.probs;
  const weights = base.map((probability, index) => probability * (bias[index] ?? 1));
  return normalizeWeights(weights);
}

function rollValue(probs: number[], rng: () => number): number {
  let roll = rng();
  for (let face = 0; face < 6; face += 1) {
    roll -= probs[face]!;
    if (roll <= 0) return face + 1;
  }
  return 6;
}

function makeBoard(bag: BagEntry[]): BoardDie[] {
  return bag.map((entry, index) => ({
    uid: `board-${index}-${entry.uid}`,
    bagUid: entry.uid,
    dieId: entry.dieId,
    value: null,
    blank: false,
    wild: false,
    scored: false,
    probs: entry.probs ? [...entry.probs] : undefined,
  }));
}

export function availableDice(state: RunState): BoardDie[] {
  return state.dice.filter((d) => !d.scored);
}

export function selectedDice(state: RunState): BoardDie[] {
  return state.dice.filter((d) => state.selected.includes(d.uid));
}

export function setCounts(state: RunState) {
  return activeSetBonuses(state.bag);
}

export function hasSetTier(state: RunState, setId: string, tier: number): boolean {
  const sets = setCounts(state);
  return (sets[setId]?.count || 0) >= tier;
}

export function targetForLevel(state: RunState, level = state.level): number {
  return getLevelConfig(level).target;
}

function resetLevelFlags(state: RunState) {
  state.flags = {
    hunterMark: false,
    bloodContract: false,
    wagerMark: false,
    saltOffer: false,
    starBonus: false,
    starArmed: false,
    vortexScore: false,
    charm: false,
    vortexUsed: false,
    starUsed: false,
    gestureUsedThisThrow: false,
    hotDice: false,
    rerollAll: false,
    bossLastType: null,
    bossLockedType: null,
    bossDisabled: false,
    roundSinglesOnly: true,
  };
}

export function activeBoss(state: RunState | null): BossDef | null {
  if (!state || !getLevelConfig(state.level).boss) return null;
  return getOpponent(state.level) as BossDef | null;
}

export function bossEffectKey(state: RunState): string | null {
  const boss = activeBoss(state);
  if (!boss || state.flags?.bossDisabled) return null;
  return boss.effectKey;
}

/**
 * 悬秤人的「浮筹未决」：本关的分数全是漂浮分——掷空时连同之前所有回合
 * 一起消散，只有离开这张桌子（过关结算）才真正落袋。
 */
export function isFloatingScore(state: RunState): boolean {
  return bossEffectKey(state) === 'floatingScore';
}

export function isBossDieBlocked(state: RunState, die: BoardDie | null | undefined): boolean {
  if (!die) return true;
  if (die.blank) return true;
  return bossEffectKey(state) === 'noSix' && die.value === 6;
}

function scorableDice(state: RunState): BoardDie[] {
  return availableDice(state).filter((die) => !isBossDieBlocked(state, die));
}

const HAND_TYPE_NAMES: Record<string, string> = {
  single: '单骰',
  triple: '三条',
  quad: '四条',
  quint: '五条',
  sext: '六条',
  straight: '顺子',
  mixed: '混合',
};

export function handTypeOf(analysis: ScoringAnalysis | null | undefined): HandType | null {
  if (!analysis?.valid || !analysis.combos?.length) return null;
  if (analysis.combos.length > 1) return 'mixed';
  const combo = analysis.combos[0]!;
  if (combo.type === 'straight') return 'straight';
  if (combo.type === 'single') return 'single';
  if (combo.type === 'nkind') {
    return (({ 3: 'triple', 4: 'quad', 5: 'quint', 6: 'sext' } as Record<number, HandType>)[combo.count]) || 'mixed';
  }
  return 'mixed';
}

export function handTypeName(type: string | null | undefined): string {
  return HAND_TYPE_NAMES[type ?? ''] || '尚未计分';
}

export function bossTypeStatus(state: RunState, type: HandType | null): { blocked: boolean; note: string } {
  const boss = activeBoss(state);
  const effectKey = bossEffectKey(state);
  if (!boss || !type || !effectKey) return { blocked: false, note: '' };
  if (effectKey === 'noRepeatType') {
    const last = state.flags?.bossLastType;
    return {
      blocked: Boolean(last && last === type),
      note: last ? `上一手为「${handTypeName(last)}」，本手不能重复。` : '第一手不受限制。',
    };
  }
  if (effectKey === 'singleTypeOnly') {
    const locked = state.flags?.bossLockedType;
    return {
      blocked: Boolean(locked && locked !== type),
      note: locked ? `本关已锁定「${handTypeName(locked)}」。` : '第一次计分会锁定本关骰型。',
    };
  }
  return { blocked: false, note: '' };
}

export function bossStatusText(state: RunState): string {
  const boss = activeBoss(state);
  if (!boss) return '';
  if (state.flags?.bossDisabled) return '庄家效果已被静默赦令消除';
  const effectKey = bossEffectKey(state);
  if (effectKey === 'blankNinth') {
    const remainder = 9 - ((state.bossDiceRolled || 0) % 9);
    return `距离下一颗白骰还有 ${remainder} 颗`;
  }
  if (effectKey === 'floatingScore') {
    const atRisk = Math.max(0, state.roundScore || 0);
    return atRisk > 0 ? `${atRisk} 分漂浮未落定` : '所有得分漂浮，掷空即清零';
  }
  if (effectKey === 'noRepeatType') {
    return state.flags?.bossLastType ? `上一手：${handTypeName(state.flags.bossLastType)}` : '尚未计分';
  }
  if (effectKey === 'singleTypeOnly') {
    return state.flags?.bossLockedType ? `已锁定：${handTypeName(state.flags.bossLockedType)}` : '尚未锁定骰型';
  }
  return '';
}

export function initLevel(state: RunState): RunState {
  syncBag(state);
  for (const entry of state.bag) prepareRandomFaces(entry, getRng(state));
  const config = getLevelConfig(state.level);
  state.targetBase = targetForLevel(state);
  state.target = state.targetBase;
  state.score = 0;
  state.roundScore = 0;
  state.targetReached = false;
  state.overshootTierKey = null;
  state.lastBust = null;
  state.lastScore = null;
  state.selected = [];
  state.phase = 'ready';
  state.dice = makeBoard(state.bag);
  state.throwNumber = 0;
  state.bossDiceRolled = 0;
  state.flags.bossLastType = null;
  state.flags.bossLockedType = null;
  resetLevelFlags(state);
  state.itemCharges = {};
  for (const itemId of state.activeItems) {
    state.itemCharges[itemId] = ITEM_BY_ID[itemId]?.charges ?? 1;
  }
  const opponent = getOpponent(state.level);
  if (config.boss && state.bossWardArmed && opponent && 'effectName' in opponent) {
    state.bossWardArmed = false;
    state.flags.bossDisabled = true;
    pushLog(state, `静默赦令生效：${opponent.name} 的「${opponent.effectName}」被消除。`, 'good');
  }
  const effectKey = state.flags.bossDisabled ? null : opponent && 'effectKey' in opponent ? opponent.effectKey : null;
  // The base budget never grows between levels (no boss-boon carry-over), but
  // the two boss effects and a handful of items may still shift this level.
  let rerolls = BASE_REROLLS;
  if (config.boss && effectKey === 'rerollMinus') rerolls -= 1;
  if (config.boss && effectKey === 'scoreTaxReroll') rerolls += 1;
  state.rerolls = Math.max(1, rerolls);
  state.maxRerolls = state.rerolls;
  state.levelStartRerolls = rerolls;
  state.levelReward = null;
  state.pendingReward = null;
  state.runWon = false;
  state.stats.levelRolls = 0;
  state.stats.levelScore = 0;
  pushLog(state, `${getTable(state.level).name}：第 ${state.level} 关，目标 ${state.target} 分。`, 'system');
  if (config.boss && effectKey === 'floatingScore') {
    pushLog(state, '悬秤人把秤悬在桌上：本关所有得分都是漂浮分，掷出无法计分的骰型就会整桌清零。', 'system');
  }
  return state;
}

export function createRun({ rng = Math.random }: { rng?: () => number } = {}): RunState {
  const state: RunState = {
    version: 1,
    level: 1,
    coins: STARTING_COINS,
    bag: [0, 0, 0, 0, 0, 0].map(() => standardEntry()),
    barrelId: 'oak',
    ownedBarrels: ['oak'],
    activeItems: ['lucky_coin'],
    passiveItems: [],
    acquiredItemIds: ['lucky_coin'],
    dice: [],
    selected: [],
    score: 0,
    roundScore: 0,
    targetReached: false,
    overshootTierKey: null,
    lastBust: null,
    target: 0,
    targetBase: 0,
    rerolls: BASE_REROLLS,
    maxRerolls: BASE_REROLLS,
    phase: 'ready',
    bossWardArmed: false,
    flags: {},
    itemCharges: {},
    history: [],
    shop: null,
    log: [],
    rngState: 0,
    stats: { rolls: 0, scored: 0, levelRolls: 0, levelScore: 0, bestHit: 0, wins: 0 },
    rng,
    levelReward: null,
    pendingReward: null,
    pendingCoinGain: null,
    lastScore: null,
  };
  state.stats.wins = 0;
  initLevel(state);
  pushLog(state, '门房塞给你一枚幸运币：每关可以额外 +150 分。', 'good');
  return state;
}

export function getRng(state: RunState): () => number {
  return state.rng || Math.random;
}

export function pushLog(state: RunState, text: string, type = 'info') {
  state.log.unshift({
    id: uid('log'),
    text,
    type,
    level: state.level,
    at: Date.now(),
  });
  if (state.log.length > 60) state.log.length = 60;
}

export function toggleDie(state: RunState, uidValue: string): boolean {
  const die = state.dice.find((d) => d.uid === uidValue);
  if (!die || die.scored || die.value == null || isBossDieBlocked(state, die)) return false;
  if (state.selected.includes(uidValue)) {
    state.selected = state.selected.filter((id) => id !== uidValue);
  } else {
    state.selected.push(uidValue);
  }
  return true;
}

export function clearSelection(state: RunState) {
  state.selected = [];
}

export function getComboAnalysis(state: RunState): ScoringAnalysis {
  const dice = selectedDice(state);
  return analyzeSelection(dice.map((d) => (d.wild ? WILD_VALUE : d.value as number)));
}

export interface BuildScoreResult {
  valid: boolean;
  error?: string;
  total: number;
  analysis: ScoringAnalysis;
  bossNote?: string;
  voided?: boolean;
  breakdown: RunScoreBreakdown | null;
}

/**
 * Applies every scoring modifier. Returns a transparent breakdown that the UI
 * can display, including boss taxes and set bonuses.
 */
export function buildScore(state: RunState, action = 'reroll'): BuildScoreResult {
  const selected = selectedDice(state);
  if (selected.some((die) => isBossDieBlocked(state, die))) {
    return {
      valid: false,
      error: '所选骰子中有白骰或被庄家禁用的点数。',
      total: 0,
      analysis: { valid: false, base: 0, combos: [], straight: false, counts: [], values: [] },
      breakdown: null,
    };
  }
  const analysis = analyzeSelection(selected.map((d) => (d.wild ? WILD_VALUE : d.value as number)));
  if (!analysis.valid) {
    return {
      valid: false,
      error: selected.length ? '所选骰子无法组成合法计分组合。' : '请先选择要计分的骰子。',
      total: 0,
      analysis,
      breakdown: null,
    };
  }

  const boss = activeBoss(state);
  const bossEffect = bossEffectKey(state);
  let scoringBase = analysis.base;
  let bossNote = '';
  let voided = false;
  if (bossEffect === 'minTripleScore') {
    const eligible = analysis.combos.filter((combo) => combo.type === 'straight' || (combo.type === 'nkind' && combo.count >= 3));
    scoringBase = eligible.reduce((sum, combo) => sum + combo.points, 0);
    if (!eligible.length) bossNote = '本关只有 3 颗及以上骰子的组合计分；这一手得 0 分。';
  } else if (bossEffect === 'noRepeatType' || bossEffect === 'singleTypeOnly') {
    const type = handTypeOf(analysis);
    const status = bossTypeStatus(state, type);
    if (status.blocked) {
      voided = true;
      scoringBase = 0;
      bossNote = status.note;
    }
  }

  const sets = setCounts(state);
  const flats: { label: string; value: number }[] = [];
  const multipliers: { label: string; value: number | string }[] = [];
  const notes: { label: string; value?: number | string }[] = [];
  let flatAdd = 0;
  let multiplier = 1;

  const dieSpecs = selected.map((d) => getDieSpec(d.dieId));
  const counts = analysis.counts as FaceCount;
  const selectedIds = selected.map((d) => d.dieId);
  // A "triple" bonus pays for a triple in the scoring partition, not for three
  // dice of a face that were split between a straight and single changes.
  const hasTriple = analysis.combos.some((combo) => combo.type === 'nkind' && combo.count >= 3);

  // Per-die bonuses.
  for (let i = 0; i < selected.length; i += 1) {
    const spec = dieSpecs[i]!;
    const die = selected[i]!;
    const bonus = spec.bonus;
    if (!bonus) continue;
    if (bonus.type === 'faceFlat' && die.value === bonus.face) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'wildFlat' && die.wild) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'tripleFace'
      && analysis.combos.some((combo) => combo.type === 'nkind' && combo.face === bonus.face && combo.count >= 3)) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'anyTriple' && hasTriple) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'hasFace' && counts[bonus.face]! >= 1) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'straightFlat' && analysis.straight) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'fiveAndSix' && counts[5] >= 1 && counts[6] >= 1) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'dieMultiplier') {
      multiplier *= bonus.value;
      multipliers.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'flatScored') {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'retriggerKind') {
      const kind = analysis.combos.find(
        (combo): combo is NKindCombo => combo.type === 'nkind' && combo.face === die.value && combo.count >= 3,
      );
      if (kind) {
        const value = Math.round(kind.points / kind.count);
        flatAdd += value;
        flats.push({ label: `${spec.name} · ${bonus.label}`, value });
      }
    } else if (bonus.type === 'noRerollMultiplier' && state.rerolls <= 0) {
      multiplier *= bonus.value;
      multipliers.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'shopRerollMultiplier') {
      const entry = state.bag.find((item) => item.uid === die.bagUid);
      const stacks = entry?.shopRerolls || 0;
      if (stacks > 0) {
        const value = 1 + stacks * bonus.value;
        multiplier *= value;
        multipliers.push({ label: `${spec.name} · ${bonus.label} ×${stacks}`, value });
      }
    }
  }

  // Set bonuses: wolf rides on 3s, demon pays for jokers actually used.
  const wolfCount = sets.wolf?.count || 0;
  const demonCount = sets.demon?.count || 0;
  const wildDice = selected.filter((d) => d.wild).length;
  if (wolfCount >= 2 && counts[3]! > 0) {
    const value = counts[3]! * 60;
    flatAdd += value;
    flats.push({ label: '狼裔 2 件 · 每颗 3 +60', value });
  }
  if (wolfCount >= 4 && counts[3]! >= 3) {
    flatAdd += 600;
    flats.push({ label: '狼裔 4 件 · 三条 3 加成', value: 600 });
  }
  if (demonCount >= 4 && wildDice > 0) {
    multiplier *= 1.22;
    multipliers.push({ label: '恶魔 4 件 · 群魔', value: 1.22 });
  } else if (demonCount >= 2 && wildDice > 0) {
    multiplier *= 1.08;
    multipliers.push({ label: '恶魔 2 件 · 契约', value: 1.08 });
  }

  // Barrels pay for what was actually scored: the wolf cup pays for 3s, the
  // demon pact pays for jokers that made a combination legal.
  const barrel = getBarrel(state);
  if (barrel.type === 'faceScore') {
    const n = counts[barrel.face] || 0;
    if (n > 0) {
      const value = n * barrel.value;
      flatAdd += value;
      flats.push({ label: `${barrel.name} · ${n} 颗 ${barrel.face}`, value });
    }
    if (n >= 3 && barrel.tripleValue) {
      flatAdd += barrel.tripleValue;
      flats.push({ label: `${barrel.name} · 三条 ${barrel.face}`, value: barrel.tripleValue });
    }
  }
  if (barrel.type === 'wildScore' && wildDice > 0) {
    const value = wildDice * barrel.value;
    flatAdd += value;
    flats.push({ label: `${barrel.name} · ${wildDice} 颗恶魔赖子`, value });
  }
  if (state.passiveItems.includes('cracked_pouch')) {
    multiplier *= 1.25;
    multipliers.push({ label: '裂痕骰袋 · 孤注一掷', value: 1.25 });
  }

  // Passive hand-type items: one multiplier per matching 条子/顺子/单点 rule.
  const kind = (size: number) => analysis.combos.some(
    (combo) => combo.type === 'nkind' && combo.count === size,
  );
  const hasStraight = analysis.combos.some((combo) => combo.type === 'straight');
  const hasFullStraight = analysis.combos.some(
    (combo) => combo.type === 'straight' && combo.faces.length === 6,
  );
  const hasOneOrFive = selected.some(
    (die) => !die.wild && (die.value === 1 || die.value === 5),
  );
  for (const item of ITEMS) {
    if (!('scoreRule' in item)) continue;
    const rule = item.scoreRule;
    if (!rule || !state.passiveItems.includes(item.id)) continue;
    const matches = rule.hand === 'triple' ? kind(3)
      : rule.hand === 'quad' ? kind(4)
        : rule.hand === 'quint' ? kind(5)
          : rule.hand === 'sext' ? kind(6)
            : rule.hand === 'straight' ? hasStraight
              : rule.hand === 'straight16' ? hasFullStraight
                : hasOneOrFive;
    if (!matches) continue;
    multiplier *= rule.multiplier;
    multipliers.push({ label: `${item.name} · ${rule.label}`, value: rule.multiplier });
  }

  if (barrel.type === 'singlesBonus'
    && state.flags.roundSinglesOnly !== false
    && analysis.combos.length > 0
    && analysis.combos.every((combo) => combo.type === 'single')) {
    multiplier *= barrel.multiplier;
    multipliers.push({ label: `${barrel.name} · 全单骰`, value: barrel.multiplier });
  }

  // Pact die: carrying it is a boon when it scores, a penalty when it sits out.
  // Driven by the bonus type, so renaming or retiring a die cannot break it.
  const pactDie = state.bag
    .map((entry) => getDieSpec(entry.dieId))
    .find((spec) => spec.bonus?.type === 'demon');
  if (pactDie && pactDie.bonus && pactDie.bonus.type === 'demon') {
    const pact = pactDie.bonus;
    if (selectedIds.includes(pactDie.id)) {
      multiplier *= pact.included;
      multipliers.push({ label: `${pactDie.name} · 恶魔契约`, value: pact.included });
    } else if (state.dice.some((die) => die.dieId === pactDie.id && !die.scored)) {
      multiplier *= pact.missing;
      multipliers.push({ label: `${pactDie.name} · 被冷落的诅咒`, value: pact.missing });
    }
  }

  // Active items and gesture buffs.
  if (state.flags.hunterMark) {
    multiplier *= 2;
    multipliers.push({ label: '猎人印记 · 双倍', value: 2 });
  }
  if (state.flags.wagerMark) {
    multiplier *= 1.6;
    multipliers.push({ label: '加注契约 · 押注', value: 1.6 });
  }
  if (state.flags.bloodContract) {
    multiplier *= 1.35;
    multipliers.push({ label: '血契 · 献祭 +35%', value: 1.35 });
  }
  if (state.flags.starBonus) {
    multiplier *= 1.20;
    multipliers.push({ label: '五芒星仪式 · +20%', value: 1.20 });
  }
  if (state.flags.vortexScore) {
    multiplier *= 1.15;
    multipliers.push({ label: '旋涡仪式 · +15%', value: 1.15 });
  }

  let preBoss = Math.round((scoringBase + flatAdd) * multiplier);

  // Boss score taxes are applied after the player's own modifiers.
  let total = preBoss;
  if (bossEffect === 'scoreTaxReroll' && boss) {
    total = Math.round(total * 0.6);
    multipliers.push({ label: `${boss.name} · 四成归天`, value: 0.6 });
  }
  if (bossNote && boss) notes.push({ label: `${boss.name} · ${bossNote}` });
  if (voided || (bossEffect === 'minTripleScore' && scoringBase === 0)) total = 0;
  if (voided && boss) notes.push({ label: `${boss.name} · 本手不计分`, value: '×0' });

  const costs: { label: string; value: number }[] = [];
  if (state.flags.bloodContract) costs.push({ label: '血契代价', value: 100 });

  return {
    valid: true,
    total: Math.max(0, total),
    analysis,
    bossNote,
    voided,
    breakdown: {
      base: scoringBase,
      flats,
      flatAdd,
      multipliers,
      notes,
      costs,
      preBoss,
      total: Math.max(0, total),
    },
  };
}

export function getScorePreview(state: RunState) {
  const reroll = buildScore(state, 'reroll');
  const cont = buildScore(state, 'continue');
  const bank = buildScore(state, 'bank');
  return {
    ...reroll,
    reroll,
    continue: cont,
    bank,
    totalReroll: reroll.valid ? reroll.total : 0,
    totalContinue: cont.valid ? cont.total : 0,
    totalBank: bank.valid ? bank.total : 0,
    /** Kept for callers that only ask for one preview; reroll is the default. */
    total: reroll.valid ? reroll.total : 0,
  };
}

function bossScoreAmount(state: RunState, amount: number): number {
  return bossEffectKey(state) === 'scoreTaxReroll' ? Math.round(amount * 0.6) : amount;
}

function addScore(state: RunState, amount: number, { round = false }: { round?: boolean } = {}) {
  state.score += amount;
  state.stats.levelScore += amount;
  // Every "计分并继续" adds to the same unbanked round. Only
  // "计分并重投" banks it. Under a floating-score dealer nothing is ever
  // secured: every point on the table rides on the next throw.
  if (isFloatingScore(state)) state.roundScore = state.score;
  else if (round) state.roundScore = (state.roundScore || 0) + amount;
  if (amount > state.stats.bestHit) state.stats.bestHit = amount;
}

/**
 * A turn's unbanked points burn when the next throw has no scoring dice.
 * Only the current round is lost; previously secured score stays.
 */
function bustRound(state: RunState): number {
  const lost = Math.max(0, state.roundScore || 0);
  if (!lost) return 0;
  const floating = isFloatingScore(state);
  state.score = Math.max(0, state.score - lost);
  state.stats.levelScore = Math.max(0, state.stats.levelScore - lost);
  state.roundScore = 0;
  state.targetReached = state.score >= state.target;
  state.lastBust = { lost, floating };
  state.flags.roundSinglesOnly = true;
  pushLog(state, floating
    ? `秤翻了：整桌 ${lost} 分漂浮分全部消散。`
    : `本轮 ${lost} 分作废。`, 'bad');
  return lost;
}

function penalizeScore(state: RunState, amount: number) {
  const roundPart = Math.min(state.roundScore || 0, amount);
  state.roundScore = Math.max(0, (state.roundScore || 0) - roundPart);
  state.score = Math.max(0, state.score - amount);
  state.stats.levelScore = Math.max(0, state.stats.levelScore - amount);
}

export interface CashOutResult {
  spare: number;
  base: number;
  perReroll: number;
  refund: number;
  overshoot: boolean;
  overshootValue: number;
  total: number;
}

/**
 * What banking right now would pay, on top of the level's base reward:
 * each unused reroll is worth 20% of the base reward; strictly exceeding
 * 2× the target adds another 50% of the base reward.
 */
export function cashOutValue(state: RunState): CashOutResult {
  const spare = Math.max(0, state.rerolls || 0);
  const base = getLevelConfig(state.level).reward;
  const perReroll = Math.round(base * REROLL_BONUS_RATE);
  const refund = spare * perReroll;
  const overshoot = exceedsOvershoot(state.score || 0, state.target || 0);
  const overshootValue = overshoot ? Math.round(base * OVERSHOOT_BONUS_RATE) : 0;
  return {
    spare, base, perReroll, refund,
    overshoot, overshootValue, total: refund + overshootValue,
  };
}

function awardLevel(state: RunState): LevelRewardInfo {
  if (state.levelReward) return state.levelReward;
  const cfg = getLevelConfig(state.level);
  const bonuses: { label: string; value: number }[] = [];
  let total = cfg.reward;
  // 庄家赏金系数：目标分与基础赏金都由曲线 × 系数算出来，这里把系数本身
  // 记进结算，界面才能说清“这一关为什么比上一关贵”。
  const boss = cfg.boss ? getOpponent(state.level) as BossDef | null : null;
  const curveReward = cfg.curve?.reward ?? cfg.reward;
  const bossPremium = boss ? cfg.reward - curveReward : 0;
  if (state.passiveItems.includes('gold_cuff')) {
    total += 15;
    bonuses.push({ label: '镀金袖扣', value: 15 });
  }
  // Leaving with tokens in hand pays: each unused reroll is 20% of base.
  const cash = cashOutValue(state);
  if (cash.spare > 0) {
    total += cash.refund;
    bonuses.push({
      label: `未用重投 ${cash.spare} × ${Math.round(REROLL_BONUS_RATE * 100)}%`,
      value: cash.refund,
    });
  }
  if (cash.overshoot) {
    total += cash.overshootValue;
    bonuses.push({
      label: `超过目标 ${OVERSHOOT_RATIO} 倍 · +${Math.round(OVERSHOOT_BONUS_RATE * 100)}%`,
      value: cash.overshootValue,
    });
  }
  state.coins += total;
  state.levelReward = {
    base: cfg.reward, curveBase: curveReward, bossPremium,
    bossName: boss?.name || null, bossScale: boss?.curve?.reward ?? 1, bonuses, total,
  };
  state.pendingReward = state.levelReward;
  state.pendingCoinGain = state.levelReward;
  state.stats.wins += 1;
  pushLog(state, `第 ${state.level} 关获胜，获得 ${total} 银币。`, 'reward');
  if (bossPremium > 0 && boss) {
    pushLog(state, `${boss.name} 悬赏 ×${(boss.curve?.reward ?? 1).toFixed(2)}：基础赏金 ${curveReward} → ${cfg.reward}。`, 'reward');
  }
  if (cash.spare > 0) {
    pushLog(state, `收手带走 ${cash.spare} 次未用重投，折 ${cash.refund} 银币。`, 'reward');
  }
  if (cash.overshoot) {
    const times = ((state.score || 0) / (state.target || 1)).toFixed(1);
    pushLog(state, `本关得分达到目标的 ${times} 倍：超额奖励 +${cash.overshootValue} 银币。`, 'reward');
  }
  return state.levelReward;
}

function completeLevel(state: RunState) {
  if (state.phase === 'won' || state.phase === 'run-won') return;
  state.roundScore = 0;
  awardLevel(state);
  if (state.level >= LEVEL_COUNT) {
    state.phase = 'run-won';
    state.runWon = true;
    pushLog(state, '你击败了钻石天使，赢下了整座天穹赌局。', 'victory');
  } else {
    state.phase = 'won';
    pushLog(state, `达到 ${state.target} 分，第 ${state.level} 关通过。`, 'win');
  }
}

function checkWin(state: RunState): boolean {
  if (state.score >= state.target && state.phase !== 'won' && state.phase !== 'run-won') {
    if (!state.targetReached) {
      state.targetReached = true;
      const cash = cashOutValue(state);
      if (isFloatingScore(state)) {
        pushLog(
          state,
          `漂浮分摸到 ${state.target}。现在落秤就能带走 ${cash.total} 银币`
          + `（含剩余重投 ${cash.spare} 次折 ${cash.refund}）；再扔一次，秤就可能翻，一分不剩。`,
          'win',
        );
      } else {
        pushLog(
          state,
          `达到 ${state.target} 分。超过目标的 2 倍才有额外 50% 赏金；`
          + `现在收手则带走 ${cash.total} 银币（含未用重投 ${cash.spare} 次折 ${cash.refund}）。`,
          'win',
        );
      }
    }
    // Announce the single overshoot threshold once per level.
    const cash = cashOutValue(state);
    if (cash.overshoot && state.overshootTierKey !== 'double') {
      state.overshootTierKey = 'double';
      pushLog(state, isFloatingScore(state)
        ? `超过目标 2 倍：落秤时可额外带走 ${cash.overshootValue} 银币——前提是秤没翻。`
        : `超过目标 2 倍：收手时可额外带走 ${cash.overshootValue} 银币。`, 'good');
    }
    return true;
  }
  return false;
}

/**
 * The target is a milestone, not an automatic ending. The player may keep
 * scoring past it until they explicitly choose to leave for the next level.
 */
export function advanceLevel(state: RunState | null): { ok: boolean; error?: string; final?: boolean; reward?: LevelRewardInfo | null } {
  if (!state || ['won', 'run-won', 'lost', 'shop'].includes(state.phase)) {
    return { ok: false, error: '当前无法进入下一关。' };
  }
  if (state.score < state.target) {
    return { ok: false, error: `还差 ${state.target - state.score} 分。` };
  }
  state.roundScore = 0;
  completeLevel(state);
  return {
    ok: true,
    final: state.phase === 'run-won',
    reward: state.levelReward,
  };
}

export function activeCharges(state: RunState): number {
  /* Salt is reactive: it can only answer a bust, so it must not keep a dead
     table alive forever once the reroll tokens are gone. */
  return Object.entries(state.itemCharges || {}).reduce(
    (sum, [id, n]) => sum + (n > 0 && id !== 'salt' ? n : 0), 0,
  );
}

export function finalizeStuck(state: RunState): RunState {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') return state;
  if (state.score >= state.target) {
    checkWin(state);
    return state;
  }
  if (state.rerolls <= 0 && !hasScoringSelection(scorableDice(state)) && activeCharges(state) === 0) {
    state.phase = 'lost';
    pushLog(state, '重投耗尽，分数未达标。', 'lose');
  }
  return state;
}

export interface RollResult {
  ok: boolean;
  error?: string;
  values?: (number | string)[];
  hot?: boolean;
  bust?: number;
  /** A bust is on hold because the player owns salt and has to answer. */
  saltOffer?: boolean;
}

function ownsSalt(state: RunState): boolean {
  return state.activeItems.includes('salt') && (state.itemCharges.salt || 0) > 0;
}

/** Answer the salt prompt a bust raised. */
export function resolveSaltOffer(state: RunState, use: boolean): { ok: boolean; error?: string; saved?: number; lost?: number } {
  if (!state.flags.saltOffer) return { ok: false, error: '现在没有需要盐的掷空。' };
  state.flags.saltOffer = false;
  if (!use) {
    const lost = bustRound(state);
    finalizeStuck(state);
    return { ok: true, lost };
  }
  const salt = ITEM_BY_ID.salt;
  if (salt?.consumable) {
    state.activeItems = state.activeItems.filter((id) => id !== 'salt');
    delete state.itemCharges.salt;
  } else {
    state.itemCharges.salt = 0;
  }
  const saved = Math.max(0, state.roundScore || 0);
  // Floating points go straight back on the table after salt saves them.
  state.roundScore = isFloatingScore(state) ? state.score : 0;
  state.lastBust = { saved };
  pushLog(state, saved > 0
    ? `盐挡住了这一掷：本轮 ${saved} 分保住。`
    : '盐挡住了这一掷，但本轮本来没有分数可保。', 'good');
  finalizeStuck(state);
  return { ok: true, saved };
}

function completeStraight(dice: BoardDie[], rng: () => number): { die: BoardDie; face: number } | null {
  const usable = dice.filter((die) => !die.blank && (die.value ?? 0) >= 1 && (die.value ?? 0) <= 6);
  if (usable.length < 5) return null;
  const counts = new Map<number, number>();
  for (const die of usable) counts.set(die.value!, (counts.get(die.value!) || 0) + 1);
  const targets = [
    [1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6],
    [1, 2, 3, 4, 5],
  ];
  for (const faces of targets) {
    const missing = faces.filter((face) => !counts.has(face));
    if (missing.length !== 1) continue;
    const candidates = usable.filter(
      (die) => (counts.get(die.value!) || 0) > 1 && die.value !== missing[0],
    );
    if (!candidates.length) continue;
    const die = candidates[Math.floor(rng() * candidates.length)]!;
    return { die, face: missing[0]! };
  }
  return null;
}

function applyBarrelRollEffects(
  state: RunState,
  rolled: BoardDie[],
  barrel: BarrelDef,
  rng: () => number,
): void {
  if (!rolled.length) return;
  if (barrel.type === 'forceOne' && rng() < barrel.chance) {
    const die = rolled[Math.floor(rng() * rolled.length)]!;
    die.value = 1;
    die.wild = getDieSpec(die.dieId).setId === 'demon';
    pushLog(state, `${barrel.name}：一颗骰子被指定为 1。`, 'roll');
  }
  if (barrel.type === 'gild' && rng() < barrel.chance) {
    const die = rolled[Math.floor(rng() * rolled.length)]!;
    die.gilded = true;
    pushLog(state, `${barrel.name}：一颗骰子染上金痕；它计分时额外 +${barrel.coin} 银币。`, 'roll');
  }
  if (barrel.type === 'straightFix') {
    const fix = completeStraight(rolled, rng);
    if (fix) {
      fix.die.value = fix.face;
      fix.die.wild = false;
      pushLog(state, `${barrel.name}：一颗骰子转到 ${fix.face} 点，补成顺子。`, 'roll');
    }
  }
}

function applyOrderedDieEffects(state: RunState, rng: () => number): void {
  // The copy die reads the first slot after the table order is shuffled.
  const first = state.dice[0];
  if (first && !first.blank && first.value != null) {
    for (let index = 1; index < state.dice.length; index += 1) {
      const die = state.dice[index]!;
      if (die.scored) continue;
      const bonus = getDieSpec(die.dieId).bonus;
      if (bonus?.type !== 'copyFirst' || die.blank) continue;
      die.value = first.value;
      die.wild = getDieSpec(die.dieId).setId === 'demon' && die.value === 1;
    }
  }
  for (let index = 1; index < state.dice.length; index += 1) {
    const die = state.dice[index]!;
    if (die.scored) continue;
    const prev = state.dice[index - 1]!;
    const bonus = getDieSpec(die.dieId).bonus;
    if (bonus?.type !== 'adjacentChance' || die.blank) continue;
    if (!prev.value || prev.blank || prev.value < 1 || prev.value > 6) continue;
    if (rng() >= bonus.chance) continue;
    const options = [prev.value - 1, prev.value + 1].filter((face) => face >= 1 && face <= 6);
    if (!options.length) continue;
    die.value = options[Math.floor(rng() * options.length)]!;
    die.wild = getDieSpec(die.dieId).setId === 'demon' && die.value === 1;
  }
}

function shuffleUnscored(state: RunState, rng: () => number): void {
  const slots = state.dice.map((die, index) => (die.scored ? -1 : index)).filter((index) => index >= 0);
  const shuffled = shuffleInPlace(slots.map((index) => state.dice[index]!), rng);
  slots.forEach((slot, index) => { state.dice[slot] = shuffled[index]!; });
}

export function rollDice(state: RunState, { free = false, rng = getRng(state) }: { free?: boolean; rng?: () => number } = {}): RollResult {  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') {
    return { ok: false, error: '本关已结束。' };
  }
  if (state.phase === 'shop') return { ok: false, error: '商店阶段不能投掷。' };
  // The opening throw is free, and "计分并继续" rerolls the remaining dice for
  // free. Only "计分并重投" (rerollAll) spends a token on its next throw.
  const openingThrow = state.phase === 'ready' && state.stats.levelRolls === 0;
  const continuingRound = state.phase === 'reroll-pending' && !state.flags.rerollAll;
  const freeThrow = free || openingThrow || continuingRound;
  if (!freeThrow && state.rerolls <= 0) {
    return { ok: false, error: '没有剩余重投次数。' };
  }
  if (!freeThrow) state.rerolls -= 1;

  // A new throw always discards the previous throw's gesture buff unless a new
  // gesture was armed before this roll.
  const armedStar = state.flags.starArmed;
  const armedVortex = state.flags.vortexArmed;
  state.flags.starBonus = Boolean(armedStar);
  state.flags.starArmed = false;
  state.flags.vortexScore = Boolean(armedVortex);
  state.flags.vortexArmed = false;
  state.flags.gestureUsedThisThrow = false;

  const wasHot = state.flags.hotDice;
  const rerollAll = state.flags.rerollAll;
  if (wasHot || rerollAll) {
    // "计分并重投" brings every die back into the cup, including dice that had
    // already been set aside in this throw.
    for (const die of state.dice) {
      die.scored = false;
      die.value = null;
      die.blank = false;
      die.wild = false;
    }
    state.flags.hotDice = false;
    state.flags.rerollAll = false;
  }

  // Temporary dice from a previous cup throw never survive the next shake.
  state.dice = state.dice.filter((die) => !die.extra);

  const toRoll = availableDice(state).filter((d) => d.value == null || !free || wasHot || rerollAll);
  const targets = toRoll.length ? toRoll : availableDice(state);
  const barrel = getBarrel(state);
  const blankNinth = bossEffectKey(state) === 'blankNinth';
  const rolledNow: BoardDie[] = [];
  const rollOne = (die: BoardDie) => {
    die.scored = false;
    die.blank = false;
    die.wild = false;
    die.gilded = false;
    state.bossDiceRolled = (state.bossDiceRolled || 0) + 1;
    if (blankNinth && state.bossDiceRolled % 9 === 0) {
      die.value = 0;
      die.blank = true;
      rolledNow.push(die);
      return;
    }
    die.value = rollValue(effectiveProbs(die.dieId, barrel.id, die.probs), rng);
    // Demon dice turn their 1 face into a joker, never a plain 100 points.
    die.wild = getDieSpec(die.dieId).setId === 'demon' && die.value === 1;
    rolledNow.push(die);
  };
  for (const die of targets) rollOne(die);
  for (const die of state.dice) {
    if (die.value == null) rollOne(die);
  }

  if (barrel.type === 'extraDie' && rng() < barrel.chance) {
    const extra: BoardDie = {
      uid: `extra-${uid('die')}`,
      bagUid: 'extra',
      dieId: 'standard',
      value: null,
      blank: false,
      wild: false,
      scored: false,
      extra: true,
      probs: [...STANDARD_DIE.probs],
    };
    state.dice.push(extra);
    rollOne(extra);
    pushLog(state, `${barrel.name}：多滚出一颗骰子。`, 'roll');
  }

  applyBarrelRollEffects(state, rolledNow, barrel, rng);
  shuffleUnscored(state, rng);
  applyOrderedDieEffects(state, rng);

  state.selected = [];
  state.phase = 'selecting';
  state.throwNumber = (state.throwNumber || 0) + 1;
  state.stats.rolls += 1;
  state.stats.levelRolls += 1;
  state.lastRoll = rolledNow.map((d) => (d.blank ? 0 : d.wild ? '魔' : d.value ?? 0));

  const scoring = bestSelection(scorableDice(state));
  let bust = 0;
  if (!scoring) {
    state.phase = 'dead';
    pushLog(state, `掷出 ${state.lastRoll!.map((v) => v === 0 ? '白' : v).join(' · ')}，没有可计分的组合。`, 'bad');
    /* Salt is no longer armed in advance: the table holds the bust and asks.
       The round stays on the table until resolveSaltOffer() answers. */
    if (ownsSalt(state)) {
      state.flags.saltOffer = true;
      state.lastBust = { saved: Math.max(0, state.roundScore || 0) };
    } else {
      bust = bustRound(state);
    }
  } else {
    // A scoring throw does not end the round. The accumulated round stays at
    // risk until "计分并重投" or a bust.
    state.lastBust = null;
    pushLog(state, `掷出 ${state.lastRoll!.map((v) => v === 0 ? '白' : v).join(' · ')}。`, 'roll');
  }
  if (!state.flags.saltOffer) finalizeStuck(state);
  return { ok: true, values: state.lastRoll!, hot: Boolean(wasHot), bust, saltOffer: Boolean(state.flags.saltOffer) };
}

export type ScoreAction = 'continue' | 'reroll' | 'bank';

export interface ApplyScoreResult {
  ok: boolean;
  error?: string;
  total?: number;
  action?: string;
  won?: boolean;
  hot?: boolean;
  reroll?: boolean;
  rerollAll?: boolean;
  cleared?: boolean;
  settled?: boolean;
  targetReached?: boolean;
  breakdown?: RunScoreBreakdown | null;
}

/**
 * Apply the selected dice.
 * continue — score, set aside, reroll only the remaining dice.
 * reroll   — score, then put all six dice back into the cup.
 * bank     — no reroll tokens left; score and settle the level.
 */
export function applyScore(state: RunState, action: ScoreAction): ApplyScoreResult {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') {
    return { ok: false, error: '本关已结束。' };
  }
  if (state.phase === 'shop') return { ok: false, error: '商店阶段不能计分。' };
  if (!['continue', 'reroll', 'bank'].includes(action)) {
    return { ok: false, error: '未知的计分操作。' };
  }
  if (action === 'bank' && state.rerolls > 0) {
    return { ok: false, error: '还有重投次数，请选择继续或全部重投。' };
  }
  if (action === 'reroll' && state.rerolls <= 0) {
    return { ok: false, error: '没有剩余重投次数，无法全部重投。' };
  }
  const preview = getScorePreview(state);
  const chosen = action === 'reroll'
    ? preview.reroll
    : action === 'bank'
      ? preview.bank
      : preview.continue;
  if (!chosen.valid) return { ok: false, error: chosen.error };

  const scoringDice = selectedDice(state);
  const scoringValues: (number | string)[] = scoringDice.map((d) => (d.wild ? '魔' : d.value ?? 0));
  const total = chosen.total;
  const bossEffect = bossEffectKey(state);
  if (bossEffect === 'noRepeatType') {
    state.flags.bossLastType = handTypeOf(chosen.analysis);
  } else if (bossEffect === 'singleTypeOnly' && !state.flags.bossLockedType) {
    state.flags.bossLockedType = handTypeOf(chosen.analysis);
  }
  addScore(state, total, { round: true });
  state.lastBust = null;
  state.lastScore = {
    total,
    action,
    values: scoringValues,
    combos: chosen.analysis.combos,
    breakdown: chosen.breakdown,
    critical: Boolean(state.flags.hunterMark),
  };

  // 独注桶：track whether this round has only ever scored single-die combos.
  const allSingles = chosen.analysis.combos.length > 0
    && chosen.analysis.combos.every((combo) => combo.type === 'single');
  state.flags.roundSinglesOnly = state.flags.roundSinglesOnly !== false && allSingles;

  // Coins paid by dice that were actually scored this hand.
  let coinGain = 0;
  const activeBarrel = getBarrel(state);
  const gildCoin = activeBarrel.type === 'gild' ? activeBarrel.coin : 100;
  for (const die of scoringDice) {
    const bonus = getDieSpec(die.dieId).bonus;
    if (bonus?.type === 'coinsPerScore') coinGain += bonus.value;
    if (die.gilded) {
      coinGain += gildCoin;
      die.gilded = false;
    }
  }
  if (coinGain > 0) {
    state.coins += coinGain;
    pushLog(state, `骰子结算：+${coinGain} 银币。`, 'reward');
  }

  // Die-specific trigger effects.
  const specs = scoringDice.map((d) => getDieSpec(d.dieId));
  if (specs.some((s) => s.bonus?.type === 'demon')) {
    pushLog(state, '无冠女王满意地收下了这份供奉。', 'demon');
  }

  if (state.flags.hunterMark) {
    state.flags.hunterMark = false;
  }
  if (state.flags.wagerMark) {
    state.flags.wagerMark = false;
  }
  if (state.flags.bloodContract) {
    penalizeScore(state, 100);
    pushLog(state, '血契索取代价：-100 分。', 'bad');
  }

  for (const die of scoringDice) die.scored = true;
  state.selected = [];
  pushLog(state, `计分 ${total} 分（${scoringValues.join(' · ')}）。`, 'score');

  const reachedTarget = checkWin(state);

  const allScored = state.dice.every((d) => d.scored);
  if (allScored) {
    state.flags.hotDice = true;
    state.flags.rerollAll = false;
    state.phase = 'hot';
    for (const die of state.dice) {
      die.value = null;
      die.scored = false;
    }
    pushLog(state, '全骰！所有骰子都已计分，可以免费重掷全部骰子。', 'hot');
    return { ok: true, total, action, hot: true, won: false, targetReached: reachedTarget, breakdown: chosen.breakdown };
  }

  if (action === 'bank') {
    state.roundScore = 0;
    if (state.score >= state.target) {
      state.phase = 'cleared';
      pushLog(state, '目标已达成，等待你进入下一关。', 'win');
      return { ok: true, total, action, won: false, hot: false, cleared: true, targetReached: true, breakdown: chosen.breakdown };
    }
    state.phase = 'lost';
    pushLog(state, `重投耗尽，计分 ${total} 后仍未达到目标。`, 'lose');
    return { ok: true, total, action, won: false, hot: false, settled: true, breakdown: chosen.breakdown };
  }

  // "计分并重投" ends the round: bank every accumulated point, then bring all
  // six dice back. "计分并继续" keeps the same round alive.
  if (action === 'reroll' && !isFloatingScore(state)) state.roundScore = 0;
  state.phase = 'reroll-pending';
  state.flags.rerollAll = action === 'reroll';
  if (action === 'reroll') state.flags.roundSinglesOnly = true;
  return {
    ok: true, total, action, won: false, hot: false, targetReached: reachedTarget,
    reroll: true, rerollAll: action === 'reroll', breakdown: chosen.breakdown,
  };
}

export interface GestureResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export function applyGesture(state: RunState, gesture: string): GestureResult {
  const barrel = getBarrel(state);
  const barrelGesture = 'gesture' in barrel ? barrel.gesture : undefined;
  if (barrelGesture !== gesture) {
    return { ok: false, error: '当前骰桶没有这种仪式。' };
  }
  if (state.flags.gestureUsedThisThrow) {
    return { ok: false, error: '本次投掷已经完成过仪式。' };
  }
  if (gesture === 'pentagram') {
    if (state.flags.starUsed) {
      return { ok: false, error: '五芒星每关只能生效一次。' };
    }
    if (state.phase === 'ready' || state.phase === 'dead' || state.phase === 'hot' ||
        state.phase === 'reroll-pending') {
      state.flags.starArmed = true;
    } else if (state.phase === 'selecting') {
      state.flags.starBonus = true;
    } else {
      return { ok: false, error: '当前无法进行仪式。' };
    }
    state.flags.starUsed = true;
    state.flags.gestureUsedThisThrow = true;
    pushLog(state, '五芒星仪式完成：本关仅此一次，本掷计分 +20%。', 'gesture');
    return { ok: true, message: '五芒星点亮。本关仅此一次，本掷计分 +20%' };
  }
  if (gesture === 'circle') {
    if (state.flags.vortexUsed) {
      return { ok: false, error: '旋涡桶的额外重投每关只能获得一次。' };
    }
    state.flags.vortexUsed = true;
    state.flags.gestureUsedThisThrow = true;
    state.rerolls += 1;
    state.maxRerolls += 1;
    if (state.phase === 'ready' || state.phase === 'dead') {
      state.flags.vortexArmed = true;
    } else {
      state.flags.vortexScore = true;
    }
    pushLog(state, '旋涡仪式完成：+1 次重投，本掷计分 +15%。', 'gesture');
    return { ok: true, message: '旋涡转动。+1 重投，本掷 +15%' };
  }
  return { ok: false, error: '未知仪式。' };
}

function disableBossEffectNow(state: RunState) {
  const boss = activeBoss(state);
  if (!boss || state.flags.bossDisabled) return;
  if (boss.effectKey === 'rerollMinus') {
    state.rerolls += 1;
    state.maxRerolls += 1;
  } else if (boss.effectKey === 'scoreTaxReroll') {
    state.rerolls = Math.max(1, state.rerolls - 1);
    state.maxRerolls = Math.max(1, state.maxRerolls - 1);
  } else if (boss.effectKey === 'floatingScore') {
    // 秤被按下去了：桌上的分从此落袋，不再随着掷空消散。
    state.roundScore = 0;
  }
  state.flags.bossDisabled = true;
  pushLog(state, `静默赦令：${boss.name} 的「${boss.effectName}」被消除。`, 'good');
}

export interface ItemResult {
  ok: boolean;
  error?: string;
  item?: ItemDef;
  rerollFree?: boolean;
  grant?: { candidates: PricedDie[]; choose: number; itemId: string };
}

export function canUseItem(state: RunState, itemId: string): ItemResult {
  const item = ITEM_BY_ID[itemId];
  if (!item || item.type !== 'active') return { ok: false, error: '这不是主动物品。' };
  if (!state.activeItems.includes(itemId)) return { ok: false, error: '你还没有这件物品。' };
  if ((state.itemCharges[itemId] || 0) <= 0) return { ok: false, error: '本关已经使用过了。' };
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost' || state.phase === 'shop') {
    return { ok: false, error: '当前阶段不能使用物品。' };
  }
  if (itemId === 'salt') {
    return { ok: false, error: '盐会在掷空时自动询问是否使用。' };
  }
  if (itemId === 'boss_ward') {
    if (state.bossWardArmed) return { ok: false, error: '下一场庄家已经被静默赦令保护。' };
    const isBoss = getLevelConfig(state.level).boss;
    if (isBoss && (state.flags.bossDisabled || state.stats.levelRolls > 0 || state.phase !== 'ready')) {
      return { ok: false, error: '静默赦令只能在庄家关首掷前使用。' };
    }
    if (!isBoss && state.level >= LEVEL_COUNT) return { ok: false, error: '已经没有下一场庄家。' };
  }
  if (itemId === 'glove' && (state.phase !== 'selecting' || selectedDice(state).length !== 1)) {
    return { ok: false, error: '先选中恰好一颗骰子。' };
  }
  if ((itemId === 'smoke' || itemId === 'powder') && !['selecting', 'dead'].includes(state.phase)) {
    return { ok: false, error: '只能在投掷后使用。' };
  }
  return { ok: true };
}

export function useItem(state: RunState, itemId: string): ItemResult {
  const check = canUseItem(state, itemId);
  if (!check.ok) return check;
  const item = ITEM_BY_ID[itemId]!;

  if ('grant' in item && item.grant) {
    const grant = item.grant;
    const all = DICE.filter((die) => die.rarity === grant.rarity);
    const owned = new Set(state.bag.map((entry) => entry.dieId));
    const fresh = all.filter((die) => !owned.has(die.id));
    const candidates = pickMany(fresh.length >= grant.count ? fresh : all, grant.count, getRng(state));
    return { ok: true, item, grant: { candidates, choose: grant.choose, itemId } };
  }

  if (itemId === 'boss_ward') {
    if (getLevelConfig(state.level).boss) {
      disableBossEffectNow(state);
      pushLog(state, '静默赦令展开：本关庄家被动当场失效。', 'good');
    } else {
      state.bossWardArmed = true;
      pushLog(state, '静默赦令已封存：下一场庄家的被动将被消除。', 'good');
    }
  } else if (itemId === 'lucky_coin') {
    const gain = bossScoreAmount(state, 150);
    addScore(state, gain);
    pushLog(state, `幸运币翻面：+${gain} 分。`, 'item');
    checkWin(state);
  } else if (itemId === 'courage') {
    state.rerolls += 1;
    state.maxRerolls += 1;
    pushLog(state, '烈酒下肚：+1 次重投。这瓶酒见底了。', 'item');
  } else if (itemId === 'hunter_mark') {
    state.flags.hunterMark = true;
    pushLog(state, '猎人印记已锁定：下一次计分翻倍。', 'item');
  } else if (itemId === 'glove') {
    const die = selectedDice(state)[0]!;
    die.value = 1;
    die.wild = getDieSpec(die.dieId).setId === 'demon';
    pushLog(state, die.wild
      ? '魔术手套滑过骰面：一颗恶魔骰翻出赖子。'
      : '魔术手套滑过骰面：一颗骰子变成 1。', 'item');
  } else if (itemId === 'smoke') {
    pushLog(state, '烟雾弥漫，未计分的骰子被重新掷出。', 'item');
    state.selected = [];
    state.itemCharges[itemId] = 0;
    return { ok: true, rerollFree: true, item };
  } else if (itemId === 'charm') {
    state.flags.charm = true;
    state.target = Math.ceil(state.target * 0.85);
    pushLog(state, `赌徒护符生效：目标降至 ${state.target} 分。`, 'item');
    checkWin(state);
  } else if (itemId === 'hourglass') {
    state.rerolls += 1;
    state.maxRerolls += 1;
    const gain = bossScoreAmount(state, 200);
    addScore(state, gain);
    pushLog(state, `沙漏逆转：+1 次重投，+${gain} 分。`, 'item');
    checkWin(state);
  } else if (itemId === 'blood_contract') {
    state.flags.bloodContract = true;
    pushLog(state, '血契签署：本关后续计分 +35%，每次计分后 -100 分。', 'item');
  } else if (itemId === 'wager') {
    state.rerolls += 1;
    state.maxRerolls += 1;
    state.flags.wagerMark = true;
    pushLog(state, '加注契约生效：+1 次重投，下一次计分 ×1.6。', 'item');
  } else if (itemId === 'powder') {
    const gain = bossScoreAmount(state, 80);
    addScore(state, gain);
    state.selected = [];
    pushLog(state, `幸运粉扬开：+${gain} 分，未计分的骰子重新掷出。`, 'item');
    state.activeItems = state.activeItems.filter((id) => id !== itemId);
    delete state.itemCharges[itemId];
    checkWin(state);
    return { ok: true, rerollFree: true, item };
  }

  if (item.consumable) {
    state.activeItems = state.activeItems.filter((id) => id !== itemId);
    delete state.itemCharges[itemId];
  } else {
    state.itemCharges[itemId] = 0;
  }
  finalizeStuck(state);
  return { ok: true, item };
}

export function applyItemGrant(
  state: RunState,
  itemId: string,
  dieId: string,
): { ok: boolean; error?: string; die?: PricedDie; replaced?: PricedDie } {
  const item = ITEM_BY_ID[itemId];
  const die = DICE_BY_ID[dieId];
  if (!item || item.type !== 'active' || !item.grant) return { ok: false, error: '这不是骰子礼包。' };
  if (!state.activeItems.includes(itemId) || (state.itemCharges[itemId] || 0) <= 0) {
    return { ok: false, error: '这件物品已经用过了。' };
  }
  if (!die || die.rarity !== item.grant.rarity) return { ok: false, error: '这枚骰子不在礼包范围内。' };

  const capacity = getDiceCapacity(state);
  let replaced: PricedDie | undefined;
  if (state.bag.length >= capacity) {
    const target = state.bag.find((entry) => entry.dieId === 'standard')
      || [...state.bag].sort((a, b) => (DICE_BY_ID[a.dieId]?.price || 0) - (DICE_BY_ID[b.dieId]?.price || 0))[0];
    if (!target) return { ok: false, error: '骰袋已满，无法放入新骰子。' };
    const oldId = target.dieId;
    target.dieId = die.id;
    delete target.probs;
    delete target.shopRerolls;
    delete target.lastShopRerollLevel;
    prepareRandomFaces(target, getRng(state));
    replaced = oldId === 'standard'
      ? ({ ...STANDARD_DIE, price: 0 } as PricedDie)
      : DICE_BY_ID[oldId];
  } else {
    const entry: BagEntry = { uid: uid('bag'), dieId: die.id };
    prepareRandomFaces(entry, getRng(state));
    state.bag.push(entry);
  }

  if (item.consumable) {
    state.activeItems = state.activeItems.filter((id) => id !== itemId);
    delete state.itemCharges[itemId];
  } else {
    state.itemCharges[itemId] = 0;
  }
  pushLog(state, replaced
    ? `「${item.name}」开出「${die.name}」，替换了「${replaced.name}」。`
    : `「${item.name}」开出「${die.name}」，加入骰袋。`, 'item');
  return { ok: true, die, replaced };
}

export function rerollDeadThrow(state: RunState, { free = false }: { free?: boolean } = {}): RollResult {
  if (state.rerolls <= 0 && !free) return { ok: false, error: '没有剩余重投次数。' };
  state.selected = [];
  return rollDice(state, { free });
}

export function forfeit(state: RunState): { ok: boolean; error?: string } {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') {
    return { ok: false, error: '本关已经结束。' };
  }
  state.phase = 'lost';
  pushLog(state, '你放下了骰子，承认这一局输了。', 'lose');
  return { ok: true };
}

export function retryLevel(state: RunState): { ok: boolean; error?: string } {
  if (state.phase !== 'lost') return { ok: false, error: '当前不需要重试。' };
  const lost = Math.floor(state.coins * 0.5);
  state.coins = lost;
  pushLog(state, `卷土重来，半数银币留在了桌上（-${lost}）。`, 'system');
  initLevel(state);
  return { ok: true };
}

// ── Shop ───────────────────────────────────────────────────────────────────

export function shopPrice(state: RunState, base: number): number {
  return Math.max(1, Math.round(base * SHOP_PRICE_MULTIPLIER));
}

export function refreshCost(state: RunState, section: string): number {
  const base = ({ dice: 10, barrel: 14, item: 12 } as Record<string, number>)[section] ?? 10;
  let value = base;
  if (state.passiveItems.includes('gold_cuff')) value *= 0.8;
  return Math.max(1, Math.round(value));
}

function dicePool(state: RunState): PricedDie[] {
  const owned = new Set(state.bag.map((entry) => entry.dieId));
  return DICE.filter((die) => !owned.has(die.id));
}

function barrelPool(state: RunState): BarrelDef[] {
  return BARRELS.filter((barrel) => !state.ownedBarrels.includes(barrel.id));
}

function itemPool(state: RunState): ItemDef[] {
  const owned = new Set(getOwnedItemIds(state));
  const uniqueTaken = new Set(
    getAcquiredItemIds(state).filter((id) => ITEM_BY_ID[id]?.unique),
  );
  return ITEMS.filter((item) => !owned.has(item.id) && !(item.unique && uniqueTaken.has(item.id)));
}

export function getOwnedItemIds(state: RunState): string[] {
  return [...(state.activeItems || []), ...(state.passiveItems || [])];
}

export function getAcquiredItemIds(state: RunState): string[] {
  if (Array.isArray(state.acquiredItemIds)) return state.acquiredItemIds;
  const fallback = getOwnedItemIds(state);
  if (Array.isArray(state.passiveItems)) state.acquiredItemIds = [...fallback];
  return fallback;
}

export function hasItemEverBeenTaken(state: RunState, itemId: string): boolean {
  return getAcquiredItemIds(state).includes(itemId);
}

function offers<T extends { id: string }>(list: T[], count: number, kind: string, rng: () => number): ShopOffer[] {
  return pickMany(list, count, rng).map((entry) => ({
    kind,
    id: entry.id,
    sold: false,
  }));
}

/**
 * Dice stock subtly favours sets the player has already committed to. This
 * makes 2/4-piece set bonuses attainable without removing shop randomness.
 */
function diceOffers(state: RunState, count: number, rng: () => number): ShopOffer[] {
  const pool = dicePool(state);
  const ownedSets = new Set(
    state.bag
      .map((entry) => getDieSpec(entry.dieId).setId)
      .filter(Boolean),
  );
  const chosen: DiceDef[] = [];
  const remaining = () => pool.filter((die) => !chosen.some((pick) => pick.id === die.id));
  const weightFor = (die: DiceDef, tierSize: Map<string, number>) => {
    const band = rarityShopWeight(die.rarity, state.level || 1);
    if (!band) return 0;
    // Weights describe the tier's share of the shelf, so split that share
    // across the dice still available in the tier. Without this the pool's
    // composition silently reweights the bands (7 rare dice would outdraw
    // 3 common ones even at 80/18).
    const share = band / (tierSize.get(die.rarity) || 1);
    // Nudge stock toward sets the player already owns so 2/4-piece bonuses
    // stay reachable without removing shop randomness.
    return die.setId != null && ownedSets.has(die.setId) ? share * 1.5 : share;
  };
  while (chosen.length < count) {
    const left = remaining();
    const tierSize = new Map<string, number>();
    for (const die of left) tierSize.set(die.rarity, (tierSize.get(die.rarity) || 0) + 1);
    const candidates = left
      .map((die) => ({ die, weight: weightFor(die, tierSize) }))
      .filter((entry) => entry.weight > 0);
    if (!candidates.length) break;
    const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;
    let pick = candidates[candidates.length - 1]!.die;
    for (const entry of candidates) {
      roll -= entry.weight;
      if (roll <= 0) { pick = entry.die; break; }
    }
    chosen.push(pick);
  }
  return chosen.map((die) => ({ kind: 'die', id: die.id, sold: false }));
}

/**
 * Items use the same per-level rarity bands as dice. Each tier's shelf share
 * is split across the items still available in that tier, so a large pool of
 * epics cannot drown out the rare/common bands.
 */
function itemOffers(state: RunState, count: number, rng: () => number): ShopOffer[] {
  const pool = itemPool(state);
  const chosen: ItemDef[] = [];
  const remaining = () => pool.filter((item) => !chosen.some((pick) => pick.id === item.id));
  while (chosen.length < count) {
    const left = remaining();
    if (!left.length) break;
    const tierSize = new Map<string, number>();
    for (const item of left) tierSize.set(item.rarity, (tierSize.get(item.rarity) || 0) + 1);
    const candidates = left
      .map((item) => ({
        item,
        weight: (rarityShopWeight(item.rarity, state.level || 1) || 0) / (tierSize.get(item.rarity) || 1),
      }))
      .filter((entry) => entry.weight > 0);
    /* If every remaining item belongs to a tier that is exhausted for this
       level, keep the shelf full rather than returning an empty slot. */
    const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
    if (!candidates.length || total <= 0) {
      chosen.push(left[Math.floor(rng() * left.length)]!);
      continue;
    }
    let roll = rng() * total;
    let pick = candidates[candidates.length - 1]!.item;
    for (const entry of candidates) {
      roll -= entry.weight;
      if (roll <= 0) { pick = entry.item; break; }
    }
    chosen.push(pick);
  }
  return chosen.map((item) => ({ kind: 'item', id: item.id, sold: false }));
}

export interface ShopSlots {
  dice: number;
  barrel: number;
  item: number;
}

/**
 * Base stock is 2 dice / 1 barrel / 3 items; the shelf passives each add one
 * slot to their own section.
 */
export function shopSlots(state: RunState): ShopSlots {
  const has = (id: string) => (state.passiveItems || []).includes(id);
  return {
    dice: 2 + (has('shelf_dice') ? 1 : 0),
    barrel: 1 + (has('shelf_barrel') ? 1 : 0),
    item: 3 + (has('shelf_item') ? 1 : 0),
  };
}

export function createShop(state: RunState, { rng = getRng(state) }: { rng?: () => number } = {}): ShopState {
  const slots = shopSlots(state);
  const shop: ShopState = {
    dice: diceOffers(state, slots.dice, rng),
    barrel: offers(barrelPool(state), slots.barrel, 'barrel', rng),
    item: itemOffers(state, slots.item, rng),
    refreshes: { dice: 0, barrel: 0, item: 0 },
  };
  state.shop = shop;
  state.phase = 'shop';
  return shop;
}

export function openShop(state: RunState): ShopState | null {
  if (state.phase === 'won') {
    return createShop(state);
  }
  if (state.shop) {
    state.phase = 'shop';
    return state.shop;
  }
  return null;
}

export type ShopSection = 'dice' | 'barrel' | 'item';
export type ShopEntry = DiceDef | BarrelDef | ItemDef;

function offerEntry(state: RunState, section: string, index: number): ShopOffer | null {
  if (!state.shop) return null;
  const entry = state.shop[section as ShopSection]?.[index];
  if (!entry || entry.sold || !entry.id) return null;
  return entry;
}

export function shopEntry(state: RunState, section: 'dice', index: number): PricedDie | null;
export function shopEntry(state: RunState, section: 'barrel', index: number): BarrelDef | null;
export function shopEntry(state: RunState, section: 'item', index: number): ItemDef | null;
export function shopEntry(state: RunState, section: ShopSection, index: number): ShopEntry | null;
export function shopEntry(state: RunState, section: ShopSection, index: number): ShopEntry | null {
  const entry = offerEntry(state, section, index);
  if (!entry) return null;
  if (section === 'dice') return DICE_BY_ID[entry.id] ?? null;
  if (section === 'barrel') return BARREL_BY_ID[entry.id] ?? null;
  return ITEM_BY_ID[entry.id] ?? null;
}

export function shopEntryPrice(state: RunState, section: string, index: number): number | null {
  const offer = offerEntry(state, section, index);
  if (!offer) return null;
  const spec = section === 'dice' ? DICE_BY_ID[offer.id]
    : section === 'barrel' ? BARREL_BY_ID[offer.id]
      : ITEM_BY_ID[offer.id];
  return spec ? shopPrice(state, spec.price) : null;
}

export function refreshSection(state: RunState, section: string, { rng = getRng(state) }: { rng?: () => number } = {}): { ok: boolean; error?: string; cost?: number } {
  if (!state.shop) return { ok: false, error: '商店未开启。' };
  const cost = refreshCost(state, section);
  if (state.coins < cost) return { ok: false, error: `需要 ${cost} 银币。` };
  state.coins -= cost;
  const slots = shopSlots(state);
  if (section === 'dice') {
    state.shop.dice = diceOffers(state, slots.dice, rng);
  } else if (section === 'barrel') {
    state.shop.barrel = offers(barrelPool(state), slots.barrel, 'barrel', rng);
  } else if (section === 'item') {
    state.shop.item = itemOffers(state, slots.item, rng);
  } else {
    return { ok: false, error: '未知的商店区域。' };
  }
  state.shop.refreshes[section] = (state.shop.refreshes[section] ?? 0) + 1;
  for (const entry of state.bag) {
    const bonus = dieBonus(entry.dieId);
    if (bonus?.type === 'shopRerollMultiplier' && entry.lastShopRerollLevel !== state.level) {
      entry.shopRerolls = (entry.shopRerolls || 0) + 1;
      entry.lastShopRerollLevel = state.level;
      pushLog(state, `「${getDieSpec(entry.dieId).name}」记住了这次重随：计分加成 +${Math.round(bonus.value * 100)}%。`, 'shop');
    }
  }
  pushLog(state, `刷新${sectionLabel(section)}，花费 ${cost} 银币。`, 'shop');
  return { ok: true, cost };
}

export function sectionLabel(section: string): string {
  return ({ dice: '骰子', barrel: '骰桶', item: '物品' } as Record<string, string>)[section] || section;
}

export interface BuyResult {
  ok: boolean;
  error?: string;
  needReplace?: boolean;
  die?: PricedDie;
  barrel?: BarrelDef;
  item?: ItemDef;
  price?: number;
}

export function buyDie(state: RunState, index: number, replaceBagUid: string | null = null): BuyResult {
  const die = shopEntry(state, 'dice', index);
  if (!die) return { ok: false, error: '这个骰子已经售出。' };
  const entry = state.shop!.dice[index]!;
  const price = shopPrice(state, die.price);
  if (state.coins < price) return { ok: false, error: `需要 ${price} 银币。` };
  const capacity = getDiceCapacity(state);
  if (state.bag.length >= capacity && !replaceBagUid) {
    return { ok: false, needReplace: true, die, price };
  }
  if (state.bag.length >= capacity) {
    const target = state.bag.find((b) => b.uid === replaceBagUid);
    if (!target) return { ok: false, error: '请选择要替换的骰子。' };
    target.dieId = die.id;
    delete target.probs;
    prepareRandomFaces(target, getRng(state));
  } else {
    const added: BagEntry = { uid: uid('bag'), dieId: die.id };
    prepareRandomFaces(added, getRng(state));
    state.bag.push(added);
  }
  state.coins -= price;
  entry.sold = true;
  pushLog(state, `购入「${die.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, die, price };
}

export function buyBarrel(state: RunState, index: number): BuyResult {
  const barrel = shopEntry(state, 'barrel', index);
  if (!barrel) return { ok: false, error: '这个骰桶已经售出。' };
  const entry = state.shop!.barrel[index]!;
  const price = shopPrice(state, barrel.price);
  if (state.coins < price) return { ok: false, error: `需要 ${price} 银币。` };
  state.coins -= price;
  state.barrelId = barrel.id;
  if (!state.ownedBarrels.includes(barrel.id)) state.ownedBarrels.push(barrel.id);
  entry.sold = true;
  pushLog(state, `换上「${barrel.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, barrel, price };
}

export function buyItem(state: RunState, index: number): BuyResult {
  const item = shopEntry(state, 'item', index);
  if (!item) return { ok: false, error: '这件物品已经售出。' };
  // +1 / -1 dice-capacity items are once-per-run pickups: even after being
  // removed from the shop render they must never come back.
  if (item.unique && hasItemEverBeenTaken(state, item.id)) {
    return { ok: false, error: '这件物品整局只能获取一次。' };
  }
  const entry = state.shop!.item[index]!;
  const price = shopPrice(state, item.price);
  if (state.coins < price) return { ok: false, error: `需要 ${price} 银币。` };
  state.coins -= price;
  if (item.type === 'active') {
    state.activeItems.push(item.id);
    state.itemCharges[item.id] = item.charges;
  } else {
    state.passiveItems.push(item.id);
    if (item.id === 'dice_bag' || item.id === 'cracked_pouch') syncBag(state);
  }
  if (!getAcquiredItemIds(state).includes(item.id)) {
    getAcquiredItemIds(state).push(item.id);
  }
  entry.sold = true;
  pushLog(state, `购入「${item.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, item, price };
}

export function itemSellPrice(item: ItemDef | null | undefined): number {
  return Math.max(1, Math.floor((item?.price || 0) / 2));
}

export function canSellItem(state: RunState, itemId: string): { ok: boolean; error?: string; item?: ItemDef; price?: number } {
  if (state.phase !== 'shop') return { ok: false, error: '只能在本关市集出售物品。' };
  const item = ITEM_BY_ID[itemId];
  if (!item || !getOwnedItemIds(state).includes(itemId)) {
    return { ok: false, error: '你没有这件物品。' };
  }
  if (itemId === 'dice_bag') {
    const capacityAfter = Math.max(4, 6 - (state.passiveItems.includes('cracked_pouch') ? 1 : 0));
    if (state.bag.length > capacityAfter) {
      return { ok: false, error: '骰袋里骰子太多，卖出丰饶骰袋会挤掉骰子。' };
    }
  }
  return { ok: true, item, price: itemSellPrice(item) };
}

export function sellItem(state: RunState, itemId: string): { ok: boolean; error?: string; item?: ItemDef; price?: number } {
  const check = canSellItem(state, itemId);
  if (!check.ok) return check;
  const item = check.item!;
  const price = check.price!;
  if (state.activeItems.includes(itemId)) {
    state.activeItems = state.activeItems.filter((id) => id !== itemId);
    delete state.itemCharges[itemId];
  } else {
    state.passiveItems = state.passiveItems.filter((id) => id !== itemId);
    if (itemId === 'dice_bag' || itemId === 'cracked_pouch') syncBag(state);
  }
  state.coins += price;
  pushLog(state, `出售「${item.name}」，获得 ${price} 银币（半价）。`, 'shop');
  return { ok: true, item, price };
}

export function leaveShop(state: RunState): { ok: boolean; error?: string } {
  if (state.phase !== 'shop') return { ok: false, error: '你不在商店。' };
  if (state.level >= LEVEL_COUNT) return { ok: false, error: '已经是最后一关。' };
  state.shop = null;
  state.level += 1;
  initLevel(state);
  return { ok: true };
}

export function runSummary(state: RunState) {
  return {
    level: state.level,
    wins: state.stats.wins,
    coins: state.coins,
    bestHit: state.stats.bestHit,
    rolls: state.stats.rolls,
    dice: state.bag.map((entry) => getDieSpec(entry.dieId)),
    barrel: getBarrel(state),
    activeItems: state.activeItems.map((id) => ITEM_BY_ID[id]),
    passiveItems: state.passiveItems.map((id) => ITEM_BY_ID[id]),
  };
}

export function explainTarget(state: RunState) {
  const base = getLevelConfig(state.level).target;
  const reasons: { label: string; value: string }[] = [];
  if (state.flags.charm) reasons.push({ label: '赌徒护符', value: `目标降至 ${state.target}` });
  return { base, target: state.target, reasons };
}

export function getOpponentInfo(state: RunState): Opponent | null {
  return getOpponent(state.level);
}

export function tableInfo(state: RunState) {
  return getTable(state.level);
}

export function chapterInfo(level: number): number {
  return chapterForLevel(level);
}
