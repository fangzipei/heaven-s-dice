import { CHANGELOG, LATEST_CHANGELOG } from '../../content/changelog.ts';
import { h } from '../../core/util.ts';
import { openOverlay } from '../components/overlay.ts';
import { $ } from '../dom.ts';

export function refreshHomeChangelog(): void {
  const title = $('#home-update-title');
  const summary = $('#home-update-summary');
  if (title) title.textContent = `${LATEST_CHANGELOG.date.replaceAll('-', ' / ')} · ${LATEST_CHANGELOG.title}`;
  if (summary) summary.textContent = LATEST_CHANGELOG.summary;
}

export function openChangelog(): void {
  const entries = CHANGELOG.map((entry) => `
    <article class="changelog-entry">
      <div class="changelog-date">${h(entry.date)}</div>
      <div>
        <h3>${h(entry.title)}</h3>
        <p class="changelog-summary">${h(entry.summary)}</p>
        <ul>${entry.items.map((item) => `<li>${h(item)}</li>`).join('')}</ul>
      </div>
    </article>
  `).join('');
  openOverlay(`
    <div class="modal result-modal changelog-modal" style="width:min(680px,100%);padding:30px 34px">
      <button class="overlay-close" data-action="close-overlay" aria-label="关闭">×</button>
      <p class="modal-kicker">WHAT CHANGED</p>
      <h2 style="font-size:30px;margin-top:6px">更新日志</h2>
      <p class="result-sub">每次发版都会写在这里，挑你关心的看就行。</p>
      <div class="changelog-list">${entries}</div>
    </div>
  `);
}
