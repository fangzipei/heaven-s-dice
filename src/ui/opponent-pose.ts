import { portraitFor, hasPortraitStates } from '../render/portrait-assets.ts';
import { portraitStateArt, type PortraitState } from '../render/portrait-states.ts';
import { $ } from './dom.ts';

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let swapTimer: ReturnType<typeof setTimeout> | null = null;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let loadToken = 0;

function currentArt(): string {
  return $('#opponent')?.dataset.paperArt || '';
}

function clearPoseTimers(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (swapTimer) clearTimeout(swapTimer);
  if (settleTimer) clearTimeout(settleTimer);
  idleTimer = null;
  swapTimer = null;
  settleTimer = null;
}

/**
 * Swap the opponent into one of the four reserved poses. Characters without
 * state assets keep their existing single SVG; the fallback is silent.
 *
 * The portrait shakes left with the old frame, then swaps on the right swing.
 */
export function setOpponentPose(state: PortraitState, holdMs = 0): void {
  const art = currentArt();
  const image = $<HTMLImageElement>('#opponent-image');
  if (!art || !image || !hasPortraitStates(art)) return;
  const next = portraitStateArt(art, state);
  clearPoseTimers();
  if (image.dataset.portraitState === state && image.getAttribute('src') === next) {
    if (holdMs) idleTimer = setTimeout(() => setOpponentPose('idle'), holdMs);
    return;
  }
  const token = ++loadToken;
  const preload = new Image();
  preload.onload = () => {
    if (token !== loadToken) return;
    const wrap = image.closest<HTMLElement>('.opponent-image-wrap');
    if (wrap) {
      wrap.classList.remove('is-state-swapping');
      void wrap.offsetWidth;
      wrap.classList.add('is-state-swapping');
      settleTimer = setTimeout(() => wrap.classList.remove('is-state-swapping'), 480);
    }
    // Left swing still shows the old frame; swap as the pendulum reaches right.
    swapTimer = setTimeout(() => {
      if (token !== loadToken) return;
      image.src = next;
      image.dataset.portraitState = state;
      if (holdMs) idleTimer = setTimeout(() => setOpponentPose('idle'), holdMs);
    }, 180);
  };
  preload.src = next;
}

export function resetOpponentPose(): void {
  clearPoseTimers();
  setOpponentPose('idle');
}

export function opponentIdleArt(): string {
  const art = currentArt();
  return art ? portraitFor(art, 'idle') : '';
}
