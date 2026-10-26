import {
  DICE, ITEMS,
  ITEM_BY_ID, LEVEL_COUNT, RARITIES, TABLES, STANDARD_DIE,
  rarityShopWeight, REROLL_REFUND, OVERSHOOT_TIERS,
  activeSetBonuses, chapterForLevel, getLevelConfig, getOpponent, getTable,
} from '../compat/content.ts';
import * as Engine from '../core/engine.ts';
import { analyzeSelection } from '../core/scoring.ts';
import { clamp, h, num, sleep } from '../core/util.ts';
import { motion } from '../render/motion.ts';
import { sound } from '../platform/sound.ts';
import {
  bindDiscovery, discoverLoadout, discoverShop,
  loadDiscovery, readSoundPref, saveSoundPref,
} from '../platform/storage.ts';
import { installDebugBridge } from '../platform/debug-bridge.ts';
import { $, $$, setCss } from '../ui/dom.ts';
import { app } from '../ui/state.ts';
import {
  barrelTooltip, bindTooltip, barrelTypeLabel, dieTooltip, hideTooltip, itemTooltip, setTooltip,
} from '../ui/components/tooltip.ts';
import { closeOverlay, openOverlay } from '../ui/components/overlay.ts';
import { clearToasts, showToast } from '../ui/components/toast.ts';
import { renderOpponentPlate, renderRail, renderScorePanel, renderTopbar, showBustNotice } from '../ui/hud.ts';
import { renderActionDock, renderAutoButton, renderComboPreview, renderDangerStrip } from '../ui/dock.ts';
import { baseReward, projectedReward } from '../ui/reward.ts';
import { diceTable, ensureDiceTable, renderDiceTray, setTrayRepaint } from '../ui/tray.ts';
import { openRules, openTutorial, scrollTutorial, showStartPrompt } from '../ui/screens/tutorial.ts';
import { openCompendium, switchCompendiumTab } from '../ui/screens/compendium.ts';
import {
  buyBarrel, buyDie, buyItem, closeShopScreen, confirmReplace, openShopScreen,
  refreshShop, sellShopItem,
} from '../ui/screens/shop.ts';

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
  bindGlobalEvents();
  bindCupDrag();
  bindTooltip();
  // 点骰子是 tray 里发生的事，但重画整张牌桌归组装层管。
  setTrayRepaint(renderGame);
  bindSceneParallax();
  renderStartDecor();
});

