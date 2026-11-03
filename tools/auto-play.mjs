/*

 * Headless playtest runner, v2.

 *

 * The old bot picked the highest-scoring selection and compared two point

 * totals. This one asks a different question at every decision: "which action

 * maximises the probability of clearing this level? - because in this game
 * the free "score and continue" reroll keeps the whole round at risk, while
 * spends a token to lock it in. That trade is the entire game, so it is worth

 * solving instead of guessing.

 *

 * The solver is a small DP over (dice still to roll, rerolls left, points still

 * needed). Outcome distributions for 1..7 dice are exact (every multiset with

 * its multinomial weight), so no sampling noise. State is cached globally and

 * shared by every run in the process.

 *

 * Examples:

 *   node tools/auto-play.mjs --runs=500 --seed=20261027

 *   node tools/auto-play.mjs --runs=2000 --json --quiet

 */

import {

  createRun, rollDice, applyScore, getScorePreview, availableDice,

  initLevel, createShop, buyDie, buyBarrel, buyItem, leaveShop,

  getDiceCapacity, useItem, applyItemGrant, applyGesture, getBarrel, shopPrice,

  advanceLevel, makeRng, isBossDieBlocked, resolveSaltOffer, resolveLoanOffer,

  getDieSpec, effectiveProbs, currentScoringOptions,

} from '../src/core/engine.ts';

import { bestSelection } from '../src/core/scoring.ts';

import {

  LEVELS, DICE_BY_ID, ITEM_BY_ID, BARREL_BY_ID, STANDARD_DIE,

} from '../src/content/index.ts';



const argv = process.argv.slice(2);

const numberArg = (name, fallback) => {

  const hit = argv.find((arg) => arg.startsWith(`--${name}=`));

  if (!hit) return fallback;

  const value = Number(hit.slice(name.length + 3));

  return Number.isFinite(value) ? value : fallback;

};

const RUNS = Math.max(1, Math.floor(numberArg('runs', 500)));

const START_SEED = numberArg('seed', 20261027) >>> 0;

const MAX_STEPS = Math.max(40, Math.floor(numberArg('max-steps', 240)));

// Winning runs lock a hand in far more often than a pure EV maximiser does;

// this margin lets the bot prefer the secure line by a small probability edge.

const RISK_MARGIN = numberArg('risk', 0);

const JSON_OUTPUT = argv.includes('--json');

const QUIET = argv.includes('--quiet') || JSON_OUTPUT;



const RARITY = { common: 0, rare: 1, epic: 2, legendary: 3 };

const ACTIONS = { continue: 0, reroll: 0, bank: 0 };



/* ------------------------------------------------------------------ *

 * Exact outcome distributions

 *

 * For n dice, group every roll by its multiset. `bestSelection` gives the

 * highest-scoring legal pick and how many dice it consumes, so the DP only

 * needs (points, used) pairs weighted by probability.

 * ------------------------------------------------------------------ */

function multisetWeights(n) {

  const out = [];

  const counts = Array(7).fill(0);

  const walk = (face, left) => {

    if (face === 6) {

      counts[6] = left;

      // multinomial coefficient n! / prod(count!)

      let coeff = factorial(n);

      for (let f = 1; f <= 6; f += 1) coeff /= factorial(counts[f]);

      out.push({ counts: [...counts], ways: coeff });

      return;

    }

    for (let c = 0; c <= left; c += 1) {

      counts[face] = c;

      walk(face + 1, left - c);

    }

    counts[face] = 0;

  };

  walk(1, n);

  return out;

}



const FACT = [1];

function factorial(n) {

  for (let i = FACT.length; i <= n; i += 1) FACT[i] = FACT[i - 1] * i;

  return FACT[n];

}



function optionKey(options) {

  return JSON.stringify([options.singleFaces || [1, 5], options.singlePoints || {}, Boolean(options.allowPairs)]);

}



function buildDistribution(n, options) {

  const total = 6 ** n;

  const pairs = new Map(); // "q|k" -> weight

  let bust = 0;

  for (const { counts, ways } of multisetWeights(n)) {

    const dice = [];

    for (let face = 1; face <= 6; face += 1) {

      for (let i = 0; i < counts[face]; i += 1) {

        dice.push({ uid: `d${dice.length}`, value: face, wild: false, blank: false });

      }

    }

    const best = bestSelection(dice, options);

    if (!best || best.analysis.base <= 0) {

      bust += ways;

      continue;

    }

    const key = `${best.analysis.base}|${best.dice.length}`;

    pairs.set(key, (pairs.get(key) || 0) + ways);

  }

  const outcomes = [...pairs.entries()].map(([key, ways]) => {

    const [q, k] = key.split('|').map(Number);

    return { q, k, p: ways / total };

  });

  return { outcomes, bust: bust / total };

}



