import { PORTRAIT_STATES, portraitStateArt, type PortraitState } from '../render/portrait-states.ts';

/**
 * Characters that have the four-state portrait set installed.
 *
 * Keyed by character id (slug). Bosses that share one art id still get their
 * own entry here, because every one of them ships a distinct look.
 */
const READY = new Set([
  // minions
  'rat',
  'gargoyle',
  'forge',
  'gilt',
  'crystal',
  // bosses
  'rotfang',
  'judge',
  'soulsmith',
  'ashclerk',
  'gildedking',
  'startax',
  'suspensor',
  'seraph',
  'lucifer',
  'twinsix',
  'toll',
  'mirror',
  'pairbane',
  'satan',
]);

export function hasPortraitStates(id: string): boolean {
  return READY.has(id);
}

export function portraitFor(id: string, art: string, state: PortraitState): string {
  return hasPortraitStates(id)
    ? portraitStateArt(id, state)
    : `assets/portraits/paper/${art}.svg`;
}

const preloaded = new Set<string>();

/**
 * Warm the four poses once per character. Safari decodes a large PNG on the
 * main thread when `src` changes, which shows up as a hitch during the pose
 * swap; decoding up front moves that work off the critical moment.
 */
export function preloadPortraitStates(id: string): void {
  if (!hasPortraitStates(id) || preloaded.has(id)) return;
  preloaded.add(id);
  for (const state of PORTRAIT_STATES) {
    const image = new Image();
    image.decoding = 'async';
    image.src = portraitStateArt(id, state);
    image.decode?.().catch(() => {});
  }
}
