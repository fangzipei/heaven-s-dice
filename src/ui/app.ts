// ui/app.ts — 组装层：启动、全局事件、关卡生命周期与调试桥。
//
// src/legacy/app.js 的最后一块。到这里，每个屏与牌桌控制都有自己的模块，
// 这个文件只做三件事：把 DOM 事件翻译成动作、把一关的场景摆好、把调试桥交给 tools/。
import {
  LEVEL_COUNT, OVERSHOOT_TIERS, REROLL_REFUND,
  chapterForLevel, getLevelConfig, getOpponent, getTable,
} from '../content/index.ts';
import * as Engine from '../core/engine.ts';
import type { BossDef, Opponent } from '../core/types.ts';
import { clamp, h, num } from '../core/util.ts';
import { motion } from '../render/motion.ts';
import { sound } from '../platform/sound.ts';
import {
  bindDiscovery, discoverLoadout,
  loadDiscovery, readSoundPref, saveSoundPref,
} from '../platform/storage.ts';
import { installDebugBridge } from '../platform/debug-bridge.ts';
import { closeOverlay, openOverlay } from './components/overlay.ts';
import { clearToasts, showToast } from './components/toast.ts';
import { bindTooltip, hideTooltip } from './components/tooltip.ts';
import { $, $$, setCss } from './dom.ts';
import {
  advanceCurrentLevel, answerSaltOffer, beginRoll, bindCupDrag, forfeitRun, handleScore,
  pulseCup, renderGame, setSpeech, useItem,
} from './game.ts';
import { renderTopbar } from './hud.ts';
import { baseReward } from './reward.ts';
import { openCompendium, switchCompendiumTab } from './screens/compendium.ts';
import { openGesture } from './screens/gesture.ts';
import { showDefeat, showVictory } from './screens/result.ts';
import {
  buyBarrel, buyDie, buyItem, closeShopScreen, confirmReplace, openShopScreen,
  refreshShop, sellShopItem,
} from './screens/shop.ts';
import { openRules, openTutorial, scrollTutorial, showStartPrompt } from './screens/tutorial.ts';
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
  bindTooltip();
  // 点骰子是 tray 里发生的事，但重画整张牌桌归组装层管。
  setTrayRepaint(renderGame);
  bindSceneParallax();
  renderStartDecor();
});

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
  const cup = $<HTMLImageElement>('.hero-cup img');
  if (cup) cup.src = 'assets/cups/astral.svg';
}

/* ═══════════════════════════════════════════════════════════════════
   Global events
   ═══════════════════════════════════════════════════════════════════ */
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
      handleScore(app.run.rerolls > 0 ? 'continue' : 'bank');
    } else if (event.key === '2' && app.run?.phase === 'selecting' && app.run.rerolls > 0) {
      event.preventDefault();
      handleScore('reroll');
    }
  });
}

