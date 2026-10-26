import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, rollDice, applyScore, initLevel, targetForLevel,
  effectiveProbs, useItem, canUseItem, createShop, buyDie,
  buyBarrel, buyItem, leaveShop, applyGesture, getDiceCapacity,
  openShop, refreshSection, getBarrel, BASE_REROLLS, advanceLevel,
  buildScore, syncBag, getScorePreview, hasItemEverBeenTaken,
  activeBoss, isBossDieBlocked, handTypeOf, sellItem, canSellItem, itemSellPrice,
  bossEffectKey, shopSlots, isFloatingScore,
} from '../src/engine.js';
import { makeRng, cashOutValue } from '../src/engine.js';
import {
  REROLL_REFUND, overshootTier, OVERSHOOT_TIERS, LEVELS, getLevelConfig,
} from '../src/data.js';

function fresh(seed = 42) {
  return createRun({ rng: makeRng(seed) });
}

function forceRoll(state, values) {
  state.dice.forEach((die, i) => {
    die.value = values[i] ?? 1;
    die.scored = false;
  });
  state.selected = [];
  state.phase = 'selecting';
}

test('opening throw is free, later throws spend rerolls', () => {
  const state = fresh();
  assert.equal(state.rerolls, 5);
  const first = rollDice(state);
  assert.equal(first.ok, true);
  assert.equal(state.rerolls, 5);
  state.phase = 'dead';
  rollDice(state);
  assert.equal(state.rerolls, 4);
});

test('run-best single hit survives level resets', () => {
  const state = fresh();
  state.stats.bestHit = 4321;
  initLevel(state);
  assert.equal(state.stats.bestHit, 4321);
  assert.equal(state.stats.levelRolls, 0);
});

test('score and continue rerolls only the remaining dice', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  const ones = state.dice.filter((d) => d.value === 1 || d.value === 5);
  state.selected = ones.map((d) => d.uid);
  const before = state.rerolls;
  const result = applyScore(state, 'continue');
  assert.equal(result.ok, true);
  assert.equal(result.total, 150);
  assert.equal(result.reroll, true);
  assert.equal(result.rerollAll, false);
  assert.equal(state.score, 150);
  assert.equal(state.roundScore, 150);
  assert.equal(state.phase, 'reroll-pending');
  assert.equal(state.rerolls, before);
  const scoredUids = ones.map((d) => d.uid);
  const roll = rollDice(state);
  assert.equal(roll.ok, true);
  assert.equal(state.rerolls, before - 1);
  assert.ok(state.dice.filter((d) => scoredUids.includes(d.uid)).every((d) => d.scored));
  assert.equal(state.dice.filter((d) => !d.scored).length, 4);
});

test('a dead reroll burns the whole unbanked round', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  assert.equal(state.score, 150);
  assert.equal(state.roundScore, 150);
  const seq = [0.2, 0.4, 0.6, 0.95]; // the four remaining dice become 2/3/4/6
  const roll = rollDice(state, { rng: () => seq.shift() ?? 0.95 });
  assert.equal(roll.ok, true);
  assert.equal(roll.bust, 150);
  assert.equal(state.phase, 'dead');
  assert.equal(state.score, 0);
  assert.equal(state.roundScore, 0);
  assert.equal(state.lastBust.lost, 150);
});

test('a scoring throw confirms the previous round before a later bust', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  assert.equal(state.score, 150);
  assert.equal(state.roundScore, 150);
  const scoringSeq = [0.01, 0.2, 0.4, 0.6]; // remaining dice become 1/2/3/4
  const roll = rollDice(state, { rng: () => scoringSeq.shift() ?? 0.2 });
  assert.equal(roll.ok, true);
  assert.equal(state.phase, 'selecting');
  assert.equal(state.score, 150);
  assert.equal(state.roundScore, 0);
  const newOne = state.dice.find((d) => d.value === 1 && !d.scored);
  state.selected = [newOne.uid];
  const second = applyScore(state, 'continue');
  assert.equal(second.total, 100);
  assert.equal(state.score, 250);
  assert.equal(state.roundScore, 100);
  const deadSeq = [0.2, 0.4, 0.6]; // remaining 2/3/4
  const bust = rollDice(state, { rng: () => deadSeq.shift() ?? 0.6 });
  assert.equal(bust.bust, 100);
  assert.equal(state.score, 150);
  assert.equal(state.roundScore, 0);
});

