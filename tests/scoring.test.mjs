import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSelection, bestSelection } from '../src/scoring.js';

const score = (values) => analyzeSelection(values).base;

test('single dice', () => {
  assert.equal(score([1]), 100);
  assert.equal(score([5]), 50);
  assert.equal(analyzeSelection([2]).valid, false);
  assert.equal(analyzeSelection([6]).valid, false);
});

test('triples and larger groups', () => {
  assert.equal(score([1, 1, 1]), 1000);
  assert.equal(score([2, 2, 2]), 200);
  assert.equal(score([3, 3, 3]), 300);
  assert.equal(score([4, 4, 4]), 400);
  assert.equal(score([5, 5, 5]), 500);
  assert.equal(score([6, 6, 6]), 600);
  assert.equal(score([2, 2, 2, 2]), 400);
  assert.equal(score([1, 1, 1, 1]), 2000);
  assert.equal(score([2, 2, 2, 2, 2]), 800);
  assert.equal(score([1, 1, 1, 1, 1]), 4000);
  assert.equal(score([2, 2, 2, 2, 2, 2]), 1600);
  assert.equal(score([1, 1, 1, 1, 1, 1]), 8000);
});

test('straights', () => {
  assert.equal(score([1, 2, 3, 4, 5]), 500);
  assert.equal(score([2, 3, 4, 5, 6]), 750);
  assert.equal(score([1, 2, 3, 4, 5, 6]), 1500);
  assert.equal(score([1, 2, 3, 4, 5, 5]), 550);
});

test('mixed combinations', () => {
  assert.equal(score([1, 1, 1, 5]), 1050);
  assert.equal(score([1, 5, 2, 2, 2]), 350);
  assert.equal(score([1, 1, 5, 5]), 300);
  assert.equal(score([2, 2, 2, 3, 3, 3]), 500);
  assert.equal(analyzeSelection([1, 5, 4]).valid, false);
});

test('selected dice must all be consumed by a legal group', () => {
  assert.equal(analyzeSelection([1, 2]).valid, false);
  assert.equal(analyzeSelection([1, 1, 1, 2, 3]).valid, false);
  assert.equal(analyzeSelection([]).valid, false);
  assert.equal(analyzeSelection([1, 5]).valid, true);
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
  assert.ok(best);
  assert.equal(best.analysis.base, 1500);
  assert.equal(best.dice.length, 6);
});

test('bestSelection handles dead rolls', () => {
  const dice = [2, 3, 4, 6].map((value, i) => ({ uid: String(i), value }));
  assert.equal(bestSelection(dice), null);
});
