import {
  BARRELS, BARREL_BY_ID, BOSSES, DICE, DICE_BY_ID, DICE_SETS,
  ITEMS, ITEM_BY_ID, LEVELS, LEVEL_COUNT, RARITIES, STANDARD_DIE,
  activeSetBonuses, chapterForLevel, getLevelConfig, getOpponent, getTable,
} from './data.js';
import {
  analyzeSelection, bestSelection, hasScoringSelection,
} from './scoring.js';

export const BASE_REROLLS = 5;
export const STARTING_COINS = 40;
export const ACTIVE_ITEM_SLOTS = 4;
export const DEBUG = false;

let uidCounter = 0;
function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function rng() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickMany(list, count, rng) {
  const copy = list.slice();
  const out = [];
  while (copy.length && out.length < count) {
    const index = Math.floor(rng() * copy.length);
    out.push(copy.splice(index, 1)[0]);
  }
  return out;
}

function standardEntry() {
  return { uid: uid('bag'), dieId: 'standard' };
}

export function getDiceCapacity(state) {
  return 6 + (state.passiveItems.includes('dice_bag') ? 1 : 0);
}

export function syncBag(state) {
  const capacity = getDiceCapacity(state);
  while (state.bag.length < capacity) state.bag.push(standardEntry());
  return state;
}

export function getDieSpec(dieId) {
  return DICE_BY_ID[dieId] || STANDARD_DIE;
}

export function getBarrel(state) {
  return BARREL_BY_ID[state.barrelId] || BARRELS[0];
}