test('hot dice resets all six dice for a free reroll', () => {
  const state = fresh();
  state.target = 99999;
  forceRoll(state, [1, 1, 1, 1, 1, 1]);
  state.selected = state.dice.map((d) => d.uid);
  const result = applyScore(state, 'continue');
  assert.equal(result.ok, true);
  assert.equal(result.hot, true);
  assert.equal(result.total, 8000);
  assert.equal(state.phase, 'hot');
  assert.ok(state.dice.every((d) => !d.scored && d.value == null));
});

test('score and reroll brings all six dice back and spends one reroll', () => {
  const state = fresh();
  state.target = 99999;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const before = state.rerolls;
  const result = applyScore(state, 'reroll');
  assert.equal(result.ok, true);
  assert.equal(result.reroll, true);
  assert.equal(result.rerollAll, true);
  assert.equal(state.phase, 'reroll-pending');
  assert.equal(state.rerolls, before);
  const roll = rollDice(state);
  assert.equal(roll.ok, true);
  assert.equal(state.rerolls, before - 1);
  assert.ok(state.dice.every((d) => !d.scored && d.value >= 1));
  assert.equal(state.dice.filter((d) => d.scored).length, 0);
});

test('no reroll tokens means scoring settles the level', () => {
  const state = fresh();
  state.target = 99999;
  state.rerolls = 0;
  state.maxRerolls = 0;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const result = applyScore(state, 'bank');
  assert.equal(result.ok, true);
  assert.equal(result.settled, true);
  assert.equal(state.score, 100);
  assert.equal(state.roundScore, 0);
  assert.equal(state.phase, 'lost');
  assert.equal(applyScore(state, 'continue').ok, false);
});

test('lucky coin adds 150 points and consumes its charge', () => {
  const state = fresh();
  const itemId = 'lucky_coin';
  assert.equal(canUseItem(state, itemId).ok, true);
  const result = useItem(state, itemId);
  assert.equal(result.ok, true);
  assert.equal(state.score, 150);
  assert.equal(state.itemCharges[itemId], 0);
  assert.equal(canUseItem(state, itemId).ok, false);
});

test('barrel probabilities normalise and bias faces', () => {
  const oak = effectiveProbs('standard', 'oak');
  const lead = effectiveProbs('standard', 'lead');
  assert.equal(oak.length, 6);
  assert.ok(Math.abs(oak.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(lead[0] > lead[1]);
  assert.ok(lead[4] > lead[1]);
});

test('shop offers 2 dice, 1 barrel, 3 items and purchases deduct coins', () => {
  const state = fresh();
  state.level = 2;
  initLevel(state);
  state.score = state.target;
  state.phase = 'won';
  createShop(state);
  assert.equal(state.shop.dice.length, 2);
  assert.equal(state.shop.barrel.length, 1);
  assert.equal(state.shop.item.length, 3);
  const dieIndex = state.shop.dice.findIndex((entry) => entry.id && !entry.sold);
  assert.ok(dieIndex >= 0);
  const dieOffer = state.shop.dice[dieIndex];
  state.coins += 100;
  const beforeCoins = state.coins;
  const replacement = state.bag[0].uid;
  const result = buyDie(state, dieIndex, replacement);
  assert.equal(result.ok, true);
  assert.ok(state.coins < beforeCoins);
  assert.ok(state.bag.some((entry) => entry.dieId === dieOffer.id));
});

test('barrel purchase swaps the current cup', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  createShop(state);
  const index = state.shop.barrel.findIndex((entry) => entry.id);
  if (index >= 0) {
    const result = buyBarrel(state, index);
    assert.equal(result.ok, true);
    assert.notEqual(getBarrel(state).id, 'oak');
  }
});

test('passive dice bag adds a seventh die slot', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  createShop(state);
  const itemIndex = state.shop.item.findIndex((entry) => entry.id === 'dice_bag');
  if (itemIndex >= 0) {
    const result = buyItem(state, itemIndex);
    assert.equal(result.ok, true);
    assert.equal(state.bag.length, getDiceCapacity(state));
    assert.equal(state.bag.length, 7);
  }
});

test('reaching the target stays open until the player advances', () => {
  const state = fresh();
  state.target = 10;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const result = applyScore(state, 'continue');
  assert.equal(result.ok, true);
  assert.equal(result.targetReached, true);
  assert.equal(state.targetReached, true);
  assert.equal(state.phase, 'reroll-pending');
  assert.notEqual(state.phase, 'won');
  assert.equal(advanceLevel(state).ok, true);
  assert.equal(state.phase, 'won');
});

