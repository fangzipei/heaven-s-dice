/*
 * Fast headless playtest runner.
 * It drives the pure engine directly; no DOM, browser, timers, or page clicks.
 *
 * Examples:
 *   node tools/auto-play.mjs --runs=1000 --seed=20261027
 *   node tools/auto-play.mjs --runs=5000 --json --quiet
 */
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  initLevel, createShop, buyDie, buyBarrel, buyItem, leaveShop,
  getDiceCapacity, useItem, canUseItem, getBarrel, shopPrice,
  advanceLevel, makeRng, isBossDieBlocked, resolveSaltOffer, getDieSpec,
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
const MAX_STEPS = Math.max(40, Math.floor(numberArg('max-steps', 160)));
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet') || JSON_OUTPUT;

const RARITY = { common: 0, rare: 1, epic: 2, legendary: 3 };
const ITEM_PRIORITY = [
  'dice_bag', 'shelf_dice', 'shelf_item', 'shelf_barrel', 'charm', 'hunter_mark',
  'hourglass', 'courage', 'wager', 'salt', 'powder', 'lucky_coin', 'smoke', 'glove',
  'blood_contract', 'gold_cuff', 'cracked_pouch', 'boss_ward',
];

function dieRank(id) {
  if (id === 'standard') return -1;
  return RARITY[DICE_BY_ID[id]?.rarity] ?? 0;
}

function itemRank(id) {
  const index = ITEM_PRIORITY.indexOf(id);
  return index < 0 ? ITEM_PRIORITY.length : index;
}

function setCounts(run) {
  const counts = {};
  for (const entry of run.bag) {
    const setId = getDieSpec(entry.dieId).setId;
    if (setId) counts[setId] = (counts[setId] || 0) + 1;
  }
  return counts;
}

function dieOfferScore(run, spec, focusSet) {
  const counts = setCounts(run);
  const current = run.bag.map((entry) => dieRank(entry.dieId));
  const weakest = Math.min(...current);
  const setBonus = spec.setId === focusSet ? 20 : (spec.setId ? 4 : 0);
  const bonus = spec.bonus ? 5 : 0;
  const replacementGain = run.bag.length >= getDiceCapacity(run)
    ? Math.max(0, dieRank(spec.id) - weakest) * 8 : 12;
  const existingSet = spec.setId ? (counts[spec.setId] || 0) : 0;
  return dieRank(spec.id) * 12 + setBonus + existingSet * 8 + bonus + replacementGain;
}

function chooseFocusSet(run) {
  const counts = setCounts(run);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .find(([, count]) => count >= 2)?.[0]
    || Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    || null;
}

function weakestReplacement(run, focusSet) {
  const score = (entry) => {
    const spec = getDieSpec(entry.dieId);
    return dieRank(entry.dieId) * 12 + (spec.setId === focusSet ? 20 : 0)
      + (spec.bonus ? 5 : 0);
  };
  return [...run.bag].sort((a, b) => score(a) - score(b))[0] || null;
}

function usePlannedItems(run) {
  if (run.itemCharges.charm && run.score === 0) useItem(run, 'charm');
  if (run.itemCharges.wager && run.score === 0 && run.rerolls <= 3) useItem(run, 'wager');
  if (run.itemCharges.courage && run.rerolls <= 1) useItem(run, 'courage');
  if (run.itemCharges.blood_contract && run.level >= 10 && run.score === 0) {
    useItem(run, 'blood_contract');
  }
  if (run.itemCharges.boss_ward && LEVELS[run.level - 1]?.boss && run.phase === 'ready') {
    useItem(run, 'boss_ward');
  }
  if (run.itemCharges.lucky_coin && run.score + 150 >= run.target) useItem(run, 'lucky_coin');
  if (run.itemCharges.hourglass && run.score + 200 >= run.target) useItem(run, 'hourglass');
}

