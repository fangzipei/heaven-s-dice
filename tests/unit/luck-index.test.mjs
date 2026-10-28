import { describe, expect, test } from 'vitest';
import { calculateLuckIndex, levelFacts } from '../../server/luck-index.mjs';

const level = ({ score, target = 500, endedAt = '2026-01-01T00:00:00Z', throws = [] }) => ({
  level: 1, score, target, endedAt, throws,
});

const singleThrow = (points = 100) => ({
  action: 'continue',
  points,
  selectedDice: [{ dieId: 'standard' }],
  combos: ['单 1'],
  bust: 0,
});

const tripleThrow = () => ({
  action: 'continue',
  points: 300,
  selectedDice: [{ dieId: 'a' }, { dieId: 'b' }, { dieId: 'c' }],
  combos: ['三条 3'],
  bust: 0,
});

describe('hd_runs luck index', () => {
  test('early high-score single-die run is capped and penalized', () => {
    const run = {
      result: 'loss', levelReached: 3, finalScore: 5000,
      levels: [
        level({ score: 5000, target: 500, throws: Array.from({ length: 30 }, singleThrow) }),
        level({ score: 5000, target: 1060, throws: Array.from({ length: 20 }, singleThrow) }),
        level({ score: 0, target: 1440, endedAt: null, throws: [] }),
      ],
    };
    expect(levelFacts(run).multiRate).toBe(0);
    expect(calculateLuckIndex(run)).toBeLessThanOrEqual(24);
  });

  test('a stable multi-level run scores above an early farm', () => {
    const farm = {
      result: 'loss', levelReached: 3,
      levels: [level({ score: 5000, target: 500, throws: Array.from({ length: 10 }, singleThrow) })],
    };
    const stable = {
      result: 'loss', levelReached: 8,
      levels: Array.from({ length: 8 }, (_, index) => level({
        score: 600 + index * 30, target: 500 + index * 20,
        throws: [tripleThrow(), singleThrow()],
      })),
    };
    expect(calculateLuckIndex(stable)).toBeGreaterThan(calculateLuckIndex(farm));
  });

  test('a completed run gets a high index without using final score alone', () => {
    const run = {
      result: 'win', levelReached: 33, finalScore: 1,
      levels: Array.from({ length: 33 }, (_, index) => level({
        score: 500 + index * 10, target: 500 + index * 10,
        throws: [tripleThrow()],
      })),
    };
    expect(calculateLuckIndex(run)).toBeGreaterThan(80);
  });
});