test('advanceLevel refuses a score below target', () => {
  const state = fresh();
  state.target = 1000;
  state.score = 999;
  const result = advanceLevel(state);
  assert.equal(result.ok, false);
  assert.equal(state.phase, 'ready');
});

test('defeating a boss grants a permanent reroll boon', () => {
  const state = fresh(7);
  state.level = 3;
  initLevel(state);
  state.target = 10;
  state.score = 9;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const result = applyScore(state, 'continue');
  assert.equal(result.ok, true);
  assert.equal(state.targetReached, true);
  assert.notEqual(state.phase, 'won');
  const advance = advanceLevel(state);
  assert.equal(advance.ok, true);
  assert.equal(state.phase, 'won');
  assert.equal(state.roundScore, 0);
  assert.equal(state.bossBoons, 1);
  // Base reward from the level table + every unspent reroll × 8 (the boss table
  // may grant an extra token) + the 3× overshoot bounty, which 100 points
  // against a 10 target hits.
  assert.equal(state.levelReward.total, getLevelConfig(3).reward + state.rerolls * REROLL_REFUND + 140);
  assert.ok(state.levelReward.bonuses.some((b) => b.label.includes('剩余重投')));
  assert.ok(state.levelReward.bonuses.some((b) => b.label.includes('天胡')));
  openShop(state);
  leaveShop(state);
  assert.equal(state.level, 4);
  assert.equal(state.rerolls, BASE_REROLLS + 1);
});

test('pentagram gesture arms one 20% bonus per level', () => {
  const state = fresh();
  state.barrelId = 'pentagram';
  state.phase = 'ready';
  const result = applyGesture(state, 'pentagram');
  assert.equal(result.ok, true);
  assert.equal(state.flags.starArmed, true);
  assert.equal(state.flags.starUsed, true);
  rollDice(state);
  assert.equal(state.flags.starBonus, true);
  const second = applyGesture(state, 'pentagram');
  assert.equal(second.ok, false);
  assert.match(second.error, /每关/);
  initLevel(state);
  assert.equal(state.flags.starUsed, false);
  assert.equal(applyGesture(state, 'pentagram').ok, true);
});

test('vortex gesture grants one extra reroll per level', () => {
  const state = fresh();
  state.barrelId = 'vortex';
  const before = state.rerolls;
  const result = applyGesture(state, 'circle');
  assert.equal(result.ok, true);
  assert.equal(state.rerolls, before + 1);
  assert.equal(state.flags.vortexUsed, true);
  const second = applyGesture(state, 'circle');
  assert.equal(second.ok, false);
});

test('target is the level config and nothing else', () => {
  const state = fresh();
  state.bag[0].dieId = 'astral_dust';
  state.bag[1].dieId = 'astral_comet';
  assert.equal(targetForLevel(state, 8), LEVELS[7].target);
});

test('wolf two-piece pays for every scored 3', () => {
  const state = fresh();
  state.bag[0].dieId = 'wolf_whelp';
  state.bag[1].dieId = 'wolf_hunter';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.valid, true);
  assert.equal(score.breakdown.base, 300);
  assert.ok(score.breakdown.flats.some(
    (flat) => flat.label === '狼裔 2 件 · 每颗 3 +60' && flat.value === 180,
  ));
});

test('wolf four-piece adds the triple-three bonus', () => {
  const state = fresh();
  ['wolf_whelp', 'wolf_hunter', 'wolf_bloodmoon', 'wolf_alpha'].forEach((id, i) => {
    state.bag[i].dieId = id;
  });
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.ok(score.breakdown.flats.some(
    (flat) => flat.label === '狼裔 4 件 · 三连 3 加成' && flat.value === 600,
  ));
});

test('a demon joker cannot score alone but completes a triple', () => {
  const state = fresh();
  state.bag[0].dieId = 'demon_taxman';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 1, 2, 3, 4]);
  state.dice[0].wild = true;
  state.selected = [state.dice[0].uid];
  assert.equal(buildScore(state, 'reroll').valid, false);
  state.selected = state.dice.slice(0, 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.valid, true);
  assert.equal(score.breakdown.base, 1000);
});

