/* Balance simulation: a competent, greedy player who shops between levels. */
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  initLevel, createShop, buyDie, buyBarrel, buyItem, leaveShop,
  getDiceCapacity, useItem, canUseItem, getBarrel, shopPrice, advanceLevel,
} from '../src/engine.js';
import { bestSelection } from '../src/scoring.js';
import {
  LEVELS, DICE_BY_ID, ITEM_BY_ID, BARREL_BY_ID, STANDARD_DIE,
} from '../src/data.js';

const RUNS = Number(process.argv[2] || 500);
const RARITY = { common: 0, rare: 1, epic: 2, legendary: 3 };
const ITEM_PRIORITY = [
  'dice_bag', 'charm', 'hunter_mark', 'courage', 'hourglass',
  'lucky_coin', 'blood_contract', 'smoke', 'gold_cuff', 'glove',
];

function dieRank(dieId) {
  if (dieId === 'standard') return -1;
  const spec = DICE_BY_ID[dieId] || STANDARD_DIE;
  return RARITY[spec.rarity] ?? 0;
}

function maybeUseItems(run) {
  // Use defensive / setup items early.
  if (run.itemCharges.charm && run.score === 0) useItem(run, 'charm');
  if (run.itemCharges.courage && run.rerolls <= 5) useItem(run, 'courage');
  if (run.itemCharges.blood_contract && run.score === 0 && run.level >= 8) useItem(run, 'blood_contract');
  // Rescue / finishing items.
  if (run.itemCharges.lucky_coin && run.score + 150 >= run.target) useItem(run, 'lucky_coin');
  if (run.itemCharges.hourglass && run.score + 100 >= run.target) useItem(run, 'hourglass');
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
      if (run.phase === 'dead' && run.itemCharges.smoke) {
        useItem(run, 'smoke');
        rollDice(run, { free: true });
      } else {
        const result = rollDice(run, { free: run.phase === 'hot' });
        if (!result.ok) break;
      }
      continue;
    }
    if (run.phase === 'selecting') {
      const best = bestSelection(availableDice(run));
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
  // Buy dice: highest rarity first, replace weakest.
  const diceOffers = run.shop.dice
    .filter((o) => !o.sold && o.id)
    .map((offer, index) => ({ index, spec: DICE_BY_ID[offer.id] }))
    .filter((offer) => offer.spec)
    .sort((a, b) => dieRank(b.spec.id) - dieRank(a.spec.id));
  for (const offer of diceOffers) {
    const price = shopPrice(run, offer.spec.price);
    if (run.coins < price) continue;
    if (run.bag.length >= getDiceCapacity(run)) {
      const weakest = [...run.bag].sort((a, b) => dieRank(a.dieId) - dieRank(b.dieId))[0];
      if (!weakest || dieRank(weakest.dieId) >= dieRank(offer.spec.id)) continue;
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
    const scoreBarrel = (b) => (b.type === 'gesture' ? 2 : b.type === 'probability' ? 1 : 0);
    if (run.coins >= shopPrice(run, barrel.price) && scoreBarrel(barrel) >= scoreBarrel(current)) {
      buyBarrel(run, idx);
    }
  }
  // Items.
  const itemOffers = run.shop.item
    .filter((o) => !o.sold && o.id)
    .map((offer, index) => ({ index, item: ITEM_BY_ID[offer.id] }))
    .sort((a, b) => ITEM_PRIORITY.indexOf(a.item.id) - ITEM_PRIORITY.indexOf(b.item.id));
  for (const offer of itemOffers) {
    if (run.coins < shopPrice(run, offer.item.price)) continue;
    buyItem(run, offer.index);
  }
  leaveShop(run);
}

let completed = 0;
const reached = Array(15).fill(0);
const fails = Array(15).fill(0);
const coinsEnd = [];
const levelsAtEnd = [];
const startCoins = 20;
for (let r = 0; r < RUNS; r += 1) {
  const run = createRun();
  let alive = true;
  for (let level = 1; level <= 15; level += 1) {
    run.level = level;
    initLevel(run);
    if (!playLevel(run)) {
      fails[level - 1] += 1;
      alive = false;
      break;
    }
    reached[level - 1] += 1;
    if (run.phase === 'run-won') { completed += 1; break; }
    shop(run);
  }
  coinsEnd.push(run.coins);
  levelsAtEnd.push(run.level);
}
const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
console.log(JSON.stringify({
  runs: RUNS,
  completion: completed / RUNS,
  reached: reached.map((r) => (r / RUNS)),
  fails: fails.map((f) => (f / RUNS)),
  avgCoins: avg(coinsEnd),
  avgEndLevel: avg(levelsAtEnd),
}, null, 2));
