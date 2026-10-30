import { describe, expect, test } from "vitest";

import {
  BARRELS, BOSSES, BOSS_CATALOG, BOSS_RELICS, DICE, ITEMS, ITEM_BY_ID, LEVELS, MINIONS, TABLES, DICE_SETS,
  SHOP_RARITY_WEIGHTS, rarityShopWeight, chapterForLevel, chapterLevelSpan,
  MINION_GAPS, buildLevelTable, LEVEL_CURVE,
} from '../../src/content/index.ts';

const countBy = (list, key) => list.reduce((counts, entry) => {
  counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  return counts;
}, {});

test('dice roster: four 4-piece sets + 21 free agents, rarity 11/10/10/6', () => {
  expect(DICE.length).toBe(37);
  expect(countBy(DICE, 'rarity')).toEqual({ common: 11, rare: 10, epic: 10, legendary: 6 });
  expect(Object.keys(DICE_SETS)).toEqual(['wolf', 'demon', 'stargazer', 'caravan']);
  for (const set of Object.values(DICE_SETS)) {
    expect(DICE.filter((die) => die.setId === set.id).length).toBe(4);
    expect(set.bonuses.length).toBe(2);
    expect(DICE.filter((die) => die.setId === set.id).every((die) => die.unique)).toBe(true);
  }
  // The whole point of the reshuffle: not every die has to be in a set.
  expect(DICE.filter((die) => !die.setId).length).toBe(21);
  for (const die of DICE) {
    expect(die.probs.length).toBe(6);
    const sum = die.probs.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1) < 1e-9).toBeTruthy();
    expect(die.price > 0).toBeTruthy();
  }
});

test('every die bonus is well-formed, and bias dice mark 1/5 rare', () => {
  for (const die of DICE) {
    if (!die.bonus) continue;
    expect(typeof die.bonus.type).toBe('string');
    expect(typeof die.bonus.label).toBe('string');
    expect(die.bonus.label.length).toBeGreaterThan(0);
  }
  expect(DICE.filter((die) => die.bonus).length).toBe(29);
  const bias = DICE.filter((die) => /^bias_/.test(die.id));
  expect(bias.length).toBe(6);
  for (const die of bias) {
    expect(die.rarity).toBe(die.id === 'bias_one' || die.id === 'bias_five' ? 'rare' : 'common');
    expect(Math.max(...die.probs)).toBeCloseTo(0.40);
    expect(die.bonus.type).toBe('faceFlat');
    expect(die.bonus.value).toBe(100);
  }
});

test('set dice actually lean on their mechanic', () => {
  const wolf = DICE.filter((die) => die.setId === 'wolf');
  const demon = DICE.filter((die) => die.setId === 'demon');
  for (const die of wolf) {
    // 3 has to be the joint-most likely face, never merely above average.
    expect(die.probs[2] >= Math.max(...die.probs) - 1e-9).toBeTruthy();
    expect(die.probs[2] > die.probs[1]).toBeTruthy();
  }
  for (const die of demon) {
    expect(die.probs[0] >= 0.10).toBeTruthy();
  }
  // Free agents earn their slot either with a shape, or with a bonus that no
  // distribution could express (回声骰 is fair but multiplies every score).
  const freeAgents = DICE.filter((die) => !die.setId);
  for (const die of freeAgents) {
    const tv = die.probs.reduce((sum, p) => sum + Math.abs(p - 1 / 6), 0) / 2;
    expect(tv > 0.1 || Boolean(die.bonus)).toBeTruthy();
  }
});

test('shop rarity weights open up across four level bands, legendary capped at 10%', () => {
  expect(SHOP_RARITY_WEIGHTS.length).toBe(4);
  expect(SHOP_RARITY_WEIGHTS.map((band) => band.untilLevel)).toEqual([6, 12, 18, 24]);
  expect(rarityShopWeight('common', 1)).toBeCloseTo(65);
  expect(rarityShopWeight('rare', 1)).toBeCloseTo(27);
  expect(rarityShopWeight('epic', 1)).toBeCloseTo(7);
  expect(rarityShopWeight('legendary', 1)).toBeCloseTo(1);
  expect(rarityShopWeight('legendary', 6)).toBeCloseTo(1);
  expect(rarityShopWeight('legendary', 12)).toBeCloseTo(4);
  expect(rarityShopWeight('legendary', 18)).toBeCloseTo(9);
  expect(rarityShopWeight('legendary', 24)).toBeCloseTo(10);
  expect(rarityShopWeight('epic', 1) < rarityShopWeight('epic', 24)).toBeTruthy();
  expect(rarityShopWeight('common', 1) > rarityShopWeight('common', 24)).toBeTruthy();
  for (const band of SHOP_RARITY_WEIGHTS) {
    expect(Object.values(band.weights).some((weight) => weight > 0)).toBeTruthy();
    expect(band.weights.legendary).toBeLessThanOrEqual(10);
  }
});

