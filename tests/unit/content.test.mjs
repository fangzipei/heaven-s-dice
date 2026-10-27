import { describe, expect, test } from "vitest";

import {
  BARRELS, BOSSES, DICE, ITEMS, LEVELS, MINIONS, TABLES, DICE_SETS,
  SHOP_RARITY_WEIGHTS, rarityShopWeight, chapterForLevel, chapterLevelSpan,
  MINION_GAPS, buildLevelTable, LEVEL_CURVE,
} from '../../src/content/index.ts';

const countBy = (list, key) => list.reduce((counts, entry) => {
  counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  return counts;
}, {});

test('dice roster: 5 wolf + 5 demon + 10 free agents, rarity 3/7/6/4', () => {
  expect(DICE.length).toBe(20);
  expect(countBy(DICE, 'rarity')).toEqual({ common: 3, rare: 7, epic: 6, legendary: 4 });
  expect(Object.keys(DICE_SETS)).toEqual(['wolf', 'demon']);
  for (const set of Object.values(DICE_SETS)) {
    expect(DICE.filter((die) => die.setId === set.id).length).toBe(5);
    expect(set.bonuses.length).toBe(2);
  }
  // The whole point of the reshuffle: not every die has to be in a set.
  expect(DICE.filter((die) => !die.setId).length).toBe(10);
  for (const die of DICE) {
    expect(die.probs.length).toBe(6);
    const sum = die.probs.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1) < 1e-9).toBeTruthy();
    expect(die.price > 0).toBeTruthy();
  }
});

