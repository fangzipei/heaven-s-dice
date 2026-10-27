// ui/screens/history.ts — 首页历史骰局：本机记录 + 已同步账号的云端记录。
import { BARREL_BY_ID, DICE_BY_ID, ITEM_BY_ID, STANDARD_DIE } from '../../content/index.ts';
import { h, num } from '../../core/util.ts';
import { fetchRunHistory, type HistoryEntry } from '../../platform/api.ts';
import { loadProfile } from '../../platform/profile.ts';
import { readHistory } from '../../platform/save.ts';
import type { RunRecord } from '../../platform/run-record.ts';
import { closeOverlay, openOverlay } from '../components/overlay.ts';
import { $ } from '../dom.ts';

function durationLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '时间未知';
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function dieName(id: string): string {
  return DICE_BY_ID[id]?.name || (id === STANDARD_DIE.id ? STANDARD_DIE.name : id);
}

function groupedDice(ids: string[]): string {
  const counts = new Map<string, number>();
  ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  return [...counts.entries()]
    .map(([id, count]) => `${h(dieName(id))}${count > 1 ? ` ×${count}` : ''}`)
    .join('、') || '无记录';
}

function itemNames(ids: string[]): string {
  return ids.length
    ? ids.map((id) => h(ITEM_BY_ID[id]?.name || id)).join('、')
    : '无';
}

function resultLabel(result: string): { label: string; className: string } {
  if (result === 'win') return { label: '通关', className: 'is-win' };
  if (result === 'forfeit') return { label: '弃局', className: 'is-forfeit' };
  return { label: '失败', className: 'is-loss' };
}

function localEntry(record: RunRecord): HistoryEntry {
  const last = record.levels[record.levels.length - 1];
  return {
    clientRunId: record.clientRunId,
    startedAt: record.startedAt,
    endedAt: record.endedAt || new Date().toISOString(),
    durationMs: record.durationMs,
    result: record.result || 'abandoned',
    levelReached: record.levelReached,
    finalScore: record.finalScore,
    coins: record.coins,
    loadout: last?.loadout || { dice: [], barrel: 'oak', activeItems: [], passiveItems: [] },
    summary: record.summary as unknown as Record<string, number>,
  };
}

export async function openHistory(): Promise<void> {
  openOverlay(`
    <div class="modal history-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <p class="modal-kicker">THE LEDGER OF NIGHTS</p>
      <h2>历史骰局</h2>
      <p class="result-sub" id="history-source">本机记录</p>
      <div class="history-list" id="history-list">
        <div class="history-empty">读取中……</div>
      </div>
    </div>
  `, { dismissible: true });

  const profile = loadProfile();
  let entries = readHistory().map(localEntry);
  let source = '本机记录';
  if (profile?.mode === 'synced' && profile.token) {
    try {
      const server = await fetchRunHistory(profile.token, 100);
      const map = new Map<string, HistoryEntry>();
      [...server, ...entries].forEach((entry) => map.set(entry.clientRunId, entry));
      entries = [...map.values()];
      source = '本机 + 云端记录';
    } catch {
      source = '云端读取失败 · 仅显示本机记录';
    }
  }
  entries.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
  const list = $('#history-list');
  const sourceNode = $('#history-source');
  if (sourceNode) sourceNode.textContent = `${source} · ${entries.length} 局`;
  if (!list) return;
  if (!entries.length) {
    list.innerHTML = '<div class="history-empty">还没有结束的骰局。通关或死亡后，这里会留下整局账本。</div>';
    return;
  }
  list.innerHTML = entries.map((entry) => {
    const result = resultLabel(entry.result);
    return `
      <article class="history-card ${result.className}">
        <header class="history-head">
          <span class="history-result">${result.label}</span>
          <span class="history-when">${h(dateLabel(entry.endedAt))}</span>
          <span class="history-level">第 ${num(entry.levelReached)} 关</span>
        </header>
        <div class="history-stats">
          <div><span>耗时</span><b>${durationLabel(entry.durationMs)}</b></div>
          <div><span>银币</span><b>${num(entry.coins)}</b></div>
          <div><span>最终得分</span><b>${num(entry.finalScore)}</b></div>
        </div>
        <div class="history-loadout">
          <div><span>骰子</span><b>${groupedDice(entry.loadout.dice)}</b></div>
          <div><span>骰桶</span><b>${h(BARREL_BY_ID[entry.loadout.barrel]?.name || entry.loadout.barrel)}</b></div>
          <div><span>主动物品</span><b>${itemNames(entry.loadout.activeItems)}</b></div>
          <div><span>被动物品</span><b>${itemNames(entry.loadout.passiveItems)}</b></div>
        </div>
      </article>`;
  }).join('');
}

// Kept for the action dispatcher; history is read-only.
export function closeHistory(): void { closeOverlay(); }
