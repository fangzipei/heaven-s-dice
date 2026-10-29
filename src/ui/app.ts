// ui/app.ts — 组装层：启动、全局事件、关卡生命周期与调试桥。
//
// src/legacy/app.js 的最后一块。到这里，每个屏与牌桌控制都有自己的模块，
// 这个文件只做三件事：把 DOM 事件翻译成动作、把一关的场景摆好、把调试桥交给 tools/。
import {
  LEVEL_COUNT, REROLL_BONUS_RATE, OVERSHOOT_BONUS_RATE,
  chapterForLevel, getLevelConfig, getOpponent, getTable,
} from '../content/index.ts';
import * as Engine from '../core/engine.ts';
import type { BossDef, Opponent } from '../core/types.ts';
import { clamp, h, num } from '../core/util.ts';
import { motion } from '../render/motion.ts';
import { barrelCupArt, paperTableArt, portraitArt } from '../render/art.ts';
import { sound } from '../platform/sound.ts';
import {
  bindDiscovery, discoverLoadout,
  loadDiscovery, readSoundPref, saveSoundPref,
} from '../platform/storage.ts';
import { installDebugBridge } from '../platform/debug-bridge.ts';
import { loadProfile } from '../platform/profile.ts';
import {
  beginLevelRecord, beginRunRecord, endLevelRecord, getRunRecord, pauseRunRecord,
  recordShop, restoreRunRecord, resumeRunRecord, setRecordUser,
} from '../platform/run-record.ts';
import { clearGameSave, loadGame, saveGame } from '../platform/save.ts';
import { clearActiveGame, syncEverything, uploadActiveGame } from '../platform/sync.ts';
import {
  identityBack, identityLogin, identityNext, logoutAccount, openAccount, openIdentity,
  refreshAccountButton, setPasswordAndSync, switchAccount, syncNow,
} from './screens/account.ts';
import { closeOverlay, openOverlay } from './components/overlay.ts';
import { clearToasts, showToast } from './components/toast.ts';
import { bindTooltip, hideTooltip } from './components/tooltip.ts';
import { $, $$, setCss } from './dom.ts';
import { paperSwap } from './paper-transition.ts';
import {
  advanceCurrentLevel, answerLoanOffer, answerSaltOffer, answerTwoFace, beginRoll, bindCupDrag, cancelGrant, cancelGrantReplace,
  chooseGrantDie, confirmGrantReplace, confirmUseItem, forfeitRun, handleScore, pulseCup, renderGame,
  requestUseItem, setSpeech, toggleTwoFace,
} from './game.ts';
import { renderTopbar } from './hud.ts';
import { baseReward } from './reward.ts';
import { openCompendium, switchCompendiumTab } from './screens/compendium.ts';
import { openHistory } from './screens/history.ts';
import { openGesture } from './screens/gesture.ts';
import { showDefeat, showVictory } from './screens/result.ts';
import {
  buyBarrel, buyDie, buyItem, closeShopScreen, confirmReplace, openShopScreen,
  refreshShop, sellShopItem,
} from './screens/shop.ts';
import { openRules, openTutorial, scrollTutorial, showStartPrompt } from './screens/tutorial.ts';
import { startTutorialGuide } from './tutorial-guide.ts';
import { loadGameConfig } from '../platform/game-config.ts';
import { app } from './state.ts';
import { diceTable, ensureDiceTable, renderDiceTray, setTrayRepaint } from './tray.ts';

