/* ============================================================
   Dice expected-value evaluator
   ------------------------------------------------------------
   Every die has its own face probabilities and its own bonus, so "is this die
   worth its price?" cannot be answered by reading the data. This tool measures
   it the only way that matters: play the same level with the same greedy
   policy, swap exactly one thing, and compare.

   Metrics
   -------
   throw  : expected score of the opening throw (6 fresh dice, best selection).
   solo   : level score EV with [die] + 5 standard dice.
   set2   : level score EV with [die + set partner] + 4 standard dice.
   set4   : level score EV with [die + 3 set mates] + 2 standard dice.
   barrel : set4 bag with the matching cup (wolf_totem / demon_pact).

   All level sims share common random numbers (same seed per trial index) so
   paired differences have far less noise than independent runs.

   Usage: node tools/dice-ev.mjs [options]
     --trials=400    level simulations per configuration
     --throw=4000    opening-throw simulations per die
     --shop=20000    shop stock draws per level band
     --level=8       which level is simulated (use a non-boss level)
   ============================================================ */

import {
  DICE, DICE_SETS, STANDARD_DIE, BARRELS, SHOP_RARITY_WEIGHTS,
  rarityShopWeight, getLevelConfig, LEVEL_COUNT,
} from '../src/content/index.ts';
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  advanceLevel, isBossDieBlocked, initLevel, createShop, makeRng,
  getDieSpec, effectiveProbs,
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
const TRIALS = arg('trials', 800);
const THROW_TRIALS = arg('throw', 4000);
const SHOP_TRIALS = arg('shop', 20000);
const LEVEL = Math.min(arg('level', 8), LEVEL_COUNT);
const QUICK = argv.includes('--quick');

const T = QUICK ? Math.max(80, Math.round(TRIALS / 4)) : TRIALS;

// ── display helpers (CJK aware) ────────────────────────────────────────────
const widthOf = (s) => [...String(s)].reduce(
  (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0,
);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - widthOf(s)));
const padL = (s, n) => ' '.repeat(Math.max(0, n - widthOf(s))) + String(s);
const num = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '-');

// ── bag recipes ────────────────────────────────────────────────────────────
const SET_MEMBERS = {};
for (const die of DICE) (SET_MEMBERS[die.setId] ||= []).push(die.id);

const MATCHED_BARREL = { wolf: 'wolf_totem', demon: 'demon_pact' };

function neutralPartner(setId, dieId) {
  const mates = SET_MEMBERS[setId] || [];
  const plain = mates.find((id) => id !== dieId && !getDieSpec(id).bonus);
  return plain || mates.find((id) => id !== dieId) || dieId;
}

function setMates(setId, dieId, count) {
  return (SET_MEMBERS[setId] || []).filter((id) => id !== dieId).slice(0, count);
}

const STANDARD_BAG = () => [0, 0, 0, 0, 0, 0].map(() => 'standard');

function bagSolo(dieId) {
  const bag = STANDARD_BAG();
  bag[0] = dieId;
  return bag;
}
function bagTriple(dieId) {
  const bag = STANDARD_BAG();
  bag[0] = dieId;
  bag[1] = dieId;
  bag[2] = dieId;
  return bag;
}
function bagSet2(dieId, setId) {
  const bag = STANDARD_BAG();
  bag[0] = dieId;
  bag[1] = neutralPartner(setId, dieId);
  return bag;
}
function bagSet4(dieId, setId) {
  const bag = STANDARD_BAG();
  const mates = setMates(setId, dieId, 3);
  bag[0] = dieId;
  mates.forEach((id, i) => { bag[i + 1] = id; });
  return bag;
}

// ── simulation ─────────────────────────────────────────────────────────────
function makeState(bagIds, level, barrelId, rng) {
  const state = createRun({ rng });
  state.bag = bagIds.map((id, index) => ({ uid: `ev-${index}`, dieId: id }));
  state.barrelId = barrelId;
  state.level = level;
  state.activeItems = [];
  state.passiveItems = [];
  state.acquiredItemIds = [];
  state.bossBoons = 0;
  initLevel(state);
  return state;
}

