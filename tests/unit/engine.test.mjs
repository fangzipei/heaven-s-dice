import { describe, expect, test } from "vitest";

import {
  createRun, rollDice, applyScore, initLevel, targetForLevel,
  effectiveProbs, useItem, canUseItem, createShop, buyDie,
  buyBarrel, buyItem, leaveShop, applyGesture, getDiceCapacity,
  openShop, refreshSection, refreshCost, getBarrel, BASE_REROLLS, advanceLevel,
  buildScore, syncBag, getScorePreview, hasItemEverBeenTaken,
  activeBoss, isBossDieBlocked, handTypeOf, sellItem, canSellItem, itemSellPrice,
  bossEffectKey, shopSlots, isFloatingScore, resolveSaltOffer, activeItemCapacity,
  bustRound, setTwoFaceFaces, resolveLoanOffer, settleFloatingBust,
  devilRetry, devilRetryCost, selectBestScoring,
} from '../../src/core/engine.ts';
import { makeRng, cashOutValue } from '../../src/core/engine.ts';
import {
  REROLL_BONUS_RATE, OVERSHOOT_BONUS_RATE, LEVELS, getLevelConfig, ITEM_BY_ID, DICE_BY_ID, DEFAULT_BOSS_PLAN,
  BOSS_SLOTS, BOSS_BY_ID, rollBossPlan,
} from '../../src/content/index.ts';

function fresh(seed = 42) {
  const state = createRun({ rng: makeRng(seed) });
  state.bossPlan = { ...DEFAULT_BOSS_PLAN };
  return state;
}

function forceRoll(state, values) {
  state.dice.forEach((die, i) => {
    die.value = values[i] ?? 1;
    die.scored = false;
  });
  state.selected = [];
  state.phase = 'selecting';
}

test('a new run starts with zero coins and a 500-point first target', () => {
  const state = fresh();
  expect(state.coins).toBe(0);
  expect(state.level).toBe(1);
  expect(state.target).toBe(500);
  expect(getLevelConfig(2).target).toBe(1000);
});

test('opening throw is free, later throws spend the three fixed rerolls', () => {
  const state = fresh();
  expect(state.rerolls).toBe(3);
  const first = rollDice(state);
  expect(first.ok).toBe(true);
  expect(state.rerolls).toBe(3);
  state.phase = 'dead';
  rollDice(state);
  expect(state.rerolls).toBe(2);
});

test('run-best single hit survives level resets', () => {
  const state = fresh();
  state.stats.bestHit = 4321;
  initLevel(state);
  expect(state.stats.bestHit).toBe(4321);
  expect(state.stats.levelRolls).toBe(0);
});

test('score and continue rerolls only the remaining dice', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  const ones = state.dice.filter((d) => d.value === 1 || d.value === 5);
  state.selected = ones.map((d) => d.uid);
  const before = state.rerolls;
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(result.total).toBe(150);
  expect(result.reroll).toBe(true);
  expect(result.rerollAll).toBe(false);
  expect(state.score).toBe(150);
  expect(state.roundScore).toBe(150);
  expect(state.phase).toBe('reroll-pending');
  expect(state.rerolls).toBe(before);
  const scoredUids = ones.map((d) => d.uid);
  const roll = rollDice(state);
  expect(roll.ok).toBe(true);
  expect(state.rerolls).toBe(before);
  expect(state.dice.filter((d) => scoredUids.includes(d.uid)).every((d) => d.scored)).toBeTruthy();
  expect(state.dice.filter((d) => !d.scored).length).toBe(4);
});

test('scoring records each combo with its faces and points', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  expect(state.scoreHistory).toHaveLength(2);
  expect(state.scoreHistory.map((entry) => entry.faces)).toEqual([[1], [5]]);
  expect(state.scoreHistory.map((entry) => entry.points)).toEqual([100, 50]);
  expect(state.scoreHistory.every((entry) => entry.level === 1 && entry.throw === 1)).toBe(true);
});

test('the rule hover counter tracks jokers that took part in a scored hand', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [4, 4, 4, 4, 2, 3]);
  state.dice[0].wild = true;
  state.selected = state.dice.slice(0, 4).map((d) => d.uid);
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(state.flags.wildScored).toBe(1);
});

test('score and continue stays free even with no reroll tokens', () => {
  const state = fresh();
  state.target = 9999;
  state.rerolls = 0;
  state.maxRerolls = 0;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(state.phase).toBe('reroll-pending');
  const roll = rollDice(state);
  expect(roll.ok).toBe(true);
  expect(state.rerolls).toBe(0);
  expect(applyScore(state, 'reroll').ok).toBe(false);
});

test('a dead reroll burns the whole unbanked round', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  expect(state.score).toBe(150);
  expect(state.roundScore).toBe(150);
  const seq = [0.2, 0.4, 0.6, 0.95]; // the four remaining dice become 2/3/4/6
  const roll = rollDice(state, { rng: () => seq.shift() ?? 0.95 });
  expect(roll.ok).toBe(true);
  expect(roll.bust).toBe(150);
  expect(state.phase).toBe('dead');
  expect(state.score).toBe(0);
  expect(state.roundScore).toBe(0);
  expect(state.lastBust.lost).toBe(150);
});

test('a dead reroll puts every die back on the table', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  // Two dice are set aside, then the four remaining dice bust.
  const deadSeq = [0.2, 0.4, 0.6, 0.95];
  const bust = rollDice(state, { rng: () => deadSeq.shift() ?? 0.95 });
  expect(bust.bust).toBe(150);
  expect(state.phase).toBe('dead');
  // The next throw must reset the two scored dice as well, not only the four
  // dice that were just rolled.
  const seq = [0.2, 0.4, 0.6, 0.8, 0.3, 0.9];
  const next = rollDice(state, { rng: () => seq.shift() ?? 0.5 });
  expect(next.ok).toBe(true);
  expect(state.dice.length).toBe(6);
  expect(state.dice.every((die) => !die.scored)).toBe(true);
  expect(state.dice.every((die) => die.value != null)).toBe(true);
});

test('a scoring throw keeps the whole round at risk until a later bust', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  expect(state.score).toBe(150);
  expect(state.roundScore).toBe(150);
  const scoringSeq = [0.01, 0.2, 0.4, 0.6]; // remaining dice become 1/2/3/4
  const roll = rollDice(state, { rng: () => scoringSeq.shift() ?? 0.2 });
  expect(roll.ok).toBe(true);
  expect(state.phase).toBe('selecting');
  expect(state.score).toBe(150);
  expect(state.roundScore).toBe(150);
  const newOne = state.dice.find((d) => d.value === 1 && !d.scored);
  state.selected = [newOne.uid];
  const second = applyScore(state, 'continue');
  expect(second.total).toBe(100);
  expect(state.score).toBe(250);
  expect(state.roundScore).toBe(250);
  const deadSeq = [0.2, 0.4, 0.6]; // remaining 2/3/4
  const bust = rollDice(state, { rng: () => deadSeq.shift() ?? 0.6 });
  expect(bust.bust).toBe(250);
  expect(state.score).toBe(0);
  expect(state.roundScore).toBe(0);
});

