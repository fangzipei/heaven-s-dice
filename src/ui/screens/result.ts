// ui/screens/result.ts — 过关与失败的结算弹窗。
//
// 从 app.js「Victory / defeat」一节原样搬出。两层按钮（前往市集 / 卷土重来）
// 与奖励拆解被 tools/campaign-test.mjs 与截图比对依赖，这里只换 import 与类型。
import { LEVEL_COUNT, getLevelConfig, getOpponent, getTable } from '../../content/index.ts';
import { runSummary } from '../../core/engine.ts';
import type { LevelRewardInfo } from '../../core/types.ts';
import { h, num } from '../../core/util.ts';
import { sound } from '../../platform/sound.ts';
import { finishRunRecord } from '../../platform/run-record.ts';
import { clearGameSave } from '../../platform/save.ts';
import { storeFinishedRun } from '../../platform/sync.ts';
import { openOverlay } from '../components/overlay.ts';
import { projectedReward } from '../reward.ts';
import { app } from '../state.ts';

export function showVictory(): void {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level)!;
  const table = getTable(run.level);
  const isFinal = run.phase === 'run-won' || run.level >= LEVEL_COUNT;
  const reward = (run.levelReward || { total: projectedReward(), bonuses: [] }) as LevelRewardInfo;
  sound.win();
  if (isFinal) {
    const finished = finishRunRecord(run, 'win');
    if (finished) storeFinishedRun(finished);
    clearGameSave();
    const summary = runSummary(run);
    openOverlay(`
      <div class="modal result-modal">
        <div class="result-sigil"><svg><use href="#i-spark"></use></svg></div>
        <p class="modal-kicker">THE HOUSE HAS FALLEN</p>
        <h2>天穹已破</h2>
        <p class="result-sub">你击败了钻石天使，赢下了整座天国骰局。</p>
        <p class="result-quote">“${h(opponent.win)}”</p>
        <div class="result-score">
          <div><span>通关关卡</span><b>${LEVEL_COUNT} / ${LEVEL_COUNT}</b></div>
          <div><span>最高单次计分</span><b>${num(summary.bestHit)}</b></div>
          <div><span>银币</span><b><svg><use href="#i-coin"></use></svg>${num(summary.coins)}</b></div>
        </div>
        <div class="reward-breakdown">
          <span>秘骰 ${run.bag.length} 枚</span>
          <span>主动物品 ${run.activeItems.length}</span>
          <span>被动物品 ${run.passiveItems.length}</span>
          <span>重投 ${summary.rolls} 次落骰</span>
        </div>
        <div class="modal-actions">
          <button class="secondary-button" data-action="confirm-home">返回首页</button>
          <button class="primary-button" data-action="restart-run">再来一局 <svg><use href="#i-restart"></use></svg></button>
        </div>
      </div>
    `, { dismissible: false });
    return;
  }
  const next = run.level + 1;
  const nextTable = getTable(next);
  openOverlay(`
    <div class="modal result-modal">
      <div class="result-sigil"><svg><use href="#i-spark"></use></svg></div>
      <p class="modal-kicker">TABLE CLEARED · ${h(table.subtitle)}</p>
      <h2>${getLevelConfig(run.level).boss ? '庄家败北' : '本关告捷'}</h2>
      <p class="result-sub">${h(opponent.name)}放下了骰子。第 ${run.level} 关达成。</p>
      <p class="result-quote">“${h(opponent.win)}”</p>
      <div class="result-score">
        <div><span>本关得分</span><b>${num(run.score)}</b></div>
        <div><span>目标</span><b>${num(run.target)}</b></div>
        <div><span>奖励</span><b><svg><use href="#i-coin"></use></svg>${num(reward.total)}</b></div>
      </div>
      ${reward.bossPremium ? `<div class="reward-breakdown"><span style="border-color:rgba(116,100,154,.4);color:var(--violet)">${h(reward.bossName)} 悬赏 ×${reward.bossScale.toFixed(2)} <b>基础 ${num(reward.curveBase)} → ${num(reward.base)}</b></span></div>` : ''}
      ${reward.bonuses?.length ? `<div class="reward-breakdown">${reward.bonuses.map((b) => `<span>${h(b.label)} <b>+${num(b.value)}</b></span>`).join('')}</div>` : ''}
      <p class="result-sub" style="font-size:10px;margin-top:-5px">下一站：${h(nextTable.name)} · 第 ${next} 关</p>
      <div class="modal-actions">
        <button class="primary-button" data-action="go-shop">前往市集 <svg><use href="#i-shop"></use></svg></button>
      </div>
    </div>
  `, { dismissible: false });
}

export function showDefeat(): void {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level)!;
  const finished = finishRunRecord(run, 'loss');
  if (finished) storeFinishedRun(finished);
  clearGameSave();
  sound.lose();
  openOverlay(`
    <div class="modal result-modal loss">
      <div class="result-sigil"><svg><use href="#i-skull"></use></svg></div>
      <p class="modal-kicker">THE HOUSE COLLECTS</p>
      <h2>赌局结束</h2>
      <p class="result-sub">${h(opponent.name)}收走了桌上的银币。你没能达到 ${num(run.target)} 分。</p>
      <p class="result-quote">“${h(opponent.taunts?.[0] || opponent.intro)}”</p>
      <div class="result-score">
        <div><span>本关得分</span><b>${num(run.score)}</b></div>
        <div><span>目标</span><b>${num(run.target)}</b></div>
        <div><span>剩余银币</span><b><svg><use href="#i-coin"></use></svg>${num(run.coins)}</b></div>
      </div>
      <p class="result-sub" style="font-size:10px">卷土重来会保留骰子、骰桶与物品，但会失去一半银币。</p>
      <div class="modal-actions">
        <button class="secondary-button" data-action="confirm-home">离开赌桌</button>
        <button class="secondary-button" data-action="restart-run">重新开始</button>
        <button class="primary-button" data-action="retry-level">卷土重来 <svg><use href="#i-restart"></use></svg></button>
      </div>
    </div>
  `, { dismissible: false });
}