test('demon set bonus multiplies only when a joker is used', () => {
  const state = fresh();
  state.bag[0].dieId = 'demon_seal';
  state.bag[1].dieId = 'demon_taxman';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 1, 2, 3, 4]);
  state.dice[0].wild = true;
  state.selected = state.dice.slice(0, 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.ok(score.breakdown.multipliers.some((m) => m.value === 1.08));
  assert.equal(score.total, Math.round(1000 * 1.08));
});

test('the glove turns a demon die into a joker', () => {
  const state = fresh();
  state.bag[0].dieId = 'demon_imp';
  syncBag(state);
  initLevel(state);
  state.activeItems = ['glove'];
  state.itemCharges.glove = 1;
  forceRoll(state, [3, 1, 2, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  assert.equal(useItem(state, 'glove').ok, true);
  assert.equal(state.dice[0].wild, true);
  assert.equal(state.dice[0].value, 1);
});

test('face-score barrel pays per scored face plus a triple bonus', () => {
  const state = fresh();
  state.barrelId = 'wolf_totem';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.breakdown.base, 300);
  assert.ok(score.breakdown.flats.some((f) => f.label.includes('狼图腾桶 · 3 颗 3') && f.value === 150));
  assert.ok(score.breakdown.flats.some((f) => f.label.includes('狼图腾桶 · 三连 3') && f.value === 150));
  assert.equal(score.total, 600);
});

test('wild-score barrel pays for each joker that was actually used', () => {
  const state = fresh();
  state.barrelId = 'demon_pact';
  state.bag[0].dieId = 'crown_court';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 1, 2, 3, 4]);
  state.dice[0].wild = true;
  state.selected = state.dice.slice(0, 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.breakdown.base, 1000);
  assert.ok(score.breakdown.flats.some((f) => f.label.includes('恶魔契桶') && f.value === 60));
});

test('face-score barrel pays nothing when its face was not scored', () => {
  const state = fresh();
  state.barrelId = 'wolf_totem';
  // Single 1s score 100 each; the cup must not pay for wolf dice as such.
  state.bag[0].dieId = 'wolf_whelp';
  state.bag[1].dieId = 'wolf_bloodmoon';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 2, 3, 4, 6]);
  state.selected = state.dice
    .filter((d) => d.dieId === 'wolf_whelp' || d.dieId === 'wolf_bloodmoon')
    .map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.valid, true);
  assert.equal(score.breakdown.base, 200);
  assert.equal(score.total, 200);
});

test('once-only dice items cannot be taken twice, even if re-offered', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  state.shop = null;
  createShop(state);
  state.shop.item = [{ kind: 'item', id: 'dice_bag', sold: false }];
  assert.equal(buyItem(state, 0).ok, true);
  assert.equal(state.passiveItems.includes('dice_bag'), true);
  assert.equal(hasItemEverBeenTaken(state, 'dice_bag'), true);
  assert.equal(getDiceCapacity(state), 7);
  // Simulate a stock reshuffle that puts the same unique item back on the shelf.
  state.coins = 500;
  state.shop.item = [{ kind: 'item', id: 'dice_bag', sold: false }];
  const second = buyItem(state, 0);
  assert.equal(second.ok, false);
  assert.match(second.error, /只能获取一次/);
  assert.equal(state.passiveItems.filter((id) => id === 'dice_bag').length, 1);
  assert.equal(getDiceCapacity(state), 7);
});

test('cracked pouch trades a die for a permanent score multiplier', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  state.shop = null;
  createShop(state);
  state.shop.item = [{ kind: 'item', id: 'cracked_pouch', sold: false }];
  assert.equal(buyItem(state, 0).ok, true);
  assert.equal(getDiceCapacity(state), 5);
  assert.equal(state.bag.length, 5);
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const preview = getScorePreview(state);
  assert.equal(preview.reroll.breakdown.base, 100);
  assert.equal(preview.reroll.total, 125);
  state.shop.item = [{ kind: 'item', id: 'cracked_pouch', sold: false }];
  state.coins = 500;
  const second = buyItem(state, 0);
  assert.equal(second.ok, false);
});

test('owned items can be sold for half price only in the shop', () => {
  const state = fresh();
  state.phase = 'shop';
  state.shop = {};
  state.activeItems = ['glove'];
  state.itemCharges = { glove: 1 };
  state.coins = 10;
  const expected = itemSellPrice({ price: 65 });
  assert.equal(expected, 32);
  assert.equal(canSellItem(state, 'glove').ok, true);
  const result = sellItem(state, 'glove');
  assert.equal(result.ok, true);
  assert.equal(result.price, 32);
  assert.equal(state.coins, 10 + result.price);
  assert.equal(state.activeItems.includes('glove'), false);
  assert.equal(state.itemCharges.glove, undefined);
  assert.equal(sellItem(state, 'glove').ok, false);
});

