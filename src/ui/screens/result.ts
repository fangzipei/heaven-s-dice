// ui/screens/result.ts — 过关与失败的结算弹窗。
//
// 从 app.js「Victory / defeat」一节原样搬出。两层按钮（前往市集 / 卷土重来）
// 与奖励拆解被 tools/campaign-test.mjs 与截图比对依赖，这里只换 import 与类型。
import { ITEM_BY_ID, LEVEL_COUNT, getLevelConfig, getOpponent, getTable, rarityOf } from '../../content/index.ts';
import { runSummary } from '../../core/engine.ts';
import type { LevelRewardInfo } from '../../core/types.ts';
import { h, num } from '../../core/util.ts';
import { sound } from '../../platform/sound.ts';
import { finishRunRecord } from '../../platform/run-record.ts';
import { clearGameSave } from '../../platform/save.ts';
import { clearActiveGame, storeFinishedRun } from '../../platform/sync.ts';
import { openOverlay } from '../components/overlay.ts';
import { showHeavenGate } from './heaven.ts';
import { projectedReward } from '../reward.ts';
import { app } from '../state.ts';

export function showVictory(): void {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level, run)!;
  const table = getTable(run.level);
  const isFinal = run.phase === 'run-won' || run.level >= LEVEL_COUNT;
  const reward = (run.levelReward || { total: projectedReward(), bonuses: [] }) as LevelRewardInfo;
  sound.win();
  if (run.level === 24 && run.phase === 'won') {
    showHeavenGate();
    return;
  }
  if (isFinal) {
    const finished = finishRunRecord(run, 'win');
    if (finished) storeFinishedRun(finished);
    clearGameSave();
    void clearActiveGame();
    const summary = runSummary(run);
    openOverlay(`
      <div class="modal result-modal">
        <div class="result-sigil"><svg><use href="#i-spark"></use></svg></div>
        <p class="modal-kicker">THE HOUSE HAS FALLEN</p>
        <h2>${run.level === 25 ? '天堂的主人' : '天穹已破'}</h2>
        <p class="result-sub">${run.level === 25 ? '你击败了撒旦，坐上了那张空着的王座。' : `你击败了${h(opponent.name)}，赢下了整座天国骰局。`}</p>
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
          <span>全骰 ${run.stats.hotDice || 0} 次</span>
        </div>
        <div class="modal-actions">
          <button class="secondary-button" data-action="confirm-home">返回首页</button>
        </div>
      </div>
    `, { dismissible: false });
    return;
  }
  const next = run.level + 1;
  const nextTable = getTable(next);
  /* A boss win hands over a relic: reveal it as a drop card, and 确定 is the
     single way onward (shop, then the next level). */
  const relic = reward.relic ? ITEM_BY_ID[reward.relic.id] : null;
  const relicRarity = rarityOf(relic);
  openOverlay(`
    <div class="modal result-modal">
      <div class="result-sigil"><svg><use href="#i-spark"></use></svg></div>
      <p class="modal-kicker">TABLE CLEARED · ${h(table.subtitle)}</p>
      <h2>${getLevelConfig(run.level).boss ? '庄家败北' : '本关告捷'}</h2>
      <p class="result-sub">${h(opponent.name)}放下了骰子。第 ${run.level} 关达成。</p>
      ${relic ? `
        <div class="boss-drop" style="--drop-accent:${relicRarity.color};--drop-glow:${relicRarity.glow}">
          <p class="boss-drop-kicker">庄家掉落 · BOSS DROP</p>
          <div class="boss-drop-card">
            <div class="boss-drop-art"><img src="assets/art/items/${h(relic.id)}-cut.svg" alt=""></div>
            <div class="boss-drop-body">
              <h3>${h(relic.name)}</h3>
              <p class="boss-drop-rarity">${h(relicRarity.name)} · 被动物品 · 已收入行囊</p>
              <p class="boss-drop-desc">${h(relic.desc)}</p>
              <p class="boss-drop-flavor">${h(relic.flavor)}</p>
            </div>
          </div>
        </div>
      ` : `<p class="result-quote">“${h(opponent.win)}”</p>`}
      <div class="result-score">
        <div><span>本关得分</span><b>${num(run.score)}</b></div>
        <div><span>目标</span><b>${num(run.target)}</b></div>
        <div><span>奖励</span><b><svg><use href="#i-coin"></use></svg>${num(reward.total)}</b></div>
      </div>
      ${reward.bossPremium ? `<div class="reward-breakdown"><span style="border-color:rgba(116,100,154,.4);color:var(--violet)">${h(reward.bossName)} 悬赏 ×${reward.bossScale.toFixed(2)} <b>基础 ${num(reward.curveBase)} → ${num(reward.base)}</b></span></div>` : ''}
      ${reward.bonuses?.length ? `<div class="reward-breakdown">${reward.bonuses.map((b) => `<span>${h(b.label)} <b>+${num(b.value)}</b></span>`).join('')}</div>` : ''}
      <p class="result-sub" style="font-size:10px;margin-top:-5px">下一站：${h(nextTable.name)} · 第 ${next} 关</p>
      <div class="modal-actions">
        <button class="primary-button" data-action="go-shop">${relic ? '确定' : '前往市集'} <svg><use href="#i-shop"></use></svg></button>
      </div>
    </div>
  `, { dismissible: false });
}

export function showDefeat(): void {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level, run)!;
  const finished = finishRunRecord(run, 'loss');
  if (finished) storeFinishedRun(finished);
  clearGameSave();
  void clearActiveGame();
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
      <p class="result-sub" style="font-size:10px">这一局到此为止。重新开始会从第 1 关起用全新的骰袋、骰桶与银币。</p>
      <div class="modal-actions">
        <button class="secondary-button" data-action="confirm-home">离开赌桌</button>
        <button class="primary-button" data-action="restart-run">重新开始 <svg><use href="#i-restart"></use></svg></button>
      </div>
    </div>
  `, { dismissible: false });
}
