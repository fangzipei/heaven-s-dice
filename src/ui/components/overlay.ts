// ui/components/overlay.ts — 覆盖层的开合与它的清理约定。
//
// 从 app.js 的 Overlay plumbing 一节原样搬出。关闭时留 220ms 淡出、期间把商店
// 面板锁掉、顺手清掉 pendingReplace，这三件事都是截图脚本依赖的时序。
import { $ } from '../dom.ts';
import { app } from '../state.ts';
import { hideTooltip } from './tooltip.ts';

export function openOverlay(html: string, { dismissible = true }: { dismissible?: boolean } = {}): void {
  hideTooltip();
  clearTimeout(app.overlayTimer ?? undefined);
  if (app.gestureCleanup) { app.gestureCleanup(); app.gestureCleanup = null; }
  app.gestureReset = null;
  const root = $('#overlay-root')!;
  root.innerHTML = `<div class="overlay" data-overlay>${html}</div>`;
  app.overlayDismissible = dismissible;
  const overlay = $('[data-overlay]', root)!;
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay && app.overlayDismissible) closeOverlay();
  });
  const close = $<HTMLButtonElement>('[data-action="close-overlay"]', root);
  if (close) close.hidden = !dismissible;
  requestAnimationFrame(() => {
    const focusable = $<HTMLButtonElement>('button.primary-button, [data-action="close-overlay"]', root);
    focusable?.focus?.({ preventScroll: true });
  });
}

export function closeOverlay(): void {
  const root = $('#overlay-root');
  if (!root) return;
  const overlay = $('.overlay', root);
  if (!overlay) return;
  app.overlayDismissible = false;
  if (app.gestureCleanup) { app.gestureCleanup(); app.gestureCleanup = null; }
  app.gestureReset = null;
  overlay.classList.add('is-closing');
  const shop = $('.shop-screen');
  if (shop) shop.style.pointerEvents = 'none';
  clearTimeout(app.overlayTimer ?? undefined);
  app.overlayTimer = setTimeout(() => {
    root.innerHTML = '';
    if (shop) shop.style.pointerEvents = '';
    app.pendingReplace = null;
    app.pendingGrant = null;
  }, 220);
}