test('selling a dice capacity passive keeps the bag legal', () => {
  const state = fresh();
  state.phase = 'shop';
  state.shop = {};
  state.passiveItems = ['dice_bag'];
  state.acquiredItemIds = ['dice_bag'];
  syncBag(state);
  assert.equal(state.bag.length, 7);
  assert.equal(canSellItem(state, 'dice_bag').ok, false);
  state.bag.pop();
  assert.equal(canSellItem(state, 'dice_bag').ok, true);
  assert.equal(sellItem(state, 'dice_bag').ok, true);
  assert.equal(getDiceCapacity(state), 6);
});

test('non-unique items can be reacquired, unique items cannot', () => {
  const state = fresh();
  state.phase = 'shop';
  state.coins = 500;
  state.acquiredItemIds = ['glove', 'dice_bag'];
  state.shop = { item: [
    { kind: 'item', id: 'glove', sold: false },
    { kind: 'item', id: 'dice_bag', sold: false },
  ] };
  assert.equal(buyItem(state, 0).ok, true);
  assert.equal(buyItem(state, 1).ok, false);
  assert.equal(state.activeItems.includes('glove'), true);
});

test('the one-shot boss ward cancels the next boss or the current boss before the first throw', () => {
  const armed = fresh();
  armed.level = 2;
  initLevel(armed);
  armed.activeItems.push('boss_ward');
  armed.itemCharges.boss_ward = 1;
  const use = useItem(armed, 'boss_ward');
  assert.equal(use.ok, true);
  assert.equal(armed.activeItems.includes('boss_ward'), false);
  assert.equal(armed.bossWardArmed, true);
  armed.level = 3;
  initLevel(armed);
  assert.equal(armed.flags.bossDisabled, true);
  assert.equal(bossEffectKey(armed), null);

  const direct = fresh();
  direct.level = 23; // 星税官 takes a token away, so the ward visibly hands it back
  initLevel(direct);
  direct.activeItems.push('boss_ward');
  direct.itemCharges.boss_ward = 1;
  const before = direct.rerolls;
  assert.equal(useItem(direct, 'boss_ward').ok, true);
  assert.equal(direct.flags.bossDisabled, true);
  assert.equal(direct.rerolls, before + 1);
  assert.equal(direct.activeItems.includes('boss_ward'), false);
});

test('boss roster covers eight levels and eight effects', () => {
  const state = fresh();
  assert.deepEqual([3, 6, 10, 14, 18, 23, 28, 33].map((level) => activeBoss({ ...state, level }).id),
    ['rotfang', 'judge', 'soulsmith', 'ashclerk', 'gildedking', 'startax', 'suspensor', 'seraph']);
});

test('the rat blanks every ninth rolled die', () => {
  const state = fresh();
  state.level = 3;
  initLevel(state);
  const first = rollDice(state, { rng: () => 0 });
  assert.equal(first.ok, true);
  const second = rollDice(state, { rng: () => 0 });
  assert.equal(second.ok, true);
  const blanks = state.dice.filter((die) => die.blank);
  assert.equal(blanks.length, 1);
  assert.equal(blanks[0].value, 0);
  assert.equal(isBossDieBlocked(state, blanks[0]), true);
});

