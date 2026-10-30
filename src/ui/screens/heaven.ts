import { finishRunRecord, endLevelRecord, beginLevelRecord } from '../../platform/run-record.ts';
import { clearGameSave } from '../../platform/save.ts';
import { clearActiveGame, storeFinishedRun } from '../../platform/sync.ts';
import * as Engine from '../../core/engine.ts';
import { app } from '../state.ts';
import { openOverlay, closeOverlay } from '../components/overlay.ts';
import { showToast } from '../components/toast.ts';
import { num } from '../../core/util.ts';

/** The last table is deliberately not a normal victory screen. */
export function showHeavenGate(): void {
  const run = app.run;
  if (!run) return;
  const hots = run.stats.hotDice || 0;
  const suspicious = hots >= 50;
  openOverlay(`
    <div class="heaven-scene ${suspicious ? 'is-suspicious' : ''}">
      <div class="heaven-rays" aria-hidden="true"></div>
      <div class="heaven-clouds" aria-hidden="true"></div>
      <div class="heaven-copy">
        <p class="heaven-kicker">THE TWENTY-FOURTH TABLE</p>
        <h2>光落了下来。</h2>
        <p>黑暗像一块旧布从桌边滑落。你走出最后一张赌桌，脚下第一次不是地狱的石板，而是温暖的白光。</p>
        <p>你终于来到了天堂。</p>
        <p class="heaven-small">这一路，你一共触发了 <b>${num(hots)}</b> 次全骰。</p>
        ${suspicious ? `<p class="heaven-warning">可是……这里太安静了。安静得像一张刚刚擦干净的赌桌。<br>你忽然发现，这里好像并不是天堂。</p>` : ''}
      </div>
      <div class="heaven-actions">
        ${suspicious
          ? `<button class="secondary-button" data-action="heaven-leave">转身离开</button>
             <button class="primary-button" data-action="heaven-fight">迎战最终 Boss</button>`
          : `<button class="primary-button" data-action="heaven-enter">走进天堂</button>`}
      </div>
    </div>
  `, { dismissible: false });
}

export function leaveHeaven(): void {
  const run = app.run;
  if (!run) return;
  run.phase = 'run-won';
  run.runWon = true;
  const finished = finishRunRecord(run, 'win');
  if (finished) storeFinishedRun(finished);
  clearGameSave();
  void clearActiveGame();
  openOverlay(`
    <div class="modal result-modal">
      <div class="result-sigil"><svg><use href="#i-spark"></use></svg></div>
      <p class="modal-kicker">THE END OF THE ROAD</p>
      <h2>你留在了光里。</h2>
      <p class="result-sub">你没有回头。身后的赌桌、庄家和那些没有掷出的骰子，慢慢沉进黑暗。</p>
      <p class="result-quote">“这一次，你没有再赌。”</p>
      <div class="modal-actions">
        <button class="primary-button" data-action="confirm-home">返回首页</button>
      </div>
    </div>
  `, { dismissible: false });
}

export function fightSatan(): void {
  const run = app.run;
  if (!run) return;
  const scene = document.querySelector('.heaven-scene');
  scene?.classList.add('is-tearing');
  showToast('天堂的幕布被撕开了。', 'error');
  setTimeout(async () => {
    closeOverlay();
    endLevelRecord(run);
    run.level = 25;
    run.shop = null;
    run.phase = 'ready';
    Engine.initLevel(run);
    beginLevelRecord(run);
    app.screen = 'game';
    app.resultShown = false;
    const [{ setupLevelScene, showLevelIntro }, { renderGame }] = await Promise.all([
      import('../app.ts'), import('../game.ts'),
    ]);
    setupLevelScene(true);
    renderGame();
    showLevelIntro();
  }, 1150);
}

export function heavenLine(run = app.run): string {
  if (!run) return '';
  return `“${run.stats.hotDice || 0} 次全骰……你比我想的更有趣。”`;
}
