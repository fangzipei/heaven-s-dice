/* ============================================================
   Dice value calculator — 四轴综合收益评估
   ------------------------------------------------------------
   dice-ev.mjs answers "how strong is this die". This tool answers
   the buying question: strong AND affordable AND findable. Per die,
   bag = [die] + 5 standard vs the 6-standard baseline, paired RNG:

   strength : level score Δ at snapshot levels (non-boss, one per
              shop rarity band).
   money    : per-level coin EV Δ measured from what awardLevel
              actually credits (win × reward + spare-reroll refund
              + overshoot + coin effects), payback levels, net gain
              over the remaining run.
   access   : appearance rate per shop visit via real createShop
              Monte Carlo (rarity bands, demon ×0.5, owned-set ×1.5,
              unique filtering all included), expected shops and
              expected acquisition cost (base refresh 20 each).
   composite: min-max normalized strength/money/access blend
              (default 50/30/20) → S/A/B/C grade.

   Usage: node tools/dice-value.mjs [options]
     --trials=600    level simulations per configuration
     --shop=20000    shop draws per snapshot level
     --level=9       reference level for money/access columns
     --w=50,30,20    composite weights: strength, money, access
     --bag=a,b,c     evaluate an arbitrary bag instead of the roster
     --die=id        restrict the roster to one die
     --rarity=...    restrict the roster to one rarity
     --quick         quarter the sample counts
     --json          machine-readable output
   ============================================================ */

import { DICE, DICE_SETS, LEVEL_COUNT, getLevelConfig } from '../src/content/index.ts';
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  advanceLevel, isBossDieBlocked, initLevel, createShop, makeRng,
  getDieSpec, BASE_REROLLS,
} from '../src/core/engine.ts';
import { bestSelection } from '../src/core/scoring.ts';

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split('=')[1]);
  return Number.isFinite(value) ? value : fallback;
}
function argStr(name, fallback) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}
const TRIALS = arg('trials', 600);
const SHOP_TRIALS = arg('shop', 20000);
const QUICK = argv.includes('--quick');
const JSON_OUT = argv.includes('--json');
const REF_LEVEL = Math.min(Math.max(arg('level', 9), 1), LEVEL_COUNT);
const WEIGHTS = argStr('w', '50,30,20').split(',').map(Number);
const BAG_ARG = argStr('bag', '');
const DIE_FILTER = argStr('die', '');
const RARITY = argStr('rarity', '');
const T = QUICK ? Math.max(60, Math.round(TRIALS / 4)) : TRIALS;
if (WEIGHTS.length !== 3 || WEIGHTS.some((v) => !Number.isFinite(v))) {
  console.error('--w 需要三个数字，如 --w=50,30,20');
  process.exit(1);
}

/** Non-boss snapshots, one per shop rarity band (≤6/≤12/≤18/≤24). */
const SNAPSHOT_LEVELS = [...new Set([4, 9, 13, 18, 23, REF_LEVEL])].sort((a, b) => a - b);

// ── display helpers (CJK aware) ────────────────────────────────────────────
const widthOf = (s) => [...String(s)].reduce(
  (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0,
);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - widthOf(s)));
const padL = (s, n) => ' '.repeat(Math.max(0, n - widthOf(s))) + String(s);
const num = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '-');

// ── bag recipes ────────────────────────────────────────────────────────────
const STANDARD_BAG = () => [0, 0, 0, 0, 0, 0].map(() => 'standard');
function bagSolo(dieId) {
  const bag = STANDARD_BAG();
  bag[0] = dieId;
  return bag;
}

// ── simulation ─────────────────────────────────────────────────────────────
function makeState(bagIds, level, rng) {
  const state = createRun({ rng });
  state.bag = bagIds.map((id, index) => ({ uid: `dv-${index}`, dieId: id }));
  state.level = level;
  state.activeItems = [];
  state.passiveItems = [];
  state.acquiredItemIds = [];
  initLevel(state);
  // Zeroing here means state.coins after a won level is exactly what
  // awardLevel credited: reward + reroll refund + overshoot + coin effects.
  state.coins = 0;
  return state;
}

