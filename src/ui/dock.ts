// ui/dock.ts — 屏幕底部的操作坞：预计分、四个行动按钮、自动摇骰、缺票红条。
//
// 从 app.js「Dice tray — WebGL path」末尾那节原样搬出。按钮上的 data-action
// 是 handleAction 的字典，文案被 tools/campaign-test.mjs 与截图比对依赖，
// 所以这里只允许改 import 和 TS 断言，不许动模板字符串。
import { LEVEL_COUNT } from '../content/index.ts';
import { activeBoss, activeCharges, buildScore, getScorePreview, selectedDice } from '../core/engine.ts';
import { h, num } from '../core/util.ts';
import { $ } from './dom.ts';
import { app } from './state.ts';

export function renderComboPreview() {
  const run = app.run!;
  const preview = $('#combo-preview');
  if (!preview) return;
  if (run.phase === 'ready') {
    preview.innerHTML = '<span class="combo-placeholder">1 与 5 总能计分 · 三条、四条与顺子会带来大分</span>';
    return;
  }
  if (run.phase === 'hot') {
    preview.innerHTML = '<span class="combo-label">全骰归位</span><span class="combo-total">六颗骰子免费重投 <em>HOT DICE</em></span>';
    return;
  }
  if (run.phase === 'reroll-pending') {
    preview.innerHTML = '<span class="combo-label">准备续投</span><span class="combo-total">拖动骰桶自己摇，或自动投掷 <em>等待操作</em></span>';
    return;
  }
  if (run.phase === 'cleared') {
    preview.innerHTML = '<span class="combo-label">目标已达成</span><span class="combo-total">可继续得分 · 点击左上角「下一关」收手</span>';
    return;
  }
  if (run.phase === 'dead') {
    preview.innerHTML = '<span class="combo-warning">没有合法计分组合。重投剩余骰子，或使用物品改变骰面。</span>';
    return;
  }
  if (run.phase !== 'selecting') {
    preview.innerHTML = '<span class="combo-placeholder">等待下一步。</span>';
    return;
  }
  const selected = selectedDice(run);
  if (!selected.length) {
    preview.innerHTML = '<span class="combo-placeholder">选择要计分的骰子 · 1 和 5 总能计分</span>';
    return;
  }
  const result = buildScore(run, 'reroll');
  if (!result.valid) {
    preview.innerHTML = `<span class="combo-warning">${h(result.error)}</span>`;
    return;
  }
  const boss = activeBoss(run);
  const shownCombos = boss?.effectKey === 'minTripleScore'
    ? result.analysis.combos.filter((combo) => combo.type === 'straight' || (combo.type === 'nkind' && combo.count >= 3))
    : result.analysis.combos;
  if (!result.total) {
    preview.innerHTML = `<span class="combo-warning">${h(result.bossNote || '本手不计分')}</span><span class="combo-total">+0<em>不计分</em></span>`;
    return;
  }
  const combos = shownCombos.map((combo) => `<span class="combo-pill">${h(combo.label)}<b>+${num(combo.points)}</b></span>`).join('');
  const breakdown = result.breakdown!;
  const selectedFaces = selected.map((die) => die.wild ? '魔' : die.value).join(' · ');
  const flats = breakdown.flats.map((flat) => `<span class="combo-detail-line">${h(flat.label)} <b>+${num(flat.value)}</b></span>`).join('');
  const multipliers = breakdown.multipliers.map((mult) => `<span class="combo-detail-line">${h(mult.label)} <b>${h(String(mult.value))}</b></span>`).join('');
  const notes = breakdown.notes.map((note) => `<span class="combo-detail-line is-note">${h(note.label)}${note.value != null ? ` <b>${h(String(note.value))}</b>` : ''}</span>`).join('');
  const costs = breakdown.costs.map((cost) => `<span class="combo-detail-line is-cost">${h(cost.label)} <b>−${num(cost.value)}</b></span>`).join('');
  preview.innerHTML = `
    <div class="combo-summary"><span class="combo-selected">已选 ${h(selectedFaces)}</span>${combos}</div>
    <div class="combo-breakdown">
      <span class="combo-detail-line">基础 <b>+${num(breakdown.base)}</b></span>
      ${flats}${multipliers}${notes}${costs}
      <span class="combo-total">+${num(result.total)}<em>预计 · 计分</em></span>
    </div>`;
}