test('score and reroll banks the whole round and starts a fresh one', () => {
  const state = fresh();
  state.target = 9999;
  forceRoll(state, [1, 5, 2, 3, 4, 6]);
  state.selected = state.dice.filter((d) => d.value === 1 || d.value === 5).map((d) => d.uid);
  applyScore(state, 'continue');
  const scoringSeq = [0.01, 0.2, 0.4, 0.6];
  rollDice(state, { rng: () => scoringSeq.shift() ?? 0.2 });
  const newOne = state.dice.find((d) => d.value === 1 && !d.scored);
  state.selected = [newOne.uid];
  const banked = applyScore(state, 'reroll');
  expect(banked.total).toBe(100);
  expect(state.roundScore).toBe(0);
  expect(state.score).toBe(250);
  const deadSeq = [0.2, 0.4, 0.6, 0.95, 0.2, 0.4];
  const bust = rollDice(state, { rng: () => deadSeq.shift() ?? 0.4 });
  expect(bust.bust).toBe(0);
  expect(state.score).toBe(250);
});

test('hot dice resets all six dice for a free reroll', () => {
  const state = fresh();
  state.target = 99999;
  forceRoll(state, [1, 1, 1, 1, 1, 1]);
  state.selected = state.dice.map((d) => d.uid);
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(result.hot).toBe(true);
  // 六条 1 原为 8000，本关第一次全骰把这一手连乘到 9600。
  expect(result.total).toBe(9600);
  expect(result.hotCount).toBe(1);
  expect(result.hotMultiplier).toBeCloseTo(1.2);
  expect(state.phase).toBe('hot');
  expect(state.dice.every((d) => !d.scored && d.value == null)).toBeTruthy();
});

test('score and reroll brings all six dice back and spends one reroll', () => {
  const state = fresh();
  state.target = 99999;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const before = state.rerolls;
  const result = applyScore(state, 'reroll');
  expect(result.ok).toBe(true);
  expect(result.reroll).toBe(true);
  expect(result.rerollAll).toBe(true);
  expect(state.phase).toBe('reroll-pending');
  expect(state.rerolls).toBe(before);
  const roll = rollDice(state);
  expect(roll.ok).toBe(true);
  expect(state.rerolls).toBe(before - 1);
  expect(state.dice.every((d) => !d.scored && d.value >= 1)).toBeTruthy();
  expect(state.dice.filter((d) => d.scored).length).toBe(0);
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
  expect(result.ok).toBe(true);
  expect(result.settled).toBe(true);
  expect(state.score).toBe(100);
  expect(state.roundScore).toBe(0);
  expect(state.phase).toBe('lost');
  expect(applyScore(state, 'continue').ok).toBe(false);
});

test('lucky coin adds 250 points and is consumed for good', () => {
  const state = fresh();
  const itemId = 'lucky_coin';
  expect(canUseItem(state, itemId).ok).toBe(true);
  const result = useItem(state, itemId);
  expect(result.ok).toBe(true);
  expect(state.score).toBe(250);
  expect(state.activeItems.includes(itemId)).toBe(false);
  expect(state.itemCharges[itemId]).toBe(undefined);
  expect(canUseItem(state, itemId).ok).toBe(false);
});

test('barrel probabilities normalise and bias faces', () => {
  const oak = effectiveProbs('standard', 'oak');
  const lead = effectiveProbs('standard', 'lead');
  expect(oak.length).toBe(6);
  expect(Math.abs(oak.reduce((a, b) => a + b, 0) - 1) < 1e-9).toBeTruthy();
  expect(lead[0] > lead[1]).toBeTruthy();
  expect(lead[4] > lead[1]).toBeTruthy();
});

test('early shop dice follow the 65 / 27 / 7 / 1 rarity split', () => {
  const state = fresh(11);
  state.level = 1;
  const rng = makeRng(20261027);
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < 2000; i += 1) {
    const shop = createShop(state, { rng });
    for (const offer of shop.dice) counts[DICE_BY_ID[offer.id].rarity] += 1;
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  expect(total).toBe(4000);
  expect(counts.common / total).toBeGreaterThan(0.62);
  expect(counts.common / total).toBeLessThan(0.74);
  expect(counts.rare / total).toBeGreaterThan(0.18);
  expect(counts.rare / total).toBeLessThan(0.30);
  expect(counts.epic / total).toBeGreaterThan(0.04);
  expect(counts.epic / total).toBeLessThan(0.10);
  expect(counts.legendary / total).toBeLessThanOrEqual(0.02);
});

test('shop offers 2 dice, 1 barrel, 3 items and purchases deduct coins', () => {  const state = fresh();
  state.level = 2;
  initLevel(state);
  state.score = state.target;
  state.phase = 'won';
  createShop(state);
  expect(state.shop.dice.length).toBe(2);
  expect(state.shop.barrel.length).toBe(1);
  expect(state.shop.item.length).toBe(3);
  const dieIndex = state.shop.dice.findIndex((entry) => entry.id && !entry.sold);
  expect(dieIndex >= 0).toBeTruthy();
  const dieOffer = state.shop.dice[dieIndex];
  state.coins += 100;
  const beforeCoins = state.coins;
  const replacement = state.bag[0].uid;
  const result = buyDie(state, dieIndex, replacement);
  expect(result.ok).toBe(true);
  expect(state.coins < beforeCoins).toBeTruthy();
  expect(state.bag.some((entry) => entry.dieId === dieOffer.id)).toBeTruthy();
});

test('barrel purchase swaps the current cup', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  createShop(state);
  const index = state.shop.barrel.findIndex((entry) => entry.id);
  if (index >= 0) {
    const result = buyBarrel(state, index);
    expect(result.ok).toBe(true);
    expect(getBarrel(state).id).not.toBe('oak');
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
    expect(result.ok).toBe(true);
    expect(state.bag.length).toBe(getDiceCapacity(state));
    expect(state.bag.length).toBe(7);
  }
});

test('reaching the target stays open until the player advances', () => {
  const state = fresh();
  state.target = 10;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(result.targetReached).toBe(true);
  expect(state.targetReached).toBe(true);
  expect(state.phase).toBe('reroll-pending');
  expect(state.phase).not.toBe('won');
  expect(advanceLevel(state).ok).toBe(true);
  expect(state.phase).toBe('won');
});

test('advanceLevel refuses a score below target', () => {
  const state = fresh();
  state.target = 1000;
  state.score = 999;
  const result = advanceLevel(state);
  expect(result.ok).toBe(false);
  expect(state.phase).toBe('ready');
});