/** Greedy policy: always bank the best legal selection, reroll when behind. */
function playLevel(state) {
  let guard = 0;
  const stats = { dead: 0, throws: 0 };
  while (!['won', 'run-won', 'lost'].includes(state.phase) && guard++ < 200) {
    if (state.score >= state.target) {
      if (!advanceLevel(state).ok) break;
      break;
    }
    if (['ready', 'dead', 'hot'].includes(state.phase)) {
      const free = state.phase === 'hot';
      const before = state.phase;
      const result = rollDice(state, { free });
      if (!result.ok) break;
      stats.throws += 1;
      if (state.phase === 'dead' && before !== 'dead') stats.dead += 1;
      continue;
    }
    if (state.phase === 'selecting') {
      const best = bestSelection(
        availableDice(state).filter((die) => !isBossDieBlocked(state, die)),
      );
      if (!best) { state.phase = 'dead'; continue; }
      state.selected = best.dice.map((d) => d.uid);
      const preview = getScorePreview(state);
      if (!preview.valid) break;
      const needTarget = state.score + preview.totalContinue >= state.target;
      const action = state.rerolls <= 0
        ? 'bank'
        : (needTarget || preview.totalContinue >= preview.totalReroll) ? 'continue' : 'reroll';
      const result = applyScore(state, action);
      if (!result.ok) break;
      if (state.phase === 'reroll-pending' && !rollDice(state).ok) break;
      continue;
    }
    if (state.phase === 'reroll-pending') {
      if (!rollDice(state).ok) break;
      continue;
    }
    break;
  }
  return stats;
}

/** @returns {{score:number, win:number, coins:number, deadRate:number}} */
function levelEV(bagIds, { level, trials = T } = {}) {
  let score = 0;
  let wins = 0;
  let coins = 0;
  let dead = 0;
  let throws = 0;
  for (let t = 0; t < trials; t += 1) {
    const rng = makeRng((0x9e3779b9 + t * 2654435761) >>> 0);
    const state = makeState(bagIds, level, rng);
    const stats = playLevel(state);
    score += state.score;
    wins += state.score >= state.target ? 1 : 0;
    coins += state.coins;
    dead += stats.dead;
    throws += stats.throws;
  }
  return {
    score: score / trials,
    win: wins / trials,
    coins: coins / trials,
    deadRate: throws ? dead / throws : 0,
  };
}

// ── main ───────────────────────────────────────────────────────────────────
const started = Date.now();
const ROSTER = DICE.filter((die) => (!DIE_FILTER || die.id === DIE_FILTER)
  && (!RARITY || die.rarity === RARITY));

if (!JSON_OUT) {
  console.log('');
  console.log('════ 骰子综合价值评估 ════');
  console.log(`快照关卡：${SNAPSHOT_LEVELS.join(' / ')} · 参考关 L${REF_LEVEL} · 重投 ${BASE_REROLLS} 次 · 无道具 · 骰桶橡木`);
  console.log(`样本：关卡 ${T} 局/配置 · 商店 ${SHOP_TRIALS} 次/快照 · 综合权重 ${WEIGHTS.join('/')}`);
  console.log('\n计算基准中…');
}

const baseByLevel = new Map();
for (const level of SNAPSHOT_LEVELS) {
  baseByLevel.set(level, levelEV(STANDARD_BAG(), { level }));
  const base = baseByLevel.get(level);
  if (!JSON_OUT) {
    const cfg = getLevelConfig(level);
    console.log(
      `  L${padL(level, 2)}（目标 ${num(cfg.target)} · 赏金 ${num(cfg.reward)}）：`
      + `基准分 ${num(base.score, 1)} · 达标率 ${num(base.win * 100, 1)}% · 金币/关 ${num(base.coins, 1)}`,
    );
  }
}

// ── roster sweep ───────────────────────────────────────────────────────────
const rows = [];
for (const die of ROSTER) {
  const deltas = {};
  const wins = {};
  const coinDeltas = {};
  const deadRates = {};
  for (const level of SNAPSHOT_LEVELS) {
    const ev = levelEV(bagSolo(die.id), { level });
    const base = baseByLevel.get(level);
    deltas[level] = ev.score - base.score;
    wins[level] = ev.win;
    coinDeltas[level] = ev.coins - base.coins;
    deadRates[level] = ev.deadRate;
  }
  rows.push({ die, deltas, wins, coinDeltas, deadRates });
  if (!JSON_OUT) process.stdout.write(`  · ${die.name}\n`);
}

// ── table A: strength ──────────────────────────────────────────────────────
if (!JSON_OUT) {
  console.log('\n── 表 A：强度 · 关卡分 Δ（bag = 该骰 + 5 标准 vs 6 标准） ──');
  const head = ['骰子', '套组', '稀有', '价', ...SNAPSHOT_LEVELS.map((l) => `ΔL${l}`), `达标%@L${REF_LEVEL}`, `死掷%@L${REF_LEVEL}`];
  console.log([
    pad(head[0], 14), pad(head[1], 8), pad(head[2], 6), padL(head[3], 5),
    ...head.slice(4, -2).map((h) => padL(h, 8)),
    padL(head.at(-2), 11), padL(head.at(-1), 11),
  ].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      pad(DICE_SETS[row.die.setId]?.name || '-', 8),
      pad(row.die.rarity, 6),
      padL(String(row.die.price), 5),
      ...SNAPSHOT_LEVELS.map((l) => padL(num(row.deltas[l], 0), 8)),
      padL(`${num(row.wins[REF_LEVEL] * 100, 0)}%`, 11),
      padL(num(row.deadRates[REF_LEVEL] * 100, 1), 11),
    ].join(' '));
  }
}

