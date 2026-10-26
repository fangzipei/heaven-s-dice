/* The read-only channel between the mutate-style engine and the UI.
   Every command calls straight through to `engine.ts` and then emits facts
   derived from the return value plus the state the engine just produced —
   so the numbers stay exactly where the Phase 1 parity tests pinned them, and
   rendering code never has to re-derive a rule.
   Events carry keys and numbers, never Chinese copy: wording is the UI's job. */
import * as Engine from './engine.ts';
import type { RunScoreBreakdown, ScoreAction, ShopSection } from './engine.ts';
import type { LevelRewardInfo, RunPhase } from './types.ts';
import type { ScoringAnalysis } from './scoring.ts';
import type { RunState } from './types.ts';

export interface DiceSnapshot {
  uid: string;
  dieId: string;
  value: number | null;
  blank: boolean;
  wild: boolean;
  scored: boolean;
}

/** What banking right now would pay, mirrored from `Engine.getScorePreview`. */
export interface ScorePreviewSnapshot {
  valid: boolean;
  totalReroll: number;
  totalContinue: number;
  totalBank: number;
  voided: boolean;
  bossNote?: string;
}

export type EngineEvent =
  | { type: 'level:opened'; level: number; target: number; targetBase: number; bossKey: string | null; bossStatus: string | null; rerolls: number }
  | { type: 'dice:rolled'; throwNumber: number; values: (number | string)[]; dice: DiceSnapshot[]; hot: boolean; bust: number; phase: RunPhase }
  | { type: 'dice:toggled'; uid: string; selected: string[]; preview: ScorePreviewSnapshot }
  | { type: 'score:preview'; preview: ScorePreviewSnapshot }
  | { type: 'score:applied'; ok: boolean; action: ScoreAction; total: number; score: number; roundScore: number; rerolls: number; phase: RunPhase; targetReached: boolean; critical: boolean; combos: ScoringAnalysis['combos']; breakdown: RunScoreBreakdown | null; error?: string }
  | { type: 'level:settled'; level: number; score: number; target: number; reward: LevelRewardInfo | null; pendingReward: LevelRewardInfo | null; overshootTierKey: string | null; coins: number; runWon: boolean }
  | { type: 'item:used'; itemId: string; ok: boolean; rerollFree: boolean; charges: number; phase: RunPhase; error?: string }
  | { type: 'gesture:applied'; gesture: string; ok: boolean; phase: RunPhase; error?: string }
  | { type: 'shop:stocked'; dice: (string | null)[]; barrels: (string | null)[]; items: (string | null)[]; refreshes: Record<string, number> }
  | { type: 'shop:purchase'; section: ShopSection; index: number; itemId: string | null; ok: boolean; price: number; coins: number; needReplace: boolean; error?: string }
  | { type: 'boss:effect'; key: string | null; status: string | null }
  | { type: 'run:ended'; victory: boolean; level: number; coins: number; reason: RunPhase };

export type EngineListener = (event: EngineEvent) => void;

