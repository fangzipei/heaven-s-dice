import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BARRELS, BOSSES, DICE, ITEMS, LEVELS, MINIONS, TABLES, DICE_SETS,
} from '../src/data.js';

const countBy = (list, key) => list.reduce((counts, entry) => {
  counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  return counts;
}, {});

test('required dice rarity distribution and five four-piece sets', () => {
  assert.equal(DICE.length, 20);
  assert.deepEqual(countBy(DICE, 'rarity'), { common: 2, rare: 10, epic: 5, legendary: 3 });
  assert.equal(Object.keys(DICE_SETS).length, 5);
  for (const set of Object.values(DICE_SETS)) {
    assert.equal(DICE.filter((die) => die.setId === set.id).length, 4);
    assert.equal(set.bonuses.length, 2);
  }
  for (const die of DICE) {
    assert.equal(die.probs.length, 6);
    const sum = die.probs.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${die.name} probabilities sum to ${sum}`);
    assert.ok(die.price > 0);
  }
  assert.equal(DICE.filter((die) => die.demon).length, 1);
});

test('required item mix', () => {
  assert.equal(ITEMS.length, 12);
  assert.deepEqual(countBy(ITEMS, 'type'), { active: 9, passive: 3 });
});

test('once-only dice-capacity items are marked unique', () => {
  const diceCapItems = ITEMS.filter((item) => /dice_bag|cracked_pouch/.test(item.id));
  assert.equal(diceCapItems.length, 2);
  for (const item of diceCapItems) {
    assert.equal(item.unique, true, `${item.name} must be unique`);
    assert.equal(item.type, 'passive');
  }
});

test('barrel composition: starter + 3 probability + 2 set-score + 2 gesture', () => {
  assert.equal(BARRELS.length, 8);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'probability').length, 3);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'gesture').length, 2);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'setScore').length, 2);
  assert.equal(BARRELS.filter((barrel) => barrel.type === 'none').length, 1);
  for (const barrel of BARRELS.filter((b) => b.type === 'setScore')) {
    assert.ok(barrel.setId && barrel.value > 0, `${barrel.name} must target a set`);
  }
});

test('seven bosses, five minions, five tables, fifteen levels', () => {
  assert.equal(BOSSES.length, 7);
  assert.equal(MINIONS.length, 5);
  assert.equal(TABLES.length, 5);
  assert.equal(LEVELS.length, 15);
  assert.deepEqual(BOSSES.map((boss) => boss.level), [3, 5, 7, 9, 11, 13, 15]);
  assert.equal(new Set(BOSSES.map((boss) => boss.effectKey)).size, 7);
  for (const level of LEVELS) {
    assert.ok(level.target > 0);
    assert.ok(level.reward > 0);
    if ([3, 5, 7, 9, 11, 13, 15].includes(level.level)) assert.equal(level.boss, true);
    else assert.notEqual(level.boss, true);
  }
});

test('each table chapter maps three levels and at least one boss', () => {
  for (const table of TABLES) {
    const levels = LEVELS.filter((level) => Math.floor((level.level - 1) / 3) === table.group);
    assert.equal(levels.length, 3);
    assert.ok(levels.filter((level) => level.boss).length >= 1);
  }
});
