// ui/combo-notes.ts — the rail's scoring cheat-sheet and the left-hand ledger.
//
// Both lists show real paper dice, so they live outside hud.ts: the HUD is
// deliberately kept from re-assembling face markup and reuses the renderer.
import { STANDARD_DIE } from '../content/index.ts';
import { h, num } from '../core/util.ts';
import { paperDieFaceHtml } from '../render/dice-dom.ts';
import { $ } from './dom.ts';
import { app } from './state.ts';

interface RuleRow {
  id: string;
  label: string;
  faces: (number | 'wild')[];
  points: string;
  detail: string;
}

const RULE_ROWS: RuleRow[] = [
  { id: 'single', label: '单颗 1 / 5', faces: [1, 5], points: '100 / 50', detail: '只有 1 和 5 能单独计分' },
  { id: 'triple', label: '三条', faces: [4, 4, 4], points: '400', detail: '同点三颗 × 100；三条 1 记 1000' },
  { id: 'quad', label: '四条 ~ 六条', faces: [3, 3, 3, 3], points: '×2 / ×4 / ×8', detail: '在三条的基础上翻倍' },
  { id: 'straight', label: '顺子', faces: [1, 2, 3, 4, 5], points: '500', detail: '五颗连号 500；2 起头 750；1-6 全顺 1500' },
  { id: 'wild', label: '恶魔赖子', faces: ['wild'], points: '补缺口', detail: '可替顺子或同点，不能单独计分' },
];

function ruleDice(faces: (number | 'wild')[]): string {
  return faces.map((face) => (face === 'wild'
    ? '<span class="rule-die is-wild" aria-hidden="true">魔</span>'
    : `<span class="rule-die">${paperDieFaceHtml(face, STANDARD_DIE)}</span>`)).join('');
}

export function renderRules(): void {
  const list = $('#patterns');
  if (!list) return;
  const note = $('#pattern-note');
  if (note) note.textContent = '取最高分';
  list.innerHTML = RULE_ROWS.map((row) => `
    <div class="rule-row" data-rule-tip="${h(row.id)}">
      <div class="rule-head"><b>${h(row.label)}</b><strong>${h(row.points)}</strong></div>
      <div class="rule-dice">${ruleDice(row.faces)}</div>
      <p>${h(row.detail)}</p>
    </div>`).join('');
}

export function renderScoreHistory(): void {
  const run = app.run;
  const panel = $('#score-history');
  const list = $('#score-history-list');
  if (!run || !panel || !list) return;
  // Show the hand that was just scored until the next throw starts. Do not
  // depend on throwNumber, which can advance before the panel repaints.
  const score = run.lastScore;
  const visible = run.phase === 'reroll-pending' && Boolean(score?.combos?.length);
  if (!visible) {
    panel.hidden = true;
    list.innerHTML = '';
    return;
  }
  const entries = (score!.combos || []).map((combo) => ({
    label: combo.label,
    points: combo.points,
    faces: combo.type === 'straight'
      ? [...combo.faces, ...Array.from({ length: combo.wilds || 0 }, () => 'wild' as const)]
      : Array.from({ length: combo.type === 'single' ? 1 : combo.count }, () => combo.face),
  }));
  panel.hidden = false;
  $('#score-history-note')!.textContent = `${entries.length} 次`;
  list.innerHTML = entries.map((entry) => `
    <div class="score-history-row" aria-label="${h(entry.label)}，${num(entry.points)} 分">
      <div class="score-history-head"><b>${h(entry.label)}</b><strong>+${num(entry.points)}</strong></div>
      <div class="score-history-dice">${ruleDice(entry.faces)}</div>
    </div>`).join('');
}