const DIST_CACHE = new Map(); // optionKey -> [null, dist1..dist7]



function distributions(options) {

  const key = optionKey(options);

  let cached = DIST_CACHE.get(key);

  if (!cached) {

    cached = [null];

    for (let n = 1; n <= 7; n += 1) cached[n] = buildDistribution(n, options);

    DIST_CACHE.set(key, cached);

  }

  return cached;

}



/* ------------------------------------------------------------------ *

 * DP: probability of clearing, given dice to roll / rerolls / points short

 * ------------------------------------------------------------------ */

const BUCKET = 50; // every scoring hand is worth at least 50

const memo = new Map();

const MAX_GAP = 120000;



function clearProb(n, rerolls, gap, dist, variant) {

  if (gap <= 0) return 1;

  if (gap > MAX_GAP) gap = MAX_GAP;

  const bucket = Math.ceil(gap / BUCKET) * BUCKET;

  const dice = n <= 0 ? 6 : Math.min(7, n);

  const key = `${variant}|${dice}|${rerolls}|${bucket}`;

  const hit = memo.get(key);

  if (hit !== undefined) return hit;

  // guard against cycles: assume failure until the deeper state is known

  memo.set(key, 0);

  const { outcomes } = dist[dice];

  let sum = 0;

  for (const { q, k, p } of outcomes) {

    const nextGap = bucket - q;

    const continueValue = clearProb(k === 0 ? 6 : k, rerolls, nextGap, dist, variant);

    const bankValue = rerolls > 0

      ? clearProb(6, rerolls - 1, nextGap, dist, variant)

      : (nextGap <= 0 ? 1 : 0);

    sum += p * Math.max(continueValue, bankValue);

  }

  memo.set(key, sum);

  return sum;

}



/* ------------------------------------------------------------------ *

 * Dice valuation, calibrated against the winning runs

 * ------------------------------------------------------------------ */

const DIE_VALUE = {

  chain_note: 3.15, merchant: 4.0, balance: 2.54, hex: 2.49, five_fold: 1.6,

  ace: 3.17, even_twin: 2.53, refrain: 2.45, aftershock: 2.5, wolf_ancestor: 2.82,

  bias_five: 1.77, last_road: 1.66, bias_one: 1.59, mirror: 1.5, polar: 1.48,

  echo: 1.33, bias_six: 1.28, cliff: 1.24, odd_eye: 1.21, bias_two: 1.2,

  shadow: 1.11, scavenger: 1.06, demon_taxman: 1.06, gilded_trace: 0.93,

  ladder: 0.9, jack: 0.68, pilgrim: 0.65, demon_imp: 0.58, bias_three: 0.6,

  bias_four: 0.57, wolf_alpha: 0.65, wolf_bloodmoon: 0.63, wolf_whelp: 0.49,

  demon_queen: 1.6, demon_devourer: 2.2, demon_seal: 1.3,

};



function dieValue(id) {

  if (id === 'standard') return 1.0;

  if (DIE_VALUE[id]) return DIE_VALUE[id];

  const spec = DICE_BY_ID[id];

  if (!spec) return 0.8;

  const probs = spec.probs || STANDARD_DIE.probs;

  const face = (probs[0] || 0) * 1.0 + (probs[4] || 0) * 0.5 + (probs[2] || 0) * 0.3;

  return 0.9 + (RARITY[spec.rarity] ?? 0) * 0.15 + face;

}



function weakestDie(run) {

  return [...run.bag].sort((a, b) => dieValue(a.dieId) - dieValue(b.dieId))[0] || null;

}



function nextIsBoss(run) {

  return Boolean(LEVELS[run.level]?.boss);

}



function bagAverage(run) {

  if (!run.bag.length) return 1;

  return run.bag.reduce((sum, entry) => sum + dieValue(entry.dieId), 0) / run.bag.length;

}



/* ------------------------------------------------------------------ *

 * Selection + action choice

 * ------------------------------------------------------------------ */

