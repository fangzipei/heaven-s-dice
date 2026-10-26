/* Balance simulation: a competent, greedy player who shops between levels. */
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  initLevel, createShop, buyDie, buyBarrel, buyItem, leaveShop,
  getDiceCapacity, useItem, canUseItem, getBarrel, shopPrice, advanceLevel, makeRng,
  isBossDieBlocked,
} from '../src/core/engine.ts';
import { bestSelection } from '../src/core/scoring.ts';
import {
  LEVELS, DICE_BY_ID, ITEM_BY_ID, BARREL_BY_ID, STANDARD_DIE, DICE_SETS,
} from '../src/content/index.ts';
import { getDieSpec } from '../src/core/engine.ts';

const RUNS = Number(process.argv[2] || 500);

/* SEED makes the whole sweep reproducible: every run gets its own stream from
   the engine's splitmix rng, so two engines can be compared number for number.
     SEED=1 node tools/balance.mjs 200 */
const SEED = Number(process.env.SEED || 0);

/* Optional overrides so the 28-level curve can be swept without editing data:
     TARGET_GROWTH=1.08 REWARD_GROWTH=1.05 node tools/balance.mjs 200 */
const TARGET_GROWTH = Number(process.env.TARGET_GROWTH || 0);
const REWARD_GROWTH = Number(process.env.REWARD_GROWTH || 0);
const QUIET = process.env.QUIET === '1';
const TARGET_BASE = Number(process.env.TARGET_BASE || 0);
if (TARGET_BASE > 0) LEVELS.forEach((cfg) => { cfg.target = TARGET_BASE; });
if (TARGET_GROWTH > 0) {
  const base = TARGET_BASE > 0 ? TARGET_BASE : LEVELS[0].target;
  LEVELS.forEach((cfg, i) => {
    if (i > 0) cfg.target = Math.round((base * TARGET_GROWTH ** i) / 10) * 10;
  });
}
if (REWARD_GROWTH > 0) {
  LEVELS.forEach((cfg, i) => {
    if (i > 0) cfg.reward = Math.round((LEVELS[0].reward * REWARD_GROWTH ** i) / 5) * 5;
  });
}
const RARITY = { common: 0, rare: 1, epic: 2, legendary: 3 };
// Every item id must appear here; the bot buys top-down once it can afford it.
const ITEM_PRIORITY = [
  'dice_bag', 'shelf_dice', 'shelf_item', 'shelf_barrel', 'charm', 'hunter_mark',
  'hourglass', 'courage', 'wager', 'salt', 'powder', 'lucky_coin', 'smoke', 'glove',
  'blood_contract', 'gold_cuff', 'cracked_pouch', 'boss_ward',
];
const itemRank = (id) => {
  const index = ITEM_PRIORITY.indexOf(id);
  return index < 0 ? ITEM_PRIORITY.length + 1 : index;
};

function dieRank(dieId) {
  if (dieId === 'standard') return -1;
  const spec = DICE_BY_ID[dieId] || STANDARD_DIE;
  return RARITY[spec.rarity] ?? 0;
}

function maybeUseItems(run) {
  // Use defensive / setup items early.
  if (run.itemCharges.charm && run.score === 0) useItem(run, 'charm');
  if (run.itemCharges.wager && run.score === 0 && run.rerolls <= 5) useItem(run, 'wager');
  if (run.itemCharges.courage && run.rerolls <= 5) useItem(run, 'courage');
  if (run.itemCharges.blood_contract && run.score === 0 && run.level >= 10) useItem(run, 'blood_contract');
  // Salt only pays off once there is something worth protecting.
  if (run.itemCharges.salt && run.score > 0 && run.rerolls <= 1) useItem(run, 'salt');
  // Rescue / finishing items.
  if (run.itemCharges.lucky_coin && run.score + 150 >= run.target) useItem(run, 'lucky_coin');
  if (run.itemCharges.hourglass && run.score + 125 >= run.target) useItem(run, 'hourglass');
}

function maybeUseMark(run, preview) {
  if (run.itemCharges.hunter_mark && preview.valid && preview.totalReroll >= 300 && run.score < run.target) {
    useItem(run, 'hunter_mark');
    return true;
  }
  return false;
}

