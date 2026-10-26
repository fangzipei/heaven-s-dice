// window.HeavensDice — the contract the CDP scripts under tools/ drive the game
// through. The field list is load-bearing: a test script that cannot find
// `roll` or `app.busy` fails silently, so the shape is declared here once.
import type { RunState } from '../core/types.ts';
import type * as EngineNamespace from '../core/engine.ts';

export interface DebugBridge {
  readonly run: RunState | null;
  readonly app: Record<string, unknown>;
  readonly Engine: typeof EngineNamespace;
  readonly start: () => void;
  readonly roll: (options?: { free?: boolean }) => void;
  readonly score: (action: string) => void;
  readonly render: () => void;
  readonly setup: (force?: boolean) => void;
  readonly intro: () => void;
  readonly shop: () => void;
  readonly victory: () => void;
  readonly defeat: () => void;
  readonly openCompendium: (tab?: string) => void;
  readonly openRules: () => void;
  readonly showVictory: () => void;
  readonly showDefeat: () => void;
  readonly diceTable: () => unknown;
  readonly diceTableEntries: () => number;
  readonly motion: unknown;
  readonly setLevel: (level: number) => boolean;
}

declare global {
  interface Window {
    HeavensDice?: DebugBridge;
  }
}

export function installDebugBridge(bridge: DebugBridge): void {
  window.HeavensDice = bridge;
}