function candidateSelections(run, options) {

  const dice = availableDice(run).filter((die) => !isBossDieBlocked(run, die));

  const best = bestSelection(dice, options);

  if (!best) return [];

  const out = [best];

  // Dropping one scoring die can be right: it buys an extra die to reroll while

  // keeping most of the points. Evaluate the obvious variants.

  for (const drop of best.dice) {

    const rest = dice.filter((die) => die.uid !== drop.uid);

    const alt = bestSelection(rest, options);

    if (alt && alt.analysis.base > 0) out.push(alt);

  }

  const seen = new Set();

  return out.filter((entry) => {

    const key = entry.dice.map((die) => die.uid).sort().join(',');

    if (seen.has(key)) return false;

    seen.add(key);

    return true;

  }).slice(0, 8);

}



function chooseAction(run) {

  const options = currentScoringOptions(run);

  const variant = optionKey(options);

  const dist = distributions(options);

  const candidates = candidateSelections(run, options);

  if (!candidates.length) return null;

  const gap = run.target - run.score;

  const diceLeft = availableDice(run).filter((die) => !isBossDieBlocked(run, die)).length;

  let best = null;

  const previous = run.selected;

  for (const candidate of candidates) {

    run.selected = candidate.dice.map((die) => die.uid);

    const preview = getScorePreview(run);

    run.selected = previous;

    if (!preview.valid) continue;

    const q = preview.totalContinue;

    const remaining = Math.max(0, diceLeft - candidate.dice.length);

    const nextGap = gap - q;

    const continueValue = clearProb(remaining === 0 ? 6 : remaining, run.rerolls, nextGap, dist, variant);

    let action = 'continue';

    let value = continueValue;

    if (run.rerolls > 0) {

      const bankValue = clearProb(6, run.rerolls - 1, nextGap, dist, variant);

      if (bankValue + RISK_MARGIN >= value) { action = 'reroll'; value = bankValue; }

    } else if (nextGap > 0) {

      // no tokens left: settling cannot clear the level, so keep rolling

      action = 'continue';

      value = continueValue;

    }

    if (!best || value > best.value + 1e-9

        || (Math.abs(value - best.value) < 1e-9 && q > best.q)) {

      best = { action, value, q, dice: candidate.dice };

    }

  }

  return best;

}



/* ------------------------------------------------------------------ *

 * Items, gestures, shop

 * ------------------------------------------------------------------ */

function usePlannedItems(run) {

  const gap = run.target - run.score;

  if (run.itemCharges.charm && run.score === 0) useItem(run, 'charm');

  if (run.itemCharges.wager && run.score === 0) useItem(run, 'wager');

  // Courage is a whole extra reroll for this level, so spend it on the opening

  // throw rather than at the last moment.

  if (run.itemCharges.courage && run.score === 0) useItem(run, 'courage');

  // Hunter's mark doubles the next scoring hand; arm it before the first score.

  if (run.itemCharges.hunter_mark && run.score === 0) useItem(run, 'hunter_mark');

  if (run.itemCharges.blood_contract && run.level >= 10 && run.score === 0) useItem(run, 'blood_contract');

  if (run.itemCharges.boss_ward && LEVELS[run.level - 1]?.boss && run.phase === 'ready') useItem(run, 'boss_ward');

  if (run.itemCharges.lucky_coin && gap <= 250) useItem(run, 'lucky_coin');

  if (run.itemCharges.hourglass && gap <= 200) useItem(run, 'hourglass');



  for (const itemId of ['epic_chest', 'rare_pair']) {

    if (!run.itemCharges[itemId]) continue;

    const result = useItem(run, itemId);

    if (!result.grant?.candidates?.length) continue;

    const candidate = [...result.grant.candidates].sort((a, b) => dieValue(b.id) - dieValue(a.id))[0];

    const weakest = run.bag.length >= getDiceCapacity(run) ? weakestDie(run) : null;

    if (weakest && dieValue(candidate.id) <= dieValue(weakest.dieId)) continue;

    applyItemGrant(run, itemId, candidate.id, weakest?.uid || null);

  }

}



function useGestureIfUseful(run, preview = null) {

  const barrel = getBarrel(run);

  if (barrel.type !== 'gesture') return;

  if (run.flags.gestureUsedThisThrow) return;

  if (['ready', 'dead', 'hot', 'reroll-pending'].includes(run.phase)) {

    applyGesture(run, barrel.gesture);

  } else if (run.phase === 'selecting' && preview?.valid && preview.totalContinue >= 250) {

    applyGesture(run, barrel.gesture);

  }

}



/* ------------------------------------------------------------------ *

 * Level loop

 * ------------------------------------------------------------------ */

