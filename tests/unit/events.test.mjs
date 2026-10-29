/* Phase 2b gate: the event wrapper must not touch the game.
   The same scripted player is driven twice — once straight through
   `core/engine.ts`, once through `core/events.ts` — and the resulting state
   has to match throw for throw. Then the same seed replayed through the
   wrapper has to emit an identical event stream, which is what lets the
   render layer animate from events instead of polling RunState. */
import { describe, it, expect } from 'vitest';
import * as Engine from '../../src/core/engine.ts';
import { bestSelection } from '../../src/core/scoring.ts';
import * as Events from '../../src/core/events.ts';
import { DEFAULT_BOSS_PLAN } from '../../src/content/index.ts';
/* Die uids, log ids and their `at` stamps embed Date.now() and a process-wide
   counter, so they are opaque bookkeeping, not game state. Alias them in
   first-seen order so two runs of the same seed compare behaviour, not naming. */
const ID_TAIL = /-[0-9a-z]{8}-[0-9a-z]+$/;
function canonical(value) {
  const aliases = new Map();
  const alias = (id) => {
    if (!aliases.has(id)) aliases.set(id, `uid#${aliases.size}`);
    return aliases.get(id);
  };
  return JSON.stringify(value, (key, nested) => {
    if (key === 'at') return 0;
    if (typeof nested !== 'string') return nested;
    return ID_TAIL.test(nested) ? alias(nested) : nested;
  });
}

/** Reads come from the engine directly; only writes go through `ops`. */
function drive(ops, seed, maxSteps) {
  const run = Engine.createRun({ rng: Engine.makeRng(seed) });
  run.bossPlan = { ...DEFAULT_BOSS_PLAN };
  const trace = [];

  for (let step = 0; step < maxSteps; step += 1) {
    if (run.phase === 'run-won') break;

    if (['ready', 'reroll-pending'].includes(run.phase)) {
      ops.rollDice(run);
    } else if (run.phase === 'hot') {
      ops.rollDice(run, { free: true });
    } else if (run.phase === 'selecting') {
      const best = bestSelection(
        run.dice.filter((d) => !d.scored && !d.blank && (d.wild || (d.value >= 1 && d.value <= 6))),
      );
      if (best) {
        run.selected = best.dice.map((d) => d.uid);
        ops.applyScore(run, run.rerolls > 0 ? 'reroll' : 'bank');
      } else if (run.rerolls > 0) {
        ops.rerollDeadThrow(run);
      } else {
        ops.rollDice(run);
      }
    } else if (run.phase === 'dead') {
      const usable = run.activeItems.find((id) => Engine.canUseItem(run, id).ok);
      if (run.rerolls > 0) {
        ops.rerollDeadThrow(run);
      } else if (usable) {
        const used = ops.useItem(run, usable);
        if (used?.rerollFree) ops.rollDice(run, { free: true });
      } else {
        ops.forfeit(run);
      }
    } else if (run.phase === 'cleared') {
      ops.advanceLevel(run);
    } else if (run.phase === 'won') {
      ops.openShop(run);
      for (const section of ['dice', 'barrel', 'item']) {
        const offers = run.shop?.[section] || [];
        for (let index = 0; index < offers.length; index += 1) {
          const result = ops.buy(run, section, index);
          if (result?.ok) continue;
          if (result?.needReplace) ops.buy(run, section, index, run.bag.at(-1)?.uid);
        }
        if (Engine.refreshCost(run, section) <= run.coins) ops.refreshSection(run, section);
      }
      ops.leaveShop(run);
    } else if (run.phase === 'shop') {
      ops.leaveShop(run);
    } else if (run.phase === 'lost') {
      ops.retryLevel(run);
    }

    trace.push(canonical(run));
  }
  return { run, trace };
}

const DIRECT_OPS = {
  rollDice: (state, options) => Engine.rollDice(state, options),
  applyScore: (state, action) => Engine.applyScore(state, action),
  rerollDeadThrow: (state) => Engine.rerollDeadThrow(state),
  useItem: (state, itemId) => Engine.useItem(state, itemId),
  forfeit: (state) => Engine.forfeit(state),
  advanceLevel: (state) => Engine.advanceLevel(state),
  retryLevel: (state) => Engine.retryLevel(state),
  openShop: (state) => Engine.openShop(state),
  refreshSection: (state, section) => Engine.refreshSection(state, section),
  leaveShop: (state) => Engine.leaveShop(state),
  buy: (state, section, index, uid = null) => (section === 'dice' ? Engine.buyDie(state, index, uid)
    : section === 'barrel' ? Engine.buyBarrel(state, index)
      : Engine.buyItem(state, index)),
};