async function handleAction(action: string, target: HTMLElement, _event?: MouseEvent): Promise<void> {
  switch (action) {
    case 'start-run':
      showStartPrompt();
      break;
    case 'start-direct':
      startRun();
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
    case 'toggle-rail':
      $('#game-screen .rail')?.classList.toggle('is-open');
      break;
    case 'auto-roll':
    case 'manual-roll':
      beginRoll();
      break;
    case 'cue-cup':
      pulseCup();
      showToast('按住左侧骰桶拖动，2 秒倒计时后落骰；仪式桶要沿桌面轨迹描画。');
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
    case 'use-item':
      useItem(target.dataset.itemId!);
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
export function startRun(): void {
  closeOverlay();
  closeShopScreen();
  app.run = Engine.createRun();
  discoverLoadout(app.run);
  app.screen = 'game';
  app.busy = false;
  app.rolling = false;
  app.resultShown = false;
  $('#start-screen')!.hidden = true;
  $('#game-screen')!.hidden = false;
  setupLevelScene(true);
  renderGame();
  // Bring the WebGL table up once the game screen has a real size, then
  // repaint so the first roll already animates in 3D.
  ensureDiceTable().then((table) => {
    if (!table || !app.run) return;
    diceTable!.resize();
    renderDiceTray();
    motion.markDirty();
  });
  sound.unlock();
  showLevelIntro();
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
  const opponent = getOpponent(app.run.level)!;
  const isBoss = Boolean(getLevelConfig(app.run.level).boss);
  const boss = isBoss ? (opponent as BossDef) : null;
  const sceneArt = $('#scene-art')!;
  const scene = $('#scene')!;
  scene.dataset.table = table.id;
  setCss(scene, '--table-accent', table.accent);
  $('#room-back')!.style.backgroundImage = `url("assets/rooms/${table.art}.svg")`;
  $('#chapter-tag')!.innerHTML = `<span>${h(table.subtitle.split(' · ')[0])}</span><b>${h(table.subtitle.split(' · ')[1] || '')}</b>`;
  const opponentEl = $('#opponent')!;
  opponentEl.classList.toggle('is-boss', isBoss);
  opponentEl.style.setProperty('--boss-accent', opponent.accent || '#c25b5b');
  const image = $<HTMLImageElement>('#opponent-image')!;
  image.src = `assets/portraits/${opponent.art}.svg`;
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
  $<HTMLImageElement>('#cup-image')!.src = `assets/cups/${cup.art}.svg`;
  $('#cup-badge')!.textContent = cup.name;
  $('#cup')!.dataset.barrelTip = cup.id;
  $<HTMLImageElement>('#barrel-thumb')!.src = `assets/cups/${cup.art}.svg`;
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
  const opponent = getOpponent(run.level)!;
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
        <img src="assets/portraits/${opponent.art}.svg" alt="${h(opponent.name)}">
      </div>
      <div class="intro-body">
        <div class="intro-eyebrow"><i></i>${isBoss ? 'DEALER’S TABLE' : 'A CHALLENGER APPEARS'} · ${isBoss ? '庄家' : '小兵'}<i></i></div>
        <h2 class="modal-title">${h(opponent.name)}</h2>
        <p class="intro-role">${h(isBoss ? opponent.title : opponent.title)} · ${h(table.name)}</p>
        <p class="intro-quote">“${h(line)}”</p>
        ${effect}
        <div class="intro-stats">
          <div class="intro-stat"><span>目标分数</span><b>${num(run.target)}</b></div>
          <div class="intro-stat"><span>胜利奖励</span><b>${num(reward)} <small style="font-size:10px;color:#8d7c62">银币起</small></b></div>
          <div class="intro-stat ${isBoss ? 'boss' : ''}"><span>重投次数</span><b>${run.rerolls}</b></div>
          <div class="intro-stat"><span>章节</span><b>${roman}</b></div>
        </div>
        <p class="intro-role" style="margin-top:-12px;margin-bottom:18px;font-size:10px;color:#a08c6c">收手奖金：每剩 1 次重投 +${REROLL_REFUND} 银币；得分达到目标 1.5 / 2 / 3 倍再 +${OVERSHOOT_TIERS.slice().reverse().map((t) => t.value).join(' / ')}。</p>
        <div class="intro-actions">
          <button class="primary-button" data-action="close-intro">入座应战 <svg><use href="#i-arrow"></use></svg></button>
          <button class="text-button" data-action="open-rules">查看计分规则 <span>↗</span></button>
        </div>
        ${run.level === 1 ? '<p class="intro-role" style="margin-top:15px;font-size:10px;color:#8f7d63">门房赠礼：一枚「幸运币」，立即 +150 分，用完即消失。</p>' : ''}
        <div class="intro-tableline"></div>
      </div>
    </div>
  `, { dismissible: false });
}

function goToShop(): void {
  if (!app.run) return;
  if (app.run.phase !== 'won') return;
  closeOverlay();
  const shop = Engine.openShop(app.run);
  if (!shop) { showToast('市集没有开门。', 'error'); return; }
  openShopScreen();
}

function leaveShop(): void {
  if (!app.run) return;
  const next = app.run.level + 1;
  const result = Engine.leaveShop(app.run);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  closeShopScreen();
  setupLevelScene(true);
  renderGame();
  if (next <= LEVEL_COUNT) showLevelIntro();
}

function retryLevel(): void {
  if (!app.run) return;
  const result = Engine.retryLevel(app.run);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  closeOverlay();
  closeShopScreen();
  app.busy = false;
  app.rolling = false;
  app.resultShown = false;
  setupLevelScene(true);
  renderGame();
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