function playLevel(run) {

  let steps = 0;

  while (!['won', 'run-won', 'lost'].includes(run.phase) && steps++ < MAX_STEPS) {

    usePlannedItems(run);

    useGestureIfUseful(run);

    if (run.score >= run.target) { advanceLevel(run); break; }



    if (run.flags.saltOffer) {

      resolveSaltOffer(run, true);

      continue;

    }

    if (run.flags.loanOffer) {

      // paying 40 coins for a fresh throw is worth it when the round holds real points

      resolveLoanOffer(run, run.coins >= 40 && (run.roundScore || 0) >= 300);

      continue;

    }



    if (['ready', 'dead', 'hot'].includes(run.phase)) {

      if (run.phase === 'dead' && run.itemCharges.powder) {

        useItem(run, 'powder');

        if (!rollDice(run, { free: true }).ok) break;

      } else if (run.phase === 'dead' && run.itemCharges.smoke) {

        useItem(run, 'smoke');

        if (!rollDice(run, { free: true }).ok) break;

      } else if (!rollDice(run, { free: run.phase === 'hot' }).ok) {

        break;

      }

      continue;

    }



    if (run.phase === 'selecting') {

      const choice = chooseAction(run);

      if (!choice) { run.phase = 'dead'; continue; }

      run.selected = choice.dice.map((die) => die.uid);

      let preview = getScorePreview(run);

      if (!preview.valid) { run.phase = 'dead'; continue; }

      useGestureIfUseful(run, preview);

      if (run.flags.gestureUsedThisThrow) preview = getScorePreview(run);

      ACTIONS[choice.action] += 1;

      const result = applyScore(run, choice.action);

      if (!result.ok) break;

      if (run.score >= run.target) {

        if (!advanceLevel(run).ok) break;

        break;

      }

      if (run.phase === 'reroll-pending' && !rollDice(run).ok) break;

      continue;

    }



    if (run.phase === 'reroll-pending') {

      if (!rollDice(run).ok) break;

      continue;

    }

    break;

  }

  return ['won', 'run-won'].includes(run.phase);

}



function shop(run, trace = false) {

  createShop(run);

  if (trace) console.log(`  shop coins=${run.coins} dice=${run.shop.dice.map((o) => `${o.id}:${o.price}`).join(' ')} barrel=${run.shop.barrel.map((o) => `${o.id}:${o.price}`).join(' ')} item=${run.shop.item.map((o) => `${o.id}:${o.price}`).join(' ')}`);

  const weakest = weakestDie(run);

  const capacity = getDiceCapacity(run);

  const offers = run.shop.dice

    .map((offer, index) => ({ offer, index, spec: DICE_BY_ID[offer.id] }))

    .filter((entry) => entry.spec && !entry.offer.sold)

    .sort((a, b) => dieValue(b.spec.id) - dieValue(a.spec.id));



  for (const { index, spec } of offers) {

    if (run.coins < shopPrice(run, spec.price)) continue;

    const full = run.bag.length >= capacity;

    const worst = weakestDie(run);

    if (full && worst && dieValue(spec.id) <= dieValue(worst.dieId) + 0.3) continue;

    buyDie(run, index, full ? worst?.uid || null : null);

  }



  const barrels = run.shop.barrel

    .map((offer, index) => ({ offer, index, barrel: BARREL_BY_ID[offer.id] }))

    .filter((entry) => entry.barrel && !entry.offer.sold)

    .sort((a, b) => barrelValue(run, b.barrel) - barrelValue(run, a.barrel));

  if (barrels[0] && barrelValue(run, barrels[0].barrel) > 0.3) {

    const price = shopPrice(run, barrels[0].barrel.price);

    if (run.coins >= price) buyBarrel(run, barrels[0].index);

  }



  const items = run.shop.item

    .map((offer, index) => ({ offer, index, item: ITEM_BY_ID[offer.id] }))

    .filter((entry) => entry.item && !entry.offer.sold)

    .sort((a, b) => itemValue(run, b.item) - itemValue(run, a.item));

  for (const { index, item } of items) {

    const price = shopPrice(run, item.price);

    if (run.coins >= price && itemValue(run, item) >= 0.7) buyItem(run, index);

  }

  leaveShop(run);

}



function barrelValue(run, barrel) {

  const current = getBarrel(run);

  if (barrel.id === current.id) return -1;

  const avg = bagAverage(run);

  let value = (RARITY[barrel.rarity] ?? 0) * 0.25;

  if (barrel.type === 'extraDie') value += 1.6;

  if (barrel.type === 'gesture') value += 0.8;

  if (barrel.type === 'probability') value += 0.4;

  if (barrel.type === 'score' || barrel.type === 'faceScore' || barrel.type === 'wildScore') value += 0.55 * avg;

  if (barrel.type === 'interaction') value += 0.35 * avg;

  return value - (RARITY[current.rarity] ?? 0) * 0.15;

}