export function renderActionDock() {
  const dock = $('#action-dock');
  if (!dock) return;
  const run = app.run!;
  if (app.busy) {
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">${app.cupAnimating ? '骰桶摇动中 · 准备落骰' : '骰子正在落桌…'}</div>
        <div class="action-buttons">
          <button class="score-action" disabled>
            <span class="action-icon"><svg><use href="#i-die"></use></svg></span>
            <span class="action-copy"><b>${app.cupAnimating ? '摇骰中' : '结算中'}</b><em>听，木头和骨头在说话</em></span>
            <span class="action-points">—</span>
          </button>
        </div>
      </div>`;
    return;
  }
  const phase = run.phase;
  if (phase === 'won' || phase === 'run-won' || phase === 'lost' || phase === 'shop') {
    dock.innerHTML = '<div class="action-dock-inner"><div class="action-hint">本关已结束。</div></div>';
    return;
  }
  if (phase === 'cleared') {
    const final = run.level >= LEVEL_COUNT;
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">目标已达成 · 可以继续得分，准备好了再离开</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="advance-level">
            <span class="action-icon"><svg><use href="#i-arrow"></use></svg></span>
            <span class="action-copy"><b>${final ? '查看结局' : '进入下一关'}</b><em>${final ? '结束这场天穹赌局' : '收下本关奖励，前往市集'}</em></span>
            <span class="action-points">→</span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'reroll-pending') {
    const all = run.flags.rerollAll;
    const remaining = run.dice.filter((die) => !die.scored).length;
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">已计分 · ${all ? '全部骰子已归位' : `剩余 ${remaining} 颗骰子待重投`} · 拖动骰桶自己摇，或自动投掷</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="auto-roll">
            <span class="action-icon"><svg><use href="#i-spark"></use></svg></span>
            <span class="action-copy"><b>自动投掷</b><em>系统摇骰，直接投出${all ? '全部六颗' : '剩余'}骰子</em></span>
            <span class="action-points">→</span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'ready') {
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">首掷免费 · 按住骰桶摇动，或直接自动投掷</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="manual-roll">
            <span class="action-icon"><svg><use href="#i-spark"></use></svg></span>
            <span class="action-copy"><b>自动投掷</b><em>六颗骰子已经就位 · 也可以拖动骰桶自己摇</em></span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'hot') {
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">全骰 · 免费重投全部骰子，不消耗重投次数</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="manual-roll">
            <span class="action-icon"><svg><use href="#i-spark"></use></svg></span>
            <span class="action-copy"><b>全骰重投</b><em>让六颗骰子重新落桌</em></span>
            <span class="action-points">FREE<small>免费</small></span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'dead') {
    const pending = Boolean(run.flags.floatingBustPending);
    const canReroll = run.rerolls > 0;
    const canClick = canReroll || pending;
    const hasItems = activeCharges(run) > 0;
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">${pending
          ? `浮动分还挂在桌上 · ${canReroll ? `重投会扣掉它并消耗 1 次（剩余 ${run.rerolls}）` : '先使用烟雾弹或 +重投道具；点重投会结算本关'}`
          : hasItems
            ? '没有可计分的组合，重投已经耗尽 · 你还有物品：可以用魔术手套改骰面，或用加投物品再试'
            : canReroll ? `没有可计分的组合 · 重投消耗 1 次（剩余 ${run.rerolls}）` : '没有可计分的组合，重投已经耗尽'}</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="manual-roll" ${canClick ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>${canReroll ? '重投剩余骰子' : pending ? '结算浮动分' : '重投已耗尽'}</b><em>${canReroll ? '消耗 1 次重投' : pending ? '点击后结束本关' : '使用物品或结束本关'}</em></span>
            <span class="action-points">${canReroll ? `−1<small>重投</small>` : '—'}</span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'selecting') {
    const selected = selectedDice(run);
    const preview = getScorePreview(run);
    const valid = preview.valid && selected.length > 0;
    const noTokens = run.rerolls <= 0;
    const invalidHint = selected.length ? '所选骰子无法计分' : '先选择要计分的骰子';
    const cont = valid ? num(preview.totalContinue) : '—';
    const rer = valid ? num(preview.totalReroll) : '—';
    const bank = valid ? num(preview.totalBank) : '—';
    if (noTokens) {
      dock.innerHTML = `
        <div class="action-dock-inner">
          <div class="action-hint">${valid ? '全部重投已耗尽 · 继续免费，或计分并结算' : h(invalidHint)}</div>
          <div class="action-buttons">
            <button class="hint-score-button" data-action="hint-score"><svg><use href="#i-spark"></use></svg>提示最高分</button>
            <button class="score-action" data-action="score-continue" ${valid ? '' : 'disabled'}>
              <span class="action-icon"><svg><use href="#i-die"></use></svg></span>
              <span class="action-copy"><b>计分并继续</b><em>免费重投剩余骰子 · 不消耗重投</em></span>
              <span class="action-points">+${cont}<small>计分</small></span>
            </button>
            <button class="score-action primary" data-action="score-bank" ${valid ? '' : 'disabled'}>
              <span class="action-icon"><svg><use href="#i-spark"></use></svg></span>
              <span class="action-copy"><b>计分并结算</b><em>收下本轮分数，直接结算本关</em></span>
              <span class="action-points">+${bank}<small>计分</small></span>
            </button>
          </div>
        </div>`;
      return;
    }
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">${valid ? '继续免费；只有全部重投消耗 1 次' : h(invalidHint)}</div>
        <div class="action-buttons">
          <button class="hint-score-button" data-action="hint-score"><svg><use href="#i-spark"></use></svg>提示最高分</button>
          <button class="score-action" data-action="score-continue" ${valid ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-die"></use></svg></span>
            <span class="action-copy"><b>计分并继续</b><em>免费重投剩余骰子 · 不消耗重投</em></span>
            <span class="action-points">+${cont}<small>计分</small></span>
          </button>
          <button class="score-action primary" data-action="score-reroll" ${valid ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>计分并重投</b><em>全部六颗重新投 · 消耗 1 次（剩 ${run.rerolls}）</em></span>
            <span class="action-points">+${rer}<small>计分</small></span>
          </button>
        </div>
      </div>`;
  }
}

export function renderDangerStrip() {
  const run = app.run;
  const strip = $('#danger-strip')!;
  if (!run) return;
  const show = run.phase === 'dead' && run.rerolls <= 0 && run.score < run.target && !run.flags.floatingBustPending;
  strip.hidden = !show;
}
