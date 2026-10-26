/* Phase 1 gate: the TS core must be behaviourally indistinguishable from the
   JS it replaced. Content identity is checked by object reference (the typed
   surface re-exports the very same objects), scoring is checked exhaustively,
   and the engine is checked by replaying identical scripted runs side by side. */
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import * as LegacyData from '../../src/legacy/data.js';
import * as LegacyScoring from '../../src/legacy/scoring.js';
import * as LegacyEngine from '../../src/legacy/engine.js';
import * as Content from '../../src/content/index.ts';
import * as NewScoring from '../../src/core/scoring.ts';
import * as NewEngine from '../../src/core/engine.ts';

const CONTENT_KEYS = [
  'RARITIES', 'DICE_SETS', 'DICE', 'DICE_BY_ID', 'STANDARD_DIE', 'BARRELS',
  'BARREL_BY_ID', 'ITEMS', 'ITEM_BY_ID', 'TABLES', 'MINIONS', 'BOSSES',
  'SHOP_RARITY_WEIGHTS', 'MINION_GAPS', 'LEVEL_CURVE', 'LEVELS', 'LEVEL_COUNT',
  'REROLL_REFUND', 'OVERSHOOT_TIERS', 'CHAPTERS',
];

describe('content surface is the same data', () => {
  it('rebuilds every legacy content table, entry for entry', () => {
    // Phase 3a moved the data from one big module into per-item files, so object
    // identity is gone for good; what must survive is the exact structure, order
    // and values the legacy tables had (order feeds the shop pools and RNG).
    for (const key of CONTENT_KEYS) {
      expect(Content[key], key).toEqual(LegacyData[key]);
    }
  });
});

describe('scoring parity', () => {
  it('agrees on every selection up to four dice, wilds included', () => {
    const faces = [1, 2, 3, 4, 5, 6, LegacyScoring.WILD_VALUE];
    const vectors = [];
    for (const a of faces) {
      vectors.push([a]);
      for (const b of faces) {
        vectors.push([a, b]);
        for (const c of faces) {
          vectors.push([a, b, c]);
          for (const d of faces) vectors.push([a, b, c, d]);
        }
      }
    }
    for (const five of [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6],
      [1, 1, 1, 5, 5], [6, 6, 6, 6, 6], [1, 1, 1, 1, 1, 1],
      [LegacyScoring.WILD_VALUE, 2, 3, 4, 5], [1, 2, 3, 4, LegacyScoring.WILD_VALUE]]) {
      vectors.push(five);
    }
    for (const values of vectors) {
      const legacy = LegacyScoring.analyzeSelection(values);
      const next = NewScoring.analyzeSelection(values);
      expect(next, `values ${values.join(',')}`).toEqual(legacy);
    }
  });

  it('agrees on the best selection of a full board', () => {
    const rng = LegacyEngine.makeRng(0xC0FFEE);
    for (let round = 0; round < 400; round += 1) {
      const dice = Array.from({ length: 6 }, (_, uid) => ({
        uid: `d${uid}`,
        value: Math.floor(rng() * 6) + 1,
        wild: rng() < 0.12,
      }));
      const legacy = LegacyScoring.bestSelection(dice);
      const next = NewScoring.bestSelection(dice);
      expect(next?.analysis, `round ${round}`).toEqual(legacy?.analysis);
      expect(next?.dice.map((d) => d.uid), `round ${round}`).toEqual(legacy?.dice.map((d) => d.uid));
    }
  });

  it('exposes the same scoring reference rows', () => {
    expect(NewScoring.SCORING_ROWS).toEqual(LegacyScoring.SCORING_ROWS);
    expect(NewScoring.WILD_VALUE).toBe(LegacyScoring.WILD_VALUE);
    expect(NewScoring.countFaces([1, 1, 5, 9, null, LegacyScoring.WILD_VALUE]))
      .toEqual(LegacyScoring.countFaces([1, 1, 5, 9, null, LegacyScoring.WILD_VALUE]));
  });
});

/** Everything a UI could read, minus the run-scoped unique ids. */
function snapshot(run) {
  return JSON.parse(JSON.stringify({
    phase: run.phase, level: run.level, score: run.score, roundScore: run.roundScore,
    target: run.target, targetBase: run.targetBase, targetReached: run.targetReached,
    rerolls: run.rerolls, maxRerolls: run.maxRerolls, coins: run.coins,
    throwNumber: run.throwNumber, bossDiceRolled: run.bossDiceRolled,
    barrelId: run.barrelId, ownedBarrels: run.ownedBarrels,
    bag: run.bag.map((b) => b.dieId), activeItems: run.activeItems,
    passiveItems: run.passiveItems, acquiredItemIds: run.acquiredItemIds,
    itemCharges: run.itemCharges, bossBoons: run.bossBoons, bossWardArmed: run.bossWardArmed,
    flags: run.flags, stats: run.stats, lastRoll: run.lastRoll, lastBust: run.lastBust,
    lastScore: run.lastScore, levelReward: run.levelReward, pendingReward: run.pendingReward,
    overshootTierKey: run.overshootTierKey, runWon: run.runWon,
    dice: run.dice.map((d) => ({ value: d.value, scored: d.scored, blank: d.blank, wild: d.wild })),
    shop: run.shop && {
      dice: run.shop.dice.map((o) => [o.kind, o.id, o.sold]),
      barrel: run.shop.barrel.map((o) => [o.kind, o.id, o.sold]),
      item: run.shop.item.map((o) => [o.kind, o.id, o.sold]),
      refreshes: run.shop.refreshes,
    },
    log: run.log.map((l) => [l.text, l.type, l.level]),
  }));
}