test('defeating a boss never raises the reroll budget', () => {
  const state = fresh(7);
  state.level = 3;
  initLevel(state);
  state.target = 10;
  state.score = 9;
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const result = applyScore(state, 'continue');
  expect(result.ok).toBe(true);
  expect(state.targetReached).toBe(true);
  expect(state.phase).not.toBe('won');
  const advance = advanceLevel(state);
  expect(advance.ok).toBe(true);
  expect(state.phase).toBe('won');
  expect(state.roundScore).toBe(0);
  const cfg3 = getLevelConfig(3);
  const perReroll = Math.round(cfg3.reward * REROLL_BONUS_RATE);
  const overshoot = Math.round(cfg3.reward * OVERSHOOT_BONUS_RATE);
  expect(state.levelReward.total).toBe(Math.round((cfg3.reward + state.rerolls * perReroll + overshoot) * 1.1));
  expect(state.levelReward.bonuses.some((b) => b.label.includes('未用重投'))).toBeTruthy();
  expect(state.levelReward.bonuses.some((b) => b.label.includes('超过目标'))).toBeTruthy();
  openShop(state);
  leaveShop(state);
  expect(state.level).toBe(4);
  expect(state.rerolls).toBe(BASE_REROLLS);
});

test('pentagram gesture arms one 20% bonus per level', () => {
  const state = fresh();
  state.barrelId = 'pentagram';
  state.phase = 'ready';
  const result = applyGesture(state, 'pentagram');
  expect(result.ok).toBe(true);
  expect(state.flags.starArmed).toBe(true);
  expect(state.flags.starUsed).toBe(true);
  rollDice(state);
  expect(state.flags.starBonus).toBe(true);
  const second = applyGesture(state, 'pentagram');
  expect(second.ok).toBe(false);
  expect(second.error).toMatch(/每关/);
  initLevel(state);
  expect(state.flags.starUsed).toBe(false);
  expect(applyGesture(state, 'pentagram').ok).toBe(true);
});

test('vortex gesture grants one extra reroll per level', () => {
  const state = fresh();
  state.barrelId = 'vortex';
  const before = state.rerolls;
  const result = applyGesture(state, 'circle');
  expect(result.ok).toBe(true);
  expect(state.rerolls).toBe(before + 1);
  expect(state.maxRerolls).toBe(before + 1);
  expect(state.flags.vortexUsed).toBe(true);
  const second = applyGesture(state, 'circle');
  expect(second.ok).toBe(false);
});

test('target is the level config and nothing else', () => {
  const state = fresh();
  state.bag[0].dieId = 'astral_dust';
  state.bag[1].dieId = 'astral_comet';
  expect(targetForLevel(state, 8)).toBe(LEVELS[7].target);
});

test('wolf two-piece pays for every scored 3', () => {
  const state = fresh();
  state.bag[0].dieId = 'wolf_whelp';
  state.bag[1].dieId = 'wolf_bloodmoon';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  expect(score.valid).toBe(true);
  expect(score.breakdown.base).toBe(300);
  expect(score.breakdown.flats.some(
    (flat) => flat.label === '狼裔 2 件 · 每颗 3 +80' && flat.value === 240,
  )).toBeTruthy();
});

test('wolf four-piece adds the triple-three bonus', () => {
  const state = fresh();
  ['wolf_whelp', 'wolf_bloodmoon', 'wolf_alpha', 'wolf_ancestor'].forEach((id, i) => {
    state.bag[i].dieId = id;
  });
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  expect(score.breakdown.flats.some(
    (flat) => flat.label === '狼裔 4 件 · 三条 3 加成' && flat.value === 800,
  )).toBeTruthy();
});

test('a demon joker cannot score alone but completes a triple', () => {
  const state = fresh();
  state.bag[0].dieId = 'demon_taxman';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 1, 2, 3, 4]);
  state.dice[0].wild = true;
  state.selected = [state.dice[0].uid];
  expect(buildScore(state, 'reroll').valid).toBe(false);
  state.selected = state.dice.slice(0, 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  expect(score.valid).toBe(true);
  expect(score.breakdown.base).toBe(1000);
});

test('seven dice: 1-6 plus a spare 1 still scores, even when the 1 is a joker', () => {
  const natural = fresh();
  natural.passiveItems = ['dice_bag'];
  syncBag(natural);
  initLevel(natural);
  forceRoll(natural, [1, 2, 3, 4, 5, 6, 1]);
  natural.selected = natural.dice.map((d) => d.uid);
  const plain = buildScore(natural, 'continue');
  expect(plain.valid).toBe(true);
  expect(plain.breakdown.base).toBe(1600);

  const joker = fresh();
  joker.passiveItems = ['dice_bag'];
  syncBag(joker);
  initLevel(joker);
  forceRoll(joker, [1, 2, 3, 4, 5, 6, 1]);
  joker.dice[0].wild = true;
  joker.selected = joker.dice.map((d) => d.uid);
  const wild = buildScore(joker, 'continue');
  expect(wild.valid).toBe(true);
  expect(wild.breakdown.base).toBe(1600);
});

test('a joker spent on the straight does not also pay an any-triple bonus', () => {
  const state = fresh();
  state.bag[0].dieId = 'jack';
  state.bag[1].dieId = 'demon_imp';
  state.passiveItems = ['dice_bag'];
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 1, 1, 1, 1, 2, 4]);
  state.dice[1].wild = true;
  state.selected = state.dice.map((d) => d.uid);
  const score = buildScore(state, 'continue');
  expect(score.valid).toBe(true);
  expect(score.breakdown.base).toBe(700);
  expect(score.breakdown.flats.some((flat) => flat.label.includes('骰王'))).toBe(false);
});

test('demon set bonus multiplies only when a joker is used', () => {
  const state = fresh();
  state.bag[0].dieId = 'demon_imp';
  state.bag[1].dieId = 'demon_taxman';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 1, 1, 2, 3, 4]);
  state.dice[0].wild = true;
  state.selected = state.dice.slice(0, 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  expect(score.breakdown.multipliers.some((m) => m.value === 1.10)).toBeTruthy();
  expect(score.total).toBe(Math.round(1000 * 1.10));
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
  expect(useItem(state, 'glove').ok).toBe(true);
  expect(state.dice[0].wild).toBe(true);
  expect(state.dice[0].value).toBe(1);
  expect(state.activeItems).not.toContain('glove');
  expect(state.itemCharges.glove).toBe(undefined);
});

test('face-score barrel pays per scored face plus a triple bonus', () => {
  const state = fresh();
  state.barrelId = 'wolf_totem';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [3, 3, 3, 1, 2, 4]);
  state.selected = state.dice.filter((d) => d.value === 3).map((d) => d.uid);
  const score = buildScore(state, 'reroll');
  expect(score.breakdown.base).toBe(300);
  expect(score.breakdown.flats.some((f) => f.label.includes('狼图腾桶 · 3 颗 3') && f.value === 150)).toBeTruthy();
  expect(score.breakdown.flats.some((f) => f.label.includes('狼图腾桶 · 三条 3') && f.value === 150)).toBeTruthy();
  expect(score.total).toBe(600);
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
  expect(score.breakdown.base).toBe(1000);
  expect(score.breakdown.flats.some((f) => f.label.includes('恶魔契桶') && f.value === 60)).toBeTruthy();
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
  expect(score.valid).toBe(true);
  expect(score.breakdown.base).toBe(200);
  expect(score.total).toBe(200);
});