/** The same player, but every write is announced on a bus. */
function record(seed, maxSteps) {
  const bus = Events.createEventBus();
  const seen = [];
  bus.on((event) => seen.push(event));
  const ops = {
    rollDice: (state, options) => Events.rollDice(state, bus, options),
    applyScore: (state, action) => Events.applyScore(state, bus, action),
    rerollDeadThrow: (state) => Events.rerollDeadThrow(state, bus),
    useItem: (state, itemId) => Events.useItem(state, bus, itemId),
    forfeit: (state) => Events.forfeit(state, bus),
    advanceLevel: (state) => Events.advanceLevel(state, bus),
    retryLevel: (state) => Events.retryLevel(state, bus),
    openShop: (state) => Events.openShop(state, bus),
    refreshSection: (state, section) => Events.refreshSection(state, bus, section),
    leaveShop: (state) => Events.leaveShop(state, bus),
    buy: (state, section, index, uid) => Events.buy(state, bus, section, index, uid),
  };
  const played = drive(ops, seed, maxSteps);
  return { ...played, seen };
}

describe('engine event stream', () => {
  it('leaves the run state exactly where the raw engine puts it', () => {
    const direct = drive(DIRECT_OPS, 0x5EED, 3000);
    const wrapped = record(0x5EED, 3000);
    expect(wrapped.run.level).toBe(direct.run.level);
    expect(wrapped.trace.length).toBe(direct.trace.length);
    for (let i = 0; i < direct.trace.length; i += 1) {
      expect(wrapped.trace[i], `step ${i}`).toBe(direct.trace[i]);
    }
  }, 180_000);

  it('replays the same seed as the same event stream', () => {
    const first = record(0x1234, 1600);
    const second = record(0x1234, 1600);
    expect(canonical(second.seen)).toBe(canonical(first.seen));
    const types = [...new Set(first.seen.map((event) => event.type))];
    for (const required of [
      'level:opened', 'boss:effect', 'dice:rolled', 'score:applied',
      'level:settled', 'shop:stocked', 'shop:purchase', 'run:ended',
    ]) {
      expect(types, `event stream never carried ${required}`).toContain(required);
    }
    const ended = first.seen.filter((event) => event.type === 'run:ended');
    expect(ended.length).toBeGreaterThan(0);
    expect(ended.every((event) => typeof event.victory === 'boolean')).toBe(true);
  }, 180_000);

  it('emits nothing for a rejected roll', () => {
    const bus = Events.createEventBus();
    const seen = [];
    bus.on((event) => seen.push(event));
    const run = Engine.createRun({ rng: Engine.makeRng(7) });
    run.phase = 'shop';
    expect(Events.rollDice(run, bus).ok).toBe(false);
    expect(seen).toEqual([]);
  });

  it('announces the end of a run only when it ends', () => {
    const bus = Events.createEventBus();
    const seen = [];
    bus.on((event) => seen.push(event));
    const run = Engine.createRun({ rng: Engine.makeRng(11) });
    Events.rollDice(run, bus);
    expect(seen.some((event) => event.type === 'run:ended')).toBe(false);
    Events.forfeit(run, bus);
    expect(seen.at(-1)).toMatchObject({ type: 'run:ended', victory: false, level: 1, reason: 'lost' });
  });

  it('previews without mutating and selects without re-rolling', () => {
    const bus = Events.createEventBus();
    const seen = [];
    bus.on((event) => seen.push(event));
    const run = Engine.createRun({ rng: Engine.makeRng(9) });
    while (run.phase !== 'selecting') Events.rollDice(run, bus);
    const rolled = JSON.stringify(run);

    const preview = Events.showPreview(run, bus);
    expect(JSON.stringify(run)).toBe(rolled);
    expect(preview.valid).toBe(false);

    const die = run.dice.find((d) => !d.blank && (d.wild || d.value === 1 || d.value === 5));
    const board = JSON.stringify(run.dice);
    expect(Events.toggleDie(run, bus, die.uid)).toBe(true);
    expect(run.selected).toEqual([die.uid]);
    expect(JSON.stringify(run.dice)).toBe(board);
    const toggled = seen.at(-1);
    expect(toggled.type).toBe('dice:toggled');
    expect(toggled.selected).toEqual([die.uid]);
    expect(toggled.preview.valid).toBe(true);
  });

  it('stops talking to a listener that unsubscribed', () => {
    const bus = Events.createEventBus();
    const seen = [];
    bus.on((event) => seen.push(event))();
    Events.rollDice(Engine.createRun({ rng: Engine.makeRng(3) }), bus);
    expect(seen).toEqual([]);
  });
});