test('item mix: 43 items, 15 active / 28 passive, 10 one-shot consumables', () => {
  expect(ITEMS.length).toBe(43);
  expect(countBy(ITEMS, 'type')).toEqual({ active: 15, passive: 28 });
  expect(ITEMS.filter((item) => item.consumable).map((item) => item.id).sort()).toEqual([
    'boss_ward', 'courage', 'devil_reset', 'epic_chest', 'glove', 'hunter_mark',
    'lucky_coin', 'powder', 'rare_pair', 'salt', 'wager',
  ]);
  for (const item of ITEMS.filter((entry) => entry.consumable)) {
    expect(item.type).toBe('active');
  }
  const scoreItems = ITEMS.filter((item) => item.scoreRule);
  expect(scoreItems.length).toBe(7);
  for (const item of scoreItems) {
    expect(item.type).toBe('passive');
    expect(item.scoreRule.multiplier > 1).toBeTruthy();
  }
  const grants = ITEMS.filter((item) => item.grant);
  expect(grants.map((item) => `${item.id}:${item.grant.rarity}:${item.grant.count}:${item.grant.choose}`).sort()).toEqual([
    'epic_chest:epic:1:1', 'rare_pair:rare:2:1',
  ]);
});

test('every non-final boss has a legendary drop-only relic', () => {
  const normalBosses = BOSS_CATALOG.filter((boss) => boss.id !== 'satan');
  for (const boss of normalBosses) {
    const relic = ITEM_BY_ID[BOSS_RELICS[boss.id]];
    expect(relic, boss.id).toBeTruthy();
    expect(relic.rarity).toBe('legendary');
    expect(relic.bossOnly).toBe(boss.id);
  }
  expect(Object.keys(BOSS_RELICS).length).toBe(normalBosses.length);
});

test('shop prices sit in the 32–444 band', () => {
  const prices = ITEMS.filter((item) => !item.bossOnly).map((item) => item.price);
  expect(Math.min(...prices)).toBe(35);
  expect(Math.max(...prices)).toBe(444);
  // 时间沙漏 is epic now and must out-price the rare tier.
  const hourglass = ITEMS.find((item) => item.id === 'hourglass');
  expect(hourglass.rarity).toBe('epic');
  expect(hourglass.price >= 120).toBeTruthy();
});

test('once-only dice-capacity items are marked unique', () => {
  const diceCapItems = ITEMS.filter((item) => /dice_bag|cracked_pouch/.test(item.id));
  expect(diceCapItems.length).toBe(2);
  for (const item of diceCapItems) {
    expect(item.unique).toBe(true);
    expect(item.type).toBe('passive');
  }
});

test('three shelf passives each open one extra shop slot', () => {
  const shelves = ITEMS.filter((item) => item.id.startsWith('shelf_'));
  expect(shelves.map((item) => item.id).sort()).toEqual(['shelf_barrel', 'shelf_dice', 'shelf_item']);
  for (const item of shelves) expect(item.type).toBe('passive');
});

test('barrel composition: starter + probability + score + interaction + gesture', () => {
  expect(BARRELS.length).toBe(19);
  expect(BARRELS.filter((barrel) => barrel.type === 'probability').length).toBe(3);
  expect(BARRELS.filter((barrel) => barrel.type === 'gesture').length).toBe(2);
  expect(BARRELS.filter((barrel) => barrel.type === 'none').length).toBe(1);
  const face = BARRELS.filter((b) => b.type === 'faceScore');
  const wild = BARRELS.filter((b) => b.type === 'wildScore');
  expect(face.length).toBe(1);
  expect(wild.length).toBe(1);
  for (const barrel of face) {
    expect(barrel.face >= 1 && barrel.face <= 6).toBeTruthy();
    expect(barrel.value > 0 && barrel.tripleValue > 0).toBeTruthy();
  }
  for (const barrel of wild) expect(barrel.value > 0).toBeTruthy();
  for (const type of ['gild', 'straightFix', 'singlesBonus', 'pawn', 'nightwatch', 'fuse', 'rotation', 'twoFace', 'loan']) {
    expect(BARRELS.filter((barrel) => barrel.type === type).length, type).toBe(1);
  }
  expect(BARRELS.filter((barrel) => barrel.type === 'forceOne').length).toBe(1);
  expect(BARRELS.filter((barrel) => barrel.type === 'extraDie').length).toBe(1);
});

