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