function playLevel(run) {
  maybeUseItems(run);
  let guard = 0;
  while (!['won', 'run-won', 'lost'].includes(run.phase) && guard++ < 120) {
    if (run.score >= run.target) {
      if (!advanceLevel(run).ok) break;
      break;
    }
    if (['ready', 'dead', 'hot'].includes(run.phase)) {
      if (run.phase === 'dead' && run.itemCharges.powder) {
        useItem(run, 'powder');
        rollDice(run, { free: true });
      } else if (run.phase === 'dead' && run.itemCharges.smoke) {
        useItem(run, 'smoke');
        rollDice(run, { free: true });
      } else {
        const result = rollDice(run, { free: run.phase === 'hot' });
        if (!result.ok) break;
      }
      continue;
    }
    if (run.phase === 'selecting') {
      const best = bestSelection(availableDice(run).filter((die) => !isBossDieBlocked(run, die)));
      if (!best) { run.phase = 'dead'; continue; }
      run.selected = best.dice.map((d) => d.uid);
      let preview = getScorePreview(run);
      if (preview.valid && maybeUseMark(run, preview)) {
        preview = getScorePreview(run);
      }
      if (!preview.valid) break;
      const action = run.rerolls <= 0
        ? 'bank'
        : (run.score + preview.totalContinue >= run.target || preview.totalContinue >= preview.totalReroll)
          ? 'continue' : 'reroll';
      const result = applyScore(run, action);
      if (!result.ok) break;
      if (run.score >= run.target) {
        if (!advanceLevel(run).ok) break;
        break;
      }
      if (run.phase === 'reroll-pending') {
        const roll = rollDice(run);
        if (!roll.ok) break;
      }
      continue;
    }
    if (run.phase === 'reroll-pending') {
      const roll = rollDice(run);
      if (!roll.ok) break;
      continue;
    }
    break;
  }
  return ['won', 'run-won'].includes(run.phase);
}

function shop(run) {
  createShop(run);
  // Commit to one set: a real player chases the 2/4-piece bonuses instead of
  // grabbing whatever has the shiniest rarity tag.
  const ownedCounts = {};
  for (const entry of run.bag) {
    const setId = getDieSpec(entry.dieId).setId;
    if (setId) ownedCounts[setId] = (ownedCounts[setId] || 0) + 1;
  }
  const ranked = Object.entries(ownedCounts).sort((a, b) => b[1] - a[1]);
  const focusSet = (ranked.find(([, count]) => count >= 2) || ranked[0])?.[0] || null;
  const offerRank = (spec) => dieRank(spec.id) * 10 + (spec.setId === focusSet ? 12 : 0);
  const bagRank = (entry) => dieRank(entry.dieId) * 10
    + (getDieSpec(entry.dieId).setId === focusSet ? 8 : 0);

  // Buy dice: set synergy first, then rarity; replace the weakest outsider.
  const diceOffers = run.shop.dice
    .filter((o) => !o.sold && o.id)
    .map((offer, index) => ({ index, spec: DICE_BY_ID[offer.id] }))
    .filter((offer) => offer.spec)
    .sort((a, b) => offerRank(b.spec) - offerRank(a.spec));
  for (const offer of diceOffers) {
    const price = shopPrice(run, offer.spec.price);
    if (run.coins < price) continue;
    if (run.bag.length >= getDiceCapacity(run)) {
      const weakest = [...run.bag].sort((a, b) => bagRank(a) - bagRank(b))[0];
      if (!weakest || bagRank(weakest) >= offerRank(offer.spec)) continue;
      const result = buyDie(run, offer.index, weakest.uid);
      if (!result.ok) { /* price or state changed */ }
    } else {
      buyDie(run, offer.index);
    }
  }
  // Barrel: always upgrade if affordable and the offer type is interesting.
  const barrelOffer = run.shop.barrel.find((o) => !o.sold && o.id);
  if (barrelOffer) {
    const idx = run.shop.barrel.indexOf(barrelOffer);
    const barrel = BARREL_BY_ID[barrelOffer.id];
    const current = getBarrel(run);
    const ownedSets = new Set(
      run.bag.map((entry) => getDieSpec(entry.dieId).setId).filter(Boolean),
    );
    const countSet = (setId) => run.bag.filter(
      (entry) => getDieSpec(entry.dieId).setId === setId,
    ).length;
    const scoreBarrel = (b) => {
      if (b.type === 'gesture') return 2;
      if (b.type === 'faceScore') {
        // Worth it once the bag already leans on that face (wolf / 3 builds).
        return 1.5 + Math.min(1, countSet('wolf') * 0.25);
      }
      if (b.type === 'wildScore') {
        return 1.5 + Math.min(1, countSet('demon') * 0.25);
      }
      return b.type === 'probability' ? 1 : 0;
    };
    if (run.coins >= shopPrice(run, barrel.price) && scoreBarrel(barrel) >= scoreBarrel(current)) {
      buyBarrel(run, idx);
    }
  }
  // Items.
  const itemOffers = run.shop.item
    .filter((o) => !o.sold && o.id)
    .map((offer, index) => ({ index, item: ITEM_BY_ID[offer.id] }))
    .sort((a, b) => itemRank(a.item.id) - itemRank(b.item.id));
  for (const offer of itemOffers) {
    if (run.coins < shopPrice(run, offer.item.price)) continue;
    buyItem(run, offer.index);
  }
  leaveShop(run);
}