test('25 levels with seven dealers at 3/7/11/15/20/24/25', () => {
  expect(BOSSES.length).toBe(7);
  expect(MINIONS.length).toBe(5);
  expect(TABLES.length).toBe(5);
  expect(LEVELS.length).toBe(25);
  const dealerLevels = BOSSES.map((boss) => boss.level);
  expect(dealerLevels).toEqual([3, 7, 11, 15, 20, 24, 25]);
  expect(dealerLevels).toEqual(MINION_GAPS.reduce((acc, gap) => {
    acc.push((acc.at(-1) || 0) + gap + 1);
    return acc;
  }, []));
  expect(new Set(BOSSES.map((boss) => boss.effectKey)).size).toBe(7);

  // 2, 3, 3, 3, 4, 3, 0 — the run up to each dealer.
  const gaps = [];
  let previous = 0;
  for (const level of dealerLevels) {
    gaps.push(level - previous - 1);
    previous = level;
  }
  expect(gaps).toEqual([2, 3, 3, 3, 4, 3, 0]);

  for (const level of LEVELS) {
    expect(level.target > 0).toBeTruthy();
    expect(level.reward > 0).toBeTruthy();
    expect(level.boss === true).toBe(dealerLevels.includes(level.level));
  }
  const minions = LEVELS.filter((level) => !level.boss);
  for (let i = 1; i < minions.length; i += 1) {
    expect(minions[i].target > minions[i - 1].target).toBeTruthy();
  }
  for (const dealer of LEVELS.filter((level) => level.boss)) {
    expect(dealer.target > 0).toBeTruthy();
  }
  const minionRewards = LEVELS.filter((level) => !level.boss).map((level) => level.reward);
  for (let i = 1; i < minionRewards.length; i += 1) {
    expect(minionRewards[i] >= minionRewards[i - 1]).toBeTruthy();
  }
  for (const dealer of LEVELS.filter((level) => level.boss)) {
    const neighbours = LEVELS.filter((level) => !level.boss
      && Math.abs(level.level - dealer.level) <= 1).map((level) => level.reward);
    for (const reward of neighbours) expect(dealer.reward > reward).toBeTruthy();
  }
});

test('25 levels split 5 / 5 / 5 / 5 / 5 across five tables', () => {
  expect([0, 1, 2, 3, 4].map((chapter) => chapterLevelSpan(chapter))).toEqual([
    [1, 5], [6, 10], [11, 15], [16, 20], [21, 25],
  ]);
  for (const table of TABLES) {
    const levels = LEVELS.filter((level) => chapterForLevel(level.level) === table.group);
    expect(levels.length >= 4).toBeTruthy();
  }
});

test('the level table uses the no-boss curve, then boss coefficients', () => {
  expect(buildLevelTable()).toEqual(LEVELS);
  expect(LEVELS[0].target).toBe(LEVEL_CURVE.targetBase);
  expect(LEVELS[1].target).toBe(LEVEL_CURVE.nonBossTargets[1]);
  expect(LEVELS[23].target).toBe(30060);
  expect(LEVELS[24].target).toBe(100000);
  expect(LEVELS[0].reward).toBe(LEVEL_CURVE.rewardBase);
  for (const level of LEVELS) {
    const boss = BOSSES.find((entry) => entry.level === level.level);
    if (!boss) {
      expect(level.reward).toBe(level.curve.reward);
      expect(level.target).toBe(level.curve.target);
      continue;
    }
    expect(level.reward > level.curve.reward).toBeTruthy();
    const idealReward = level.curve.reward * boss.curve.reward;
    const idealTarget = level.curve.target * boss.curve.target * (level.level > 7 && level.level < 25 ? 1.1 : 1);
    expect(Math.abs(level.reward - idealReward) <= LEVEL_CURVE.rewardStep * 2).toBeTruthy();
    expect(Math.abs(level.target - idealTarget) <= LEVEL_CURVE.targetStep).toBeTruthy();
  }

  const extended = [...BOSSES, {
    ...BOSSES[0], id: 'test-dealer', level: LEVELS.length + 3, curve: { target: 1, reward: 2 },
  }];
  const longer = buildLevelTable(extended);
  expect(longer.length).toBe(LEVELS.length + 3);
  expect(longer.at(-1).level).toBe(LEVELS.length + 3);
  expect(longer.at(-1).boss).toBe(true);
  expect(longer.at(-1).reward > longer.at(-2).reward * 1.5).toBeTruthy();
});