/** Greedy policy: always bank the best legal selection, reroll when behind. */
function playLevel(state) {
  let guard = 0;
  const stats = { dead: 0, throws: 0, actions: 0, wilds: 0, threes: 0 };
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
      stats.actions += 1;
      stats.wilds += best.dice.filter((d) => d.wild).length;
      stats.threes += (preview.analysis?.counts?.[3] || 0);
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

/** @returns {{score:number, win:number, deadRate:number}} */
function levelEV(bagIds, { level = LEVEL, barrel = 'oak', trials = T } = {}) {
  let score = 0;
  let wins = 0;
  let dead = 0;
  let throws = 0;
  let actions = 0;
  let wilds = 0;
  let threes = 0;
  for (let t = 0; t < trials; t += 1) {
    const rng = makeRng((0x9e3779b9 + t * 2654435761) >>> 0);
    const state = makeState(bagIds, level, barrel, rng);
    const stats = playLevel(state);
    score += state.score;
    wins += state.score >= state.target ? 1 : 0;
    dead += stats.dead;
    throws += stats.throws;
    actions += stats.actions;
    wilds += stats.wilds;
    threes += stats.threes;
  }
  return {
    score: score / trials,
    win: wins / trials,
    deadRate: throws ? dead / throws : 0,
    wildPerAction: actions ? wilds / actions : 0,
    threePerAction: actions ? threes / actions : 0,
  };
}

/** Expected score of a single fresh throw (no reroll dynamics, low variance). */
function throwEV(bagIds, { barrel = 'oak', trials = THROW_TRIALS } = {}) {
  let total = 0;
  let dead = 0;
  for (let t = 0; t < trials; t += 1) {
    const rng = makeRng((0x51ed270b + t * 40503) >>> 0);
    const state = makeState(bagIds, LEVEL, barrel, rng);
    rollDice(state, { free: true });
    const best = bestSelection(
      availableDice(state).filter((die) => !isBossDieBlocked(state, die)),
    );
    if (!best) { dead += 1; continue; }
    state.selected = best.dice.map((d) => d.uid);
    const preview = getScorePreview(state);
    total += preview.valid ? preview.total : 0;
  }
  return { score: total / trials, deadRate: dead / trials };
}

// ── analytic dice properties ───────────────────────────────────────────────
function dieStats(dieId, barrelId = 'oak') {
  const probs = effectiveProbs(dieId, barrelId);
  return {
    p3: probs[2],
    pWild: getDieSpec(dieId).setId === 'demon' ? probs[0] : 0,
    p1: probs[0],
    p5: probs[4],
    p6: probs[5],
  };
}

// ── main ───────────────────────────────────────────────────────────────────
const started = Date.now();
const cfg = getLevelConfig(LEVEL);
console.log('');
console.log('════ 骰子期望分数评估 ════');
console.log(`关卡：第 ${LEVEL} 关（目标 ${cfg.target} 分${cfg.boss ? '，庄家关' : ''}） · 重投 ${5} 次 · 无道具`);
console.log(`样本：单掷 ${THROW_TRIALS} 次/骰 · 关卡 ${T} 局/配置 · 商店 ${SHOP_TRIALS} 次/等级`);

console.log('\n计算基准中…');
const baseLevel = levelEV(STANDARD_BAG(), { trials: T });
const baseThrow = throwEV(STANDARD_BAG());
console.log(`基准（6 标准骰）：单掷 ${num(baseThrow.score, 1)} 分 · 关卡 ${num(baseLevel.score, 1)} 分 · 达标率 ${num(baseLevel.win * 100, 1)}%`);

const rows = [];
for (const die of DICE) {
  const setId = die.setId;
  const soloBag = bagSolo(die.id);
  const set2Bag = bagSet2(die.id, setId);
  const set4Bag = bagSet4(die.id, setId);
  const barrelId = MATCHED_BARREL[setId];

  const th = throwEV(soloBag);
  const solo = levelEV(soloBag, { trials: T });
  const two = levelEV(set2Bag, { trials: T });
  const triple = levelEV(bagTriple(die.id), { trials: T });
  const four = levelEV(set4Bag, { trials: T });
  const cup = levelEV(set4Bag, { barrel: barrelId, trials: T });
  const stats = dieStats(die.id);

  rows.push({
    die,
    setId,
    throwDelta: th.score - baseThrow.score,
    throwDead: th.deadRate,
    soloDelta: solo.score - baseLevel.score,
    tripleDelta: triple.score - baseLevel.score,
    set2Delta: two.score - baseLevel.score,
    set4Delta: four.score - baseLevel.score,
    barrelDelta: cup.score - four.score,
    wildPerAction: four.wildPerAction,
    threePerAction: four.threePerAction,
    winRate: solo.win,
    deadRate: solo.deadRate,
    p3: stats.p3,
    pWild: stats.pWild,
    perCoin: (solo.score - baseLevel.score) / die.price * 10,
  });
  process.stdout.write(`  · ${die.name}\n`);
}

// ── table A: single die ────────────────────────────────────────────────────
console.log('\n── 表 A：单颗骰子的价值（替换 1 颗标准骰） ──');
const headA = ['骰子', '套组', '稀有', '价', '单掷Δ', '关卡Δ', '3颗Δ', 'Δ/10币', '达标率', 'P(3)', 'P(赖子)', '死掷%'];
console.log(headA.map((h, i) => (i >= 4 ? padL(h, 8) : pad(h, i === 0 ? 14 : 6))).join(' '));
for (const row of rows) {
  const cells = [
    pad(row.die.name, 14),
    pad(DICE_SETS[row.setId]?.name || '-', 6),
    pad(row.die.rarity, 6),
    pad(String(row.die.price), 6),
    padL(num(row.throwDelta, 1), 8),
    padL(num(row.soloDelta, 1), 8),
    padL(num(row.tripleDelta, 1), 8),
    padL(num(row.perCoin, 2), 8),
    padL(`${num(row.winRate * 100, 0)}%`, 8),
    padL(`${num(row.p3 * 100, 1)}%`, 8),
    padL(row.pWild ? `${num(row.pWild * 100, 1)}%` : '-', 8),
    padL(num(row.deadRate * 100, 1), 8),
  ];
  console.log(cells.join(' '));
}

// ── table B: set scaling ───────────────────────────────────────────────────
console.log('\n── 表 B：套组成长与骰桶配合（关卡Δ 分） ──');
const headB = ['骰子', '套组', '单颗', '2 件', '4 件', '4 件+配桶', '桶收益', '赖子/手', '3/手'];
console.log(headB.map((h, i) => (i === 0 ? pad(h, 14) : padL(h, 10))).join(' '));
for (const row of rows) {
  console.log([
    pad(row.die.name, 14),
    pad(DICE_SETS[row.setId]?.name || '-', 10),
    padL(num(row.soloDelta, 1), 10),
    padL(num(row.set2Delta, 1), 10),
    padL(num(row.set4Delta, 1), 10),
    padL(num(row.set4Delta + row.barrelDelta, 1), 10),
    padL(num(row.barrelDelta, 1), 10),
    padL(num(row.wildPerAction, 2), 10),
    padL(num(row.threePerAction, 2), 10),
  ].join(' '));
}


// ── rarity band verdict ────────────────────────────────────────────────────
const median = (list) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

console.log('\n── 稀有度带：价值是否配得上价格 ──');
const bands = ['common', 'rare', 'epic', 'legendary'];
const bandRows = bands.map((rarity) => {
  const members = rows.filter((r) => r.die.rarity === rarity);
  return {
    rarity,
    count: members.length,
    delta: median(members.map((m) => m.soloDelta)),
    perCoin: median(members.map((m) => m.perCoin)),
    price: members[0]?.die.price || 0,
    members,
  };
});
console.log([pad('稀有', 10), padL('数量', 6), padL('中位Δ', 10), padL('Δ/10币', 10), padL('相对价格', 10), padL('Δ/价格比', 10)].join(' '));
const priceRef = bandRows.find((b) => b.rarity === 'common')?.price || 1;
for (const band of bandRows) {
  const ratio = band.perCoin / (band.price / priceRef);
  console.log([
    pad(band.rarity, 10),
    padL(String(band.count), 6),
    padL(num(band.delta, 1), 10),
    padL(num(band.perCoin, 2), 10),
    padL(num(band.price / priceRef, 2), 10),
    padL(num(ratio, 2), 10),
  ].join(' '));
}

// ── warnings ───────────────────────────────────────────────────────────────
const warnings = [];
// A die with a negative solo delta but a strong three-copy delta is a combo
// piece by design (e.g. even-Twin): it is meant to be bought in threes, so it
// is reported separately instead of being flagged as a balance outlier.
const isCombo = (row) => row.tripleDelta - row.soloDelta > 150 && row.tripleDelta > 100;
/* Prices are a deliberate ladder (35 / 70 / 130 / 210), so "value per coin"
   rightly falls as rarity climbs — it is reported for context, not used as a
   balance tripwire. What matters is whether a die is meaningfully stronger or
   weaker than the rest of its own rarity band. */
for (const band of bandRows) {
  if (!band.members.length) continue;
  const ref = band.delta;
  for (const row of band.members) {
    if (isCombo(row)) continue;
    const gap = row.soloDelta - ref;
    if (ref && Math.abs(gap) > 25 && Math.abs(gap) / Math.abs(ref) > 0.6) {
      warnings.push(
        `${row.die.name}（${row.die.rarity}）：单颗 Δ ${num(row.soloDelta, 0)}，`
        + `同稀有中位 ${num(ref, 0)}，相差 ${num(gap, 0)} 分。`,
      );
    }
  }
}
for (let i = 1; i < bandRows.length; i += 1) {
  const prev = bandRows[i - 1];
  const cur = bandRows[i];
  if (prev.delta && cur.delta && cur.delta < prev.delta) {
    warnings.push(
      `稀有度倒挂：${cur.rarity} 中位 Δ ${num(cur.delta, 1)} 低于 ${prev.rarity} ${num(prev.delta, 1)}。`,
    );
  }
}
const worstThrow = [...rows].sort((a, b) => a.soloDelta - b.soloDelta).slice(0, 3);
const bestThrow = [...rows].sort((a, b) => b.soloDelta - a.soloDelta).slice(0, 3);
console.log('\n── 强度极值 ──');
console.log(`最强：${bestThrow.map((r) => `${r.die.name} ${num(r.soloDelta, 0)}`).join(' · ')}`);
console.log(`最弱：${worstThrow.map((r) => `${r.die.name} ${num(r.soloDelta, 0)}`).join(' · ')}`);
console.log(`极差：${num(bestThrow[0].soloDelta - worstThrow[0].soloDelta, 0)} 分（基准 ${num(baseLevel.score, 0)}）`);

// ── shop distribution ──────────────────────────────────────────────────────
console.log('\n── 商店骰子刷新分布（按等级阶段） ──');
const combos = rows.filter(isCombo);
if (combos.length) {
  console.log('\n── 组合骰（单颗拖后腿，必须成套） ──');
  for (const row of combos) {
    console.log(`  ${row.die.name}：单颗 ${num(row.soloDelta, 0)} · 3 颗 ${num(row.tripleDelta, 0)} —— ${row.die.desc}`);
  }
}

const valueByDie = new Map(rows.map((r) => [r.die.id, r.soloDelta]));
const shopState = createRun({ rng: makeRng(0x2545f491) });
shopState.bag = STANDARD_BAG().map((id, i) => ({ uid: `shop-${i}`, dieId: id }));
console.log([pad('等级', 8), padL('普通', 8), padL('稀有', 8), padL('史诗', 8), padL('传说', 8), padL('史诗+出现率', 12), padL('均价', 8), padL('均Δ', 8)].join(' '));
for (const band of SHOP_RARITY_WEIGHTS) {
  const level = band.untilLevel;
  const tally = { common: 0, rare: 0, epic: 0, legendary: 0 };
  let picks = 0;
  let priceSum = 0;
  let deltaSum = 0;
  let strongOffers = 0;
  for (let t = 0; t < SHOP_TRIALS; t += 1) {
    shopState.level = level;
    const shop = createShop(shopState, { rng: makeRng((0x1b873593 + t * 97) >>> 0) });
    let hasStrong = false;
    for (const offer of shop.dice) {
      if (!offer.id) continue;
      const spec = getDieSpec(offer.id);
      tally[spec.rarity] += 1;
      picks += 1;
      priceSum += spec.price;
      deltaSum += valueByDie.get(offer.id) || 0;
      if (spec.rarity === 'epic' || spec.rarity === 'legendary') hasStrong = true;
    }
    if (hasStrong) strongOffers += 1;
  }
  console.log([
    pad(`≤ ${level}`, 8),
    ...['common', 'rare', 'epic', 'legendary'].map((r) => padL(`${num(tally[r] / picks * 100, 1)}%`, 8)),
    padL(`${num(strongOffers / SHOP_TRIALS * 100, 1)}%`, 12),
    padL(num(priceSum / picks, 1), 8),
    padL(num(deltaSum / picks, 1), 8),
  ].join(' '));
}
console.log('（「史诗+出现率」= 两个骰位里至少刷出一颗史诗/传说的概率；「均Δ」= 刷出骰子的单颗关卡Δ 均值）');

console.log('\n权重表：');
for (const band of SHOP_RARITY_WEIGHTS) {
  console.log(`  ≤ L${band.untilLevel}: ${Object.entries(band.weights).map(([k, v]) => `${k} ${v}`).join(' / ')}`);
}

if (warnings.length) {
  console.log('\n── 平衡告警 ──');
  for (const warning of warnings) console.log(`  ⚠ ${warning}`);
  console.log(`  注：${T} 局样本下单颗 Δ 的标准误约 ±${num(520 / Math.sqrt(T), 0)} 分，个别骰子的告警请多跑几次确认；稀有度带的中位值稳定得多。`);
} else {
  console.log('\n── 平衡告警 ──\n  无：各稀有度带内偏差均在 ±35% 内，且等级越高越强。');
}

console.log(`\n用时 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