function playLevel(run) {
  usePlannedItems(run);
  let steps = 0;
  while (!['won', 'run-won', 'lost'].includes(run.phase) && steps++ < MAX_STEPS) {
    if (run.score >= run.target) {
      advanceLevel(run);
      break;
    }
    if (run.flags.saltOffer) {
      // Saving the provisional round is almost always correct for a fast stable bot.
      resolveSaltOffer(run, true);
      continue;
    }
    if (['ready', 'dead', 'hot'].includes(run.phase)) {
      const result = rollDice(run, { free: run.phase === 'hot' });
      if (!result.ok) break;
      continue;
    }
    if (run.phase === 'selecting') {
      const best = bestSelection(availableDice(run).filter((die) => !isBossDieBlocked(run, die)));
      if (!best) { run.phase = 'dead'; continue; }
      run.selected = best.dice.map((die) => die.uid);
      const preview = getScorePreview(run);
      if (!preview.valid) break;
      const canReach = run.score + preview.totalContinue >= run.target;
      const action = run.rerolls <= 0
        ? 'bank'
        : (canReach || preview.totalContinue >= preview.totalReroll ? 'continue' : 'reroll');
      if (!applyScore(run, action).ok) break;
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

function shop(run) {
  createShop(run);
  const focusSet = chooseFocusSet(run);
  const dice = run.shop.dice
    .map((offer, index) => ({ offer, index, spec: DICE_BY_ID[offer.id] }))
    .filter((entry) => entry.spec && !entry.offer.sold)
    .sort((a, b) => dieOfferScore(run, b.spec, focusSet) - dieOfferScore(run, a.spec, focusSet));

  for (const { index, spec } of dice) {
    const price = shopPrice(run, spec.price);
    if (run.coins < price) continue;
    const replacement = run.bag.length >= getDiceCapacity(run)
      ? weakestReplacement(run, focusSet) : null;
    if (replacement && dieOfferScore(run, spec, focusSet) <= dieOfferScore(run, getDieSpec(replacement.dieId), focusSet)) continue;
    buyDie(run, index, replacement?.uid || null);
  }

  const barrelChoices = run.shop.barrel
    .map((offer, index) => ({ offer, index, barrel: BARREL_BY_ID[offer.id] }))
    .filter((entry) => entry.barrel && !entry.offer.sold)
    .sort((a, b) => (RARITY[b.barrel.rarity] - RARITY[a.barrel.rarity]));
  const currentRarity = RARITY[getBarrel(run).rarity] ?? 0;
  for (const choice of barrelChoices) {
    if (RARITY[choice.barrel.rarity] <= currentRarity) continue;
    if (run.coins < shopPrice(run, choice.barrel.price)) continue;
    buyBarrel(run, choice.index);
    break;
  }

  const items = run.shop.item
    .map((offer, index) => ({ offer, index, item: ITEM_BY_ID[offer.id] }))
    .filter((entry) => entry.item && !entry.offer.sold)
    .sort((a, b) => itemRank(a.item.id) - itemRank(b.item.id));
  for (const { index, item } of items) {
    if (run.coins >= shopPrice(run, item.price)) buyItem(run, index);
  }
  leaveShop(run);
}

function simulate(seed) {
  const run = createRun({ rng: makeRng(seed) });
  let cleared = 0;
  let shops = 0;
  for (let level = 1; level <= LEVELS.length; level += 1) {
    run.level = level;
    initLevel(run);
    if (!playLevel(run)) break;
    cleared += 1;
    if (run.phase === 'run-won') break;
    shop(run);
    shops += 1;
  }
  return { run, cleared, shops };
}

const started = Date.now();
const reached = Array(LEVELS.length).fill(0);
const completed = [];
let totalCoins = 0;
let totalRolls = 0;
for (let index = 0; index < RUNS; index += 1) {
  const result = simulate((START_SEED + index * 0x9e3779b9) >>> 0);
  for (let level = 0; level < result.cleared; level += 1) reached[level] += 1;
  if (result.run.phase === 'run-won') completed.push(result);
  totalCoins += result.run.coins;
  totalRolls += result.run.stats.rolls;
}

const avg = (value) => value / RUNS;
const report = {
  runs: RUNS,
  seed: START_SEED,
  completion: completed.length / RUNS,
  averageEndLevel: avg(reached.reduce((last, value, index) => last + (value ? index + 1 : 0), 0)),
  averageCoins: avg(totalCoins),
  averageRolls: avg(totalRolls),
  reached: reached.map((value) => value / RUNS),
  elapsedMs: Date.now() - started,
};

if (!QUIET) {
  console.log(`自动测试 ${RUNS} 局 · 通关率 ${(report.completion * 100).toFixed(1)}% · 平均终点 ${report.averageEndLevel.toFixed(1)} 关`);
  console.log(`平均银币 ${report.averageCoins.toFixed(0)} · 平均投掷 ${report.averageRolls.toFixed(1)} · 用时 ${report.elapsedMs} ms`);
  console.log(report.reached.map((rate, index) => `${String(index + 1).padStart(2)}: ${(rate * 100).toFixed(1)}%`).join('  '));
}
if (JSON_OUTPUT) console.log(JSON.stringify(report));