const TOTAL_LEVELS = LEVELS.length;
let completed = 0;
const reached = Array(TOTAL_LEVELS).fill(0);
const fails = Array(TOTAL_LEVELS).fill(0);
const marginByLevel = Array(TOTAL_LEVELS).fill(0);
const coinsEnd = [];
const levelsAtEnd = [];
for (let r = 0; r < RUNS; r += 1) {
  const run = createRun({ rng: makeRng(SEED + r) });
  for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
    run.level = level;
    initLevel(run);
    if (!playLevel(run)) {
      fails[level - 1] += 1;
      break;
    }
    marginByLevel[level - 1] += run.score / run.target;
    reached[level - 1] += 1;
    if (run.phase === 'run-won') { completed += 1; break; }
    shop(run);
  }
  coinsEnd.push(run.coins);
  levelsAtEnd.push(run.level);
}
const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);

// Text report: per-level clear rate is the single most useful balance signal.
if (QUIET) {
  console.log(JSON.stringify({
    completion: Number((completed / RUNS).toFixed(3)),
    avgEndLevel: Number(avg(levelsAtEnd).toFixed(2)),
    minClear: Number(Math.min(...LEVELS.map((_, i) => reached[i] / RUNS)).toFixed(3)),
    reached: reached.map((r) => Number((r / RUNS).toFixed(2))),
  }));
} else console.log(`runs ${RUNS} · 通关率 ${(completed / RUNS * 100).toFixed(1)}% · 平均到达第 ${avg(levelsAtEnd).toFixed(1)} 关 · 平均余钱 ${avg(coinsEnd).toFixed(0)}`);
const rows = QUIET ? [] : LEVELS.map((cfg, i) => {
  const reachedHere = reached[i] / RUNS;
  const reachedBefore = i === 0 ? 1 : reached[i - 1] / RUNS;
  // Marginal = of the runs that stood at this table, how many walked away from
  // it. Cumulative reach decays by design, so marginal is the real signal.
  const marginal = reachedBefore ? reachedHere / reachedBefore : 0;
  const die = fails[i] / RUNS;
  const margin = reached[i] ? marginByLevel[i] / reached[i] : 0;
  return { level: cfg.level, target: cfg.target, boss: cfg.boss ? '★' : ' ',
    reach: (reachedHere * 100).toFixed(1), clear: (marginal * 100).toFixed(1),
    died: (die * 100).toFixed(1), score: margin.toFixed(2) };
});
const bad = rows.filter((row) => Number(row.clear) < 70);
for (const row of rows) {
  const flag = Number(row.clear) < 70 ? '  ← 本关通过率过低' : '';
  console.log(`${String(row.level).padStart(2)} ${row.boss} 目标 ${String(row.target).padStart(5)}  到达 ${row.reach.padStart(5)}%  本关通过 ${row.clear.padStart(5)}%  平均 ${row.score}× 目标${flag}`);
}
console.log(bad.length ? `\n⚠ ${bad.length} 个关卡本关通过率低于 70%：第 ${bad.map((r) => r.level).join('、')} 关` : '\n✓ 所有关卡本关通过率 ≥ 70%');
console.log(JSON.stringify({
  runs: RUNS,
  completion: completed / RUNS,
  avgCoins: avg(coinsEnd),
  avgEndLevel: avg(levelsAtEnd),
  reached: reached.map((r) => r / RUNS),
}, null, 2));
