import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRELS, BOSSES, DICE, ITEMS, LEVELS, MINIONS, TABLES, DICE_SETS,
  SHOP_RARITY_WEIGHTS, rarityShopWeight, chapterForLevel, chapterLevelSpan,
  MINION_GAPS, buildLevelTable, LEVEL_CURVE,
} from '../src/data.js';

const countBy = (list, key) => list.reduce((counts, entry) => {
  counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  return counts;
}, {});

test('dice roster: 5 wolf + 5 demon + 10 free agents, rarity 3/7/6/4', () => {
  assert.equal(DICE.length, 20);
  assert.deepEqual(countBy(DICE, 'rarity'), { common: 3, rare: 7, epic: 6, legendary: 4 });
  assert.deepEqual(Object.keys(DICE_SETS), ['wolf', 'demon']);
  for (const set of Object.values(DICE_SETS)) {
    assert.equal(DICE.filter((die) => die.setId === set.id).length, 5);
    assert.equal(set.bonuses.length, 2);
  }
  // The whole point of the reshuffle: not every die has to be in a set.
  assert.equal(DICE.filter((die) => !die.setId).length, 10);
  for (const die of DICE) {
    assert.equal(die.probs.length, 6);
    const sum = die.probs.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${die.name} probabilities sum to ${sum}`);
    assert.ok(die.price > 0);
  }
});

test('bonuses only sit on epic and legendary dice', () => {
  for (const die of DICE) {
    if (die.bonus) {
      assert.ok(['epic', 'legendary'].includes(die.rarity),
        `${die.name} is ${die.rarity} but carries a bonus`);
    }
  }
  assert.equal(DICE.filter((die) => die.bonus).length, 10);
});

test('set dice actually lean on their mechanic', () => {
  const wolf = DICE.filter((die) => die.setId === 'wolf');
  const demon = DICE.filter((die) => die.setId === 'demon');
  for (const die of wolf) {
    // 3 has to be the joint-most likely face, never merely above average.
    assert.ok(die.probs[2] >= Math.max(...die.probs) - 1e-9, `${die.name} should favour 3`);
    assert.ok(die.probs[2] > die.probs[1], `${die.name} should roll 3 more often than 2`);
  }
  for (const die of demon) {
    assert.ok(die.probs[0] >= 0.10, `${die.name} should be able to roll a joker`);
  }
  // Free agents earn their slot either with a shape, or with a bonus that no
  // distribution could express (回声骰 is fair but multiplies every score).
  const freeAgents = DICE.filter((die) => !die.setId);
  for (const die of freeAgents) {
    const tv = die.probs.reduce((sum, p) => sum + Math.abs(p - 1 / 6), 0) / 2;
    assert.ok(tv > 0.1 || Boolean(die.bonus),
      `${die.name} is neither skewed nor special (tv=${tv.toFixed(3)})`);
  }
});

test('shop rarity weights open up across five level bands', () => {
  assert.equal(SHOP_RARITY_WEIGHTS.length, 5);
  assert.deepEqual(SHOP_RARITY_WEIGHTS.map((band) => band.untilLevel), [6, 12, 18, 24, 28]);
  assert.equal(rarityShopWeight('legendary', 1), 0);
  assert.equal(rarityShopWeight('legendary', 6), 0);
  assert.ok(rarityShopWeight('legendary', 12) > 0);
  assert.ok(rarityShopWeight('legendary', 28) > rarityShopWeight('legendary', 12));
  assert.ok(rarityShopWeight('epic', 1) < rarityShopWeight('epic', 25));
  assert.ok(rarityShopWeight('common', 1) > rarityShopWeight('common', 25));
  for (const band of SHOP_RARITY_WEIGHTS) {
    assert.ok(Object.values(band.weights).some((weight) => weight > 0));
  }
});

test('item mix: 18 items, 12 active / 6 passive, 5 one-shot consumables', () => {
  assert.equal(ITEMS.length, 18);
  assert.deepEqual(countBy(ITEMS, 'type'), { active: 12, passive: 6 });
  assert.deepEqual(
    ITEMS.filter((item) => item.consumable).map((item) => item.id).sort(),
    ['boss_ward', 'courage', 'powder', 'salt', 'wager'],
  );
  for (const item of ITEMS.filter((entry) => entry.consumable)) {
    assert.equal(item.type, 'active');
  }
});

test('shop prices sit in the 35–260 band', () => {
  const prices = ITEMS.map((item) => item.price);
  assert.equal(Math.min(...prices), 35);
  assert.equal(Math.max(...prices), 260);
  // 时间沙漏 is epic now and must out-price the rare tier.
  const hourglass = ITEMS.find((item) => item.id === 'hourglass');
  assert.equal(hourglass.rarity, 'epic');
  assert.ok(hourglass.price >= 120);
});

test('once-only dice-capacity items are marked unique', () => {
  const diceCapItems = ITEMS.filter((item) => /dice_bag|cracked_pouch/.test(item.id));
  assert.equal(diceCapItems.length, 2);
  for (const item of diceCapItems) {
    assert.equal(item.unique, true, `${item.name} must be unique`);
    assert.equal(item.type, 'passive');
  }
});

test('three shelf passives each open one extra shop slot', () => {
  const shelves = ITEMS.filter((item) => item.id.startsWith('shelf_'));
  assert.deepEqual(shelves.map((item) => item.id).sort(), ['shelf_barrel', 'shelf_dice', 'shelf_item']);
  for (const item of shelves) assert.equal(item.type, 'passive');
});

test('barrel composition: starter + 3 probability + face/wild score + 2 gesture', () => {
  assert.equal(BARRELS.length, 8);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'probability').length, 3);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'gesture').length, 2);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'none').length, 1);
  const face = BARRELS.filter((b) => b.type === 'faceScore');
  const wild = BARRELS.filter((b) => b.type === 'wildScore');
  assert.equal(face.length, 1);
  assert.equal(wild.length, 1);
  for (const barrel of face) {
    assert.ok(barrel.face >= 1 && barrel.face <= 6, `${barrel.name} must target a face`);
    assert.ok(barrel.value > 0 && barrel.tripleValue > 0);
  }
  for (const barrel of wild) assert.ok(barrel.value > 0);
});

test('33 levels with eight dealers and growing minion gaps', () => {
  assert.equal(BOSSES.length, 8);
  assert.equal(MINIONS.length, 5);
  assert.equal(TABLES.length, 5);
  assert.equal(LEVELS.length, 33);
  const dealerLevels = BOSSES.map((boss) => boss.level);
  assert.deepEqual(dealerLevels, [3, 6, 10, 14, 18, 23, 28, 33]);
  assert.deepEqual(dealerLevels, MINION_GAPS.reduce((acc, gap) => {
    acc.push((acc.at(-1) || 0) + gap + 1);
    return acc;
  }, []));
  assert.equal(new Set(BOSSES.map((boss) => boss.effectKey)).size, 8);

  // 2, 2, 3, 3, 3, 4, 4, 4 — the run up to each dealer never shrinks.
  const gaps = [];
  let previous = 0;
  for (const level of dealerLevels) {
    gaps.push(level - previous - 1);
    previous = level;
  }
  assert.deepEqual(gaps, [2, 2, 3, 3, 3, 4, 4, 4]);
  for (let i = 1; i < gaps.length; i += 1) assert.ok(gaps[i] >= gaps[i - 1]);

  for (const level of LEVELS) {
    assert.ok(level.target > 0);
    assert.ok(level.reward > 0);
    assert.equal(level.boss === true, dealerLevels.includes(level.level), `level ${level.level} boss flag`);
  }
  // Targets climb every level; minion rewards climb too, and a dealer always
  // pays more than the minions sitting on either side of their table.
  for (let i = 1; i < LEVELS.length; i += 1) {
    assert.ok(LEVELS[i].target > LEVELS[i - 1].target, `target must rise at level ${LEVELS[i].level}`);
  }
  const minionRewards = LEVELS.filter((level) => !level.boss).map((level) => level.reward);
  for (let i = 1; i < minionRewards.length; i += 1) {
    assert.ok(minionRewards[i] >= minionRewards[i - 1], 'minion rewards must not fall');
  }
  for (const dealer of LEVELS.filter((level) => level.boss)) {
    const neighbours = LEVELS.filter((level) => !level.boss
      && Math.abs(level.level - dealer.level) <= 1).map((level) => level.reward);
    for (const reward of neighbours) {
      assert.ok(dealer.reward > reward, `dealer at level ${dealer.level} must out-pay its neighbours`);
    }
  }
});

test('chapters split 7 / 7 / 7 / 6 / 6 and every table hosts a dealer', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((chapter) => chapterLevelSpan(chapter)), [
    [1, 7], [8, 14], [15, 21], [22, 27], [28, 33],
  ]);
  for (const table of TABLES) {
    const levels = LEVELS.filter((level) => chapterForLevel(level.level) === table.group);
    assert.ok(levels.length >= 4, `table ${table.id} holds ${levels.length} levels`);
    assert.ok(levels.some((level) => level.boss), `table ${table.id} needs a dealer`);
  }
});

test('the level table is computed, not typed: curve × boss coefficient', () => {
  assert.deepEqual(buildLevelTable(), LEVELS);
  // 第 1 关就是曲线起点，下一关就是起点 × 增长率（取整到 10）。
  assert.equal(LEVELS[0].target, LEVEL_CURVE.targetBase);
  assert.equal(LEVELS[1].target, Math.round(LEVEL_CURVE.targetBase * LEVEL_CURVE.targetGrowth / 10) * 10);
  assert.equal(LEVELS[0].reward, LEVEL_CURVE.rewardBase);
  for (const level of LEVELS) {
    const boss = BOSSES.find((entry) => entry.level === level.level);
    if (!boss) {
      assert.equal(level.reward, level.curve.reward, `level ${level.level} is on the plain curve`);
      assert.equal(level.target, level.curve.target, `level ${level.level} is on the plain curve`);
      continue;
    }
    assert.ok(level.reward > level.curve.reward, `dealer at ${level.level} must pay a premium`);
    // 系数×曲线，误差只允许来自取整（一步 5 银币）。
    const ideal = level.curve.reward * boss.curve.reward;
    assert.ok(Math.abs(level.reward - ideal) <= LEVEL_CURVE.rewardStep,
      `dealer at ${level.level} pays ${level.reward}, curve ${level.curve.reward} × ${boss.curve.reward}`);
  }

  // Adding a dealer to the roster is enough: no level numbers to hand-edit.
  const extended = [...BOSSES, {
    ...BOSSES[0], id: 'test-dealer', level: LEVELS.length + 3, curve: { target: 1, reward: 2 },
  }];
  const longer = buildLevelTable(extended);
  assert.equal(longer.length, LEVELS.length + 3);
  assert.equal(longer.at(-1).level, LEVELS.length + 3);
  assert.equal(longer.at(-1).boss, true);
  assert.ok(longer.at(-1).reward > longer.at(-2).reward * 1.5);
});