function bindViewportHeight() {
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

function bindSceneParallax() {
  const scene = $('#scene');
  if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frame = null;
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

function renderStartDecor() {
  const cup = $('.hero-cup img');
  if (cup) cup.src = 'assets/cups/astral.svg';
}

/* ═══════════════════════════════════════════════════════════════════
   Global events
   ═══════════════════════════════════════════════════════════════════ */
function bindGlobalEvents() {
  document.addEventListener('click', (event) => {
    hideTooltip();
    const die = event.target.closest('[data-die-uid]');
    if (die && !die.disabled && app.run?.phase === 'selecting' && !app.busy && !app.introOpen) {
      sound.unlock();
      if (Engine.toggleDie(app.run, die.dataset.dieUid)) {
        sound.click();
        renderGame();
      }
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (target.matches('button') && target.disabled) return;
    sound.unlock();
    sound.click();
    handleAction(action, target, event);
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (app.overlayDismissible) {
        closeOverlay();
        event.preventDefault();
      }
      return;
    }
    if (app.introOpen || app.shopOpen || $('.overlay')) return;
    if (event.target.matches('input, textarea, select')) return;
    if (event.code === 'Space') {
      if (['ready', 'dead', 'hot'].includes(app.run?.phase)) {
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

async function handleAction(action, target) {
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
      openTutorial(!app.run);
      break;
    case 'tutorial-nav':
      scrollTutorial(target.dataset.target);
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
      switchCompendiumTab(target.dataset.tab);
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
    case 'use-item':
      useItem(target.dataset.itemId);
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
      refreshShop(target.dataset.section);
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
      sellShopItem(target.dataset.itemId);
      break;
    case 'confirm-replace':
      confirmReplace(target.dataset.bagUid);
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

function toggleSound() {
  app.soundEnabled = !app.soundEnabled;
  sound.setEnabled(app.soundEnabled);
  saveSoundPref(app.soundEnabled);
  updateSoundButtons();
  if (app.soundEnabled) {
    sound.unlock().then(() => sound.click());
  }
}
function updateSoundButtons() {
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
function startRun() {
  closeOverlay();
  closeShopScreen();
  app.run = Engine.createRun();
  discoverLoadout(app.run);
  app.screen = 'game';
  app.busy = false;
  app.rolling = false;
  app.resultShown = false;
  $('#start-screen').hidden = true;
  $('#game-screen').hidden = false;
  setupLevelScene(true);
  renderGame();
  // Bring the WebGL table up once the game screen has a real size, then
  // repaint so the first roll already animates in 3D.
  ensureDiceTable().then((table) => {
    if (!table || !app.run) return;
    diceTable.resize();
    renderDiceTray();
    motion.markDirty();
  });
  sound.unlock();
  showLevelIntro();
}

function resetToStart() {
  closeOverlay();
  closeShopScreen();
  app.run = null;
  app.busy = false;
  app.rolling = false;
  app.screen = 'start';
  app.resultShown = false;
  $('#start-screen').hidden = false;
  $('#game-screen').hidden = true;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function requestHome() {
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

function setupLevelScene(force = false) {
  if (!app.run) return;
  app.resultShown = false;
  hideTooltip();
  clearToasts();
  const table = getTable(app.run.level);
  const opponent = getOpponent(app.run.level);
  const isBoss = Boolean(getLevelConfig(app.run.level).boss);
  const sceneArt = $('#scene-art');
  const scene = $('#scene');
  scene.dataset.table = table.id;
  setCss(scene, '--table-accent', table.accent);
  $('#room-back').style.backgroundImage = `url("assets/rooms/${table.art}.svg")`;
  $('#chapter-tag').innerHTML = `<span>${h(table.subtitle.split(' · ')[0])}</span><b>${h(table.subtitle.split(' · ')[1] || '')}</b>`;
  const opponentEl = $('#opponent');
  opponentEl.classList.toggle('is-boss', isBoss);
  opponentEl.style.setProperty('--boss-accent', opponent.accent || '#c25b5b');
  const image = $('#opponent-image');
  image.src = `assets/portraits/${opponent.art}.svg`;
  image.alt = opponent.name;
  $('#opponent-name').textContent = opponent.name;
  $('#opponent-kicker').textContent = isBoss ? `第 ${app.run.level} 关 · 庄家` : opponent.title;
  $('#opponent-inline').textContent = `对手：${opponent.name}`;
  $('#boss-badge').hidden = !isBoss;
  $('#boss-effect-card').hidden = !isBoss;
  if (isBoss) {
    $('#boss-effect-name').textContent = opponent.effectName;
    $('#boss-effect-title').textContent = opponent.effectName;
    const status = Engine.bossStatusText(app.run);
    $('#boss-effect-desc').textContent = `${opponent.effectDesc}${status ? ` · ${status}` : ''}`;
  }
  const cup = Engine.getBarrel(app.run);
  $('#cup-image').src = `assets/cups/${cup.art}.svg`;
  $('#cup-badge').textContent = cup.name;
  $('#barrel-thumb').src = `assets/cups/${cup.art}.svg`;
  setSpeech(introLine(opponent, app.run.level, isBoss));
  renderTopbar();
  if (force) {
    sceneArt.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
  }
}

function showLevelIntro() {
  if (!app.run) return;
  const run = app.run;
  const opponent = getOpponent(run.level);
  const table = getTable(run.level);
  const cfg = getLevelConfig(run.level);
  const isBoss = Boolean(cfg.boss);
  const chapter = chapterForLevel(run.level);
  const roman = ['I', 'II', 'III', 'IV', 'V'][chapter];
  const reward = baseReward();
  const line = introLine(opponent, run.level, isBoss);
  const effect = isBoss ? `
    <div class="intro-effect">
      <span>庄家特权</span>
      <b>${h(opponent.effectName)}</b>
      <p>${h(opponent.effectDesc)}</p>
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
        ${run.bossBoons ? `<p class="intro-role" style="margin-top:-12px;margin-bottom:18px;font-size:10px;color:#c5a96e">已夺取 ${run.bossBoons} 枚庄家徽记 · 每关额外 ${run.bossBoons} 次重投。</p>` : ''}
        <p class="intro-role" style="margin-top:-12px;margin-bottom:18px;font-size:10px;color:#a08c6c">收手奖金：每剩 1 次重投 +${REROLL_REFUND} 银币；得分达到目标 1.5 / 2 / 3 倍再 +${OVERSHOOT_TIERS.slice().reverse().map((t) => t.value).join(' / ')}。</p>
        <div class="intro-actions">
          <button class="primary-button" data-action="close-intro">入座应战 <svg><use href="#i-arrow"></use></svg></button>
          <button class="text-button" data-action="open-rules">查看计分规则 <span>↗</span></button>
        </div>
        ${run.level === 1 ? '<p class="intro-role" style="margin-top:15px;font-size:10px;color:#8f7d63">门房赠礼：一枚「幸运币」，每关可使用一次，立即 +150 分。</p>' : ''}
        <div class="intro-tableline"></div>
      </div>
    </div>
  `, { dismissible: false });
}

function goToShop() {
  if (!app.run) return;
  if (app.run.phase !== 'won') return;
  closeOverlay();
  const shop = Engine.openShop(app.run);
  if (!shop) { showToast('市集没有开门。', 'error'); return; }
  openShopScreen();
}

function leaveShop() {
  if (!app.run) return;
  const next = app.run.level + 1;
  const result = Engine.leaveShop(app.run);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  closeShopScreen();
  setupLevelScene(true);
  renderGame();
  if (next <= LEVEL_COUNT) showLevelIntro();
}

function retryLevel() {
  if (!app.run) return;
  const result = Engine.retryLevel(app.run);
  if (!result.ok) { showToast(result.error, 'error'); return; }
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
   Rendering — game
   ═══════════════════════════════════════════════════════════════════ */
/* The individual panels live in ui/hud.ts; renderGame is the one call that
   paints the whole table and still has to reach the tray and the dock below. */
function renderGame() {
  if (!app.run) return;
  const run = app.run;
  discoverLoadout(run);
  renderTopbar();
  renderScorePanel();
  renderRail();
  renderDiceTray();
  renderComboPreview();
  renderActionDock();
  renderAutoButton();
  renderDangerStrip();
  renderOpponentPlate();
}

/* ═══════════════════════════════════════════════════════════════════
   Roll / score interactions
   ═══════════════════════════════════════════════════════════════════ */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cupDiceToGather(run) {
  if (run.flags.rerollAll || run.flags.hotDice) return run.dice.slice();
  return run.dice.filter((die) => !die.scored);
}

function dieElement(uid) {
  return $(`.die[data-die-uid="${CSS.escape(uid)}"]`);
}

/* World-space point at the cup's mouth, so dice really leave from the cup
   instead of a guessed offset above the tray. */
function cupWorldPoint() {
  const cup = $('#cup-image') || $('#cup');
  if (!diceTable || !cup) return { x: 0, y: 1.2, z: 0.9 };
  const rect = cup.getBoundingClientRect();
  if (!rect.width) return { x: 0, y: 1.2, z: 0.9 };
  // Park them roughly a die above the rim so the pour starts above the table.
  return diceTable.screenToPlane(rect.left + rect.width / 2, rect.top + rect.height * .82, 1.35);
}

async function slowSpinTableDice(run) {
  if (prefersReducedMotion() || run.stats.levelRolls === 0) return;
  const uids = run.dice.filter((die) => die.value != null).map((die) => die.uid);
  if (!uids.length) return;
  if (diceTable) {
    await motion.tumble(diceTable, uids);
    return;
  }
  // ── DOM fallback ──
  const gatherUids = new Set(cupDiceToGather(run).map((die) => die.uid));
  const elements = uids.map((uid) => dieElement(uid)).filter(Boolean);
  const animations = elements.map((element, index) => {
    const roller = $('.die-roller', element);
    if (!roller) return Promise.resolve();
    element.classList.add('is-rerolling');
    return roller.animate([
      { transform: 'rotateY(0deg) translateY(0)' },
      { transform: 'rotateY(360deg) translateY(-3px)' },
    ], { duration: 500, delay: index * 20, easing: 'cubic-bezier(.36,0,.3,1)' }).finished.catch(() => {});
  });
  await Promise.all(animations);
  elements.forEach((element) => {
    if (!gatherUids.has(element.dataset.dieUid)) element.classList.remove('is-rerolling');
  });
}

async function gatherDiceToCup(run) {
  if (prefersReducedMotion()) return;
  const uids = cupDiceToGather(run).map((die) => die.uid);
  if (!uids.length) return;
  if (diceTable) {
    await motion.gather(diceTable, uids, cupWorldPoint());
    return;
  }
  // ── DOM fallback ──
  const cupImage = $('#cup-image');
  if (!cupImage) return;
  const cupRect = cupImage.getBoundingClientRect();
  const mouthX = cupRect.left + cupRect.width / 2;
  const mouthY = cupRect.top + cupRect.height * .88;
  const elements = uids.map((die) => dieElement(die.uid)).filter(Boolean);
  const animations = elements.map((element, index) => {
    const rect = element.getBoundingClientRect();
    const dx = mouthX - (rect.left + rect.width / 2);
    const dy = mouthY - (rect.top + rect.height / 2);
    element.style.pointerEvents = 'none';
    return element.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .55}px, ${dy * .4 - 18}px) scale(.66) rotate(90deg)`, opacity: .9, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.14) rotate(150deg)`, opacity: 0 },
    ], { duration: 340, delay: index * 18, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' })
      .finished.catch(() => {});
  });
  await Promise.all(animations);
  elements.forEach((element) => { element.style.opacity = '0'; });
}

/* Pour every rerolled die out of the cup and let it settle. */
async function pourDiceIntoTable(uids) {
  if (!diceTable || !uids.length) return;
  await motion.rollDice(diceTable, uids, cupWorldPoint(), { stagger: 0.045, duration: 0.58 });
}

function pulseCup() {
  const cup = $('#cup');
  if (!cup) return;
  motion.cupCue(cup);
  clearTimeout(app.cupCueTimer);
  app.cupCueTimer = setTimeout(() => { /* GSAP owns the tween now */ }, 1400);
}

function stopCupShake() {
  const cup = $('#cup');
  if (!cup) return;
  cup.classList.remove('is-shaking');
  motion.gsap?.killTweensOf($('#cup-vessel'));
}

async function invertCup() {
  const cup = $('#cup');
  const vessel = $('#cup-vessel');
  if (!cup || !vessel) return;
  stopCupShake();
  cup.classList.add('is-ritual', 'is-inverted');
  app.cupInverted = true;
  // The cup already rests mouth-down; lifting it clear of the table is the
  // "ready to pour" pose, so no flip is needed.
  await motion.cupLift(vessel);
}

function rightCup() {
  const cup = $('#cup');
  const vessel = $('#cup-vessel');
  if (!cup || !vessel) return;
  app.cupInverted = false;
  cup.classList.remove('is-inverted', 'is-shaking');
  motion.cupDrop(vessel);
  setTimeout(() => cup.classList.remove('is-ritual'), 380);
}

function clearCupTimers() {
  clearInterval(app.cupCountdownTimer);
  clearTimeout(app.cupAutoTimer);
  app.cupCountdownTimer = null;
  app.cupAutoTimer = null;
}

function removeCupOverlays() {
  $('#cup-countdown')?.remove();
  $('#cup-trace')?.remove();
  $('#cup')?.classList.remove('is-tracing');
  app.cupTrace = null;
}

function resetCupVisuals() {
  const cup = $('#cup');
  const vessel = $('#cup-vessel');
  cup?.classList.remove('is-shaking', 'is-inverted', 'is-ritual', 'is-dragging', 'is-cue');
  if (vessel) {
    motion.gsap?.killTweensOf(vessel);
    motion.gsap?.set(vessel, { clearProps: 'transform' });
  }
  clearCupTimers();
  removeCupOverlays();
  app.cupInverted = false;
  app.cupAnimating = false;
  app.cupHoldStarted = false;
  app.cupHoldPromise = null;
}

function cupGestureInfo(run) {
  const barrel = run ? Engine.getBarrel(run) : null;
  if (!barrel?.gesture) return null;
  if (barrel.gesture === 'pentagram' && run.flags.starUsed) return null;
  if (barrel.gesture === 'circle' && run.flags.vortexUsed) return null;
  return { gesture: barrel.gesture, name: barrel.gesture === 'pentagram' ? '五芒星' : '旋涡' };
}

function traceStarPoints(cx, cy, radius) {
  const angles = [-90, -18, 54, 126, 198].map((deg) => (deg * Math.PI) / 180);
  const base = angles.map((a) => ({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }));
  return [0, 2, 4, 1, 3, 0].map((index) => base[index]);
}

function traceCirclePoints(cx, cy, radius) {
  return Array.from({ length: 97 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 96) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function samplePath(points, count = 140) {
  if (!points?.length) return [];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(length);
    total += length;
  }
  if (!total) return points.slice(0, 1);
  const samples = [];
  for (let i = 0; i <= count; i += 1) {
    let target = (i / count) * total;
    let segment = 0;
    while (segment < lengths.length && target > lengths[segment]) {
      target -= lengths[segment];
      segment += 1;
    }
    const a = points[Math.min(segment, points.length - 2)];
    const b = points[Math.min(segment + 1, points.length - 1)];
    const t = lengths[segment] ? target / lengths[segment] : 0;
    samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return samples;
}

function beginCupTrace(center, radius, info) {
  removeCupOverlays();
  if (!info) return;
  $('#cup')?.classList.add('is-tracing');
  const guide = info.gesture === 'pentagram'
    ? traceStarPoints(center.x, center.y, radius)
    : traceCirclePoints(center.x, center.y, radius);
  const guides = samplePath(guide);
  const overlay = document.createElement('div');
  overlay.id = 'cup-trace';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<svg viewBox="0 0 ${window.innerWidth} ${window.innerHeight}">
    <polyline class="cup-trace-guide" points="${guide.map((p) => `${p.x},${p.y}`).join(' ')}"></polyline>
    <polyline class="cup-trace-drawn" points=""></polyline>
  </svg>`;
  document.body.append(overlay);
  app.cupTrace = {
    ...info, center, radius, guide, guides, points: [],
    drawn: $('.cup-trace-drawn', overlay),
  };
}

function recordCupTrace(x, y) {
  const trace = app.cupTrace;
  if (!trace) return;
  const last = trace.points[trace.points.length - 1];
  if (last && Math.hypot(x - last.x, y - last.y) < 3) return;
  trace.points.push({ x, y });
  if (trace.drawn) trace.drawn.setAttribute('points', trace.points.map((p) => `${p.x},${p.y}`).join(' '));
}

function evaluateCupTrace() {
  const trace = app.cupTrace;
  if (!trace || trace.points.length < 4) return { ok: false, reason: '轨迹太短' };
  const tolerance = Math.max(16, trace.radius * 0.31);
  let covered = 0;
  for (const sample of trace.guides) {
    let nearest = Infinity;
    for (const point of trace.points) {
      const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
      if (distance < nearest) nearest = distance;
      if (nearest <= tolerance * 0.4) break;
    }
    if (nearest <= tolerance) covered += 1;
  }
  const coverage = covered / Math.max(1, trace.guides.length);
  let length = 0;
  for (let i = 1; i < trace.points.length; i += 1) {
    length += Math.hypot(trace.points[i].x - trace.points[i - 1].x, trace.points[i].y - trace.points[i - 1].y);
  }
  let sweep = 0;
  if (trace.gesture === 'circle') {
    let previous = null;
    for (const point of trace.points) {
      const angle = Math.atan2(point.y - trace.center.y, point.x - trace.center.x);
      if (previous !== null) {
        let delta = angle - previous;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        sweep += delta;
      }
      previous = angle;
    }
  }
  const guideLength = trace.guides.reduce((sum, point, index) => index
    ? sum + Math.hypot(point.x - trace.guides[index - 1].x, point.y - trace.guides[index - 1].y) : 0, 0);
  const ok = coverage >= 0.7 && length >= guideLength * 0.52
    && (trace.gesture !== 'circle' || sweep >= Math.PI * 1.45);
  return { ok, coverage, length, guideLength, sweep, reason: ok ? '' : '轨迹偏差过大' };
}

function finishCupTrace() {
  const trace = app.cupTrace;
  if (!trace) return false;
  const evaluation = evaluateCupTrace();
  const gesture = trace.gesture;
  app.lastTraceResult = {
    ...evaluation, gesture, points: trace.points.length,
    recorded: trace.points.slice(0, 30), guide: trace.guide,
  };
  removeCupOverlays();
  if (!evaluation.ok) {
    showToast(`${gesture === 'pentagram' ? '五芒星' : '旋涡'}轨迹偏差过大，仪式失败。`, 'error');
    return false;
  }
  const result = Engine.applyGesture(app.run, gesture);
  if (!result.ok) {
    showToast(result.error, 'error');
    return false;
  }
  sound.gesture();
  showToast(result.message, 'good');
  return true;
}

function beginCupCountdown(onDone) {
  clearCupTimers();
  const cup = $('#cup');
  if (!cup) return;
  $('#cup-countdown')?.remove();
  const node = document.createElement('span');
  node.id = 'cup-countdown';
  cup.append(node);
  const end = performance.now() + 2000;
  app.cupCountdownEnd = end;
  let lastText = '';
  const tick = () => {
    const left = Math.max(0, end - performance.now());
    const text = `${(left / 1000).toFixed(1)}s`;
    const urgent = left <= 650;
    if (text !== lastText) {
      lastText = text;
      node.textContent = text;
      node.classList.toggle('is-urgent', urgent);
    }
  };
  tick();
  app.cupCountdownTimer = setInterval(tick, 100);
  app.cupAutoTimer = setTimeout(() => {
    clearCupTimers();
    onDone?.();
  }, 2000);
}

async function performCupRoll({ free = false, prepared = false } = {}) {
  const run = app.run;
  if (!run) return;
  const previousPhase = run.phase;
  // Which dice the cup actually swallows — captured before the engine
  // rewrites the values, so the pour animation targets the right meshes.
  const pouring = cupDiceToGather(run).map((die) => die.uid);
  try {
    if (!prepared) {
      await slowSpinTableDice(run);
      await gatherDiceToCup(run);
      const cup = $('#cup');
      cup?.classList.add('is-ritual');
      motion.cupRattle($('#cup-vessel'), { cycles: 2 });
      sound.rattle();
      await sleep(prefersReducedMotion() ? 0 : 300);
      await invertCup();
    } else if (!app.cupInverted) {
      await invertCup();
    } else {
      stopCupShake();
    }
    const result = Engine.rollDice(run, { free: free || run.phase === 'hot' });
    if (!result.ok) {
      resetCupVisuals();
      app.busy = false;
      app.rolling = false;
      renderGame();
      showToast(result.error, 'error');
      return;
    }
    app.rolling = true;
    sound.dice();
    rightCup();
    renderGame();
    if (result.bust) showBustNotice(result.bust);
    // The dice pour out of the cup and settle; wait for the real motion
    // instead of a guessed timeout.
    if (diceTable) await pourDiceIntoTable(pouring.length ? pouring : run.dice.map((die) => die.uid));
    else await sleep(680);
    app.busy = false;
    app.rolling = false;
    app.cupAnimating = false;
    app.cupHoldStarted = false;
    app.cupHoldPromise = null;
    $('#cup')?.classList.remove('is-ritual');
    renderGame();
    if (run.phase === 'lost') showDefeat();
    else if (run.phase === 'dead') speakRandomTaunt(0.35);
    else if (previousPhase !== 'hot' && Math.random() < .24) speakRandomTaunt(0.24);
  } catch (error) {
    console.error(error);
    resetCupVisuals();
    app.busy = false;
    app.rolling = false;
    renderGame();
    showToast('骰桶卡住了，再试一次。', 'error');
  }
}

function beginRoll({ free = false } = {}) {
  if (!app.run || app.busy || app.introOpen) return;
  const run = app.run;
  const allowedNormal = ['ready', 'dead', 'hot', 'reroll-pending'].includes(run.phase);
  if (!allowedNormal && !free) return;
  if (run.phase === 'selecting' && !free) return;
  if (run.rerolls <= 0 && run.phase !== 'hot' && run.phase !== 'ready' && !free) {
    showToast('没有剩余重投次数。', 'error');
    return;
  }
  sound.unlock();
  app.busy = true;
  app.rolling = false;
  app.cupAnimating = true;
  $('#cup')?.classList.remove('is-cue');
  renderGame();
  performCupRoll({ free: free || run.phase === 'hot' });
}

/**
 * Starts the cup/shake half of a manual drag: dice gather into the cup, then
 * the cup inverts and keeps rattling while held. Release pours and rolls.
 */
function startCupHold() {
  if (!app.run || app.busy || app.introOpen) return false;
  const run = app.run;
  if (!['ready', 'dead', 'hot', 'reroll-pending'].includes(run.phase)) return false;
  if (run.phase === 'dead' && run.rerolls <= 0) return false;
  sound.unlock();
  app.busy = true;
  app.rolling = false;
  app.cupInverted = false;
  app.cupAnimating = true;
  app.cupHoldStarted = true;
  const cup = $('#cup');
  cup?.classList.remove('is-shaking', 'is-inverted', 'is-cue');
  const vessel = $('#cup-vessel');
  if (vessel) {
    motion.gsap?.killTweensOf(vessel);
    motion.gsap?.set(vessel, { clearProps: 'transform' });
  }
  renderGame();
  cup?.classList.add('is-ritual');
  const ritualHold = Boolean(cupGestureInfo(run));
  app.cupHoldPromise = (async () => {
    if (prefersReducedMotion()) return;
    await slowSpinTableDice(run);
    if (!app.cupHoldStarted) return;
    await gatherDiceToCup(run);
    if (!app.cupHoldStarted) return;
    motion.cupRattle($('#cup-vessel'), { cycles: 1 });
    sound.rattle();
    await sleep(320);
    if (!app.cupHoldStarted) return;
    if (!ritualHold) {
      await invertCup();
      if (!app.cupHoldStarted) {
        resetCupVisuals();
        return;
      }
    }
    // Keep rattling while the player holds the cup.
    motion.cupRattle($('#cup-vessel'), { cycles: 3 });
    sound.rattle();
  })().catch((error) => {
    console.error(error);
    resetCupVisuals();
    app.busy = false;
    renderGame();
  });
  return true;
}

function cancelCupHold() {
  if (!app.cupHoldStarted) return;
  resetCupVisuals();
  app.busy = false;
  app.rolling = false;
  app.cupAnimating = false;
  renderGame();
}

function handleScore(action) {
  if (!app.run || app.busy || app.introOpen) return;
  const run = app.run;
  if (run.phase !== 'selecting') return;
  const selected = Engine.selectedDice(run);
  if (!selected.length) { showToast('先选择要计分的骰子。'); return; }
  const preview = Engine.getScorePreview(run);
  if (!preview.valid) { showToast(preview.error, 'error'); return; }
  if (action !== 'bank' && run.rerolls <= 0) { showToast('没有剩余重投次数。', 'error'); return; }
  const rect = selected[0] ? $(`[data-die-uid="${CSS.escape(selected[0].uid)}"]`)?.getBoundingClientRect() : null;
  const wasReached = run.score >= run.target;
  const result = Engine.applyScore(run, action);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  app.busy = true;
  sound.score(result.total);
  showScoreFloat(result.total, rect);
  renderGame();
  speakOnScore(result.total, run);
  clearTimeout(app.rollTimer);
  app.rollTimer = setTimeout(() => {
    app.busy = false;
    renderGame();
    if (result.targetReached && !wasReached) {
      showToast('目标已达成 · 可以继续得分，准备好后再点「下一关」。', 'good');
    }
    if (result.hot) {
      showHotBurst();
      renderGame();
    } else if (run.phase === 'lost') {
      showDefeat();
    } else if (result.reroll) {
      // Do not auto-roll here. The score has been applied, but the player
      // chooses the next throw: cup by hand or the right-side auto button.
      pulseCup();
    } else if (run.phase === 'dead') {
      speakRandomTaunt(0.35);
    }
  }, 520);
}

function advanceCurrentLevel() {
  if (!app.run || app.busy || app.introOpen) return;
  const result = Engine.advanceLevel(app.run);
  if (!result.ok) {
    showToast(result.error, 'error');
    return;
  }
  app.busy = true;
  app.resultShown = false;
  clearTimeout(app.rollTimer);
  renderGame();
  setTimeout(() => {
    app.busy = false;
    showVictory();
  }, 260);
}

function showScoreFloat(total, rect) {
  const el = document.createElement('div');
  el.className = 'score-float';
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top - 10 : window.innerHeight / 2;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = `+${num(total)}<small>SCORE</small>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}

function showHotBurst() {
  const burst = document.createElement('div');
  burst.className = 'hot-burst';
  burst.innerHTML = '<span>全骰 · HOT DICE</span>';
  $('#scene')?.append(burst);
  sound.win();
  setTimeout(() => burst.remove(), 1700);
}

function speakOnScore(total, run) {
  if (total >= 700 || run.score >= run.target * .75) {
    const opponent = getOpponent(run.level);
    const lines = opponent.taunts || [];
    if (lines.length) setSpeech(lines[Math.floor(Math.random() * lines.length)]);
  }
}

function speakRandomTaunt(probability = .3) {
  if (!app.run || Math.random() > probability) return;
  const opponent = getOpponent(app.run.level);
  const lines = opponent.taunts || [];
  if (lines.length) setSpeech(lines[Math.floor(Math.random() * lines.length)]);
}

function setSpeech(text) {
  const bubble = $('#speech-bubble');
  const textEl = $('#speech-text');
  if (!bubble || !textEl || !text) return;
  clearTimeout(app.speechTimer);
  bubble.classList.add('is-changing');
  app.speechTimer = setTimeout(() => {
    textEl.textContent = text;
    bubble.classList.remove('is-changing');
  }, 180);
}

/* ═══════════════════════════════════════════════════════════════════
   Items
   ═══════════════════════════════════════════════════════════════════ */
function useItem(itemId) {
  if (!app.run || app.busy || app.introOpen) return;
  const wasReached = app.run.score >= app.run.target;
  const check = Engine.canUseItem(app.run, itemId);
  if (!check.ok) { showToast(check.error, 'error'); return; }
  const result = Engine.useItem(app.run, itemId);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  sound.item();
  showToast(`${ITEM_BY_ID[itemId].name}：${ITEM_BY_ID[itemId].desc}`, 'good');
  renderGame();
  if (result.rerollFree) {
    setTimeout(() => beginRoll({ free: true }), 380);
  } else if (!wasReached && app.run.score >= app.run.target) {
    showToast('目标已达成 · 可以继续得分，准备好后再点「下一关」。', 'good');
  } else if (app.run.phase === 'lost') {
    setTimeout(() => showDefeat(), 500);
  }
}

function forfeitRun() {
  if (!app.run || app.busy) return;
  const result = Engine.forfeit(app.run);
  if (!result.ok) return;
  renderGame();
  showDefeat();
}

/* ═══════════════════════════════════════════════════════════════════
   Cup drag — horizontal only, exactly as the brief asks
   ═══════════════════════════════════════════════════════════════════ */
function bindCupDrag() {
  const cup = $('#cup');
  if (!cup) return;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dy = 0;
  let allowVertical = false;
  let traceRadius = 86;
  let traceCenter = { x: 0, y: 0 };
  let cupCenter = { x: 0, y: 0 };
  let dragMin = -138;
  let dragMax = 138;

  const canDrag = () => app.run && !app.busy && !app.introOpen
    && (app.run.phase === 'ready' || app.run.phase === 'hot' || app.run.phase === 'reroll-pending'
      || (app.run.phase === 'dead' && app.run.rerolls > 0));

  cup.addEventListener('pointerdown', (event) => {
    if (!canDrag()) return;
    event.preventDefault();
    sound.unlock();
    dragging = true;
    pointerId = event.pointerId;
    app.cupPointerId = pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dx = 0;
    dy = 0;
    const scene = $('#scene');
    const cupRect = cup.getBoundingClientRect();
    const sceneRect = scene?.getBoundingClientRect();
    const gestureInfo = cupGestureInfo(app.run);
    allowVertical = Boolean(gestureInfo);
    cupCenter = { x: cupRect.left + cupRect.width / 2, y: cupRect.top + cupRect.height / 2 };
    traceCenter = { ...cupCenter };
    traceRadius = sceneRect ? clamp(sceneRect.width * .1, 64, 108) : 86;
    if (sceneRect) {
      const margin = Math.max(12, sceneRect.width * .018);
      dragMin = sceneRect.left + margin - cupRect.left;
      dragMax = sceneRect.right - margin - cupRect.right;
      if (dragMax < dragMin) { dragMin = 0; dragMax = 0; }
    }
    // Keep the whole ritual path inside the cup's reachable strip. The cup
    // starts near the left edge; centering a star on it would make the left
    // point unreachable, so shift the target toward the table center.
    const minCenter = traceCenter.x + dragMin;
    const maxCenter = traceCenter.x + dragMax;
    traceRadius = Math.min(traceRadius, Math.max(36, (maxCenter - minCenter) / 2));
    traceCenter.x = clamp(traceCenter.x, minCenter + traceRadius, maxCenter - traceRadius);
    try { cup.setPointerCapture(pointerId); } catch { /* pointerup fallback below */ }
    cup.classList.add('is-dragging');
  });

  const onCupMove = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dx = clamp(event.clientX - startX, dragMin, dragMax);
    dy = allowVertical ? clamp(event.clientY - startY, -traceRadius * 1.65, traceRadius * 1.65) : 0;
    const tilt = clamp(dx * .02, -9, 9);
    cup.style.transform = `translate(${dx}px, ${dy}px) rotate(${tilt}deg)`;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      sound.rattle();
      if (!app.cupHoldStarted) {
        if (startCupHold()) {
          const info = cupGestureInfo(app.run);
          if (info) beginCupTrace(traceCenter, traceRadius, info);
          beginCupCountdown(finish);
        }
      }
      if (app.cupTrace) recordCupTrace(cupCenter.x + dx, cupCenter.y + dy);
    }
  };
  cup.addEventListener('pointermove', onCupMove);
  // Pointer capture is not guaranteed in every browser/headless shell. Keep
  // tracking on window so the cup can travel across the entire tabletop.
  window.addEventListener('pointermove', onCupMove);

  const finish = async (event) => {
    if (!dragging) return;
    dragging = false;
    clearCupTimers();
    cup.classList.remove('is-dragging');
    if (pointerId != null) {
      try {
        if (cup.hasPointerCapture(pointerId)) cup.releasePointerCapture(pointerId);
      } catch { /* ignore */ }
    }
    const moved = Math.abs(dx) >= 12 || Math.abs(dy) >= 12 || app.cupHoldStarted;
    dx = 0;
    dy = 0;
    if (event?.type === 'pointercancel' && app.cupHoldStarted) {
      cup.style.transform = '';
      removeCupOverlays();
      cancelCupHold();
      return;
    }
    if (app.cupHoldStarted) {
      if (app.cupTrace) finishCupTrace();
      removeCupOverlays();
      try { await app.cupHoldPromise; } catch { /* handled in startCupHold */ }
      cup.style.transform = '';
      if (!app.cupHoldStarted) return;
      await performCupRoll({ prepared: true, free: app.run?.phase === 'hot' });
      return;
    }
    removeCupOverlays();
    cup.style.transform = '';
    if (moved) beginRoll();
    else {
      cup.animate([
        { transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)' },
        { transform: 'rotate(4deg)' }, { transform: 'rotate(0deg)' },
      ], { duration: 280, easing: 'ease-out' });
      showToast('按住骰桶拖动，2 秒倒计时后落骰。');
    }
  };
  cup.addEventListener('pointerup', finish);
  cup.addEventListener('pointercancel', finish);
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);

  cup.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      if (canDrag()) beginRoll();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Victory / defeat
   ═══════════════════════════════════════════════════════════════════ */
function showVictory() {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level);
  const table = getTable(run.level);
  const isFinal = run.phase === 'run-won' || run.level >= LEVEL_COUNT;
  const reward = run.levelReward || { total: projectedReward(), bonuses: [] };
  sound.win();
  if (isFinal) {
    const summary = Engine.runSummary(run);
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
      ${reward.bossPremium ? `<div class="reward-breakdown"><span style="border-color:rgba(196,170,240,.34);color:#c9b6f0">${h(reward.bossName)} 悬赏 ×${reward.bossScale.toFixed(2)} <b>基础 ${num(reward.curveBase)} → ${num(reward.base)}</b></span></div>` : ''}
      ${reward.bonuses?.length ? `<div class="reward-breakdown">${reward.bonuses.map((b) => `<span>${h(b.label)} <b>+${num(b.value)}</b></span>`).join('')}</div>` : ''}
      ${getLevelConfig(run.level).boss ? '<div class="reward-breakdown"><span style="border-color:rgba(217,180,106,.3);color:#e2c887">夺下庄家徽记 <b>后续重投上限 +1</b></span></div>' : ''}
      <p class="result-sub" style="font-size:10px;margin-top:-5px">下一站：${h(nextTable.name)} · 第 ${next} 关</p>
      <div class="modal-actions">
        <button class="primary-button" data-action="go-shop">前往市集 <svg><use href="#i-shop"></use></svg></button>
      </div>
    </div>
  `, { dismissible: false });
}

function showDefeat() {
  if (!app.run || app.resultShown) return;
  app.resultShown = true;
  const run = app.run;
  const opponent = getOpponent(run.level);
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


/* ═══════════════════════════════════════════════════════════════════
   Gesture minigame
   ═══════════════════════════════════════════════════════════════════ */
function openGesture() {
  if (!app.run || app.busy) return;
  const barrel = Engine.getBarrel(app.run);
  if (!barrel.gesture) return;
  if (app.run.flags.gestureUsedThisThrow) { showToast('本次投掷已经完成过仪式。'); return; }
  if (barrel.gesture === 'pentagram' && app.run.flags.starUsed) { showToast('五芒星每关只能生效一次。'); return; }
  if (barrel.gesture === 'circle' && app.run.flags.vortexUsed) { showToast('旋涡桶的额外重投每关只能获得一次。'); return; }
  closeOverlay();
  const isStar = barrel.gesture === 'pentagram';
  const nodes = isStar ? starNodes() : [];
  const nodeHtml = nodes.map((node, i) => `<span class="gesture-node" data-node="${i}" style="left:${node.x}%;top:${node.y}%"><i></i><b style="position:absolute;font-size:7px;transform:rotate(-45deg);color:inherit">${node.order + 1}</b></span>`).join('');
  openOverlay(`
    <div class="modal gesture-modal">
      <div class="gesture-head">
        <p class="modal-kicker">RITUAL OF ${isStar ? 'THE FIVE POINTS' : 'THE VORTEX'}</p>
        <h2>${isStar ? '五芒星仪式' : '旋涡仪式'}</h2>
        <p>${isStar ? '每关只能完成一次。依次连接五颗星点：顶 → 右下 → 左上 → 右上 → 左下 → 回到顶。完成后，本次投掷获得加成。' : '从任意位置开始，顺时针画满一整圈。完成后，本次投掷获得加成。'}</p>
      </div>
      <div class="gesture-board-wrap">
        <div class="gesture-board" id="gesture-board">
          <canvas id="gesture-canvas"></canvas>
          <div class="gesture-guide"></div>
          <div class="gesture-center-mark"></div>
          <div class="gesture-nodes">${nodeHtml}</div>
        </div>
      </div>
      <div class="gesture-status" id="gesture-status">${isStar ? '从任意星点开始，沿五角星描线。' : '在圆盘内顺时针画一圈。'}</div>
      <div class="gesture-actions">
        <button class="secondary-button" data-action="gesture-reset">重新描绘</button>
        <button class="secondary-button" data-action="close-overlay">先不画</button>
      </div>
    </div>
  `, { dismissible: true });
  requestAnimationFrame(() => initGestureBoard(isStar, nodes));
}

function starNodes() {
  const positions = [
    { x: 50, y: 9 }, { x: 90, y: 37 }, { x: 76, y: 87 }, { x: 24, y: 87 }, { x: 10, y: 37 },
  ];
  // Star path order: top -> lower-right -> upper-left -> upper-right -> lower-left.
  const order = [0, 2, 4, 1, 3];
  return positions.map((pos, index) => ({ ...pos, index, order: order.indexOf(index) }));
}

function initGestureBoard(isStar, nodes) {
  const board = $('#gesture-board');
  const canvas = $('#gesture-canvas');
  if (!board || !canvas) return;
  const status = $('#gesture-status');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let drawing = false;
  let points = [];
  let nodeHits = [];
  let totalPositive = 0;
  let totalNegative = 0;
  let lastAngle = null;
  let radiusSamples = [];
  let finished = false;

  const resize = () => {
    const rect = board.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  };
  const localPoint = (event) => {
    const rect = board.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, w: rect.width, h: rect.height };
  };
  const redraw = () => {
    const rect = board.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (points.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,216,137,.9)';
    ctx.shadowColor = 'rgba(255,193,86,.8)';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,239,195,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  const reset = () => {
    if (finished) return;
    points = [];
    nodeHits = [];
    totalPositive = 0;
    totalNegative = 0;
    lastAngle = null;
    radiusSamples = [];
    $$('.gesture-node', board).forEach((node) => node.classList.remove('is-lit'));
    status.textContent = isStar ? '从任意星点开始，沿五角星描线。' : '在圆盘内顺时针画一圈。';
    status.className = 'gesture-status';
    redraw();
  };
  app.gestureReset = reset;
  window.addEventListener('resize', resize);

  const registerNodeHits = (point) => {
    if (!isStar) return;
    for (const node of nodes) {
      const nx = (node.x / 100) * point.w;
      const ny = (node.y / 100) * point.h;
      const distance = Math.hypot(point.x - nx, point.y - ny);
      if (distance < 38) {
        if (nodeHits.at(-1) !== node.index) {
          nodeHits.push(node.index);
          const el = $(`.gesture-node[data-node="${node.index}"]`, board);
          el?.classList.add('is-lit');
          sound.tone(520 + node.order * 55, .1, 'sine', .015);
        }
      }
    }
  };

  const pointerDown = (event) => {
    if (finished) return;
    event.preventDefault();
    drawing = true;
    points = [];
    nodeHits = [];
    totalPositive = 0;
    totalNegative = 0;
    lastAngle = null;
    radiusSamples = [];
    $$('.gesture-node', board).forEach((node) => node.classList.remove('is-lit'));
    const point = localPoint(event);
    points.push(point);
    registerNodeHits(point);
    board.setPointerCapture(event.pointerId);
    redraw();
  };
  const pointerMove = (event) => {
    if (!drawing) return;
    event.preventDefault();
    const point = localPoint(event);
    const prev = points.at(-1);
    if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) < 2) return;
    points.push(point);
    registerNodeHits(point);
    if (!isStar) {
      const cx = point.w / 2;
      const cy = point.h / 2;
      const dx = point.x - cx;
      const dy = point.y - cy;
      const radius = Math.hypot(dx, dy);
      radiusSamples.push(radius);
      const angle = Math.atan2(dy, dx);
      if (lastAngle != null) {
        let delta = angle - lastAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (delta > 0) totalPositive += delta;
        else totalNegative += Math.abs(delta);
      }
      lastAngle = angle;
    }
    redraw();
  };
  const pointerUp = (event) => {
    if (!drawing) return;
    drawing = false;
    if (board.hasPointerCapture?.(event.pointerId)) board.releasePointerCapture(event.pointerId);
    if (isStar) evaluateStar(); else evaluateCircle();
  };

  function evaluateStar() {
    const seq = nodeHits.slice();
    if (seq.length >= 5) {
      const complete = starSequenceValid(seq);
      if (complete) {
        finishSuccess('五芒星闭合，星辉落在骰面上。');
      } else {
        finishFail('星线没有依次穿过所有星点。再试一次。');
      }
    } else {
      finishFail('星线还未完成，需要连接全部五颗星点。');
    }
  }

  function evaluateCircle() {
    const minRadius = board.getBoundingClientRect().width * .2;
    const maxRadius = board.getBoundingClientRect().width * .48;
    const inBand = radiusSamples.length && radiusSamples.every((r) => r >= minRadius * .65 && r <= maxRadius * 1.1);
    if (totalPositive >= Math.PI * 1.55 && totalNegative < totalPositive * .35 && inBand) {
      finishSuccess('旋涡闭合，骰桶开始自行转动。');
    } else if (totalNegative > totalPositive) {
      finishFail('方向反了。顺时针再画一次。');
    } else {
      finishFail('圈还没有画满。保持在一个圆上，顺时针画一整圈。');
    }
  }

  function finishSuccess(message) {
    if (finished) return;
    finished = true;
    status.textContent = message;
    status.className = 'gesture-status is-success';
    sound.gesture();
    const result = Engine.applyGesture(app.run, isStar ? 'pentagram' : 'circle');
    setTimeout(() => {
      if (result.ok) {
        closeOverlay();
        renderGame();
        showToast(result.message, 'good');
      } else {
        finished = false;
        status.textContent = result.error;
        status.className = 'gesture-status is-fail';
      }
    }, 850);
  }
  function finishFail(message) {
    status.textContent = message;
    status.className = 'gesture-status is-fail';
    points = [];
    nodeHits = [];
    totalPositive = 0;
    totalNegative = 0;
    lastAngle = null;
    redraw();
    $$('.gesture-node', board).forEach((node) => node.classList.remove('is-lit'));
  }

  board.addEventListener('pointerdown', pointerDown);
  board.addEventListener('pointermove', pointerMove);
  board.addEventListener('pointerup', pointerUp);
  board.addEventListener('pointercancel', pointerUp);
  resize();
  app.gestureCleanup = () => window.removeEventListener('resize', resize);
}

function starSequenceValid(seq) {
  const unique = seq.filter((value, index) => value !== seq[index - 1]);
  if (unique.length < 5) return false;
  const first = unique[0];
  const cycle = [];
  let index = unique.indexOf(first);
  if (index === -1) return false;
  for (let i = 0; i < 5; i += 1) {
    cycle.push(unique[(index + i) % unique.length]);
  }
  const pattern = [0, 2, 4, 1, 3];
  const reversePattern = [...pattern].reverse();
  const rotations = (arr) => Array.from({ length: 5 }, (_, r) => arr.map((_, i) => arr[(i + r) % 5]).join(','));
  return rotations(pattern).includes(cycle.join(',')) || rotations(reversePattern).includes(cycle.join(','));
}


/* ═══════════════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════════════ */
function introLine(opponent, level, isBoss) {
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
  get app() { return app; },
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
  setLevel(level) {
    if (!app.run) return false;
    app.run.level = clamp(Number(level) || 1, 1, LEVEL_COUNT);
    app.run.shop = null;
    Engine.initLevel(app.run);
    setupLevelScene(true);
    renderGame();
    return true;
  },
});