/* ═══════════════════════════════════════════════════════════════════
   Boot
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  app.discovered = loadDiscovery();
  bindDiscovery(app, (dieId) => Boolean(Engine.getDieSpec(dieId).isStandard));
  app.soundEnabled = readSoundPref();
  sound.setEnabled(app.soundEnabled);
  updateSoundButtons();
  bindViewportHeight();
  mountCupZone();
  bindGlobalEvents();
  bindCupDrag();
  bindRailResize();
  bindTooltip();
  // 点骰子是 tray 里发生的事，但重画整张牌桌归组装层管。
  setTrayRepaint(renderGame);
  bindSceneParallax();
  renderStartDecor();
  refreshAccountButton();
  refreshResumeButton();
  const profile = loadProfile();
  if (profile?.token) void syncEverything();
  window.addEventListener('beforeunload', () => { pauseRunRecord(); saveCheckpoint(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pauseRunRecord();
      saveCheckpoint();
    } else {
      resumeRunRecord();
    }
  });
});

/* Checkpoints are written only when a level or shop is finished, so continuing
   always drops the player at a clean level start instead of a half-played hand. */
function saveCheckpoint(): void {
  if (!app.run) return;
  const record = getRunRecord();
  saveGame(app.run, record);
  if (record) void uploadActiveGame(app.run, record);
}

export function refreshResumeButton(): void {
  const button = $('#resume-run');
  if (!button) return;
  const saved = loadGame();
  button.hidden = !saved;
  if (saved) {
    const level = saved.run.level;
    const when = saved.savedAt ? new Date(saved.savedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    button.textContent = `继续上局 · 第 ${level} 关${when ? ` · ${when}` : ''}`;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hd:save-restored', refreshResumeButton);
}

export function resumeRun(): void {
  const saved = loadGame();
  if (!saved) { showToast('没有可继续的存档。'); refreshResumeButton(); return; }
  const profile = loadProfile();
  if (!profile) { openIdentity(resumeRun); return; }
  paperSwap(() => {
    closeOverlay();
    closeShopScreen();
    app.run = saved.run;
    // Old saves could sit in the middle of a hand. Checkpoints are level-start
    // snapshots, so rebuild the level rather than resuming half a throw.
    if (saved.run.phase !== 'won' && saved.run.phase !== 'shop') Engine.initLevel(saved.run);
    if (saved.record) {
      restoreRunRecord(saved.record);
      resumeRunRecord();
    } else beginRunRecord(saved.run, profile.id);
    setRecordUser(profile.id);
    app.screen = 'game';
    app.busy = false;
    app.rolling = false;
    app.introOpen = false;
    app.resultShown = false;
    $('#start-screen')!.hidden = true;
    $('#game-screen')!.hidden = false;
    document.body.classList.add('rail-collapsed');
    setupLevelScene(true);
    renderGame();
    if (saved.run.phase === 'shop' && saved.run.shop) openShopScreen();
  }, () => {
    if (saved.run.phase === 'won') showVictory();
  });
  sound.unlock();
  showToast(`已恢复第 ${saved.run.level} 关的存档。`, 'good');
}

function mountCupZone(): void {
  const cupZone = $('#cup-zone');
  const game = $('#game-screen');
  if (!cupZone || !game) return;
  if (cupZone.parentElement !== game) game.append(cupZone);
}

function bindViewportHeight(): void {
  const root = document.documentElement;
  const sync = () => {
    const height = Math.round(window.visualViewport?.height || window.innerHeight || root.clientHeight);
    if (height > 0) root.style.setProperty('--app-height', `${height}px`);
  };
  sync();
  requestAnimationFrame(sync);
  window.visualViewport?.addEventListener('resize', sync);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', () => setTimeout(sync, 120));
}

function bindSceneParallax(): void {
  const scene = $('#scene');
  if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame: number | null = null;
  const reset = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    scene.style.setProperty('--cam-x', '1.2deg');
    scene.style.setProperty('--cam-y', '-1.6deg');
    scene.style.setProperty('--shift-x', '0px');
    scene.style.setProperty('--shift-y', '0px');
  };
  scene.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const rect = scene.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5);
      const ny = clamp((event.clientY - rect.top) / rect.height - .5, -.5, .5);
      scene.style.setProperty('--cam-y', `${(nx * 2.4).toFixed(2)}deg`);
      scene.style.setProperty('--cam-x', `${(-ny * 1.4).toFixed(2)}deg`);
      scene.style.setProperty('--shift-x', `${(nx * 12).toFixed(1)}px`);
      scene.style.setProperty('--shift-y', `${(ny * 7).toFixed(1)}px`);
    });
  });
  scene.addEventListener('pointerleave', reset);
  scene.addEventListener('pointercancel', reset);
}