test('bonuses only sit on epic and legendary dice', () => {
  for (const die of DICE) {
    if (die.bonus) {
      expect(['epic', 'legendary'].includes(die.rarity)).toBeTruthy();
    }
  }
  expect(DICE.filter((die) => die.bonus).length).toBe(10);
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

test('shop rarity weights open up across five level bands', () => {
  expect(SHOP_RARITY_WEIGHTS.length).toBe(5);
  expect(SHOP_RARITY_WEIGHTS.map((band) => band.untilLevel)).toEqual([6, 12, 18, 24, 28]);
  expect(rarityShopWeight('legendary', 1)).toBe(0);
  expect(rarityShopWeight('legendary', 6)).toBe(0);
  expect(rarityShopWeight('legendary', 12) > 0).toBeTruthy();
  expect(rarityShopWeight('legendary', 28) > rarityShopWeight('legendary', 12)).toBeTruthy();
  expect(rarityShopWeight('epic', 1) < rarityShopWeight('epic', 25)).toBeTruthy();
  expect(rarityShopWeight('common', 1) > rarityShopWeight('common', 25)).toBeTruthy();
  for (const band of SHOP_RARITY_WEIGHTS) {
    expect(Object.values(band.weights).some((weight) => weight > 0)).toBeTruthy();
  }
});

test('item mix: 18 items, 12 active / 6 passive, 7 one-shot consumables', () => {
  expect(ITEMS.length).toBe(18);
  expect(countBy(ITEMS, 'type')).toEqual({ active: 12, passive: 6 });
  expect(ITEMS.filter((item) => item.consumable).map((item) => item.id).sort()).toEqual(['boss_ward', 'courage', 'hunter_mark', 'lucky_coin', 'powder', 'salt', 'wager']);
  for (const item of ITEMS.filter((entry) => entry.consumable)) {
    expect(item.type).toBe('active');
  }
});

test('shop prices sit in the 35–260 band', () => {
  const prices = ITEMS.map((item) => item.price);
  expect(Math.min(...prices)).toBe(35);
  expect(Math.max(...prices)).toBe(260);
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

test('barrel composition: starter + 3 probability + face/wild score + 2 gesture', () => {
  expect(BARRELS.length).toBe(8);
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
});

test('33 levels with eight dealers and growing minion gaps', () => {
  expect(BOSSES.length).toBe(8);
  expect(MINIONS.length).toBe(5);
  expect(TABLES.length).toBe(5);
  expect(LEVELS.length).toBe(33);
  const dealerLevels = BOSSES.map((boss) => boss.level);
  expect(dealerLevels).toEqual([3, 6, 10, 14, 18, 23, 28, 33]);
  expect(dealerLevels).toEqual(MINION_GAPS.reduce((acc, gap) => {
    acc.push((acc.at(-1) || 0) + gap + 1);
    return acc;
  }, []));
  expect(new Set(BOSSES.map((boss) => boss.effectKey)).size).toBe(8);

  // 2, 2, 3, 3, 3, 4, 4, 4 — the run up to each dealer never shrinks.
  const gaps = [];
  let previous = 0;
  for (const level of dealerLevels) {
    gaps.push(level - previous - 1);
    previous = level;
  }
  expect(gaps).toEqual([2, 2, 3, 3, 3, 4, 4, 4]);
  for (let i = 1; i < gaps.length; i += 1) expect(gaps[i] >= gaps[i - 1]).toBeTruthy();

  for (const level of LEVELS) {
    expect(level.target > 0).toBeTruthy();
    expect(level.reward > 0).toBeTruthy();
    expect(level.boss === true).toBe(dealerLevels.includes(level.level));
  }
  // Targets climb every level; minion rewards climb too, and a dealer always
  // pays more than the minions sitting on either side of their table.
  for (let i = 1; i < LEVELS.length; i += 1) {
    expect(LEVELS[i].target > LEVELS[i - 1].target).toBeTruthy();
  }
  const minionRewards = LEVELS.filter((level) => !level.boss).map((level) => level.reward);
  for (let i = 1; i < minionRewards.length; i += 1) {
    expect(minionRewards[i] >= minionRewards[i - 1]).toBeTruthy();
  }
  for (const dealer of LEVELS.filter((level) => level.boss)) {
    const neighbours = LEVELS.filter((level) => !level.boss
      && Math.abs(level.level - dealer.level) <= 1).map((level) => level.reward);
    for (const reward of neighbours) {
      expect(dealer.reward > reward).toBeTruthy();
    }
  }
});

test('chapters split 7 / 7 / 7 / 6 / 6 and every table hosts a dealer', () => {
  expect([0, 1, 2, 3, 4].map((chapter) => chapterLevelSpan(chapter))).toEqual([
    [1, 7], [8, 14], [15, 21], [22, 27], [28, 33],
  ]);
  for (const table of TABLES) {
    const levels = LEVELS.filter((level) => chapterForLevel(level.level) === table.group);
    expect(levels.length >= 4).toBeTruthy();
    expect(levels.some((level) => level.boss)).toBeTruthy();
  }
});

test('the level table is computed, not typed: curve × boss coefficient', () => {
  expect(buildLevelTable()).toEqual(LEVELS);
  // 第 1 关就是曲线起点，下一关就是起点 × 增长率（取整到 10）。
  expect(LEVELS[0].target).toBe(LEVEL_CURVE.targetBase);
  expect(LEVELS[1].target).toBe(Math.round(LEVEL_CURVE.targetBase * LEVEL_CURVE.targetGrowth / 10) * 10);
  expect(LEVELS[0].reward).toBe(LEVEL_CURVE.rewardBase);
  for (const level of LEVELS) {
    const boss = BOSSES.find((entry) => entry.level === level.level);
    if (!boss) {
      expect(level.reward).toBe(level.curve.reward);
      expect(level.target).toBe(level.curve.target);
      continue;
    }
    expect(level.reward > level.curve.reward).toBeTruthy();
    // 系数×曲线，误差只允许来自取整（一步 5 银币）。
    const ideal = level.curve.reward * boss.curve.reward;
    expect(Math.abs(level.reward - ideal) <= LEVEL_CURVE.rewardStep).toBeTruthy();
  }

  // Adding a dealer to the roster is enough: no level numbers to hand-edit.
  const extended = [...BOSSES, {
    ...BOSSES[0], id: 'test-dealer', level: LEVELS.length + 3, curve: { target: 1, reward: 2 },
  }];
  const longer = buildLevelTable(extended);
  expect(longer.length).toBe(LEVELS.length + 3);
  expect(longer.at(-1).level).toBe(LEVELS.length + 3);
  expect(longer.at(-1).boss).toBe(true);
  expect(longer.at(-1).reward > longer.at(-2).reward * 1.5).toBeTruthy();
});