test('once-only dice items cannot be taken twice, even if re-offered', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  state.shop = null;
  createShop(state);
  state.shop.item = [{ kind: 'item', id: 'dice_bag', sold: false }];
  expect(buyItem(state, 0).ok).toBe(true);
  expect(state.passiveItems.includes('dice_bag')).toBe(true);
  expect(hasItemEverBeenTaken(state, 'dice_bag')).toBe(true);
  expect(getDiceCapacity(state)).toBe(7);
  // Simulate a stock reshuffle that puts the same unique item back on the shelf.
  state.coins = 500;
  state.shop.item = [{ kind: 'item', id: 'dice_bag', sold: false }];
  const second = buyItem(state, 0);
  expect(second.ok).toBe(false);
  expect(second.error).toMatch(/只能获取一次/);
  expect(state.passiveItems.filter((id) => id === 'dice_bag').length).toBe(1);
  expect(getDiceCapacity(state)).toBe(7);
});

test('cracked pouch trades a die for a permanent score multiplier', () => {
  const state = fresh();
  state.coins = 500;
  state.phase = 'won';
  state.shop = null;
  createShop(state);
  state.shop.item = [{ kind: 'item', id: 'cracked_pouch', sold: false }];
  expect(buyItem(state, 0).ok).toBe(true);
  expect(getDiceCapacity(state)).toBe(5);
  expect(state.bag.length).toBe(5);
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  const one = state.dice.find((d) => d.value === 1);
  state.selected = [one.uid];
  const preview = getScorePreview(state);
  expect(preview.reroll.breakdown.base).toBe(100);
  expect(preview.reroll.total).toBe(125);
  state.shop.item = [{ kind: 'item', id: 'cracked_pouch', sold: false }];
  state.coins = 500;
  const second = buyItem(state, 0);
  expect(second.ok).toBe(false);
});

test('carried active items are capped at three', () => {
  const state = fresh();
  state.activeItems = [];
  state.itemCharges = {};
  initLevel(state);
  state.coins = 9999;
  createShop(state);
  for (let i = 0; i < 3; i += 1) {
    state.shop.item[0] = { id: 'glove', sold: false };
    expect(buyItem(state, 0).ok).toBe(true);
  }
  state.shop.item[0] = { id: 'glove', sold: false };
  const fourth = buyItem(state, 0);
  expect(fourth.ok).toBe(false);
  expect(fourth.error).toContain('3');
  expect(state.activeItems.length).toBe(3);
});

test('active shelf adds one active item slot', () => {
  const state = fresh();
  state.activeItems = [];
  state.passiveItems = ['active_shelf'];
  expect(activeItemCapacity(state)).toBe(4);
  state.coins = 9999;
  initLevel(state);
  createShop(state);
  for (let i = 0; i < 4; i += 1) {
    state.shop.item[0] = { id: 'glove', sold: false };
    expect(buyItem(state, 0).ok).toBe(true);
  }
  expect(state.activeItems.length).toBe(4);
});

test('shop refreshes get 30% more expensive each time', () => {
  const state = fresh();
  initLevel(state);
  state.coins = 9999;
  createShop(state);
  expect(refreshCost(state, 'dice')).toBe(20);
  expect(refreshSection(state, 'dice', { rng: () => 0.5 }).ok).toBe(true);
  expect(refreshCost(state, 'dice')).toBe(26);
  expect(refreshSection(state, 'dice', { rng: () => 0.5 }).ok).toBe(true);
  expect(refreshCost(state, 'dice')).toBe(34);
  expect(refreshCost(state, 'barrel')).toBe(26);
  expect(refreshCost(state, 'item')).toBe(22);
});
test('dice packs roll their choices at purchase and keep them on reopen', () => {
  const state = fresh();
  initLevel(state);
  state.coins = 999;
  createShop(state);
  state.shop.item[0] = { kind: 'item', id: 'rare_pair', sold: false };
  expect(buyItem(state, 0).ok).toBe(true);
  state.phase = 'selecting';
  const first = useItem(state, 'rare_pair').grant.candidates.map((die) => die.id);
  expect(state.grantRolls.rare_pair[0]).toEqual(first);
  const second = useItem(state, 'rare_pair').grant.candidates.map((die) => die.id);
  expect(second).toEqual(first);
});

test('boss-only relics never appear in shop item offers', () => {
  const state = fresh();
  initLevel(state);
  state.coins = 9999;
  createShop(state);
  for (let i = 0; i < 80; i += 1) {
    createShop(state);
    for (const offer of state.shop.item) {
      expect(ITEM_BY_ID[offer.id].bossOnly, offer.id).toBeUndefined();
    }
  }
});

test('owned items can be sold for half price only in the shop', () => {
  const state = fresh();
  state.phase = 'shop';
  state.shop = {};
  state.activeItems = ['glove'];
  state.itemCharges = { glove: 1 };
  state.coins = 10;
  const expected = Math.floor(ITEM_BY_ID.glove.price / 2);
  expect(expected).toBe(17);
  expect(canSellItem(state, 'glove').ok).toBe(true);
  const result = sellItem(state, 'glove');
  expect(result.ok).toBe(true);
  expect(result.price).toBe(17);
  expect(state.coins).toBe(10 + result.price);
  expect(state.activeItems.includes('glove')).toBe(false);
  expect(state.itemCharges.glove).toBe(undefined);
  expect(sellItem(state, 'glove').ok).toBe(false);
});

test('selling a dice capacity passive keeps the bag legal', () => {
  const state = fresh();
  state.phase = 'shop';
  state.shop = {};
  state.passiveItems = ['dice_bag'];
  state.acquiredItemIds = ['dice_bag'];
  syncBag(state);
  expect(state.bag.length).toBe(7);
  expect(canSellItem(state, 'dice_bag').ok).toBe(false);
  state.bag.pop();
  expect(canSellItem(state, 'dice_bag').ok).toBe(true);
  expect(sellItem(state, 'dice_bag').ok).toBe(true);
  expect(getDiceCapacity(state)).toBe(6);
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
  expect(buyItem(state, 0).ok).toBe(true);
  expect(buyItem(state, 1).ok).toBe(false);
  expect(state.activeItems.includes('glove')).toBe(true);
});

test('the one-shot boss ward cancels the next boss or the current boss before the first throw', () => {
  const armed = fresh();
  armed.level = 2;
  initLevel(armed);
  armed.activeItems.push('boss_ward');
  armed.itemCharges.boss_ward = 1;
  const use = useItem(armed, 'boss_ward');
  expect(use.ok).toBe(true);
  expect(armed.activeItems.includes('boss_ward')).toBe(false);
  expect(armed.bossWardArmed).toBe(true);
  armed.level = 3;
  initLevel(armed);
  expect(armed.flags.bossDisabled).toBe(true);
  expect(bossEffectKey(armed)).toBe(null);

  const direct = fresh();
  direct.level = 7; // 石心审判官 takes a token away, so the ward visibly hands it back
  initLevel(direct);
  direct.activeItems.push('boss_ward');
  direct.itemCharges.boss_ward = 1;
  const before = direct.rerolls;
  expect(useItem(direct, 'boss_ward').ok).toBe(true);
  expect(direct.flags.bossDisabled).toBe(true);
  expect(direct.rerolls).toBe(before + 1);
  expect(direct.activeItems.includes('boss_ward')).toBe(false);
});