function renderStartDecor(): void {
  const cup = $<HTMLImageElement>('.home-cup');
  if (cup) cup.src = barrelCupArt('astral');
}

/* ═══════════════════════════════════════════════════════════════════
   Global events
   ═══════════════════════════════════════════════════════════════════ */
function bindRailResize(): void {
  const grip = $('#rail-grip');
  if (!grip) return;
  let dragging = false;
  const root = document.documentElement;
  grip.addEventListener('pointerdown', (event) => {
    if (window.innerWidth <= 1050) return;
    dragging = true;
    event.preventDefault();
    grip.setPointerCapture(event.pointerId);
    document.body.classList.add('is-resizing-rail');
  });
  const finish = () => {
    dragging = false;
    document.body.classList.remove('is-resizing-rail');
  };
  window.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const width = clamp(window.innerWidth - event.clientX, 280, Math.min(520, window.innerWidth * 0.46));
    root.style.setProperty('--rail-width', `${Math.round(width)}px`);
  });
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
}

function bindGlobalEvents(): void {
  document.addEventListener('click', (event: MouseEvent) => {
    hideTooltip();
    const die = (event.target as Element).closest<HTMLButtonElement>('[data-die-uid]');
    if (die && die.getAttribute('aria-disabled') !== 'true' && app.run?.phase === 'selecting' && !app.busy && !app.introOpen) {
      sound.unlock();
      if (Engine.toggleDie(app.run, die.dataset.dieUid!)) {
        sound.click();
        renderGame();
      }
      return;
    }
    const target = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action!;
    if (target.matches('button') && (target as HTMLButtonElement).disabled) return;
    sound.unlock();
    sound.click();
    handleAction(action, target, event);
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (app.overlayDismissible) {
        closeOverlay();
        event.preventDefault();
      }
      return;
    }
    if (app.introOpen || app.shopOpen || $('.overlay')) return;
    if ((event.target as Element).matches('input, textarea, select')) return;
    if (event.code === 'Space') {
      if (['ready', 'dead', 'hot'].includes(app.run?.phase ?? '')) {
        event.preventDefault();
        beginRoll();
      }
    } else if (event.key === '1' && app.run?.phase === 'selecting') {
      event.preventDefault();
      handleScore('continue');
    } else if (event.key === '2' && app.run?.phase === 'selecting' && app.run.rerolls > 0) {
      event.preventDefault();
      handleScore('reroll');
    }
  });
}

