import type { ChangelogEntry } from '../../content/changelog.ts';
import { h } from '../../core/util.ts';
import { fetchChangelog } from '../../platform/api.ts';
import { openOverlay } from '../components/overlay.ts';
import { $ } from '../dom.ts';

let cached: ChangelogEntry[] | null = null;

/** Test/SSR seed; production always reads GET /changelog. */
export function primeChangelog(entries: ChangelogEntry[]): void {
  cached = entries;
}

async function loadChangelog(): Promise<ChangelogEntry[]> {
  if (cached) return cached;
  try {
    cached = await fetchChangelog();
    return cached;
  } catch {
    return [];
  }
}

function entryHtml(entry: ChangelogEntry): string {
  return `
    <article class="changelog-entry">
      <div class="changelog-date">${h(entry.date)}</div>
      <div>
        <h3>${h(entry.title)}</h3>
        <p class="changelog-summary">${h(entry.summary)}</p>
        <ul>${(entry.items || []).map((item) => `<li>${h(item)}</li>`).join('')}</ul>
      </div>
    </article>`;
}

export async function refreshHomeChangelog(): Promise<void> {
  const entries = await loadChangelog();
  const latest = entries[0];
  const title = $('#home-update-title');
  const summary = $('#home-update-summary');
  if (!latest) {
    if (title) title.textContent = '更新记录';
    if (summary) summary.textContent = '连接服务器后查看最新更新。';
    return;
  }
  if (title) title.textContent = `${latest.date.replaceAll('-', ' / ')} · ${latest.title}`;
  if (summary) summary.textContent = latest.summary;
}

export async function openChangelog(): Promise<void> {
  openOverlay(`
    <div class="modal result-modal changelog-modal" style="width:min(680px,100%);padding:30px 34px">
      <button class="overlay-close" data-action="close-overlay" aria-label="关闭">×</button>
      <p class="modal-kicker">WHAT CHANGED</p>
      <h2 style="font-size:30px;margin-top:6px">更新日志</h2>
      <p class="result-sub">更新记录由服务器提供。</p>
      <div class="changelog-list"><p class="changelog-loading">正在读取更新记录…</p></div>
    </div>
  `);
  const entries = await loadChangelog();
  const list = document.querySelector<HTMLElement>('.changelog-list');
  if (!list) return;
  list.innerHTML = entries.length
    ? entries.map(entryHtml).join('')
    : '<p class="changelog-loading">更新记录暂时无法加载，请稍后再试。</p>';
}
