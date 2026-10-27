import { describe, expect, test } from "vitest";

import { analyzeSelection, bestSelection } from '../../src/core/scoring.ts';

const score = (values) => analyzeSelection(values).base;

test('single dice', () => {
  expect(score([1])).toBe(100);
  expect(score([5])).toBe(50);
  expect(analyzeSelection([2]).valid).toBe(false);
  expect(analyzeSelection([6]).valid).toBe(false);
});

test('triples and larger groups', () => {
  expect(score([1, 1, 1])).toBe(1000);
  expect(score([2, 2, 2])).toBe(200);
  expect(score([3, 3, 3])).toBe(300);
  expect(score([4, 4, 4])).toBe(400);
  expect(score([5, 5, 5])).toBe(500);
  expect(score([6, 6, 6])).toBe(600);
  expect(score([2, 2, 2, 2])).toBe(400);
  expect(score([1, 1, 1, 1])).toBe(2000);
  expect(score([2, 2, 2, 2, 2])).toBe(800);
  expect(score([1, 1, 1, 1, 1])).toBe(4000);
  expect(score([2, 2, 2, 2, 2, 2])).toBe(1600);
  expect(score([1, 1, 1, 1, 1, 1])).toBe(8000);
});

test('straights', () => {
  expect(score([1, 2, 3, 4, 5])).toBe(500);
  expect(score([2, 3, 4, 5, 6])).toBe(750);
  expect(score([1, 2, 3, 4, 5, 6])).toBe(1500);
  expect(score([1, 2, 3, 4, 5, 5])).toBe(550);
});

test('mixed combinations', () => {
  expect(score([1, 1, 1, 5])).toBe(1050);
  expect(score([1, 5, 2, 2, 2])).toBe(350);
  expect(score([1, 1, 5, 5])).toBe(300);
  expect(score([2, 2, 2, 3, 3, 3])).toBe(500);
  expect(analyzeSelection([1, 5, 4]).valid).toBe(false);
});

test('selected dice must all be consumed by a legal group', () => {
  expect(analyzeSelection([1, 2]).valid).toBe(false);
  expect(analyzeSelection([1, 1, 1, 2, 3]).valid).toBe(false);
  expect(analyzeSelection([]).valid).toBe(false);
  expect(analyzeSelection([1, 5]).valid).toBe(true);
});

test('bestSelection finds a legal scoring subset', () => {
  const dice = [
    { uid: 'a', value: 1 },
    { uid: 'b', value: 2 },
    { uid: 'c', value: 3 },
    { uid: 'd', value: 4 },
    { uid: 'e', value: 5 },
    { uid: 'f', value: 6 },
  ];
  const best = bestSelection(dice);
  expect(best).toBeTruthy();
  expect(best.analysis.base).toBe(1500);
  expect(best.dice.length).toBe(6);
});

test('bestSelection handles dead rolls', () => {
  const dice = [2, 3, 4, 6].map((value, i) => ({ uid: String(i), value }));
  expect(bestSelection(dice)).toBe(null);
});

test('demon jokers never score on their own', () => {
  expect(analyzeSelection([7]).valid).toBe(false);
  expect(analyzeSelection([7, 7]).valid).toBe(false);
  // A joker may not pad a single 5 or a single 1.
  expect(analyzeSelection([5, 7]).valid).toBe(false);
  expect(analyzeSelection([1, 7]).valid).toBe(false);
  expect(analyzeSelection([2, 7]).valid).toBe(false);
});

test('demon jokers complete triples and straights', () => {
  expect(score([1, 1, 7])).toBe(1000);
  expect(score([3, 3, 7])).toBe(300);
  expect(score([1, 1, 1, 7])).toBe(2000);
  // One missing straight face can be filled by one joker.
  expect(score([1, 2, 3, 4, 7])).toBe(500);
  expect(score([2, 3, 4, 5, 6, 7])).toBe(1500);
  // The joker stands in for the face the straight is missing, and the scorer
  // picks the better straight: 2-3-4-5 + joker reads as 2-6 for 750.
  expect(score([2, 3, 4, 5, 7])).toBe(750);
  // Two missing straight faces are one joker too many, and leftovers invalidate.
  expect(analyzeSelection([2, 3, 4, 7, 7]).valid).toBe(false);
});

test('a joker may displace a natural face in a complete straight', () => {
  // The displaced 1 stays in the hand as a single, so 1500 + 100.
  expect(score([1, 2, 3, 4, 5, 6, 7])).toBe(1600);
  expect(score([7, 2, 3, 4, 5, 6, 1])).toBe(1600);
  // With two natural 1s the joker is worth more turning them into a triple.
  expect(score([1, 1, 2, 3, 4, 5, 6, 7])).toBe(1750);
  expect(analyzeSelection([1, 2, 3, 4, 5, 6, 7]).combos.map((c) => c.type))
    .toEqual(['straight', 'single']);
});

test('bestSelection counts jokers coming from demon dice', () => {
  const dice = [
    { uid: 'a', value: 1, wild: true },
    { uid: 'b', value: 1 },
    { uid: 'c', value: 1 },
    { uid: 'd', value: 2 },
  ];
  const best = bestSelection(dice);
  expect(best).toBeTruthy();
  expect(best.analysis.base).toBe(1000);
  expect(best.analysis.wilds).toBe(1);
});