async function handleAction(action: string, target: HTMLElement, _event?: MouseEvent): Promise<void> {
  switch (action) {
    case 'resume-run':
      resumeRun();
      break;
    case 'start-run':
      showStartPrompt();
      break;
    case 'open-account':
      openAccount();
      break;
    case 'open-history':
      void openHistory();
      break;
    case 'identity-next':
      void identityNext();
      break;
    case 'identity-login':
      void identityLogin();
      break;
    case 'identity-back':
      identityBack();
      break;
    case 'account-set-password':
      void setPasswordAndSync();
      break;
    case 'account-sync-now':
      void syncNow();
      break;
    case 'account-logout':
      logoutAccount();
      break;
    case 'account-switch':
      switchAccount();
      break;
    case 'start-direct':
      startRun();
      break;
    case 'start-guided':
      void (async () => {
        await startRun();
        if (app.run) startTutorialGuide();
      })();
      break;
    case 'restart-run':
      startRun();
      break;
    case 'open-tutorial':
      openTutorial();
      break;
    case 'tutorial-nav':
      scrollTutorial(target.dataset.target!);
      break;
    case 'go-home':
      requestHome();
      break;
    case 'confirm-home':
      closeOverlay();
      resetToStart();
      break;
    case 'open-rules':
      openRules();
      break;
    case 'close-overlay':
      closeOverlay();
      break;
    case 'open-compendium':
      openCompendium(target.dataset.tab || app.compendiumTab);
      break;
    case 'switch-compendium-tab':
      switchCompendiumTab(target.dataset.tab!);
      break;
    case 'toggle-sound':
      toggleSound();
      break;
    case 'close-rail':
      document.body.classList.add('rail-collapsed');
      sound.click();
      break;
    case 'toggle-rail': {
      // One switch for every width: the sheet is the same floating element,
      // and phones hide it with `body.rail-collapsed` too.
      document.body.classList.toggle('rail-collapsed');
      const collapsed = document.body.classList.contains('rail-collapsed');
      target.setAttribute('aria-expanded', String(!collapsed));
      if (!collapsed) sound.paperUnfold();
      break;
    }
    case 'auto-roll':
    case 'manual-roll':
      beginRoll();
      break;
    case 'cue-cup':
      pulseCup();
      showToast('按住右侧骰桶拖动，2 秒倒计时后落骰；仪式桶要沿桌面轨迹描画。');
      break;
    case 'score-continue':
      handleScore('continue');
      break;
    case 'score-reroll':
      handleScore('reroll');
      break;
    case 'score-bank':
      handleScore('bank');
      break;
    case 'advance-level':
      advanceCurrentLevel();
      break;
    case 'salt-use':
      answerSaltOffer(true);
      break;
    case 'salt-decline':
      answerSaltOffer(false);
      break;
    case 'loan-pay':
      answerLoanOffer(true);
      break;
    case 'loan-decline':
      answerLoanOffer(false);
      break;
    case 'twoface-face':
      toggleTwoFace(Number(target.dataset.face));
      break;
    case 'twoface-confirm':
      answerTwoFace();
      break;
    case 'use-item':
      requestUseItem(target.dataset.itemId!);
      break;
    case 'confirm-use-item':
      confirmUseItem(target.dataset.itemId!);
      break;
    case 'open-gesture':
      openGesture();
      break;
    case 'forfeit':
      forfeitRun();
      break;
    case 'close-intro':
      app.introOpen = false;
      closeOverlay();
      renderGame();
      showCoinGainNotice();
      break;
    case 'go-shop':
      goToShop();
      break;
    case 'leave-shop':
      leaveShop();
      break;
    case 'refresh-shop':
      refreshShop(target.dataset.section!);
      break;
    case 'buy-die':
      buyDie(Number(target.dataset.index));
      break;
    case 'buy-barrel':
      buyBarrel(Number(target.dataset.index));
      break;
    case 'buy-item':
      buyItem(Number(target.dataset.index));
      break;
    case 'sell-item':
      sellShopItem(target.dataset.itemId!);
      break;
    case 'confirm-replace':
      confirmReplace(target.dataset.bagUid!);
      break;
    case 'choose-grant-die':
      chooseGrantDie(target.dataset.dieId!);
      break;
    case 'cancel-grant':
      cancelGrant();
      break;
    case 'confirm-grant-replace':
      confirmGrantReplace(target.dataset.bagUid!);
      break;
    case 'cancel-grant-replace':
      cancelGrantReplace();
      break;
    case 'cancel-replace':
      app.pendingReplace = null;
      closeOverlay();
      break;
    case 'retry-level':
      retryLevel();
      break;
    case 'gesture-reset':
      if (app.gestureReset) app.gestureReset();
      break;
    case 'dismiss-tip':
      hideTooltip();
      break;
    default:
      break;
  }
}