// ── money axis ─────────────────────────────────────────────────────────────
/** Each snapshot level stands for its ~5-level chapter of the run. */
const CHAPTER_SPAN = 5;
for (const row of rows) {
  const refCoin = row.coinDeltas[REF_LEVEL];
  row.coinPerLevel = refCoin;
  row.payback = refCoin > 0 ? row.die.price / refCoin : Infinity;
  row.netGain = SNAPSHOT_LEVELS
    .filter((l) => l >= REF_LEVEL)
    .reduce((sum, l) => sum + row.coinDeltas[l] * CHAPTER_SPAN, 0) - row.die.price;
}

if (!JSON_OUT) {
  console.log('\n── 表 B：金钱 · 每关金币 EV Δ（含达标率、重投折算、超额奖励） ──');
  console.log([pad('骰子', 14), padL('金币Δ/关', 10), padL('回本关数', 10), padL('剩余净收益', 12), padL('价格', 8)].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      padL(num(row.coinPerLevel, 1), 10),
      padL(Number.isFinite(row.payback) ? num(row.payback, 1) : '∞', 10),
      padL(num(row.netGain, 0), 12),
      padL(String(row.die.price), 8),
    ].join(' '));
  }
  console.log(`  （金币Δ = [骰+5标准] 金币 EV − 基准金币 EV @L${REF_LEVEL}；剩余净收益 = Σ(快照金币Δ × ${CHAPTER_SPAN}) − 价格）`);
}

// ── access axis ────────────────────────────────────────────────────────────
/** Appearance rate per shop visit, from the real shop generator so rarity
    bands, the demon ×0.5 penalty, owned-set ×1.5 nudge and unique filtering
    are all in the measurement. Bag = [die]+5 standard: the die itself is
    not owned yet, and set nudge is off (no set member in the baseline bag). */
function appearanceCounts(bagIds) {
  const shopState = createRun({ rng: makeRng(0x2545f491) });
  shopState.bag = bagIds.map((id, index) => ({ uid: `shop-${index}`, dieId: id }));
  shopState.activeItems = [];
  shopState.passiveItems = [];
  shopState.acquiredItemIds = [];
  const perLevel = new Map();
  let shelfFill = 0;
  for (const level of SNAPSHOT_LEVELS) {
    const hits = new Map();
    for (let t = 0; t < SHOP_TRIALS; t += 1) {
      shopState.level = level;
      const shop = createShop(shopState, { rng: makeRng((0x1b873593 + t * 97 + level * 7919) >>> 0) });
      for (const offer of shop.dice) {
        if (!offer.id) continue;
        shelfFill += 1;
        hits.set(offer.id, (hits.get(offer.id) || 0) + 1);
      }
    }
    perLevel.set(level, hits);
  }
  return { perLevel, shelfFill };
}

const mc = appearanceCounts(STANDARD_BAG());
for (const row of rows) {
  row.access = {};
  for (const level of SNAPSHOT_LEVELS) {
    row.access[level] = (mc.perLevel.get(level).get(row.die.id) || 0) / SHOP_TRIALS;
  }
  const p = row.access[REF_LEVEL] || 0;
  row.visitP = p;
  row.expectedShops = p > 0 ? 1 / p : Infinity;
  // Assume the player waits one free shelf per level and buys one extra
  // base-priced refresh (20 coins) per additional shop needed.
  row.acquisitionCost = row.die.price + 20 * Math.max(0, row.expectedShops - 1);
}

if (!JSON_OUT) {
  console.log('\n── 表 C：获取 · 每店出现率（真实商店蒙特卡洛） ──');
  const cols = SNAPSHOT_LEVELS.map((l) => `P@L${l}`);
  console.log([pad('骰子', 14), pad('稀有', 6), ...cols.map((c) => padL(c, 8)), padL('期望店数', 10), padL('期望成本', 10)].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      pad(row.die.rarity, 6),
      ...SNAPSHOT_LEVELS.map((l) => padL(`${num((row.access[l] || 0) * 100, 2)}%`, 8)),
      padL(Number.isFinite(row.expectedShops) ? num(row.expectedShops, 1) : '∞', 10),
      padL(num(row.acquisitionCost, 0), 10),
    ].join(' '));
  }
  console.log('  （期望成本 = 价格 + 20 × (期望店数 − 1)，假设每店最多多刷一次基价货架）');
}
