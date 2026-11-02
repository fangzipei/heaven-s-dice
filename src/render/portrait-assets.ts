import { portraitStateArt, type PortraitState } from '../render/portrait-states.ts';

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