test('the judge only lets three-die combinations score', () => {
  const state = fresh();
  state.level = 6;
  initLevel(state);
  forceRoll(state, [5, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  const low = buildScore(state, 'reroll');
  assert.equal(low.valid, true);
  assert.equal(low.total, 0);
  forceRoll(state, [3, 3, 3, 2, 4, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const triple = buildScore(state, 'reroll');
  assert.equal(triple.total, 300);
});

test('the forge disables all sixes', () => {
  const state = fresh();
  state.level = 10;
  initLevel(state);
  forceRoll(state, [6, 6, 1, 2, 3, 4]);
  assert.equal(isBossDieBlocked(state, state.dice[0]), true);
  state.selected = [state.dice[0].uid];
  assert.equal(buildScore(state, 'reroll').valid, false);
});

test('the ash clerk rejects repeating the previous hand type', () => {
  const state = fresh();
  state.level = 14;
  initLevel(state);
  forceRoll(state, [3, 3, 3, 2, 4, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const first = buildScore(state, 'reroll');
  assert.equal(handTypeOf(first.analysis), 'triple');
  state.flags.bossLastType = 'triple';
  const repeated = buildScore(state, 'reroll');
  assert.equal(repeated.valid, true);
  assert.equal(repeated.total, 0);
});

test('the gilded king locks the first hand type for the level', () => {
  const state = fresh();
  state.level = 18;
  initLevel(state);
  state.flags.bossLockedType = 'triple';
  forceRoll(state, [1, 2, 3, 4, 5, 6]);
  state.selected = [state.dice[0].uid, state.dice[1].uid, state.dice[2].uid, state.dice[3].uid, state.dice[4].uid];
  const straight = buildScore(state, 'reroll');
  assert.equal(straight.total, 0);
});

test('the star tax collector removes a reroll, the seraph taxes score and adds one', () => {
  const collector = fresh();
  collector.level = 23;
  initLevel(collector);
  assert.equal(collector.rerolls, BASE_REROLLS - 1);
  const seraph = fresh();
  seraph.level = 33;
  initLevel(seraph);
  assert.equal(seraph.rerolls, BASE_REROLLS + 1);
  forceRoll(seraph, [3, 3, 3, 2, 4, 6]);
  seraph.selected = seraph.dice.slice(0, 3).map((die) => die.uid);
  assert.equal(buildScore(seraph, 'reroll').total, 180);
});

test('unspent rerolls cash out as coins on a level win', () => {
  const state = fresh();
  state.level = 1;
  initLevel(state);
  state.target = 100;
  state.score = 100;
  // Spend two of the five tokens, leave three on the table.
  state.rerolls = 3;
  const cash = cashOutValue(state);
  assert.equal(cash.spare, 3);
  assert.equal(cash.refund, 3 * REROLL_REFUND);
  assert.equal(cash.tier, null);
  advanceLevel(state);
  assert.equal(state.levelReward.total, getLevelConfig(1).reward + 3 * REROLL_REFUND);
  assert.ok(state.levelReward.bonuses.some((b) => b.label === `剩余重投 3 × ${REROLL_REFUND}`));
});

test('overshoot bounty pays the highest tier reached, not the sum of tiers', () => {
  const state = fresh();
  state.level = 2;
  initLevel(state);
  state.target = 500;
  state.score = 1000; // exactly 2x, below the 3x tier
  state.rerolls = 0;
  const cash = cashOutValue(state);
  assert.equal(cash.refund, 0);
  assert.equal(cash.tier.key, 'sweep');
  assert.equal(cash.tierValue, 60);
  advanceLevel(state);
  assert.equal(state.levelReward.total, getLevelConfig(2).reward + 60);
  assert.equal(state.levelReward.bonuses.filter((b) => b.label.includes('目标')).length, 1);
});

test('a bare pass earns no overshoot bounty and no refund when rerolls are spent', () => {
  const state = fresh();
  state.level = 4;
  initLevel(state);
  state.target = 750;
  state.score = 750;
  state.rerolls = 0;
  advanceLevel(state);
  assert.equal(state.levelReward.total, getLevelConfig(4).reward);
  assert.deepEqual(state.levelReward.bonuses, []);
});

/* ── one-shot consumables ─────────────────────────────────────────────── */

test('courage is a one-shot that buys exactly one reroll', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['courage'];
  state.itemCharges.courage = 1;
  const before = state.rerolls;
  assert.equal(useItem(state, 'courage').ok, true);
  assert.equal(state.rerolls, before + 1);
  assert.equal(state.maxRerolls, before + 1);
  assert.equal(state.activeItems.includes('courage'), false);
  assert.equal(state.itemCharges.courage, undefined);
});

test('wager buys a reroll and marks the next score for ×1.6', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['wager'];
  state.itemCharges.wager = 1;
  const before = state.rerolls;
  assert.equal(useItem(state, 'wager').ok, true);
  assert.equal(state.rerolls, before + 1);
  assert.equal(state.flags.wagerMark, true);
  assert.equal(state.activeItems.includes('wager'), false);

  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  assert.equal(getScorePreview(state).reroll.total, 160);
  assert.equal(applyScore(state, 'continue').ok, true);
  // The mark is spent, so the following hand scores face value again.
  assert.equal(state.flags.wagerMark, false);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  assert.equal(getScorePreview(state).reroll.total, 100);
});

test('lucky powder pays 80, frees the reroll and vanishes', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['powder'];
  state.itemCharges.powder = 1;
  rollDice(state, { rng: makeRng(7) });
  const before = state.score;
  const result = useItem(state, 'powder');
  assert.equal(result.ok, true);
  assert.equal(result.rerollFree, true);
  assert.equal(state.score, before + 80);
  assert.equal(state.activeItems.includes('powder'), false);
});

test('powder can only be used after a throw', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['powder'];
  state.itemCharges.powder = 1;
  assert.equal(state.phase, 'ready');
  assert.equal(canUseItem(state, 'powder').ok, false);
  rollDice(state);
  assert.equal(canUseItem(state, 'powder').ok, true);
});

test('salt absorbs exactly one bust and keeps the round alive', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['salt'];
  state.itemCharges.salt = 1;
  assert.equal(useItem(state, 'salt').ok, true);
  assert.equal(state.flags.saltGuard, true);
  assert.equal(state.activeItems.includes('salt'), false);

  state.score = 300;
  state.roundScore = 100;
  // 2 · 3 · 4 · 6 · 2 · 3 — no 1s, no 5s, no triple: a guaranteed bust.
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  const result = rollDice(state, { rng: () => seq[i++ % seq.length] });
  assert.equal(result.ok, true);
  assert.equal(result.bust, 0);
  assert.equal(state.score, 300);
  assert.equal(state.roundScore, 0);
  assert.equal(state.flags.saltGuard, false);
  assert.equal(state.lastBust.saved, 100);
});

test('a bust without salt still burns the provisional round', () => {
  const state = fresh();
  initLevel(state);
  state.score = 300;
  state.roundScore = 100;
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  const result = rollDice(state, { rng: () => seq[i++ % seq.length] });
  assert.equal(result.bust, 100);
  assert.equal(state.score, 200);
});

test('blood contract costs 100 points on every scoring action', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['blood_contract'];
  state.itemCharges.blood_contract = 1;
  assert.equal(useItem(state, 'blood_contract').ok, true);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  const before = state.score;
  assert.equal(applyScore(state, 'continue').ok, true);
  // A bare ace scores 100, the contract adds +35% (135), then bills 100: 35.
  assert.equal(state.score, before + Math.round(100 * 1.35) - 100);
  assert.ok(state.log.some((entry) => entry.text.includes('血契') && entry.text.includes('100')));
});