function toggleSound(): void {
  app.soundEnabled = !app.soundEnabled;
  sound.setEnabled(app.soundEnabled);
  saveSoundPref(app.soundEnabled);
  updateSoundButtons();
  if (app.soundEnabled) {
    sound.unlock().then(() => sound.click());
  }
}
function updateSoundButtons(): void {
  $$('[data-action="toggle-sound"]').forEach((button) => {
    button.classList.toggle('is-muted', !app.soundEnabled);
    const use = $('use', button);
    if (use) use.setAttribute('href', app.soundEnabled ? '#i-volume' : '#i-muted');
    button.setAttribute('aria-label', app.soundEnabled ? '关闭声音' : '开启声音');
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Run lifecycle
   ═══════════════════════════════════════════════════════════════════ */
export async function startRun(): Promise<void> {
  const profile = loadProfile();
  if (!profile) {
    openIdentity(() => { void startRun(); });
    return;
  }
  await loadGameConfig();
  await clearActiveGame();
  paperSwap(() => {
    closeOverlay();
    closeShopScreen();
    clearGameSave();
    app.run = Engine.createRun();
    beginRunRecord(app.run!, profile.id);
    discoverLoadout(app.run!);
    app.screen = 'game';
    app.busy = false;
    app.rolling = false;
    app.resultShown = false;
    $('#start-screen')!.hidden = true;
    $('#game-screen')!.hidden = false;
    document.body.classList.add('rail-collapsed');
    setupLevelScene(true);
    renderGame();
    saveCheckpoint();
  }, () => showLevelIntro());
  sound.unlock();
  refreshResumeButton();
}

export function resetToStart(): void {
  closeOverlay();
  closeShopScreen();
  app.run = null;
  app.busy = false;
  app.rolling = false;
  app.screen = 'start';
  app.resultShown = false;
  $('#start-screen')!.hidden = false;
  $('#game-screen')!.hidden = true;
  window.scrollTo({ top: 0, behavior: 'instant' });
  refreshResumeButton();
  refreshAccountButton();
}

function requestHome(): void {
  if (!app.run) {
    resetToStart();
    return;
  }
  openOverlay(`
    <div class="modal result-modal" style="width:min(480px,100%);padding:38px">
      <p class="modal-kicker">LEAVE THE TABLE</p>
      <h2 style="font-size:27px;margin-top:6px">要离开这张赌桌吗？</h2>
      <p class="result-sub">当前这一局的骰子、银币与契约都会消失。</p>
      <div class="modal-actions" style="margin-top:24px">
        <button class="secondary-button" data-action="close-overlay">继续赌</button>
        <button class="primary-button" data-action="confirm-home">离开并重来</button>
      </div>
    </div>
  `, { dismissible: true });
}

export function setupLevelScene(force = false): void {
  if (!app.run) return;
  app.resultShown = false;
  hideTooltip();
  clearToasts();
  const table = getTable(app.run.level);
  const opponent = getOpponent(app.run.level, app.run)!;
  const isBoss = Boolean(getLevelConfig(app.run.level).boss);
  const boss = isBoss ? (opponent as BossDef) : null;
  const sceneArt = $('#scene-art')!;
  const scene = $('#scene')!;
  scene.dataset.table = table.id;
  setCss(scene, '--table-accent', table.accent);
  $('#room-back')!.style.backgroundImage = `url("${paperTableArt(table.art)}")`;
  setCss(scene, '--table-art', `url("${paperTableArt(table.art)}")`);
  $('#chapter-tag')!.innerHTML = `<span>${h(table.subtitle.split(' · ')[0])}</span><b>${h(table.subtitle.split(' · ')[1] || '')}</b>`;
  const opponentEl = $('#opponent')!;
  opponentEl.classList.toggle('is-boss', isBoss);
  opponentEl.classList.toggle('is-minion', !isBoss);
  opponentEl.dataset.paperArt = opponent.art;
  opponentEl.style.setProperty('--boss-accent', opponent.accent || '#c25b5b');
  const image = $<HTMLImageElement>('#opponent-image')!;
  image.src = portraitArt(opponent.art);
  image.alt = opponent.name;
  $('#opponent-name')!.textContent = opponent.name;
  $('#opponent-kicker')!.textContent = isBoss ? `第 ${app.run.level} 关 · 庄家` : opponent.title;
  $('#opponent-inline')!.textContent = `对手：${opponent.name}`;
  $('#boss-badge')!.hidden = !isBoss;
  $('#boss-effect-card')!.hidden = !isBoss;
  if (isBoss) {
    $('#boss-effect-name')!.textContent = boss!.effectName;
    $('#boss-effect-title')!.textContent = boss!.effectName;
    const status = Engine.bossStatusText(app.run);
    $('#boss-effect-desc')!.textContent = `${boss!.effectDesc}${status ? ` · ${status}` : ''}`;
  }
  const cup = Engine.getBarrel(app.run);
  $<HTMLImageElement>('#cup-image')!.src = barrelCupArt(cup.art);
  $('#cup-badge')!.textContent = cup.name;
  $('#cup')!.dataset.barrelTip = cup.id;
  $<HTMLImageElement>('#barrel-thumb')!.src = barrelCupArt(cup.art);
  $('#barrel-thumb')!.dataset.barrelTip = cup.id;
  setSpeech(introLine(opponent, app.run.level, isBoss));
  renderTopbar();
  if (force) {
    sceneArt.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
  }
}

export function showLevelIntro(): void {
  if (!app.run) return;
  const run = app.run;
  const opponent = getOpponent(run.level, run)!;
  const table = getTable(run.level);
  const cfg = getLevelConfig(run.level);
  const isBoss = Boolean(cfg.boss);
  const boss = isBoss ? (opponent as BossDef) : null;
  const chapter = chapterForLevel(run.level);
  const roman = ['I', 'II', 'III', 'IV', 'V'][chapter];
  const reward = baseReward();
  const line = introLine(opponent, run.level, isBoss);
  const effect = isBoss ? `
    <div class="intro-effect">
      <span>庄家特权</span>
      <b>${h(boss!.effectName)}</b>
      <p>${h(boss!.effectDesc)}</p>
    </div>` : '';
  app.introOpen = true;
  openOverlay(`
    <div class="modal intro-modal ${isBoss ? 'is-boss-intro' : ''}" role="dialog" aria-modal="true" aria-label="第 ${run.level} 关">
      <div class="intro-portrait">
        <img src="${portraitArt(opponent.art)}" alt="${h(opponent.name)}">
      </div>
      <div class="intro-body">
        <div class="intro-eyebrow"><i></i>${isBoss ? 'DEALER’S TABLE' : 'A CHALLENGER APPEARS'} · ${isBoss ? '庄家' : '小兵'}<i></i></div>
        <h2 class="modal-title">${h(opponent.name)}</h2>
        <p class="intro-role">${h(isBoss ? opponent.title : opponent.title)} · ${h(table.name)}</p>
        <p class="intro-quote">“${h(line)}”</p>
        ${effect}
        <div class="intro-stats">
          <div class="intro-stat"><span>目标分数</span><b>${num(run.target)}</b></div>
          <div class="intro-stat"><span>胜利奖励</span><b>${num(reward)} <small style="font-size:10px;color:var(--muted)">银币起</small></b></div>
          <div class="intro-stat ${isBoss ? 'boss' : ''}"><span>重投次数</span><b>${run.rerolls}</b></div>
          <div class="intro-stat"><span>章节</span><b>${roman}</b></div>
        </div>
        <p class="intro-role" style="margin-top:-12px;margin-bottom:18px;font-size:11px;color:var(--muted)">收手奖金：每次未用重投 +${Math.round(REROLL_BONUS_RATE * 100)}% 基础赏金；得分超过目标 2 倍再 +${Math.round(OVERSHOOT_BONUS_RATE * 100)}%。</p>
        <div class="intro-actions">
          <button class="primary-button" data-action="close-intro">入座应战 <svg><use href="#i-arrow"></use></svg></button>
          <button class="text-button" data-action="open-rules">查看计分规则 <span>↗</span></button>
        </div>
        ${run.level === 1 ? '<p class="intro-role" style="margin-top:15px;font-size:11px;color:var(--muted)">门房赠礼：一枚「幸运币」，立即 +150 分，用完即消失。</p>' : ''}
        <div class="intro-tableline"></div>
      </div>
    </div>
  `, { dismissible: false });
}

function goToShop(): void {
  if (!app.run) return;
  if (app.run.phase !== 'won') return;
  const shop = Engine.openShop(app.run);
  if (!shop) { showToast('市集没有开门。', 'error'); return; }
  paperSwap(() => {
    closeOverlay();
    openShopScreen();
    saveCheckpoint();
  });
}

function showCoinGainNotice(): void {
  const run = app.run;
  const gain = run?.pendingCoinGain;
  const el = $('#coin-gain');
  if (!run || !gain || !el) return;
  run.pendingCoinGain = null;
  const lines = [
    `<div class="coin-gain-line"><span>基础赏金</span><b>+${num(gain.base)}</b></div>`,
    ...gain.bonuses.map((b) => `<div class="coin-gain-line"><span>${h(b.label)}</span><b>+${num(b.value)}</b></div>`),
  ].join('');
  el.innerHTML = `<div class="coin-gain-head"><span>本关收入</span><strong>+${num(gain.total)}</strong></div>${lines}`;
  el.hidden = false;
  $('#coin-pill')!.title = `本关收入 +${gain.total} 银币\n基础赏金 ${gain.base}`
    + gain.bonuses.map((b) => `\n${b.label} +${b.value}`).join('');
  clearTimeout(app.coinGainTimer ?? undefined);
  app.coinGainTimer = setTimeout(() => { el.hidden = true; }, 9000);
}

function leaveShop(): void {
  if (!app.run) return;
  const next = app.run.level + 1;
  recordShop(app.run, { action: 'leave' });
  endLevelRecord(app.run);
  const result = Engine.leaveShop(app.run);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  beginLevelRecord(app.run);
  paperSwap(() => {
    closeShopScreen();
    setupLevelScene(true);
    renderGame();
    saveCheckpoint();
  }, () => {
    if (next <= LEVEL_COUNT) showLevelIntro();
  });
}

function retryLevel(): void {
  if (!app.run) return;
  const result = Engine.retryLevel(app.run);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  const profile = loadProfile();
  if (!profile) { openIdentity(() => retryLevel()); return; }
  beginRunRecord(app.run, profile.id);
  setRecordUser(profile.id);
  closeOverlay();
  closeShopScreen();
  paperSwap(() => {
    app.busy = false;
    app.rolling = false;
    app.resultShown = false;
    setupLevelScene(true);
    renderGame();
    saveCheckpoint();
  });
  showToast('你重新坐回桌前。半数银币留在了上一局。', 'good');
}

/* ═══════════════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════════════ */
function introLine(opponent: Opponent, level: number, isBoss: boolean): string {
  if (isBoss) return opponent.intro;
  const chapterSlot = (level - 1) % 3;
  if (chapterSlot === 0) return opponent.intro;
  return opponent.taunts[(chapterSlot - 1) % opponent.taunts.length] || opponent.intro;
}

/* ═══════════════════════════════════════════════════════════════════
   Debug / testing hooks (harmless in production)
   ═══════════════════════════════════════════════════════════════════ */
installDebugBridge({
  get run() { return app.run; },
  get app() { return app as unknown as Record<string, unknown>; },
  Engine,
  start: startRun,
  roll: beginRoll,
  score: handleScore,
  render: renderGame,
  setup: setupLevelScene,
  intro: showLevelIntro,
  shop: openShopScreen,
  victory: showVictory,
  defeat: showDefeat,
  openCompendium,
  openRules,
  showVictory,
  showDefeat,
  diceTable: () => diceTable,
  diceTableEntries: () => diceTable?.entries.length ?? 0,
  motion,
  setLevel(level: number) {
    if (!app.run) return false;
    app.run.level = clamp(Number(level) || 1, 1, LEVEL_COUNT);
    app.run.shop = null;
    Engine.initLevel(app.run);
    setupLevelScene(true);
    renderGame();
    return true;
  },
});
