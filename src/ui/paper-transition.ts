// ui/paper-transition.ts — roll the whole paper world across to the next scene.
//
// Two scene panels sit side by side in a track twice the stage width. The old
// scene is painted first, the swap happens underneath it, the next scene's
// background is fetched, and then the track slides one full stage left. A
// rolled-paper seam rides the boundary, so the change reads as a scroll instead
// of a page flip. The overlay is framed exactly like the real scene, so removing
// it at the end does not shift anything.
const SCROLL_MS = 780;
const REVEAL_MS = 160;
const LOAD_WAIT_MS = 700;
let swapping = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sceneArt(): string | null {
  const back = document.getElementById('room-back');
  if (!back) return null;
  const match = /url\((['"]?)(.*?)\1\)/.exec(getComputedStyle(back).backgroundImage);
  return match ? (match[2] ?? null) : null;
}

interface Stage { left: number; top: number; width: number; height: number; sceneWidth: number }

/** The scroll covers the table + rail stage, not the top bar. */
function measureStage(): Stage {
  const layout = document.querySelector<HTMLElement>('.game-layout');
  const scene = document.getElementById('scene');
  const viewport: Stage = {
    left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, sceneWidth: window.innerWidth,
  };
  if (!layout) return viewport;
  const rect = layout.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return viewport;
  const sceneRect = scene?.getBoundingClientRect();
  const sceneWidth = sceneRect && sceneRect.width > 40
    ? Math.min(rect.width, sceneRect.width)
    : rect.width;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, sceneWidth };
}

function buildPanel(art: string | null, stage: Stage): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'scroll-panel';
  const scene = document.createElement('div');
  scene.className = 'scroll-scene';
  scene.style.width = `${stage.sceneWidth}px`;
  if (art) scene.style.backgroundImage = `url("${art}")`;
  panel.append(scene);
  const railWidth = Math.max(0, stage.width - stage.sceneWidth);
  if (railWidth > 8) {
    const rail = document.createElement('div');
    rail.className = 'scroll-rail';
    rail.style.left = `${stage.sceneWidth}px`;
    rail.style.width = `${railWidth}px`;
    panel.append(rail);
  }
  return panel;
}

export function paperSwap(swap: () => void, after?: () => void): void {
  // A flat paper sheet slides across; no scale/rotation deformation.
  if (swapping) return;
  if (prefersReducedMotion() || !document.body) {
    swap();
    after?.();
    return;
  }
  swapping = true;
  const layer = document.createElement('div');
  layer.className = 'paper-wipe';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  requestAnimationFrame(() => layer.classList.add('is-covering'));
  window.setTimeout(() => {
    try {
      swap();
      after?.();
    } finally {
      layer.classList.add('is-revealing');
      window.setTimeout(() => { layer.remove(); swapping = false; }, 260);
    }
  }, 240);
}
