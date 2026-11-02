import { portraitFor, hasPortraitStates } from '../render/portrait-assets.ts';
import { portraitStateArt, type PortraitState } from '../render/portrait-states.ts';
import { $ } from './dom.ts';

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let loadToken = 0;

function currentArt(): string {
  return $('#opponent')?.dataset.paperArt || '';
}

/**
 * Swap the opponent into one of the four reserved poses. Characters without
 * state assets keep their existing single SVG; the fallback is silent.
 */
export function setOpponentPose(state: PortraitState, holdMs = 0): void {
  const art = currentArt();
  const image = $<HTMLImageElement>('#opponent-image');
  if (!art || !image || !hasPortraitStates(art)) return;
  const next = portraitStateArt(art, state);
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (image.dataset.portraitState === state && image.getAttribute('src') === next) {
    if (holdMs) idleTimer = setTimeout(() => setOpponentPose('idle'), holdMs);
    return;
  }
  const token = ++loadToken;
  const preload = new Image();
  preload.onload = () => {
    if (token !== loadToken) return;
    image.src = next;
    image.dataset.portraitState = state;
    if (holdMs) idleTimer = setTimeout(() => setOpponentPose('idle'), holdMs);
  };
  preload.src = next;
}

export function resetOpponentPose(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  setOpponentPose('idle');
}

export function opponentIdleArt(): string {
  const art = currentArt();
  return art ? portraitFor(art, 'idle') : '';
}