export function effectiveProbs(dieId, barrelId) {
  const die = getDieSpec(dieId);
  const barrel = BARREL_BY_ID[barrelId] || BARRELS[0];
  const bias = barrel.bias || [1, 1, 1, 1, 1, 1];
  const weights = die.probs.map((probability, index) => probability * (bias[index] ?? 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

function rollValue(probs, rng) {
  let roll = rng();
  for (let face = 0; face < 6; face += 1) {
    roll -= probs[face];
    if (roll <= 0) return face + 1;
  }
  return 6;
}

function makeBoard(bag) {
  return bag.map((entry, index) => ({
    uid: `board-${index}-${entry.uid}`,
    bagUid: entry.uid,
    dieId: entry.dieId,
    value: null,
    scored: false,
  }));
}

export function availableDice(state) {
  return state.dice.filter((d) => !d.scored);
}

export function selectedDice(state) {
  return state.dice.filter((d) => state.selected.includes(d.uid));
}

export function setCounts(state) {
  return activeSetBonuses(state.bag);
}

export function hasSetTier(state, setId, tier) {
  const sets = setCounts(state);
  return (sets[setId]?.count || 0) >= tier;
}

export function targetForLevel(state, level = state.level) {
  let target = getLevelConfig(level).target;
  if (hasSetTier(state, 'astral', 2)) target *= 0.9;
  return Math.ceil(target);
}

function resetLevelFlags(state) {
  state.flags = {
    hunterMark: false,
    bloodContract: false,
    starBonus: false,
    starArmed: false,
    vortexScore: false,
    charm: false,
    eyeUsed: false,
    vortexUsed: false,
    gestureUsedThisThrow: false,
    hotDice: false,
    rerollAll: false,
  };
}

export function initLevel(state) {
  syncBag(state);
  const config = getLevelConfig(state.level);
  state.targetBase = targetForLevel(state);
  state.target = state.targetBase;
  state.score = 0;
  state.roundScore = 0;
  state.targetReached = false;
  state.lastBust = null;
  state.lastScore = null;
  state.selected = [];
  state.phase = 'ready';
  state.dice = makeBoard(state.bag);
  state.throwNumber = 0;
  resetLevelFlags(state);
  state.itemCharges = {};
  for (const itemId of state.activeItems) {
    state.itemCharges[itemId] = ITEM_BY_ID[itemId]?.charges ?? 1;
  }
  let rerolls = BASE_REROLLS + (state.bossBoons || 0);
  if (hasSetTier(state, 'raven', 2)) rerolls += 1;
  const opponent = getOpponent(state.level);
  if (config.boss && opponent.effectKey === 'rerollMinus') rerolls -= 1;
  state.rerolls = Math.max(1, rerolls);
  state.maxRerolls = state.rerolls;
  state.levelStartRerolls = rerolls;
  state.levelReward = null;
  state.pendingReward = null;
  state.runWon = false;
  state.stats.levelRolls = 0;
  state.stats.levelScore = 0;
  pushLog(state, `${getTable(state.level).name}：第 ${state.level} 关，目标 ${state.target} 分。`, 'system');
  return state;
}

export function createRun({ rng = Math.random } = {}) {
  const state = {
    version: 1,
    level: 1,
    coins: STARTING_COINS,
    bag: [0, 0, 0, 0, 0, 0].map(() => standardEntry()),
    barrelId: 'oak',
    ownedBarrels: ['oak'],
    activeItems: ['lucky_coin'],
    passiveItems: [],
    dice: [],
    selected: [],
    score: 0,
    roundScore: 0,
    targetReached: false,
    lastBust: null,
    target: 0,
    targetBase: 0,
    rerolls: BASE_REROLLS,
    maxRerolls: BASE_REROLLS,
    phase: 'ready',
    bossBoons: 0,
    flags: {},
    itemCharges: {},
    history: [],
    shop: null,
    log: [],
    rngState: 0,
    stats: { rolls: 0, scored: 0, levelRolls: 0, levelScore: 0, bestHit: 0, wins: 0 },
  };
  state.rng = rng;
  state.stats.wins = 0;
  initLevel(state);
  pushLog(state, '门房塞给你一枚幸运币：每关可以额外 +150 分。', 'good');
  return state;
}

export function getRng(state) {
  return state.rng || Math.random;
}

export function pushLog(state, text, type = 'info') {
  state.log.unshift({
    id: uid('log'),
    text,
    type,
    level: state.level,
    at: Date.now(),
  });
  if (state.log.length > 60) state.log.length = 60;
}

export function toggleDie(state, uidValue) {
  const die = state.dice.find((d) => d.uid === uidValue);
  if (!die || die.scored || die.value == null) return false;
  if (state.selected.includes(uidValue)) {
    state.selected = state.selected.filter((id) => id !== uidValue);
  } else {
    state.selected.push(uidValue);
  }
  return true;
}

export function clearSelection(state) {
  state.selected = [];
}

export function getComboAnalysis(state) {
  const dice = selectedDice(state);
  return analyzeSelection(dice.map((d) => d.value));
}

function subtotal(state) {
  return state.log?.length || 0;
}

/**
 * Applies every scoring modifier. Returns a transparent breakdown that the UI
 * can display, including boss taxes and set bonuses.
 */
export function buildScore(state, action = 'reroll') {
  const selected = selectedDice(state);
  const analysis = analyzeSelection(selected.map((d) => d.value));
  if (!analysis.valid) {
    return {
      valid: false,
      error: selected.length ? '所选骰子无法组成合法计分组合。' : '请先选择要计分的骰子。',
      total: 0,
      analysis,
      breakdown: null,
    };
  }

  const sets = setCounts(state);
  const flats = [];
  const multipliers = [];
  const notes = [];
  let flatAdd = 0;
  let multiplier = 1;

  const dieSpecs = selected.map((d) => getDieSpec(d.dieId));
  const counts = analysis.counts;
  const selectedIds = selected.map((d) => d.dieId);

  // Per-die bonuses.
  for (let i = 0; i < selected.length; i += 1) {
    const spec = dieSpecs[i];
    const die = selected[i];
    const bonus = spec.bonus;
    if (!bonus) continue;
    if (bonus.type === 'faceFlat' && die.value === bonus.face) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'twoSixes' && counts[6] >= 2) {
      flatAdd += bonus.value;
      flats.push({ label: `${spec.name} · ${bonus.label}`, value: bonus.value });
    } else if (bonus.type === 'hasOne' && counts[1] >= 1) {
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
    }
  }

  // Set bonuses.
  if ((sets.wolf?.count || 0) >= 2 && counts[6] > 0) {
    const value = counts[6] * 25;
    flatAdd += value;
    flats.push({ label: `狼裔 2 件 · 每颗 6 +25`, value });
  }
  if ((sets.wolf?.count || 0) >= 4 && analysis.multi) {
    flatAdd += 100;
    flats.push({ label: '狼裔 4 件 · 群猎 +100', value: 100 });
  }
  if ((sets.raven?.count || 0) >= 4 && counts[1] > 0) {
    const value = counts[1] * 50;
    flatAdd += value;
    flats.push({ label: '渡鸦 4 件 · 每颗 1 +50', value });
  }
  if ((sets.serpent?.count || 0) >= 2 && analysis.straight) {
    flatAdd += 250;
    flats.push({ label: '蝰蛇 2 件 · 顺流 +250', value: 250 });
  }
  if ((sets.serpent?.count || 0) >= 4 && counts[5] > 0) {
    const value = counts[5] * 50;
    flatAdd += value;
    flats.push({ label: '蝰蛇 4 件 · 每颗 5 +50', value });
  }
  if ((sets.astral?.count || 0) >= 4) {
    multiplier *= 1.15;
    multipliers.push({ label: '星穹 4 件 · 星辉', value: 1.15 });
  }

  // Demon die: included is a boon, available-but-ignored is a pact penalty.
  const queenEquipped = state.bag.some((entry) => entry.dieId === 'crown_queen');
  const queenSelected = selectedIds.includes('crown_queen');
  if (queenEquipped && queenSelected) {
    multiplier *= 1.25;
    multipliers.push({ label: '无冠女王 · 恶魔契约', value: 1.25 });
  } else if (queenEquipped && state.dice.some((d) => d.dieId === 'crown_queen' && !d.scored)) {
    multiplier *= 0.85;
    multipliers.push({ label: '无冠女王 · 被冷落的诅咒', value: 0.85 });
  }

  // Active items and gesture buffs.
  if (state.flags.hunterMark) {
    multiplier *= 2;
    multipliers.push({ label: '猎人印记 · 双倍', value: 2 });
  }
  if (state.flags.bloodContract) {
    multiplier *= 1.3;
    multipliers.push({ label: '血契 · 献祭 +30%', value: 1.3 });
  }
  if (state.flags.starBonus) {
    multiplier *= 1.25;
    multipliers.push({ label: '五芒星仪式 · +25%', value: 1.25 });
  }
  if (state.flags.vortexScore) {
    multiplier *= 1.1;
    multipliers.push({ label: '旋涡仪式 · +10%', value: 1.1 });
  }

  let preBoss = Math.round((analysis.base + flatAdd) * multiplier);

  // Boss taxes are applied after the player's own modifiers.
  const opponent = getOpponent(state.level);
  const isBoss = Boolean(getLevelConfig(state.level).boss);
  if (isBoss) {
    if (opponent.effectKey === 'steal') {
      multiplier *= 0.9;
      multipliers.push({ label: `${opponent.name} · 鼠群分食`, value: 0.9 });
    } else if (opponent.effectKey === 'comboTax' && analysis.multi) {
      multiplier *= 0.7;
      multipliers.push({ label: `${opponent.name} · 熔炉淬火`, value: 0.7 });
    } else if (opponent.effectKey === 'continueTax' && action === 'continue') {
      multiplier *= 0.8;
      multipliers.push({ label: `${opponent.name} · 庄家抽成`, value: 0.8 });
    }
  }

  preBoss = Math.round((analysis.base + flatAdd) * multiplier);
  let total = preBoss;
  if (isBoss && opponent.effectKey === 'lowScoreHalf' && preBoss < 250) {
    total = Math.round(total * 0.5);
    notes.push({ label: `${opponent.name} · 棱镜裁决（低于 250 分）`, value: '×0.5' });
  }

  const costs = [];
  if (state.flags.bloodContract) costs.push({ label: '血契代价', value: 30 });

  return {
    valid: true,
    total: Math.max(1, total),
    analysis,
    breakdown: {
      base: analysis.base,
      flats,
      flatAdd,
      multipliers,
      notes,
      costs,
      preBoss,
      total: Math.max(1, total),
    },
  };
}

export function getScorePreview(state) {
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

function addScore(state, amount, { round = false } = {}) {
  state.score += amount;
  state.stats.levelScore += amount;
  // The newest scoring action is at risk until the next throw proves it has a
  // scoring combination. Earlier confirmed rounds stay in the secured total.
  if (round) state.roundScore = amount;
  if (amount > state.stats.bestHit) state.stats.bestHit = amount;
}

/**
 * A turn's unbanked points burn when the next throw has no scoring dice.
 * Only the current round is lost; previously secured score stays.
 */
function bustRound(state) {
  const lost = Math.max(0, state.roundScore || 0);
  if (!lost) return 0;
  state.score = Math.max(0, state.score - lost);
  state.stats.levelScore = Math.max(0, state.stats.levelScore - lost);
  state.roundScore = 0;
  state.lastBust = { lost };
  pushLog(state, `本轮 ${lost} 分作废。`, 'bad');
  return lost;
}

function penalizeScore(state, amount) {
  const roundPart = Math.min(state.roundScore || 0, amount);
  state.roundScore = Math.max(0, (state.roundScore || 0) - roundPart);
  state.score = Math.max(0, state.score - amount);
  state.stats.levelScore = Math.max(0, state.stats.levelScore - amount);
}

function awardLevel(state) {
  if (state.levelReward) return state.levelReward;
  const cfg = getLevelConfig(state.level);
  const bonuses = [];
  let total = cfg.reward;
  if (hasSetTier(state, 'crown', 4)) {
    total += 12;
    bonuses.push({ label: '王冠 4 件 · 贡金', value: 12 });
  }
  if (state.passiveItems.includes('gold_cuff')) {
    total += 12;
    bonuses.push({ label: '镀金袖扣', value: 12 });
  }
  state.coins += total;
  state.levelReward = { base: cfg.reward, bonuses, total };
  state.pendingReward = state.levelReward;
  state.stats.wins += 1;
  pushLog(state, `第 ${state.level} 关获胜，获得 ${total} 银币。`, 'reward');
  return state.levelReward;
}

function completeLevel(state) {
  if (state.phase === 'won' || state.phase === 'run-won') return;
  state.roundScore = 0;
  awardLevel(state);
  // Taking a dealer's chair grants a permanent reroll ceiling increase for the
  // rest of the run. The baseline five rerolls are untouched.
  if (getLevelConfig(state.level).boss && state.level < LEVEL_COUNT) {
    state.bossBoons = (state.bossBoons || 0) + 1;
    pushLog(state, `夺下庄家徽记：后续关卡重投上限 +1（当前 +${state.bossBoons}）。`, 'good');
  }
  if (state.level >= LEVEL_COUNT) {
    state.phase = 'run-won';
    state.runWon = true;
    pushLog(state, '你击败了钻石天使，赢下了整座天穹赌局。', 'victory');
  } else {
    state.phase = 'won';
    pushLog(state, `达到 ${state.target} 分，第 ${state.level} 关通过。`, 'win');
  }
}

function checkWin(state) {
  if (state.score >= state.target && state.phase !== 'won' && state.phase !== 'run-won') {
    if (!state.targetReached) {
      state.targetReached = true;
      pushLog(state, `达到 ${state.target} 分。可以继续加注，或点击「下一关」收手。`, 'win');
    }
    return true;
  }
  return false;
}

/**
 * The target is a milestone, not an automatic ending. The player may keep
 * scoring past it until they explicitly choose to leave for the next level.
 */
export function advanceLevel(state) {
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

export function activeCharges(state) {
  return Object.values(state.itemCharges || {}).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
}

export function finalizeStuck(state) {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') return state;
  if (state.score >= state.target) {
    checkWin(state);
    return state;
  }
  if (state.rerolls <= 0 && !hasScoringSelection(availableDice(state)) && activeCharges(state) === 0) {
    state.phase = 'lost';
    pushLog(state, '重投耗尽，分数未达标。', 'lose');
  }
  return state;
}

export function rollDice(state, { free = false, rng = getRng(state) } = {}) {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') {
    return { ok: false, error: '本关已结束。' };
  }
  if (state.phase === 'shop') return { ok: false, error: '商店阶段不能投掷。' };
  // The opening throw of a level is free; the five reroll tokens are spent on
  // subsequent throws only, exactly as in KCD2's dice game.
  const openingThrow = state.phase === 'ready' && state.stats.levelRolls === 0;
  if (!free && !openingThrow && state.rerolls <= 0) {
    return { ok: false, error: '没有剩余重投次数。' };
  }
  if (!free && !openingThrow) state.rerolls -= 1;

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
    }
    state.flags.hotDice = false;
    state.flags.rerollAll = false;
  }

  const toRoll = availableDice(state).filter((d) => d.value == null || !free || wasHot || rerollAll);
  const targets = toRoll.length ? toRoll : availableDice(state);
  const barrel = getBarrel(state);
  for (const die of targets) {
    die.value = rollValue(effectiveProbs(die.dieId, barrel.id), rng);
    die.scored = false;
  }
  for (const die of state.dice) {
    if (die.value == null) die.value = rollValue(effectiveProbs(die.dieId, barrel.id), rng);
  }
  state.selected = [];
  state.phase = 'selecting';
  state.throwNumber += 1;
  state.stats.rolls += 1;
  state.stats.levelRolls += 1;
  state.lastRoll = targets.map((d) => d.value);

  const scoring = bestSelection(availableDice(state));
  let bust = 0;
  if (!scoring) {
    state.phase = 'dead';
    pushLog(state, `掷出 ${state.lastRoll.join(' · ')}，没有可计分的组合。`, 'bad');
    bust = bustRound(state);
  } else {
    // A scoring throw confirms the previous round's provisional points.
    state.roundScore = 0;
    state.lastBust = null;
    pushLog(state, `掷出 ${state.lastRoll.join(' · ')}。`, 'roll');
  }
  finalizeStuck(state);
  return { ok: true, values: state.lastRoll, hot: wasHot, bust };
}

/**
 * Apply the selected dice.
 * continue — score, set aside, reroll only the remaining dice.
 * reroll   — score, then put all six dice back into the cup.
 * bank     — no reroll tokens left; score and settle the level.
 * @param {'continue'|'reroll'|'bank'} action
 */
export function applyScore(state, action) {
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
  if (action !== 'bank' && state.rerolls <= 0) {
    return { ok: false, error: '没有剩余重投次数，只能计分并结算。' };
  }
  const preview = getScorePreview(state);
  const chosen = action === 'reroll'
    ? preview.reroll
    : action === 'bank'
      ? preview.bank
      : preview.continue;
  if (!chosen.valid) return { ok: false, error: chosen.error };

  const scoringDice = selectedDice(state);
  const scoringValues = scoringDice.map((d) => d.value);
  const total = chosen.total;
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

  // Die-specific trigger effects.
  const specs = scoringDice.map((d) => getDieSpec(d.dieId));
  if (specs.some((s) => s.id === 'astral_eye') && !state.flags.eyeUsed) {
    state.flags.eyeUsed = true;
    state.rerolls += 1;
    state.maxRerolls += 1;
    pushLog(state, '命运之眼睁开：本关获得 1 次额外重投。', 'good');
  }
  if (specs.some((s) => s.bonus?.type === 'demon')) {
    pushLog(state, '无冠女王满意地收下了这份供奉。', 'demon');
  }

  if (state.flags.hunterMark) {
    state.flags.hunterMark = false;
  }
  if (state.flags.bloodContract) {
    penalizeScore(state, 30);
    pushLog(state, '血契索取代价：-30 分。', 'bad');
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

  // Both reroll choices are played by the cup animation before rollDice().
  // "continue" leaves already-scored dice aside; "reroll" returns all six.
  state.phase = 'reroll-pending';
  state.flags.rerollAll = action === 'reroll';
  return {
    ok: true, total, action, won: false, hot: false, targetReached: reachedTarget,
    reroll: true, rerollAll: action === 'reroll', breakdown: chosen.breakdown,
  };
}

export function applyGesture(state, gesture) {
  const barrel = getBarrel(state);
  if (barrel.gesture !== gesture) {
    return { ok: false, error: '当前骰桶没有这种仪式。' };
  }
  if (state.flags.gestureUsedThisThrow) {
    return { ok: false, error: '本次投掷已经完成过仪式。' };
  }
  if (gesture === 'pentagram') {
    if (state.phase === 'ready' || state.phase === 'dead' || state.phase === 'hot' ||
        state.phase === 'reroll-pending') {
      state.flags.starArmed = true;
    } else if (state.phase === 'selecting') {
      state.flags.starBonus = true;
    } else {
      return { ok: false, error: '当前无法进行仪式。' };
    }
    state.flags.gestureUsedThisThrow = true;
    pushLog(state, '五芒星仪式完成：本次投掷计分 +25%。', 'gesture');
    return { ok: true, message: '五芒星点亮。本掷计分 +25%' };
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
    pushLog(state, '旋涡仪式完成：+1 次重投，本掷计分 +10%。', 'gesture');
    return { ok: true, message: '旋涡转动。+1 重投，本掷 +10%' };
  }
  return { ok: false, error: '未知仪式。' };
}

export function canUseItem(state, itemId) {
  const item = ITEM_BY_ID[itemId];
  if (!item || item.type !== 'active') return { ok: false, error: '这不是主动物品。' };
  if (!state.activeItems.includes(itemId)) return { ok: false, error: '你还没有这件物品。' };
  if ((state.itemCharges[itemId] || 0) <= 0) return { ok: false, error: '本关已经使用过了。' };
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost' || state.phase === 'shop') {
    return { ok: false, error: '当前阶段不能使用物品。' };
  }
  if (itemId === 'glove' && (state.phase !== 'selecting' || selectedDice(state).length !== 1)) {
    return { ok: false, error: '先选中恰好一颗骰子。' };
  }
  if (itemId === 'smoke' && !['selecting', 'dead'].includes(state.phase)) {
    return { ok: false, error: '只能在投掷后使用。' };
  }
  return { ok: true };
}

export function useItem(state, itemId) {
  const check = canUseItem(state, itemId);
  if (!check.ok) return check;
  const item = ITEM_BY_ID[itemId];

  if (itemId === 'lucky_coin') {
    addScore(state, 150);
    pushLog(state, '幸运币翻面：+150 分。', 'item');
    checkWin(state);
  } else if (itemId === 'courage') {
    state.rerolls += 2;
    state.maxRerolls += 2;
    pushLog(state, '烈酒下肚：+2 次重投。', 'item');
  } else if (itemId === 'hunter_mark') {
    state.flags.hunterMark = true;
    pushLog(state, '猎人印记已锁定：下一次计分翻倍。', 'item');
  } else if (itemId === 'glove') {
    const die = selectedDice(state)[0];
    die.value = 6;
    pushLog(state, '魔术手套滑过骰面：一颗骰子变成 6。', 'item');
  } else if (itemId === 'smoke') {
    pushLog(state, '烟雾弥漫，未计分的骰子被重新掷出。', 'item');
    state.selected = [];
    state.itemCharges[itemId] = 0;
    return { ok: true, rerollFree: true, item };
  } else if (itemId === 'charm') {
    state.flags.charm = true;
    state.target = Math.ceil(state.target * 0.8);
    pushLog(state, `赌徒护符生效：目标降至 ${state.target} 分。`, 'item');
    checkWin(state);
  } else if (itemId === 'hourglass') {
    state.rerolls += 1;
    state.maxRerolls += 1;
    addScore(state, 100);
    pushLog(state, '沙漏逆转：+1 次重投，+100 分。', 'item');
    checkWin(state);
  } else if (itemId === 'blood_contract') {
    state.flags.bloodContract = true;
    pushLog(state, '血契签署：本关后续计分 +30%，每次计分后 -30 分。', 'item');
  }

  state.itemCharges[itemId] = 0;
  finalizeStuck(state);
  return { ok: true, item };
}

export function rerollDeadThrow(state, { free = false } = {}) {
  if (state.rerolls <= 0 && !free) return { ok: false, error: '没有剩余重投次数。' };
  state.selected = [];
  return rollDice(state, { free });
}

export function forfeit(state) {
  if (state.phase === 'won' || state.phase === 'run-won' || state.phase === 'lost') {
    return { ok: false, error: '本关已经结束。' };
  }
  state.phase = 'lost';
  pushLog(state, '你放下了骰子，承认这一局输了。', 'lose');
  return { ok: true };
}

export function retryLevel(state) {
  if (state.phase !== 'lost') return { ok: false, error: '当前不需要重试。' };
  const lost = Math.floor(state.coins * 0.5);
  state.coins = lost;
  pushLog(state, `卷土重来，半数银币留在了桌上（-${lost}）。`, 'system');
  initLevel(state);
  return { ok: true };
}

// ── Shop ───────────────────────────────────────────────────────────────────

export function shopPrice(state, base) {
  let value = base;
  if (hasSetTier(state, 'crown', 2)) value *= 0.85;
  return Math.max(1, Math.round(value));
}

export function refreshCost(state, section) {
  const base = { dice: 10, barrel: 14, item: 12 }[section] ?? 10;
  let value = base;
  if (state.passiveItems.includes('gold_cuff')) value *= 0.8;
  return Math.max(1, Math.round(value));
}

function dicePool(state) {
  const owned = new Set(state.bag.map((entry) => entry.dieId));
  return DICE.filter((die) => !owned.has(die.id));
}

function barrelPool(state) {
  return BARRELS.filter((barrel) => !state.ownedBarrels.includes(barrel.id));
}

function itemPool(state) {
  const owned = new Set([...state.activeItems, ...state.passiveItems]);
  return ITEMS.filter((item) => !owned.has(item.id));
}

function offers(list, count, kind, rng) {
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
function diceOffers(state, count, rng) {
  const pool = dicePool(state);
  const ownedSets = new Set(
    state.bag
      .map((entry) => getDieSpec(entry.dieId).setId)
      .filter(Boolean),
  );
  const chosen = [];
  const favored = pool.filter((die) => ownedSets.has(die.setId));
  if (favored.length && count > 0) {
    const first = favored[Math.floor(rng() * favored.length)];
    chosen.push(first);
  }
  const remainder = pool.filter((die) => !chosen.some((pick) => pick.id === die.id));
  chosen.push(...pickMany(remainder, count - chosen.length, rng));
  return chosen.map((die) => ({ kind: 'die', id: die.id, sold: false }));
}

export function createShop(state, { rng = getRng(state) } = {}) {
  const shop = {
    dice: diceOffers(state, 2, rng),
    barrel: offers(barrelPool(state), 1, 'barrel', rng),
    item: offers(itemPool(state), 3, 'item', rng),
    refreshes: { dice: 0, barrel: 0, item: 0 },
  };
  state.shop = shop;
  state.phase = 'shop';
  return shop;
}

export function openShop(state) {
  if (state.phase === 'won') {
    return createShop(state);
  }
  if (state.shop) {
    state.phase = 'shop';
    return state.shop;
  }
  return null;
}

export function shopEntry(state, section, index) {
  if (!state.shop) return null;
  const entry = state.shop[section]?.[index];
  if (!entry || entry.sold || !entry.id) return null;
  if (section === 'dice') return DICE_BY_ID[entry.id];
  if (section === 'barrel') return BARREL_BY_ID[entry.id];
  return ITEM_BY_ID[entry.id];
}

export function shopEntryPrice(state, section, index) {
  const entry = shopEntry(state, section, index);
  if (!entry) return null;
  return shopPrice(state, entry.price);
}

export function refreshSection(state, section, { rng = getRng(state) } = {}) {
  if (!state.shop) return { ok: false, error: '商店未开启。' };
  const cost = refreshCost(state, section);
  if (state.coins < cost) return { ok: false, error: `需要 ${cost} 银币。` };
  state.coins -= cost;
  if (section === 'dice') {
    state.shop.dice = diceOffers(state, 2, rng);
  } else if (section === 'barrel') {
    state.shop.barrel = offers(barrelPool(state), 1, 'barrel', rng);
  } else if (section === 'item') {
    state.shop.item = offers(itemPool(state), 3, 'item', rng);
  } else {
    return { ok: false, error: '未知的商店区域。' };
  }
  state.shop.refreshes[section] += 1;
  pushLog(state, `刷新${sectionLabel(section)}，花费 ${cost} 银币。`, 'shop');
  return { ok: true, cost };
}

export function sectionLabel(section) {
  return { dice: '骰子', barrel: '骰桶', item: '物品' }[section] || section;
}

export function buyDie(state, index, replaceBagUid = null) {
  const die = shopEntry(state, 'dice', index);
  if (!die) return { ok: false, error: '这个骰子已经售出。' };
  const entry = state.shop.dice[index];
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
  } else {
    state.bag.push({ uid: uid('bag'), dieId: die.id });
  }
  state.coins -= price;
  entry.sold = true;
  pushLog(state, `购入「${die.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, die, price };
}

export function buyBarrel(state, index) {
  const barrel = shopEntry(state, 'barrel', index);
  if (!barrel) return { ok: false, error: '这个骰桶已经售出。' };
  const entry = state.shop.barrel[index];
  const price = shopPrice(state, barrel.price);
  if (state.coins < price) return { ok: false, error: `需要 ${price} 银币。` };
  state.coins -= price;
  state.barrelId = barrel.id;
  if (!state.ownedBarrels.includes(barrel.id)) state.ownedBarrels.push(barrel.id);
  entry.sold = true;
  pushLog(state, `换上「${barrel.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, barrel, price };
}

export function buyItem(state, index) {
  const item = shopEntry(state, 'item', index);
  if (!item) return { ok: false, error: '这件物品已经售出。' };
  const entry = state.shop.item[index];
  if (item.type === 'active' && state.activeItems.length >= ACTIVE_ITEM_SLOTS) {
    return { ok: false, error: `主动物品栏已满（${ACTIVE_ITEM_SLOTS}）。` };
  }
  const price = shopPrice(state, item.price);
  if (state.coins < price) return { ok: false, error: `需要 ${price} 银币。` };
  state.coins -= price;
  if (item.type === 'active') {
    state.activeItems.push(item.id);
    state.itemCharges[item.id] = item.charges;
  } else {
    state.passiveItems.push(item.id);
    if (item.id === 'dice_bag') syncBag(state);
  }
  entry.sold = true;
  pushLog(state, `购入「${item.name}」，花费 ${price} 银币。`, 'shop');
  return { ok: true, item, price };
}

export function leaveShop(state) {
  if (state.phase !== 'shop') return { ok: false, error: '你不在商店。' };
  if (state.level >= LEVEL_COUNT) return { ok: false, error: '已经是最后一关。' };
  state.shop = null;
  state.level += 1;
  initLevel(state);
  return { ok: true };
}

export function runSummary(state) {
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

export function explainTarget(state) {
  const base = getLevelConfig(state.level).target;
  const reasons = [];
  if (hasSetTier(state, 'astral', 2)) reasons.push({ label: '星穹 2 件', value: -Math.round(base * 0.1) });
  if (state.flags.charm) reasons.push({ label: '赌徒护符', value: `目标降至 ${state.target}` });
  return { base, target: state.target, reasons };
}

export function getOpponentInfo(state) {
  return getOpponent(state.level);
}

export function tableInfo(state) {
  return getTable(state.level);
}

export function chapterInfo(level) {
  return chapterForLevel(level);
}

export { DICE, ITEMS, BARRELS, BOSSES, LEVELS, STANDARD_DIE, RARITIES, DICE_SETS };