test('boss roster rolls one boss per fixed rarity slot', () => {
  const state = fresh();
  expect([3, 7, 11, 15, 20, 24, 25].map((level) => activeBoss({ ...state, level }).id)).toEqual(['rotfang', 'judge', 'soulsmith', 'ashclerk', 'startax', 'seraph', 'satan']);
  const plans = Array.from({ length: 25 }, (_, i) => rollBossPlan(makeRng(100 + i)));
  expect(new Set(plans.map((plan) => JSON.stringify(plan))).size).toBeGreaterThan(1);
  for (const plan of plans) {
    for (const slot of BOSS_SLOTS) {
      expect(BOSS_BY_ID[plan[slot.level]].rarity).toBe(slot.rarity);
    }
  }
});

test('new boss rules: two/six singles, coin tax, double target and Lucifer ban', () => {
  const twins = fresh();
  twins.level = 3;
  twins.bossPlan = { ...twins.bossPlan, 3: 'twinsix' };
  initLevel(twins);
  forceRoll(twins, [2, 1, 3, 4, 6, 6]);
  twins.selected = [twins.dice[0].uid];
  expect(buildScore(twins, 'reroll').total).toBe(100);
  twins.selected = [twins.dice[1].uid];
  expect(buildScore(twins, 'reroll').valid).toBe(false);

  const toll = fresh();
  toll.level = 3;
  toll.bossPlan = { ...toll.bossPlan, 3: 'toll' };
  initLevel(toll);
  toll.coins = 100;
  forceRoll(toll, [3, 3, 3, 2, 4, 6]);
  toll.selected = toll.dice.slice(0, 3).map((die) => die.uid);
  expect(applyScore(toll, 'reroll').ok).toBe(true);
  expect(toll.coins).toBe(94);

  const mirror = fresh();
  mirror.level = 11;
  mirror.bossPlan = { ...mirror.bossPlan, 11: 'mirror' };
  initLevel(mirror);
  expect(mirror.target).toBe(getLevelConfig(11).target * 2);

  const lucifer = fresh();
  lucifer.level = 20;
  lucifer.bossPlan = { ...lucifer.bossPlan, 20: 'lucifer' };
  initLevel(lucifer);
  expect(rollDice(lucifer, { rng: () => 0 }).ok).toBe(true);
  expect(lucifer.flags.bossBannedType).toBeTruthy();
  expect(lucifer.log.some((entry) => entry.text.includes('路西法封禁'))).toBe(true);
});

test('boss relics change scoring rules instead of adding flat points', () => {
  const plain = fresh();
  forceRoll(plain, [3, 3, 2, 1, 4, 5]);
  plain.selected = plain.dice.slice(0, 2).map((die) => die.uid);
  expect(buildScore(plain, 'reroll').valid).toBe(false);

  const pair = fresh();
  pair.passiveItems = ['pairbane_relic'];
  forceRoll(pair, [3, 3, 2, 1, 4, 5]);
  pair.selected = pair.dice.slice(0, 2).map((die) => die.uid);
  expect(buildScore(pair, 'reroll').total).toBe(150);

  const wildPair = fresh();
  wildPair.passiveItems = ['pairbane_relic'];
  forceRoll(wildPair, [3, 1, 2, 4, 5, 6]);
  wildPair.dice[1].wild = true;
  wildPair.dice[1].value = 0;
  wildPair.selected = [wildPair.dice[0].uid, wildPair.dice[1].uid];
  expect(buildScore(wildPair, 'reroll').total).toBe(150);

  const twins = fresh();
  twins.passiveItems = ['twinsix_relic'];
  forceRoll(twins, [2, 1, 3, 4, 5, 6]);
  twins.selected = [twins.dice[0].uid];
  expect(buildScore(twins, 'reroll').total).toBe(200);

  const seraph = fresh();
  seraph.passiveItems = ['seraph_relic'];
  forceRoll(seraph, [3, 3, 3, 2, 4, 6]);
  seraph.selected = seraph.dice.slice(0, 3).map((die) => die.uid);
  expect(buildScore(seraph, 'reroll').total).toBe(330);

  const toll = fresh();
  toll.passiveItems = ['toll_relic'];
  toll.coins = 0;
  forceRoll(toll, [3, 3, 3, 2, 4, 6]);
  toll.selected = toll.dice.slice(0, 3).map((die) => die.uid);
  expect(applyScore(toll, 'reroll').ok).toBe(true);
  expect(toll.coins).toBe(11);
});

test('the pair-ban boss voids any throw with an exact pair', () => {
  const state = fresh();
  state.level = 11;
  state.bossPlan = { ...state.bossPlan, 11: 'pairbane' };
  initLevel(state);
  forceRoll(state, [3, 3, 2, 4, 5, 6]);
  state.selected = state.dice.slice(0, 2).map((die) => die.uid);
  const result = buildScore(state, 'reroll');
  expect(result.total).toBe(0);
});

test('the seventh die from a dice bag loses half of its scoring share', () => {
  const state = fresh();
  state.passiveItems = ['dice_bag'];
  syncBag(state);
  initLevel(state);
  forceRoll(state, [1, 2, 3, 4, 6, 6, 5]);
  const seventh = state.dice.find((die) => die.bagUid === state.bag[6].uid);
  expect(seventh).toBeTruthy();
  state.selected = [seventh.uid];
  expect(buildScore(state, 'reroll').total).toBe(25);
});

test('the rat blanks every ninth rolled die', () => {
  const state = fresh();
  state.level = 3;
  initLevel(state);
  const first = rollDice(state, { rng: () => 0 });
  expect(first.ok).toBe(true);
  const second = rollDice(state, { rng: () => 0 });
  expect(second.ok).toBe(true);
  const blanks = state.dice.filter((die) => die.blank);
  expect(blanks.length).toBe(1);
  expect(blanks[0].value).toBe(0);
  expect(isBossDieBlocked(state, blanks[0])).toBe(true);
});