export interface EventBus {
  emit(event: EngineEvent): void;
  on(listener: EngineListener): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Set<EngineListener>();
  return {
    emit(event) { for (const listener of listeners) listener(event); },
    on(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

function diceSnapshot(state: RunState): DiceSnapshot[] {
  return state.dice.map((die) => ({
    uid: die.uid, dieId: die.dieId, value: die.value,
    blank: die.blank, wild: die.wild, scored: die.scored,
  }));
}

function previewOf(state: RunState): ScorePreviewSnapshot {
  const preview = Engine.getScorePreview(state);
  return {
    valid: preview.valid,
    totalReroll: preview.totalReroll,
    totalContinue: preview.totalContinue,
    totalBank: preview.totalBank,
    voided: Boolean(preview.voided),
    bossNote: preview.bossNote,
  };
}

function levelView(state: RunState) {
  return {
    level: state.level,
    target: state.target,
    targetBase: state.targetBase,
    bossKey: Engine.bossEffectKey(state),
    bossStatus: Engine.bossStatusText(state),
    rerolls: state.rerolls,
  };
}

/** `won`/`run-won`/`shop` are the moments the level actually pays out. */
function settled(state: RunState) {
  if (!['won', 'run-won', 'shop'].includes(state.phase)) return null;
  return {
    level: state.level,
    score: state.score,
    target: state.target,
    reward: state.levelReward,
    pendingReward: state.pendingReward,
    overshootTierKey: state.overshootTierKey ?? null,
    coins: state.coins,
    runWon: state.phase === 'run-won' || Boolean(state.runWon),
  };
}

function emitSettled(bus: EventBus, state: RunState): void {
  const info = settled(state);
  if (info) bus.emit({ type: 'level:settled', ...info });
}

function emitEndIfNeeded(bus: EventBus, before: RunPhase, state: RunState): void {
  if (before === state.phase) return;
  if (state.phase !== 'run-won' && state.phase !== 'lost') return;
  bus.emit({
    type: 'run:ended',
    victory: state.phase === 'run-won',
    level: state.level,
    coins: state.coins,
    reason: state.phase,
  });
}

export function initLevel(state: RunState, bus: EventBus): RunState {
  Engine.initLevel(state);
  const view = levelView(state);
  bus.emit({ type: 'level:opened', ...view });
  bus.emit({ type: 'boss:effect', key: view.bossKey, status: view.bossStatus });
  return state;
}

export function rollDice(
  state: RunState,
  bus: EventBus,
  options: { free?: boolean; rng?: () => number } = {},
): Engine.RollResult {
  const result = Engine.rollDice(state, options);
  if (result.ok) {
    bus.emit({
      type: 'dice:rolled',
      throwNumber: state.throwNumber || 0,
      values: [...(state.lastRoll || [])],
      dice: diceSnapshot(state),
      hot: Boolean(result.hot),
      bust: result.bust || 0,
      phase: state.phase,
    });
  }
  return result;
}

export function toggleDie(state: RunState, bus: EventBus, uid: string): boolean {
  const changed = Engine.toggleDie(state, uid);
  if (changed) {
    bus.emit({ type: 'dice:toggled', uid, selected: [...state.selected], preview: previewOf(state) });
  }
  return changed;
}

export function showPreview(state: RunState, bus: EventBus): ScorePreviewSnapshot {
  const preview = previewOf(state);
  bus.emit({ type: 'score:preview', preview });
  return preview;
}

export function applyScore(state: RunState, bus: EventBus, action: ScoreAction): Engine.ApplyScoreResult {
  const before = state.phase;
  const result = Engine.applyScore(state, action);
  if (result.ok) {
    const last = state.lastScore;
    bus.emit({
      type: 'score:applied',
      ok: true,
      action,
      total: result.total || 0,
      score: state.score,
      roundScore: state.roundScore,
      rerolls: state.rerolls,
      phase: state.phase,
      targetReached: Boolean(result.targetReached),
      critical: Boolean(last?.critical),
      combos: last?.combos || [],
      breakdown: result.breakdown ?? null,
    });
    emitSettled(bus, state);
  } else {
    bus.emit({
      type: 'score:applied',
      ok: false,
      action,
      total: 0,
      score: state.score,
      roundScore: state.roundScore,
      rerolls: state.rerolls,
      phase: state.phase,
      targetReached: false,
      critical: false,
      combos: [],
      breakdown: null,
      error: result.error,
    });
  }
  emitEndIfNeeded(bus, before, state);
  return result;
}

export function rerollDeadThrow(state: RunState, bus: EventBus): Engine.RollResult {
  const before = state.phase;
  const result = Engine.rerollDeadThrow(state);
  if (result.ok) {
    bus.emit({
      type: 'dice:rolled',
      throwNumber: state.throwNumber || 0,
      values: [...(state.lastRoll || [])],
      dice: diceSnapshot(state),
      hot: Boolean(result.hot),
      bust: result.bust || 0,
      phase: state.phase,
    });
  }
  emitEndIfNeeded(bus, before, state);
  return result;
}

export function useItem(state: RunState, bus: EventBus, itemId: string): Engine.ItemResult {
  const before = state.phase;
  const result = Engine.useItem(state, itemId);
  bus.emit({
    type: 'item:used',
    itemId,
    ok: result.ok,
    rerollFree: Boolean(result.rerollFree),
    charges: Engine.activeCharges(state),
    phase: state.phase,
    error: result.error,
  });
  if (itemId === 'boss_ward' && result.ok) {
    bus.emit({ type: 'boss:effect', key: Engine.bossEffectKey(state), status: Engine.bossStatusText(state) });
  }
  emitEndIfNeeded(bus, before, state);
  return result;
}

export function applyGesture(state: RunState, bus: EventBus, gesture: string): Engine.GestureResult {
  const result = Engine.applyGesture(state, gesture);
  bus.emit({ type: 'gesture:applied', gesture, ok: result.ok, phase: state.phase, error: result.error });
  return result;
}

export function forfeit(state: RunState, bus: EventBus): { ok: boolean; error?: string } {
  const before = state.phase;
  const result = Engine.forfeit(state);
  emitEndIfNeeded(bus, before, state);
  return result;
}

export function advanceLevel(state: RunState, bus: EventBus): { ok: boolean; error?: string; final?: boolean; reward?: LevelRewardInfo | null } {
  const before = state.phase;
  const result = Engine.advanceLevel(state);
  if (result.ok) emitSettled(bus, state);
  emitEndIfNeeded(bus, before, state);
  return result;
}

export function retryLevel(state: RunState, bus: EventBus): { ok: boolean; error?: string } {
  const before = state.phase;
  const result = Engine.retryLevel(state);
  if (result.ok) {
    const view = levelView(state);
    bus.emit({ type: 'level:opened', ...view });
    bus.emit({ type: 'boss:effect', key: view.bossKey, status: view.bossStatus });
  }
  emitEndIfNeeded(bus, before, state);
  return result;
}

function stockedView(state: RunState) {
  const shop = state.shop;
  return {
    dice: (shop?.dice || []).map((offer) => offer.id ?? null),
    barrels: (shop?.barrel || []).map((offer) => offer.id ?? null),
    items: (shop?.item || []).map((offer) => offer.id ?? null),
    refreshes: { ...(shop?.refreshes || {}) },
  };
}

export function openShop(state: RunState, bus: EventBus): void {
  if (!Engine.openShop(state)) return;
  bus.emit({ type: 'shop:stocked', ...stockedView(state) });
}

export function refreshSection(
  state: RunState,
  bus: EventBus,
  section: ShopSection,
): { ok: boolean; error?: string; cost?: number } {
  const result = Engine.refreshSection(state, section);
  if (result.ok) bus.emit({ type: 'shop:stocked', ...stockedView(state) });
  return result;
}

export function buy(
  state: RunState,
  bus: EventBus,
  section: ShopSection,
  index: number,
  replaceBagUid: string | null = null,
): Engine.BuyResult {
  const result = section === 'dice'
    ? Engine.buyDie(state, index, replaceBagUid)
    : section === 'barrel' ? Engine.buyBarrel(state, index)
      : Engine.buyItem(state, index);
  bus.emit({
    type: 'shop:purchase',
    section,
    index,
    itemId: result.die?.id ?? result.barrel?.id ?? result.item?.id ?? null,
    ok: result.ok,
    price: result.price ?? 0,
    coins: state.coins,
    needReplace: Boolean(result.needReplace),
    error: result.error,
  });
  return result;
}

export function sellItem(state: RunState, bus: EventBus, itemId: string): { ok: boolean; error?: string; price?: number } {
  const result = Engine.sellItem(state, itemId);
  if (result.ok) {
    bus.emit({
      type: 'shop:purchase', section: 'item', index: -1, itemId, ok: true,
      price: -(result.price ?? 0), coins: state.coins, needReplace: false,
    });
  }
  return result;
}

export function leaveShop(state: RunState, bus: EventBus): { ok: boolean; error?: string } {
  const result = Engine.leaveShop(state);
  if (result.ok) {
    const view = levelView(state);
    bus.emit({ type: 'level:opened', ...view });
    bus.emit({ type: 'boss:effect', key: view.bossKey, status: view.bossStatus });
  }
  return result;
}
