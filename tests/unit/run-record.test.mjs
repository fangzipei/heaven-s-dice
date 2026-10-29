import { describe, expect, test } from 'vitest';
import { createRun, initLevel } from '../../src/core/engine.ts';
import {
  beginLevelRecord, beginRunRecord, endLevelRecord, finishRunRecord, recordThrow,
} from '../../src/platform/run-record.ts';

describe('run record completeness', () => {
  test('a fresh run keeps every level from 1 through the final level', () => {
    const run = createRun({ rng: () => 0.5 });
    beginRunRecord(run, 'test-user');
    for (let level = 1; level <= 24; level += 1) {
      expect(run.level).toBe(level);
      // One throw per level is enough to exercise the bookkeeping.
      recordThrow(run, { values: [1, 2, 3, 4, 5, 6], hot: false, bust: 0 });
      endLevelRecord(run);
      if (level < 24) {
        run.level += 1;
        initLevel(run);
        beginLevelRecord(run);
      }
    }
    const finished = finishRunRecord(run, 'win');
    expect(finished).not.toBeNull();
    expect(finished.levels).toHaveLength(24);
    expect(finished.levels[0].level).toBe(1);
    expect(finished.levels[23].level).toBe(24);
    expect(finished.complete).toBe(true);
  });
});