test('the star tax judge only lets three-die combinations score', () => {
  const state = fresh();
  state.level = 20;
  initLevel(state);
  forceRoll(state, [5, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  const low = buildScore(state, 'reroll');
  expect(low.valid).toBe(true);
  expect(low.total).toBe(0);
  forceRoll(state, [3, 3, 3, 2, 4, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const triple = buildScore(state, 'reroll');
  expect(triple.total).toBe(300);
});

test('the forge disables all fives', () => {
  const state = fresh();
  state.level = 11;
  initLevel(state);
  forceRoll(state, [5, 5, 1, 2, 3, 4]);
  expect(isBossDieBlocked(state, state.dice[0])).toBe(true);
  state.selected = [state.dice[0].uid];
  expect(buildScore(state, 'reroll').valid).toBe(false);
});

test('the ash clerk rejects repeating the previous hand type', () => {
  const state = fresh();
  state.level = 15;
  initLevel(state);
  forceRoll(state, [3, 3, 3, 2, 4, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const first = buildScore(state, 'reroll');
  expect(handTypeOf(first.analysis)).toBe('triple');
  state.flags.bossLastType = 'triple';
  const repeated = buildScore(state, 'reroll');
  expect(repeated.valid).toBe(true);
  expect(repeated.total).toBe(0);
});

test('the judge removes a reroll, the seraph taxes score without adding one', () => {
  const judge = fresh();
  judge.level = 7;
  initLevel(judge);
  expect(judge.rerolls).toBe(BASE_REROLLS - 1);
  const seraph = fresh();
  seraph.level = 24;
  initLevel(seraph);
  expect(seraph.rerolls).toBe(BASE_REROLLS);
  forceRoll(seraph, [3, 3, 3, 2, 4, 6]);
  seraph.selected = seraph.dice.slice(0, 3).map((die) => die.uid);
  expect(buildScore(seraph, 'reroll').total).toBe(180);
});

test('unspent rerolls cash out as coins on a level win', () => {
  const state = fresh();
  state.level = 1;
  initLevel(state);
  state.target = 100;
  state.score = 100;
  // Spend two of the five tokens, leave three on the table.
  state.rerolls = 3;
  const cfg = getLevelConfig(1);
  const perReroll = Math.round(cfg.reward * REROLL_BONUS_RATE);
  const cash = cashOutValue(state);
  expect(cash.spare).toBe(3);
  expect(cash.refund).toBe(3 * perReroll);
  expect(cash.overshoot).toBe(false);
  advanceLevel(state);
  expect(state.levelReward.total).toBe(Math.round((cfg.reward + 3 * perReroll) * 1.1));
  expect(state.levelReward.bonuses.some((b) => b.label.includes('未用重投 3'))).toBeTruthy();
  const reward = state.levelReward;
  expect(state.pendingCoinGain).toBe(reward);
  openShop(state);
  leaveShop(state);
  expect(state.pendingCoinGain).toBe(reward);
});

test('overshoot only pays when score is strictly above 2× target', () => {
  const state = fresh();
  state.level = 2;
  initLevel(state);
  const cfg = getLevelConfig(2);
  const overshoot = Math.round(cfg.reward * OVERSHOOT_BONUS_RATE);
  state.target = 500;
  state.score = 1000; // exactly 2x does not count
  state.rerolls = 0;
  let cash = cashOutValue(state);
  expect(cash.refund).toBe(0);
  expect(cash.overshoot).toBe(false);
  advanceLevel(state);
  expect(state.levelReward.total).toBe(Math.round(cfg.reward * 1.1));

  const state2 = fresh(3);
  state2.level = 2;
  initLevel(state2);
  state2.target = 500;
  state2.score = 1001;
  state2.rerolls = 0;
  cash = cashOutValue(state2);
  expect(cash.overshoot).toBe(true);
  expect(cash.overshootValue).toBe(overshoot);
  advanceLevel(state2);
  expect(state2.levelReward.total).toBe(Math.round((cfg.reward + overshoot) * 1.1));
  expect(state2.levelReward.bonuses.filter((b) => b.label.includes('超过目标')).length).toBe(1);
});

test('a bare pass earns no overshoot bounty and no refund when rerolls are spent', () => {
  const state = fresh();
  state.level = 4;
  initLevel(state);
  state.target = 750;
  state.score = 750;
  state.rerolls = 0;
  advanceLevel(state);
  expect(state.levelReward.total).toBe(Math.round(getLevelConfig(4).reward * 1.1));
  expect(state.levelReward.bonuses.filter((b) => b.label !== '金币收益 +10%')).toEqual([]);
});

/* ── one-shot consumables ─────────────────────────────────────────────── */

test('reroll items add tokens on top of the base three', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['courage', 'hourglass', 'wager'];
  state.itemCharges.courage = 1;
  state.itemCharges.hourglass = 1;
  state.itemCharges.wager = 1;
  const before = state.rerolls;
  expect(useItem(state, 'courage').ok).toBe(true);
  expect(useItem(state, 'hourglass').ok).toBe(true);
  expect(useItem(state, 'wager').ok).toBe(true);
  expect(state.rerolls).toBe(before + 3);
  expect(state.maxRerolls).toBe(BASE_REROLLS + 3);
  expect(state.activeItems.includes('courage')).toBe(false);
  expect(state.itemCharges.courage).toBe(undefined);
  expect(ITEM_BY_ID.courage.name).toBe('烈酒');
});

test('wager buys a reroll and marks the next score for ×1.6', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['wager'];
  state.itemCharges.wager = 1;
  const before = state.rerolls;
  expect(useItem(state, 'wager').ok).toBe(true);
  expect(state.rerolls).toBe(before + 1);
  expect(state.flags.wagerMark).toBe(true);
  expect(state.activeItems.includes('wager')).toBe(false);

  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  expect(getScorePreview(state).reroll.total).toBe(160);
  expect(applyScore(state, 'continue').ok).toBe(true);
  // The mark is spent, so the following hand scores face value again.
  expect(state.flags.wagerMark).toBe(false);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  expect(getScorePreview(state).reroll.total).toBe(100);
});

test('gambler charm lowers the target by 15%', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['charm'];
  state.itemCharges.charm = 1;
  const target = state.target;
  expect(useItem(state, 'charm').ok).toBe(true);
  expect(state.target).toBe(Math.ceil(target * 0.85));
  expect(state.itemCharges.charm).toBe(0);
});

test('lucky powder pays 150, frees the reroll and vanishes', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['powder'];
  state.itemCharges.powder = 1;
  rollDice(state, { rng: makeRng(7) });
  const before = state.score;
  const result = useItem(state, 'powder');
  expect(result.ok).toBe(true);
  expect(result.rerollFree).toBe(true);
  expect(state.score).toBe(before + 150);
  expect(state.activeItems.includes('powder')).toBe(false);
});

test('powder can only be used after a throw', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['powder'];
  state.itemCharges.powder = 1;
  expect(state.phase).toBe('ready');
  expect(canUseItem(state, 'powder').ok).toBe(false);
  rollDice(state);
  expect(canUseItem(state, 'powder').ok).toBe(true);
});

test('a bust with salt waits for the player, then saves the round', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['salt'];
  state.itemCharges.salt = 1;
  expect(canUseItem(state, 'salt').ok).toBe(false);

  state.score = 300;
  state.roundScore = 100;
  // 2 · 3 · 4 · 6 · 2 · 3 — no 1s, no 5s, no triple: a guaranteed bust.
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  const result = rollDice(state, { rng: () => seq[i++ % seq.length] });
  expect(result.ok).toBe(true);
  expect(result.bust).toBe(0);
  expect(result.saltOffer).toBe(true);
  expect(state.flags.saltOffer).toBe(true);
  expect(state.score).toBe(300);
  expect(state.roundScore).toBe(100);
  expect(state.activeItems.includes('salt')).toBe(true);

  const saved = resolveSaltOffer(state, true);
  expect(saved.ok).toBe(true);
  expect(saved.saved).toBe(100);
  expect(state.score).toBe(300);
  expect(state.roundScore).toBe(0);
  expect(state.flags.saltOffer).toBe(false);
  expect(state.activeItems.includes('salt')).toBe(false);
  expect(state.lastBust.saved).toBe(100);
});