const ITEM_VALUE = {

  // consumables the winning runs actually buy, roughly by purchase count

  courage: 1.9, powder: 1.8, wager: 1.7, lucky_coin: 1.5, hunter_mark: 1.3,

  salt: 2.0, smoke: 2.0, charm: 2.8, hourglass: 1.6, glove: 0.9,

  epic_chest: 2.2, rare_pair: 1.5, boss_ward: 3.0, blood_contract: 1.2,

  devil_reset: 0.4,

  // passives, led by what the winning runs stack

  dice_bag: 3.6, triple_charm: 1.6, pip_ward: 1.4, quad_seal: 1.3,

  straight_bell: 1.2, active_shelf: 1.5, shelf_item: 1.4, shelf_dice: 1.4,

  shelf_barrel: 1.2, gold_cuff: 1.0, barrel_reforger: 1.1, cracked_pouch: 1.0,

  quint_clasp: 0.9, sext_crown: 0.9, heaven_plate: 0.8,

};



function itemValue(run, item) {

  const base = ITEM_VALUE[item.id];

  if (base !== undefined) return base;

  return (RARITY[item.rarity] ?? 0) * 0.4;

}



/* ------------------------------------------------------------------ *

 * Run loop + report

 * ------------------------------------------------------------------ */

function simulate(seed, trace = false) {

  const run = createRun({ rng: makeRng(seed) });

  let cleared = 0;

  let shops = 0;

  for (let level = 1; level <= LEVELS.length; level += 1) {

    run.level = level;

    initLevel(run);

    if (!playLevel(run)) {

      if (trace) console.log(`L${level} FAIL score=${run.score}/${run.target} rerolls=${run.rerolls} bag=${run.bag.map((e) => e.dieId).join(',')} items=${run.activeItems.join(',')}`);

      break;

    }

    cleared += 1;

    if (trace) console.log(`L${level} ok score=${run.score}/${run.target} rerolls=${run.rerolls} bag=${run.bag.map((e) => e.dieId).join(',')} items=${run.activeItems.join(',')}`);

    if (run.phase === 'run-won') break;

    shop(run, trace);

    shops += 1;

  }

  return { run, cleared, shops };

}



const started = Date.now();

const reached = Array(LEVELS.length).fill(0);

const completed = [];

let totalEndLevel = 0;

let totalShops = 0;

let totalBusts = 0;

let totalCoins = 0;

let totalRolls = 0;



for (let index = 0; index < RUNS; index += 1) {

  const result = simulate((START_SEED + index * 0x9e3779b9) >>> 0, argv.includes('--trace') && index === 0);

  for (let level = 0; level < result.cleared; level += 1) reached[level] += 1;

  if (result.run.phase === 'run-won') completed.push(result);

  totalEndLevel += result.cleared;

  totalShops += result.shops;

  totalBusts += result.run.log.filter((entry) => entry.type === 'bad').length;

  totalCoins += result.run.coins;

  totalRolls += result.run.stats.rolls;

}



const avg = (value) => value / RUNS;

const report = {

  runs: RUNS,

  seed: START_SEED,

  completion: completed.length / RUNS,

  averageEndLevel: avg(totalEndLevel),

  clearRate: totalEndLevel / (RUNS * LEVELS.length),

  averageCoins: avg(totalCoins),

  averageRolls: avg(totalRolls),

  averageShops: avg(totalShops),

  averageBusts: avg(totalBusts),

  actions: ACTIONS,

  reached: reached.map((value) => value / RUNS),

  dpStates: memo.size,

  elapsedMs: Date.now() - started,

};



if (!QUIET) {

  console.log(`自动测试 ${RUNS} 局 · 通关率 ${(report.completion * 100).toFixed(1)}% · 平均终点 ${report.averageEndLevel.toFixed(1)} 关`);
  console.log(`平均银币 ${report.averageCoins.toFixed(0)} · 平均投掷 ${report.averageRolls.toFixed(1)} · 平均掷空 ${report.averageBusts.toFixed(1)} · DP 状态 ${report.dpStates} · 用时 ${report.elapsedMs} ms`);
  console.log(report.reached.map((rate, index) => `${String(index + 1).padStart(2)}: ${(rate * 100).toFixed(1)}%`).join('  '));

}

if (JSON_OUTPUT) console.log(JSON.stringify(report));



