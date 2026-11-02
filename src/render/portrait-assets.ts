import { portraitStateArt, type PortraitState } from '../render/portrait-states.ts';

/** Assets that have the four-state portrait set ready. */
const READY = new Set(['minion-rat']);

export function hasPortraitStates(art: string): boolean {
  return READY.has(art);
}

export function portraitFor(art: string, state: PortraitState): string {
  return hasPortraitStates(art)
    ? portraitStateArt(art, state)
    : `assets/portraits/paper/${art}.svg`;
}
