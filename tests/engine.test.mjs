import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, rollDice, applyScore, initLevel, targetForLevel,
  effectiveProbs, useItem, canUseItem, createShop, buyDie,
  buyBarrel, buyItem, leaveShop, applyGesture, getDiceCapacity,
  openShop, refreshSection, getBarrel, BASE_REROLLS, advanceLevel,
} from '../src/engine.js';
import { makeRng } from '../src/engine.js';

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
  assert.equal(state.levelReward.total, 80);
  openShop(state);
  leaveShop(state);
  assert.equal(state.level, 4);
  assert.equal(state.rerolls, BASE_REROLLS + 1);
});

test('pentagram gesture arms a 25% bonus for the current throw', () => {
  const state = fresh();
  state.barrelId = 'pentagram';
  state.phase = 'ready';
  const result = applyGesture(state, 'pentagram');
  assert.equal(result.ok, true);
  assert.equal(state.flags.starArmed, true);
  rollDice(state);
  assert.equal(state.flags.starBonus, true);
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

test('target uses astral two-piece discount', () => {
  const state = fresh();
  const base = targetForLevel(state, 8);
  state.bag[0].dieId = 'astral_dust';
  state.bag[1].dieId = 'astral_comet';
  const discounted = targetForLevel(state, 8);
  assert.equal(discounted, Math.ceil(base * 0.9));
});