test('declining salt burns the round like any other bust', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['salt'];
  state.itemCharges.salt = 1;
  state.score = 300;
  state.roundScore = 100;
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  rollDice(state, { rng: () => seq[i++ % seq.length] });
  const lost = resolveSaltOffer(state, false);
  expect(lost.ok).toBe(true);
  expect(lost.lost).toBe(100);
  expect(state.score).toBe(200);
  expect(state.flags.saltOffer).toBe(false);
  // The salt was not spent, so it stays in the bag for a later bust.
  expect(state.activeItems.includes('salt')).toBe(true);
});

test('a salt offer still holds the level open when no rerolls are left', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['salt'];
  state.itemCharges = { salt: 1 };
  state.rerolls = 0;
  state.score = 100;
  state.target = 500;
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  rollDice(state, { rng: () => seq[i++ % seq.length] });
  expect(state.phase).not.toBe('lost');
  resolveSaltOffer(state, false);
  expect(state.phase).toBe('lost');
});

test('a bust without salt still burns the provisional round', () => {
  const state = fresh();
  initLevel(state);
  state.score = 300;
  state.roundScore = 100;
  const seq = [0.2, 0.35, 0.55, 0.9, 0.25, 0.4];
  let i = 0;
  const result = rollDice(state, { rng: () => seq[i++ % seq.length] });
  expect(result.bust).toBe(100);
  expect(state.score).toBe(200);
});

test('blood contract costs 100 points on every scoring action', () => {
  const state = fresh();
  initLevel(state);
  state.activeItems = ['blood_contract'];
  state.itemCharges.blood_contract = 1;
  expect(useItem(state, 'blood_contract').ok).toBe(true);
  forceRoll(state, [1, 2, 3, 4, 6, 6]);
  state.selected = [state.dice[0].uid];
  const before = state.score;
  expect(applyScore(state, 'continue').ok).toBe(true);
  // A bare ace scores 100, the contract adds +35% (135), then bills 100: 35.
  expect(state.score).toBe(before + Math.round(100 * 1.35) - 100);
  expect(state.log.some((entry) => entry.text.includes('血契') && entry.text.includes('100'))).toBeTruthy();
});

/* ── shelf passives ───────────────────────────────────────────────────── */

test('shelf passives each open one extra shop slot', () => {
  const state = fresh();
  expect(shopSlots(state)).toEqual({ dice: 2, barrel: 1, item: 3 });
  state.passiveItems = ['shelf_dice'];
  expect(shopSlots(state).dice).toBe(3);
  state.passiveItems = ['shelf_barrel'];
  expect(shopSlots(state).barrel).toBe(2);
  state.passiveItems = ['shelf_item'];
  expect(shopSlots(state).item).toBe(4);
});

test('a shelf passive really stocks the extra offer', () => {
  const bare = fresh();
  createShop(bare);
  expect(bare.shop.dice.length).toBe(2);
  expect(bare.shop.barrel.length).toBe(1);
  expect(bare.shop.item.length).toBe(3);

  const stocked = fresh();
  stocked.passiveItems = ['shelf_dice', 'shelf_barrel', 'shelf_item'];
  createShop(stocked);
  expect(stocked.shop.dice.length).toBe(3);
  expect(stocked.shop.barrel.length).toBe(2);
  expect(stocked.shop.item.length).toBe(4);
});

/* ── any-triple dice ──────────────────────────────────────────────────── */

test('any-triple dice raise the whole hand by a percentage', () => {
  const state = fresh();
  state.bag[0].dieId = 'even_twin';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [2, 2, 2, 1, 5, 6]);
  state.selected = state.dice.slice(0, 3).map((die) => die.uid);
  const score = buildScore(state, 'reroll');
  expect(score.valid).toBe(true);
  expect(score.breakdown.multipliers.some((entry) => entry.value === '+40%')).toBeTruthy();
  expect(score.total).toBe(280);

  // No triple, no bonus.
  forceRoll(state, [2, 2, 1, 1, 5, 6]);
  state.selected = state.dice.filter((die) => die.value === 1 || die.value === 5).map((die) => die.uid);
  const plain = buildScore(state, 'reroll');
  expect(plain.breakdown.multipliers.some((entry) => entry.value === '+40%')).toBe(false);
});

/* ── 悬秤人：漂浮分 ───────────────────────────────────────────────────── */

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
  expect(result.bust).toBe(100);
  expect(state.score).toBe(150);
});

test('floating points still pay the overshoot bounty once they settle', () => {
  const state = fresh();
  state.level = 28;
  initLevel(state);
  state.target = 100;
  state.score = 400; // 4× target: still the single 2× overshoot bonus
  state.rerolls = 2;
  const cfg = getLevelConfig(28);
  const perReroll = Math.round(cfg.reward * REROLL_BONUS_RATE);
  const overshoot = Math.round(cfg.reward * OVERSHOOT_BONUS_RATE);
  expect(cashOutValue(state).overshoot).toBe(true);
  expect(cashOutValue(state).total).toBe(2 * perReroll + overshoot);

  // 赏金和分数在同一个时刻兑现：落秤（过关）时一起到账。
  advanceLevel(state);
  expect(state.levelReward.total).toBe(Math.round((cfg.reward + 2 * perReroll + overshoot) * 1.1));
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
  expect(state.levelReward.base).toBe(cfg.reward);
  expect(state.levelReward.curveBase).toBe(cfg.curve.reward);
  expect(state.levelReward.bossPremium).toBe(cfg.reward - cfg.curve.reward);
  expect(state.levelReward.bossName).toBe('腐牙伯爵');
  expect(state.levelReward.bossPremium > 0).toBeTruthy();

  const minion = fresh();
  minion.level = 4;
  initLevel(minion);
  minion.target = 10;
  minion.score = 100;
  minion.rerolls = 0;
  advanceLevel(minion);
  expect(minion.levelReward.bossPremium).toBe(0);
  expect(minion.levelReward.curveBase).toBe(minion.levelReward.base);
});