/** One competent greedy player: always take the best combination, shop hard. */
function play(Engine, Scoring, seed, maxSteps = 3000) {
  const trace = [];
  const run = Engine.createRun({ rng: Engine.makeRng(seed) });
  const push = (step, note) => trace.push([step, note, snapshot(run)]);

  for (let step = 0; step < maxSteps; step += 1) {
    const before = snapshot(run);
    let note = run.phase;

    if (run.phase === 'run-won') {
      push(step, note);
      break;
    }

    if (run.phase === 'ready') {
      Engine.rollDice(run);
    } else if (run.phase === 'reroll-pending') {
      Engine.rollDice(run);
    } else if (run.phase === 'hot') {
      Engine.rollDice(run, { free: true });
    } else if (run.phase === 'selecting') {
      const best = Scoring.bestSelection(
        run.dice.filter((d) => !d.scored && !d.blank && (d.wild || (d.value >= 1 && d.value <= 6))),
      );
      if (best) {
        run.selected = best.dice.map((d) => d.uid);
        Engine.applyScore(run, run.rerolls > 0 ? 'continue' : 'bank');
      } else if (run.rerolls > 0) {
        Engine.rerollDeadThrow(run);
      } else {
        Engine.rollDice(run);
      }
      note = `${note}>scored`;
    } else if (run.phase === 'dead') {
      const usable = run.activeItems.find((id) => Engine.canUseItem(run, id).ok);
      if (run.rerolls > 0) {
        Engine.rerollDeadThrow(run);
      } else if (usable) {
        const used = Engine.useItem(run, usable);
        if (used?.rerollFree) Engine.rollDice(run, { free: true });
        note = `${note}>item:${usable}`;
      } else {
        Engine.forfeit(run);
      }
    } else if (run.phase === 'cleared' || run.phase === 'won') {
      if (run.phase === 'cleared') Engine.advanceLevel(run);
      note = `${note}>advance`;
      if (run.phase === 'won') {
        Engine.openShop(run);
        for (const section of ['dice', 'barrel', 'item']) {
          const offers = run.shop?.[section] || [];
          for (let index = 0; index < offers.length; index += 1) {
            const result = section === 'dice' ? Engine.buyDie(run, index)
              : section === 'barrel' ? Engine.buyBarrel(run, index)
                : Engine.buyItem(run, index);
            if (result?.ok) continue;
            if (result?.needReplace) {
              Engine.buyDie(run, index, run.bag[run.bag.length - 1]?.uid);
            }
          }
          if (Engine.refreshCost(run, section) <= run.coins) Engine.refreshSection(run, section);
        }
        Engine.leaveShop(run);
        note = `${note}>shop`;
      }
    } else if (run.phase === 'lost') {
      Engine.retryLevel(run);
      note = `${note}>retry`;
    }

    push(step, note);
    if (JSON.stringify(before) === JSON.stringify(snapshot(run)) && run.phase === 'lost') break;
    if (run.level > LegacyData.LEVEL_COUNT) break;
  }
  return trace;
}

describe('engine parity', () => {
  it('replays a full 33-level campaign step for step', () => {
    const legacy = play(LegacyEngine, LegacyScoring, 0x5EED);
    const next = play(NewEngine, NewScoring, 0x5EED);
    expect(legacy.at(-1)[2].phase, 'the scripted player should finish the run')
      .toBe('run-won');
    expect(legacy.at(-1)[2].level).toBe(LegacyData.LEVEL_COUNT);
    expect(next.length).toBe(legacy.length);
    for (let i = 0; i < legacy.length; i += 1) {
      expect(JSON.stringify(next[i]), `step ${i}`).toBe(JSON.stringify(legacy[i]));
    }
  }, 120_000);

  it('replays shorter campaigns from the same seeds', () => {
    for (const seed of [0x1234, 0xABCD]) {
      const legacy = play(LegacyEngine, LegacyScoring, seed, 900);
      const next = play(NewEngine, NewScoring, seed, 900);
      let divergence = -1;
      for (let i = 0; i < Math.max(legacy.length, next.length); i += 1) {
        if (JSON.stringify(legacy[i]) !== JSON.stringify(next[i])) { divergence = i; break; }
      }
      expect(next.length, `seed ${seed}: step count diverged at ${divergence}`).toBe(legacy.length);
      if (divergence >= 0) {
        expect(JSON.stringify(next[divergence]), `seed ${seed} step ${divergence}`)
          .toBe(JSON.stringify(legacy[divergence]));
      }
      expect(JSON.stringify(next)).toBe(JSON.stringify(legacy));
    }
  }, 120_000);

  it('exports the same operations', () => {
    // Legacy engine.js also re-exported eight content tables for the old UI;
    // those now come from src/content, so only the functions are compared.
    const legacyNames = Object.keys(LegacyEngine)
      .filter((name) => typeof LegacyEngine[name] === 'function')
      .sort();
    const missing = legacyNames.filter((name) => typeof NewEngine[name] !== 'function');
    expect(missing).toEqual([]);
    expect(NewEngine.DICE).toBeUndefined();
  });

  it('feeds the UI through one compat surface', async () => {
    const Compat = await import('../../src/compat/content.ts');
    const source = await readFile(new URL('../../src/legacy/app.js', import.meta.url), 'utf8');
    const block = source.match(/import \{([\s\S]*?)\} from '\.\.\/compat\/content\.ts';/);
    expect(block, 'app.js imports its game surface from src/compat').toBeTruthy();
    const names = block[1].split(',').map((s) => s.trim()).filter(Boolean);
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((name) => Compat[name] === undefined)).toEqual([]);
  });
});