/* ── shelf passives ───────────────────────────────────────────────────── */

test('shelf passives each open one extra shop slot', () => {
  const state = fresh();
  assert.deepEqual(shopSlots(state), { dice: 2, barrel: 1, item: 3 });
  state.passiveItems = ['shelf_dice'];
  assert.equal(shopSlots(state).dice, 3);
  state.passiveItems = ['shelf_barrel'];
  assert.equal(shopSlots(state).barrel, 2);
  state.passiveItems = ['shelf_item'];
  assert.equal(shopSlots(state).item, 4);
});

test('a shelf passive really stocks the extra offer', () => {
  const bare = fresh();
  createShop(bare);
  assert.equal(bare.shop.dice.length, 2);
  assert.equal(bare.shop.barrel.length, 1);
  assert.equal(bare.shop.item.length, 3);

  const stocked = fresh();
  stocked.passiveItems = ['shelf_dice', 'shelf_barrel', 'shelf_item'];
  createShop(stocked);
  assert.equal(stocked.shop.dice.length, 3);
  assert.equal(stocked.shop.barrel.length, 2);
  assert.equal(stocked.shop.item.length, 4);
});

/* ── any-triple dice ──────────────────────────────────────────────────── */

test('any-triple dice pay whenever three of a kind lands', () => {
  const state = fresh();
  state.bag[0].dieId = 'even_twin';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [2, 2, 2, 1, 5, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const score = buildScore(state, 'reroll');
  assert.equal(score.valid, true);
  assert.ok(score.breakdown.flats.some((flat) => flat.value === 520),
    '双生骰 should add 520 on any triple');

  // No triple, no bonus.
  forceRoll(state, [2, 2, 1, 1, 5, 6]);
  state.selected = state.dice.filter((die) => die.value === 1 || die.value === 5).map((die) => die.uid);
  const flat = buildScore(state, 'reroll');
  assert.ok(!flat.breakdown.flats.some((entry) => entry.value === 520));
});

/* ── 悬秤人：漂浮分 ───────────────────────────────────────────────────── */

test('the suspensor keeps every point floating between throws', () => {
  const state = fresh();
  state.level = 28;
  initLevel(state);
  assert.equal(activeBoss(state).id, 'suspensor');
  assert.equal(isFloatingScore(state), true);

  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((die) => die.value === 1).map((die) => die.uid);
  applyScore(state, 'continue');
  assert.equal(state.score, 100);
  assert.equal(state.roundScore, 100, '整笔分数都押在桌上');

  // 普通关里下一掷会把上一轮“确认”，漂浮关不会。
  const seq = [0, 0, 0, 0, 0, 0]; // 六个 1：必定可计分
  let i = 0;
  state.phase = 'ready';
  state.rerolls = 4;
  rollDice(state, { free: true, rng: () => seq[i++ % seq.length] });
  assert.equal(state.phase, 'selecting');
  assert.equal(state.score, 100);
  assert.equal(state.roundScore, 100, '掷出可计分的面也不确认漂浮分');

  state.selected = state.dice.map((die) => die.uid);
  applyScore(state, 'continue');
  assert.equal(state.score, 1000 * 8 + 100, '六颗 1 = 8000，加上先前的 100');
  assert.equal(state.roundScore, state.score);
});

test('a bust under the suspensor scatters the whole table', () => {
  const state = fresh();
  state.level = 28;
  initLevel(state);
  state.score = 250;
  state.stats.levelScore = 250;
  state.roundScore = 250;

  // 2 · 3 · 4 · 6 · 2 · 3：没有 1、没有 5、没有三连——必翻。
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  state.phase = 'ready';
  state.rerolls = 4;
  const result = rollDice(state, { free: true, rng: () => seq[i++ % seq.length] });
  assert.equal(result.bust, 250);
  assert.equal(state.score, 0, '整桌清零，不只是本轮');
  assert.equal(state.lastBust.floating, true);
  assert.equal(state.roundScore, 0);
});

test('the same bust on a normal table only burns the round', () => {
  const state = fresh();
  initLevel(state);
  state.score = 250;
  state.roundScore = 100;
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  state.phase = 'ready';
  state.rerolls = 4;
  const result = rollDice(state, { free: true, rng: () => seq[i++ % seq.length] });
  assert.equal(result.bust, 100);
  assert.equal(state.score, 150, '此前的回合已经落袋');
});

test('floating points still pay the overshoot bounty once they settle', () => {
  const state = fresh();
  state.level = 28;
  initLevel(state);
  state.target = 100;
  state.score = 400; // 4 倍目标 → 天胡
  state.rerolls = 2;
  assert.equal(cashOutValue(state).tier.key, 'miracle');
  assert.equal(cashOutValue(state).total, 2 * REROLL_REFUND + 140);

  // 赏金和分数在同一个时刻兑现：落秤（过关）时一起到账。
  advanceLevel(state);
  assert.equal(state.levelReward.total, getLevelConfig(28).reward + 2 * REROLL_REFUND + 140);
});

test('silencing the suspensor is enough to stop the floating', () => {
  const state = fresh();
  state.bossWardArmed = true;
  state.level = 28;
  initLevel(state);
  assert.equal(state.flags.bossDisabled, true);
  assert.equal(isFloatingScore(state), false);
});

test('a dealer level records the coefficient that paid it', () => {
  const state = fresh();
  state.level = 3;
  initLevel(state);
  state.target = 10;
  state.score = 100;
  state.rerolls = 0;
  advanceLevel(state);
  const cfg = getLevelConfig(3);
  assert.equal(state.levelReward.base, cfg.reward);
  assert.equal(state.levelReward.curveBase, cfg.curve.reward);
  assert.equal(state.levelReward.bossPremium, cfg.reward - cfg.curve.reward);
  assert.equal(state.levelReward.bossName, '腐牙伯爵');
  assert.ok(state.levelReward.bossPremium > 0);

  const minion = fresh();
  minion.level = 4;
  initLevel(minion);
  minion.target = 10;
  minion.score = 100;
  minion.rerolls = 0;
  advanceLevel(minion);
  assert.equal(minion.levelReward.bossPremium, 0);
  assert.equal(minion.levelReward.curveBase, minion.levelReward.base);
});