test('devil retries cost 100, 1000 and 10000; the receipt resets the count', () => {
  const state = fresh();
  state.phase = 'lost';
  state.coins = 5000;
  expect(devilRetryCost(state)).toBe(100);
  expect(devilRetry(state).ok).toBe(true);
  expect(state.coins).toBe(4900);
  expect(state.retryCount).toBe(1);
  state.phase = 'lost';
  expect(devilRetryCost(state)).toBe(1000);
  expect(devilRetry(state).ok).toBe(true);
  expect(state.retryCount).toBe(2);
  state.phase = 'lost';
  expect(devilRetryCost(state)).toBe(10000);
  state.activeItems = ['devil_reset'];
  state.itemCharges = { devil_reset: 1 };
  expect(useItem(state, 'devil_reset').ok).toBe(true);
  expect(state.retryCount).toBe(0);
});

test('floating bust stays pending until a real reroll or settlement', () => {
  const state = fresh();
  state.flags.floatingBustPending = true;
  state.phase = 'dead';
  state.roundScore = 500;
  state.score = 700;
  const settled = settleFloatingBust(state);
  expect(settled.ok).toBe(true);
  expect(settled.lost).toBe(500);
  expect(state.roundScore).toBe(0);
  expect(state.phase).toBe('lost');
});

test('smoke only rerolls the dice that have not scored yet', () => {
  const state = fresh();
  state.activeItems = ['smoke'];
  state.itemCharges = { smoke: 1 };
  initLevel(state);
  forceRoll(state, [5, 2, 2, 3, 4, 6]);
  state.dice[0].scored = true;
  const scoredUid = state.dice[0].uid;
  state.phase = 'selecting';
  expect(useItem(state, 'smoke').ok).toBe(true);
  expect(state.flags.smokeReroll).toBe(true);
  const result = rollDice(state, { free: true, forced: [6, 6, 6, 6, 6] });
  expect(result.ok).toBe(true);
  const kept = state.dice.find((die) => die.uid === scoredUid);
  expect(kept.value).toBe(5);
  expect(kept.scored).toBe(true);
  for (const die of state.dice.filter((entry) => entry.uid !== scoredUid)) expect(die.value).toBe(6);
});

test('stargazer and caravan sets unlock their unique mechanics', () => {
  const star = fresh();
  star.bag[0].dieId = 'ladder';
  star.bag[1].dieId = 'mirror';
  syncBag(star);
  initLevel(star);
  forceRoll(star, [1, 2, 3, 4, 5, 6]);
  star.selected = star.dice.slice(0, 5).map((die) => die.uid);
  expect(buildScore(star, 'reroll').breakdown.flats.some(
    (flat) => flat.label === '星轨 2 件 · 两种点数' && flat.value === 200,
  )).toBe(true);

  const caravan = fresh();
  ['gilded_trace', 'last_road', 'balance', 'merchant'].forEach((id, i) => { caravan.bag[i].dieId = id; });
  syncBag(caravan);
  initLevel(caravan);
  caravan.phase = 'lost';
  caravan.coins = 0;
  expect(devilRetryCost(caravan)).toBe(0);
  expect(devilRetry(caravan).ok).toBe(true);
  expect(caravan.caravanFreeRetryUsed).toBe(true);
});

test('hint selection chooses the highest-scoring legal dice subset', () => {
  const state = fresh();
  initLevel(state);
  forceRoll(state, [1, 5, 1, 5, 1, 5]);
  const result = selectBestScoring(state);
  expect(result.ok).toBe(true);
  expect(result.total).toBeGreaterThan(0);
  expect(state.selected.length).toBeGreaterThan(0);
  expect(buildScore(state, 'continue').valid).toBe(true);
});

test('floating score must be locked by a scoring action before advancing', () => {
  const state = fresh();
  state.level = 20;
  state.bossPlan = { ...state.bossPlan, 20: 'suspensor' };
  initLevel(state);
  state.score = state.target;
  state.phase = 'selecting';
  expect(advanceLevel(state).ok).toBe(false);
  state.flags.floatingLocked = true;
  expect(advanceLevel(state).ok).toBe(true);
});

test('glove can rescue a dead throw and reopens scoring', () => {
  const state = fresh();
  state.activeItems = ['glove'];
  state.itemCharges = { glove: 1 };
  initLevel(state);
  forceRoll(state, [2, 2, 2, 3, 4, 6]);
  state.phase = 'dead';
  state.selected = [state.dice[0].uid];
  expect(useItem(state, 'glove').ok).toBe(true);
  expect(state.dice[0].value).toBe(1);
  expect(state.phase).toBe('selecting');
});

test('chain-note die adds +100 after the first successful score', () => {
  const state = fresh();
  state.bag[0].dieId = 'chain_note';
  syncBag(state);
  initLevel(state);
  forceRoll(state, [5, 2, 4, 6, 2, 4]);
  state.selected = [state.dice[0].uid];
  expect(buildScore(state, 'reroll').total).toBe(50);
  state.dieStacks = { [state.dice[0].bagUid]: 1 };
  expect(buildScore(state, 'reroll').total).toBe(150);
  state.dieStacks = { [state.dice[0].bagUid]: 2 };
  expect(buildScore(state, 'reroll').total).toBe(250);
});

test('satan is the fixed final boss with 100000 target and +2 rerolls', () => {
  const state = fresh();
  state.level = 25;
  initLevel(state);
  expect(activeBoss(state)?.id).toBe('satan');
  expect(state.target).toBe(80000);
  expect(state.rerolls).toBe(BASE_REROLLS + 2);
});

test('new barrel effects: pawn, fuse, nightwatch, twoface and loan', () => {
  const pawn = fresh();
  pawn.barrelId = 'pawn';
  pawn.coins = 100;
  initLevel(pawn);
  forceRoll(pawn, [5, 2, 4, 6, 2, 4]);
  pawn.selected = [pawn.dice[0].uid];
  expect(buildScore(pawn, 'reroll').total).toBe(60);

  const fuse = fresh();
  fuse.barrelId = 'fuse';
  initLevel(fuse);
  fuse.flags.fuseArmed = true;
  forceRoll(fuse, [5, 2, 4, 6, 2, 4]);
  fuse.selected = [fuse.dice[0].uid];
  expect(buildScore(fuse, 'reroll').total).toBe(1050);

  const night = fresh();
  night.barrelId = 'nightwatch';
  night.roundScore = 200;
  expect(bustRound(night)).toBe(100);
  expect(night.roundScore).toBe(100);
  expect(night.flags.nightwatchUsed).toBe(true);
  expect(bustRound(night)).toBe(100);

  const faces = fresh();
  faces.barrelId = 'twoface';
  expect(setTwoFaceFaces(faces, [5, 6]).ok).toBe(true);
  expect(faces.flags.twoFaceFaces).toEqual([5, 6]);
  const probs = effectiveProbs('standard', 'twoface', undefined, [5, 6]);
  expect(probs[4]).toBeGreaterThan(probs[0]);

  const loan = fresh();
  loan.barrelId = 'loan';
  loan.coins = 100;
  loan.roundScore = 50;
  loan.phase = 'dead';
  loan.flags.loanOffer = true;
  const result = resolveLoanOffer(loan, true);
  expect(result.ok).toBe(true);
  expect(loan.coins).toBe(60);
  expect(loan.flags.loanUsed).toBe(true);
});
