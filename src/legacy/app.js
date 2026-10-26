import {
  BARRELS, BARREL_BY_ID, BOSSES, DICE, DICE_BY_ID, DICE_SETS, ITEMS,
  ITEM_BY_ID, LEVELS, LEVEL_COUNT, MINIONS, RARITIES, TABLES, STANDARD_DIE,
  SHOP_RARITY_WEIGHTS, rarityShopWeight, REROLL_REFUND, OVERSHOOT_TIERS,
  MINION_GAPS, LEVEL_CURVE,
  activeSetBonuses, chapterForLevel, chapterLevelSpan, getLevelConfig, getOpponent, getTable,
  getDieSpec,
} from '../compat/content.ts';
import * as Engine from '../core/engine.ts';
import { SCORING_ROWS, analyzeSelection } from '../core/scoring.ts';
import { dieSkinStyle, favoredFaces } from '../render/dice-skins.ts';
import { pipIndexes } from '../render/pip-layout.ts';
import { artDieHtml, renderDiceTrayDom } from '../render/dice-dom.ts';
import { clamp, h, num, sleep } from '../core/util.ts';
import { motion } from '../render/motion.ts';
import { sound } from '../platform/sound.ts';
import {
  bindDiscovery, discoverLoadout, discoverShop, isDiscovered,
  loadDiscovery, readSoundPref, saveSoundPref,
} from '../platform/storage.ts';
import { installDebugBridge } from '../platform/debug-bridge.ts';

/* The dice itself is WebGL. Loaded lazily so a browser without WebGL2 (or a
   failure inside three) falls back to the DOM renderer instead of blanking
   the table. */
let DiceTable = null;
let diceTablePromise = null;
function loadDiceTable() {
  if (!diceTablePromise) {
    diceTablePromise = import('../render/dice-table.ts')
      .then((mod) => { DiceTable = mod.DiceTable; return DiceTable; })
      .catch((error) => { console.warn('WebGL dice unavailable, falling back', error); return null; });
  }
  return diceTablePromise;
}

/* ═══════════════════════════════════════════════════════════════════
   Tiny helpers
   ═══════════════════════════════════════════════════════════════════ */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const setCss = (el, name, value) => el?.style?.setProperty(name, value);
const rarityOf = (item) => RARITIES[item?.rarity] || RARITIES.common;

const codexDice = () => DICE.filter((die) => !die.isStandard);

const app = {
  run: null,
  discovered: { dice: [], barrels: [], items: [] },
  busy: false,
  rolling: false,
  introOpen: false,
  shopOpen: false,
  screen: 'start',
  soundEnabled: true,
  compendiumTab: 'dice',
  pendingReplace: null,
  speechTimer: null,
  rollTimer: null,
  overlayTimer: null,
  bustTimer: null,
  cupCueTimer: null,
  gestureCleanup: null,
  gestureReset: null,
  cupHoldStarted: false,
  cupHoldPromise: null,
  cupInverted: false,
  cupAnimating: false,
  cupCountdownTimer: null,
  cupCountdownEnd: 0,
  cupAutoTimer: null,
  cupTrace: null,
  cupPointerId: null,
  resultShown: false,
};

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

/** Base level payout, before reroll cash-out and overshoot tiers. */
function baseReward() {
  if (!app.run) return 0;
  let reward = getLevelConfig(app.run.level).reward;
  // Must match awardLevel in the engine (gold_cuff pays 15).
  if (app.run.passiveItems.includes('gold_cuff')) reward += 15;
  return reward;
}

function projectedReward() {
  if (!app.run) return 0;
  // Live preview: what banking at this exact moment would pay.
  return baseReward() + Engine.cashOutValue(app.run).total;
}

/** Itemised preview shown in the HUD tooltip so the cash-out rules stay visible. */
function cashOutHint() {
  const cash = Engine.cashOutValue(app.run);
  const parts = [`基础 ${getLevelConfig(app.run.level).reward}`];
  if (app.run.passiveItems.includes('gold_cuff')) parts.push('镀金袖扣 +15');
  parts.push(`剩余重投 ${cash.spare} × ${REROLL_REFUND} = ${cash.refund}`);
  parts.push(cash.tier ? `${cash.tier.label} +${cash.tierValue}` : '超额赏金 未达成（1.5 倍 +25 / 2 倍 +60 / 3 倍 +140）');
  return parts.join('\n');
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

function renderTopbar() {
  const run = app.run;
  if (!run) return;
  $('#coin-value').textContent = num(run.coins);
  const table = getTable(run.level);
  $('#chapter-label').textContent = `${table.subtitle}`;
  $('#level-label').textContent = `第 ${run.level} / ${LEVEL_COUNT} 关`;
  const track = $('#level-track');
  track.innerHTML = LEVELS.map((entry) => {
    const boss = Boolean(entry.boss);
    const className = [
      'level-pip', boss ? 'is-boss' : '',
      entry.level < run.level ? 'is-past' : '',
      entry.level === run.level ? 'is-current' : '',
    ].filter(Boolean).join(' ');
    return `<span class="${className}" title="第 ${entry.level} 关${boss ? ' · 庄家' : ''}"></span>`;
  }).join('');
}

function renderScorePanel() {
  const run = app.run;
  const round = Math.max(0, run.roundScore || 0);
  const secured = Math.max(0, run.score - round);
  // 悬秤人：整桌都是漂浮分，没有“已落袋”的一半可说。
  const floating = Engine.isFloatingScore(run);
  $('#score-value').textContent = num(floating ? run.score : secured);
  $('#secured-value').textContent = num(secured);
  $('#target-value').textContent = num(run.target);
  $('#target-value-2').textContent = num(run.target);
  $('#score-pending').hidden = floating || round <= 0;
  $('#round-value').textContent = num(round);
  $('#round-breakdown').hidden = floating || round <= 0;
  $('#round-value-2').textContent = num(round);
  $('#secured-note').hidden = floating;
  $('#float-note').hidden = !floating;
  const target = Math.max(1, run.target);
  const securedProgress = clamp((secured / target) * 100, 0, 100);
  const totalProgress = clamp((run.score / target) * 100, 0, 100);
  $('#score-progress').style.width = `${securedProgress}%`;
  $('#score-progress-pending').style.width = `${totalProgress}%`;
  $('#reroll-inline').textContent = `重投 ×${run.rerolls}`;
  $('#score-panel').classList.toggle('is-floating', floating);
  $('#score-panel').classList.toggle('is-danger', run.rerolls <= 0 && run.score < run.target);
  const canAdvance = run.score >= run.target && !['won', 'run-won', 'lost', 'shop'].includes(run.phase);
  const nextButton = $('#next-level');
  nextButton.hidden = !canAdvance || app.busy;
  $('#next-level-label').textContent = run.level >= LEVEL_COUNT ? '查看结局' : '下一关';
  $('#score-panel').classList.toggle('is-cleared', canAdvance);
  if (round > 0 || run.throwNumber === 0 || run.phase === 'selecting') {
    $('#score-bust').hidden = true;
    $('#score-panel').classList.remove('is-bust');
  }
}

function showBustNotice(lost) {
  const panel = $('#score-panel');
  const note = $('#score-bust');
  if (!panel || !note) return;
  const floating = Engine.isFloatingScore(app.run);
  note.hidden = false;
  note.textContent = floating ? `秤翻了 · 整桌 ${num(lost)} 分消散` : `本轮 ${num(lost)} 分作废`;
  panel.classList.remove('is-bust');
  void panel.offsetWidth;
  panel.classList.add('is-bust');
  showToast(floating
    ? `没有可计分的组合，秤翻了：整桌 ${num(lost)} 分漂浮分全部消散。`
    : `没有可计分的组合，本轮 ${num(lost)} 分作废。`, 'error');
  clearTimeout(app.bustTimer);
  app.bustTimer = setTimeout(() => {
    note.hidden = true;
    panel.classList.remove('is-bust');
  }, 2800);
}

function renderOpponentPlate() {
  const run = app.run;
  const opponent = getOpponent(run.level);
  const isBoss = Boolean(getLevelConfig(run.level).boss);
  $('#opponent-name').textContent = opponent.name;
  $('#opponent-kicker').textContent = isBoss ? `第 ${run.level} 关 · 庄家` : opponent.title;
  $('#boss-badge').hidden = !isBoss;
  $('#boss-effect-card').hidden = !isBoss;
  if (isBoss) {
    $('#boss-effect-name').textContent = opponent.effectName;
    $('#boss-effect-title').textContent = opponent.effectName;
    const status = Engine.bossStatusText(run);
    $('#boss-effect-desc').textContent = `${opponent.effectDesc}${status ? ` · ${status}` : ''}`;
  }
}

function renderRail() {
  const run = app.run;
  const opponent = getOpponent(run.level);
  const isBoss = Boolean(getLevelConfig(run.level).boss);
  $('#objective-level').textContent = `第 ${run.level} 关`;
  $('#objective-name').textContent = opponent.name;
  $('#objective-role').textContent = opponent.title;
  $('#objective-target').textContent = num(run.target);
  const rewardEl = $('#objective-reward');
  rewardEl.textContent = num(projectedReward());
  rewardEl.title = `现在收手可带走：\n${cashOutHint()}`;
  $('#objective-dice').textContent = run.bag.length;
  const taunt = $('#objective-taunt');
  if (isBoss) {
    taunt.innerHTML = `<b style="color:#d29b8c;font-weight:400">${h(opponent.effectName)}</b> · ${h(opponent.effectDesc)}`;
  } else {
    taunt.textContent = `“${opponent.taunts[0]}”`;
  }
  $('#reroll-note').textContent = run.bossBoons
    ? `剩余 ${run.rerolls} 次 · 徽记 +${run.bossBoons}`
    : `剩余 ${run.rerolls} 次`;
  const maxTokens = Math.max(run.maxRerolls, run.rerolls, 1);
  $('#reroll-row').innerHTML = Array.from({ length: Math.min(12, maxTokens) }, (_, index) => {
    const active = index < run.rerolls;
    const extra = index >= 5;
    return `<span class="reroll-token ${active ? '' : 'is-spent'} ${extra ? 'is-extra' : ''}" title="${active ? '可用重投' : '已消耗'}"></span>`;
  }).join('') + `<span class="reroll-count">${run.rerolls}<small style="color:#6f6352;font-size:8px"> / ${run.maxRerolls}</small></span>`;

  const barrel = Engine.getBarrel(run);
  $('#barrel-name').textContent = barrel.name;
  $('#barrel-short').textContent = barrel.short;
  $('#barrel-thumb').src = `assets/cups/${barrel.art}.svg`;
  const gestureButton = $('#gesture-button');
  if (barrel.gesture) {
    gestureButton.hidden = false;
    const used = run.flags.gestureUsedThisThrow
      || (barrel.gesture === 'circle' && run.flags.vortexUsed)
      || (barrel.gesture === 'pentagram' && run.flags.starUsed);
    gestureButton.disabled = used || ['won', 'run-won', 'lost', 'cleared'].includes(run.phase) || app.busy;
    gestureButton.innerHTML = `<svg><use href="#i-gesture"></use></svg>${used ? '已完成' : '画阵'}`;
  } else {
    gestureButton.hidden = true;
  }
  renderRollHint();
  renderItems();
  renderSets();
  renderLog();
}

function renderRollHint() {
  const run = app.run;
  const hint = $('#roll-hint');
  if (run.phase === 'ready') {
    hint.innerHTML = '<strong>首掷免费。</strong>按住左侧骰桶摇动，2 秒倒计时后落骰；仪式桶沿桌面轨迹描画。也可点击右侧自动摇骰。';
  } else if (run.phase === 'hot') {
    hint.innerHTML = '<strong>全骰！</strong>六颗骰子全部归位，可免费重投全部骰子。';
  } else if (run.phase === 'dead') {
    hint.innerHTML = run.rerolls > 0
      ? `本掷无分可计。<strong>重投会消耗 1 次</strong>，剩余 ${run.rerolls} 次。`
      : '本掷无分可计，重投已经耗尽。可以使用物品，或结束本关。';
  } else if (run.phase === 'selecting') {
    hint.innerHTML = run.rerolls > 0
      ? `重投剩余骰子，或重投全部六颗。二者各消耗 1 次，剩余 <strong>${run.rerolls}</strong> 次。`
      : '重投已耗尽。计分后本关将直接结算。';
  } else if (run.phase === 'reroll-pending') {
    hint.textContent = '骰子正在重新落桌……';
  } else if (run.phase === 'won' || run.phase === 'run-won') {
    hint.textContent = '赌局已结束。';
  } else if (run.phase === 'lost') {
    hint.textContent = '这一局已经结束。';
  }
}

function renderItems() {
  const run = app.run;
  const active = run.activeItems;
  const container = $('#active-items');
  const slots = [];
  for (let i = 0; i < Engine.ACTIVE_ITEM_SLOTS; i += 1) {
    const id = active[i];
    if (!id) {
      slots.push('<div class="item-slot is-empty" aria-hidden="true"></div>');
      continue;
    }
    const item = ITEM_BY_ID[id];
    const charges = run.itemCharges[id] || 0;
    const check = Engine.canUseItem(run, id);
    slots.push(`
      <button class="item-slot" data-action="use-item" data-item-id="${h(id)}" data-item-tip="${h(id)}"
        ${check.ok ? '' : 'disabled'} title="${h(item.name)}" aria-label="使用${h(item.name)}">
        <img src="assets/items/${item.icon}.svg" alt="">
        <span class="charge">${charges > 0 ? charges : '×'}</span>
        <span class="item-name">${h(item.name)}</span>
      </button>`);
  }
  container.innerHTML = slots.join('');
  $('#item-slot-note').textContent = `${active.length} / ${Engine.ACTIVE_ITEM_SLOTS}`;
  const passives = run.passiveItems;
  const passiveEl = $('#passive-items');
  if (!passives.length) {
    passiveEl.innerHTML = '<span class="passive-empty">还没有被动物品 · <button data-action="open-compendium" data-tab="items">查看物品</button></span>';
  } else {
    passiveEl.innerHTML = passives.map((id) => {
      const item = ITEM_BY_ID[id];
      return `<span class="passive-chip" data-item-tip="${h(id)}"><img src="assets/items/${item.icon}.svg" alt="">${h(item.name)}</span>`;
    }).join('');
  }
}

function renderSets() {
  const run = app.run;
  const counts = Engine.setCounts(run);
  $('#set-list').innerHTML = Object.values(DICE_SETS).map((set) => {
    const count = counts[set.id]?.count || 0;
    const tier = counts[set.id]?.tier || 0;
    const pips = Array.from({ length: 4 }, (_, i) => `<i class="${i < count ? 'on' : ''}"></i>`).join('');
    let text = count === 0 ? '还差 2 枚激活 2 件套' : '再集 1 枚激活 2 件套';
    if (tier >= 4) text = `4 件：${set.bonuses[1].text}`;
    else if (tier >= 2) text = `2 件已激活 · 再集 ${4 - count} 枚解锁 4 件`;

    return `
      <div class="set-row ${tier >= 2 ? 'is-active' : ''} ${count >= 4 ? 'has-four' : ''}"
           style="color:${set.color}" data-set-tip="${set.id}">
        <span class="set-icon">${h(set.name[0])}</span>
        <div class="set-copy"><b>${h(set.name)}</b><span>${h(text)}</span></div>
        <span class="set-pips" title="${count} / 4">${pips}</span>
      </div>`;
  }).join('');
}

function renderLog() {
  const log = app.run.log.slice(0, 5);
  $('#game-log').innerHTML = log.map((line) => `
    <div class="log-line type-${h(line.type)}"><i></i><span>${h(line.text)}</span></div>
  `).join('') || '<div class="log-line"><i></i><span>骰子已经摆好，等你落座。</span></div>';
}

function dieSpecFor(die) {
  return getDieSpec(die.dieId);
}

/* Weighted faces no longer wear a shared ornament: each die carries its own
   motif (see render/dice-skins.ts) as a watermark on every face, and the
   weighted faces light theirs up so the tilt is still readable at a glance.
   The face markup itself lives in render/dice-dom.ts. */

/* ═══════════════════════════════════════════════════════════════════
   Dice tray — WebGL path
   ═══════════════════════════════════════════════════════════════════ */
let diceTable = null;

function dieStateOf(run, die) {
  const spec = dieSpecFor(die);
  const hidden = die.value == null;
  const blank = Boolean(die.blank);
  const blocked = !hidden && !blank && Engine.isBossDieBlocked(run, die);
  const selected = run.selected.includes(die.uid);
  return { spec, hidden, blank, blocked, selected, scored: Boolean(die.scored) };
}

async function ensureDiceTable() {
  if (diceTable) return diceTable;
  const canvas = $('#dice-canvas');
  if (!canvas) return null;
  const Table = await loadDiceTable();
  if (!Table) return null;
  diceTable = new Table(canvas, { onPick: (uid) => handleDiePick(uid) });
  motion.attach(diceTable);
  motion.startClock();
  bindDiceCanvas(canvas);
  const ro = new ResizeObserver(() => { diceTable?.resize(); motion.markDirty(); });
  ro.observe(canvas);
  diceTable.resize();
  return diceTable;
}

function handleDiePick(uid) {
  if (!app.run || app.busy || app.introOpen) return;
  if (Engine.toggleDie(app.run, uid)) {
    motion.tapDie(diceTable, uid);
    renderGame();
  }
  hideTooltip();
}

function bindDiceCanvas(canvas) {
  let downAt = 0;
  let downX = 0;
  let downY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    downAt = performance.now();
    downX = event.clientX;
    downY = event.clientY;
  });
  canvas.addEventListener('pointerup', (event) => {
    // Treat a small, quick press as a tap so the cup drag never picks dice.
    const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
    if (performance.now() - downAt > 900 || moved > 14) return;
    const uid = diceTable?.pickAt(event.clientX, event.clientY);
    if (uid) handleDiePick(uid);
  });
  canvas.addEventListener('pointermove', (event) => {
    const uid = diceTable?.pickAt(event.clientX, event.clientY) || null;
    if (diceTable) motion.hoverDie(diceTable, uid);
    canvas.style.cursor = uid ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerleave', () => {
    if (diceTable) motion.hoverDie(diceTable, null);
  });
}

/* Screen-reader + keyboard row. Invisible on purpose: it carries the labels
   and focus order, while the pointer path goes through the raycast. */
function renderDiceA11y(run) {
  const layer = $('#dice-a11y');
  if (!layer) return;
  const signature = run.dice.map((die) => {
    const state = dieStateOf(run, die);
    const disabled = state.scored || state.blank || state.blocked || app.busy || run.phase !== 'selecting';
    return `${die.uid}:${die.value ?? 'x'}:${state.selected ? 1 : 0}:${disabled ? 1 : 0}`;
  }).join('|');
  if (layer.dataset.signature !== signature) {
    layer.dataset.signature = signature;
    layer.innerHTML = run.dice.map((die) => {
      const state = dieStateOf(run, die);
      const disabled = state.scored || state.blank || state.blocked || app.busy || run.phase !== 'selecting';
      const label = state.hidden ? '未掷出的骰子'
        : state.blank ? '白骰，无法计分'
          : state.blocked ? '六点被庄家禁用'
            : `${state.spec.name}，${die.value} 点`;
      return `<button type="button" class="die-a11y-button" data-die-uid="${h(die.uid)}" data-die-tip="${h(state.spec.id)}"
        ${disabled ? 'disabled' : ''} aria-pressed="${state.selected}" aria-label="${h(label)}"></button>`;
    }).join('');
  }
}

function renderDiceTrayGL(run, tray) {
  // The DOM fallback may have painted before WebGL came up — clear it once
  // so the two renderers never stack.
  if (tray.querySelector('#dice-dom-fallback')) {
    tray.querySelector('#dice-dom-fallback').remove();
    delete tray.dataset.dieSignature;
  }
  const dice = run.dice.map((die) => {
    const state = dieStateOf(run, die);
    return { uid: die.uid, value: die.value, hidden: state.hidden, blank: state.blank, spec: state.spec };
  });
  const signature = dice.map((die) => `${die.uid}:${die.value ?? 'x'}:${die.spec.id}`).join('|');
  if (tray.dataset.dieSignature !== signature) {
    tray.dataset.dieSignature = signature;
    diceTable.setDice(dice);
  }
  const states = new Map();
  run.dice.forEach((die) => {
    const state = dieStateOf(run, die);
    states.set(die.uid, {
      selected: state.selected, scored: state.scored, blank: state.blank, blocked: state.blocked,
    });
  });
  diceTable.applyStates(states);
  motion.settle(diceTable, run.dice.map((die) => die.uid));
  renderDiceA11y(run);
  motion.markDirty();
}

function renderDiceTray() {
  const run = app.run;
  const tray = $('#dice-tray');
  if (!tray) return;
  if (!run) return;
  if (diceTable) {
    renderDiceTrayGL(run, tray);
    syncDiceTrayLabels(run);
    return;
  }
  // First frame before WebGL comes up (or a browser without it): keep the
  // DOM renderer so the table is never empty.
  renderDiceTrayDom(run, tray, { rolling: app.rolling, busy: app.busy });
  syncDiceTrayLabels(run);
}

function syncDiceTrayLabels(run) {
  const selectedCount = run.selected.length;
  const available = Engine.availableDice(run);
  const tray = $('#dice-tray');
  tray?.classList.toggle('has-selection', selectedCount > 0);
  const stateLabel = run.phase === 'ready'
    ? '等待落骰'
    : run.phase === 'hot'
      ? '全骰归位'
      : run.phase === 'dead'
        ? '无分可计'
        : run.phase === 'selecting'
          ? '选择骰子'
          : run.phase === 'reroll-pending'
            ? '选择重投方式'
            : run.phase === 'cleared'
              ? '目标达成'
              : '本关结束';
  const throwLabel = run.throwNumber ? `第 ${run.throwNumber} 掷 · ${stateLabel}` : stateLabel;
  const throwNode = $('#throw-label');
  if (throwNode) {
    throwNode.textContent = selectedCount && run.phase === 'selecting'
      ? `${throwLabel} · 已选 ${selectedCount} 颗`
      : throwLabel;
    throwNode.classList.toggle('is-active', selectedCount > 0);
  }
  const availableCount = available.filter((die) => !die.scored).length;
  const countNode = $('#dice-count');
  if (countNode) {
    countNode.textContent = run.phase === 'hot'
      ? `${run.dice.length} 颗骰子 · 全骰`
      : selectedCount && run.phase === 'selecting'
        ? `${run.dice.length} 颗骰子 · 已选 ${selectedCount} 颗`
        : `${run.dice.length} 颗骰子 · 剩余 ${availableCount} 可掷`;
    countNode.classList.toggle('is-active', selectedCount > 0);
  }
}

function renderComboPreview() {
  const run = app.run;
  const preview = $('#combo-preview');
  if (!preview) return;
  if (run.phase === 'ready') {
    preview.innerHTML = '<span class="combo-placeholder">1 与 5 总能计分 · 三连、四连与顺子会带来大分</span>';
    return;
  }
  if (run.phase === 'hot') {
    preview.innerHTML = '<span class="combo-label">全骰归位</span><span class="combo-total">六颗骰子免费重投 <em>HOT DICE</em></span>';
    return;
  }
  if (run.phase === 'reroll-pending') {
    preview.innerHTML = '<span class="combo-label">准备重投</span><span class="combo-total">选择自己摇桶，或让系统重投 <em>等待操作</em></span>';
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
  const selected = Engine.selectedDice(run);
  if (!selected.length) {
    preview.innerHTML = '<span class="combo-placeholder">选择要计分的骰子 · 1 和 5 总能计分</span>';
    return;
  }
  const result = Engine.buildScore(run, 'reroll');
  if (!result.valid) {
    preview.innerHTML = `<span class="combo-warning">${h(result.error)}</span>`;
    return;
  }
  const boss = Engine.activeBoss(run);
  const shownCombos = boss?.effectKey === 'minTripleScore'
    ? result.analysis.combos.filter((combo) => combo.type === 'straight' || (combo.type === 'nkind' && combo.count >= 3))
    : result.analysis.combos;
  if (!result.total) {
    preview.innerHTML = `<span class="combo-warning">${h(result.bossNote || '本手不计分')}</span><span class="combo-total">+0<em>不计分</em></span>`;
    return;
  }
  const combos = shownCombos.map((combo) => `<span class="combo-pill">${h(combo.label)}<b>+${num(combo.points)}</b></span>`).join('');
  const breakdown = result.breakdown;
  const extras = [];
  if (breakdown.flatAdd) extras.push(`加算 +${num(breakdown.flatAdd)}`);
  if (breakdown.multipliers.length) extras.push(breakdown.multipliers.map((m) => `${h(m.label)}`).join(' · '));
  preview.innerHTML = `${combos}<span class="combo-total">+${num(result.total)}<em>预计 · 计分</em></span>${extras.length ? `<span class="combo-placeholder" style="font-size:8px">${h(extras.join(' · '))}</span>` : ''}`;
}

function renderActionDock() {
  const dock = $('#action-dock');
  if (!dock) return;
  const run = app.run;
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
        <div class="action-hint">已计分 · ${all ? '全部骰子已归位' : `剩余 ${remaining} 颗骰子待重投`} · 自己摇桶或系统重投</div>
        <div class="action-buttons">
          <button class="score-action primary" data-action="cue-cup">
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>自己摇骰桶</b><em>按住拖动 · 2 秒倒计时 · 仪式桶沿轨迹画</em></span>
          </button>
          <button class="score-action" data-action="auto-roll">
            <span class="action-icon"><svg><use href="#i-die"></use></svg></span>
            <span class="action-copy"><b>${all ? '系统全骰重投' : '系统重投'}</b><em>命令骰桶自己摇 · 消耗 1 次（剩 ${run.rerolls}）</em></span>
            <span class="action-points">−1<small>重投</small></span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'ready') {
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">首掷免费 · 按住骰桶摇动，2 秒后落骰</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="manual-roll">
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>摇动骰桶</b><em>六颗骰子已经就位</em></span>
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
    const canReroll = run.rerolls > 0;
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">${canReroll ? `没有可计分的组合 · 重投消耗 1 次（剩余 ${run.rerolls}）` : '没有可计分的组合，重投已经耗尽'}</div>
        <div class="action-buttons">
          <button class="score-action primary single-action" data-action="manual-roll" ${canReroll ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>${canReroll ? '重投剩余骰子' : '重投已耗尽'}</b><em>${canReroll ? '消耗 1 次重投' : '使用物品或结束本关'}</em></span>
            <span class="action-points">${canReroll ? `−1<small>重投</small>` : '—'}</span>
          </button>
        </div>
      </div>`;
    return;
  }
  if (phase === 'selecting') {
    const selected = Engine.selectedDice(run);
    const preview = Engine.getScorePreview(run);
    const valid = preview.valid && selected.length > 0;
    const noTokens = run.rerolls <= 0;
    const invalidHint = selected.length ? '所选骰子无法计分' : '先选择要计分的骰子';
    const cont = valid ? num(preview.totalContinue) : '—';
    const rer = valid ? num(preview.totalReroll) : '—';
    const bank = valid ? num(preview.totalBank) : '—';
    if (noTokens) {
      dock.innerHTML = `
        <div class="action-dock-inner">
          <div class="action-hint">${valid ? '重投已耗尽 · 计分后本关结算' : h(invalidHint)}</div>
          <div class="action-buttons">
            <button class="score-action primary single-action" data-action="score-bank" ${valid ? '' : 'disabled'}>
              <span class="action-icon"><svg><use href="#i-spark"></use></svg></span>
              <span class="action-copy"><b>计分并结算</b><em>重投耗尽 · 不再重投，直接结算本关</em></span>
              <span class="action-points">+${bank}<small>计分</small></span>
            </button>
          </div>
        </div>`;
      return;
    }
    dock.innerHTML = `
      <div class="action-dock-inner">
        <div class="action-hint">${valid ? '选择重投范围 · 二者各消耗 1 次' : h(invalidHint)}</div>
        <div class="action-buttons">
          <button class="score-action" data-action="score-continue" ${valid ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-die"></use></svg></span>
            <span class="action-copy"><b>计分并继续</b><em>计分后重投剩余骰子 · 消耗 1 次（剩 ${run.rerolls}）</em></span>
            <span class="action-points">+${cont}<small>计分</small></span>
          </button>
          <button class="score-action primary" data-action="score-reroll" ${valid ? '' : 'disabled'}>
            <span class="action-icon"><svg><use href="#i-cup"></use></svg></span>
            <span class="action-copy"><b>计分并重投</b><em>计分后全部六颗骰子重新投 · 消耗 1 次</em></span>
            <span class="action-points">+${rer}<small>计分</small></span>
          </button>
        </div>
      </div>`;
  }
}

function renderAutoButton() {
  const run = app.run;
  const button = $('#auto-roll');
  if (!run || !button) return;
  const can = !app.busy && (run.phase === 'ready' || run.phase === 'hot' || run.phase === 'reroll-pending'
    || (run.phase === 'dead' && run.rerolls > 0));
  button.disabled = !can;
  let label = '自动摇骰';
  let sub = '点击或按空格';
  if (run.phase === 'hot') { label = '全骰重投'; sub = '本次免费'; }
  else if (run.phase === 'cleared') { label = '目标达成'; sub = '点击下一关'; }
  else if (run.phase === 'reroll-pending') {
    label = run.flags.rerollAll ? '系统全骰重投' : '系统重投';
    sub = `消耗 1 次 · 剩 ${run.rerolls}`;
  } else if (run.phase === 'dead') { label = '自动重投'; sub = `消耗 1 次 · 剩 ${run.rerolls}`; }
  else if (run.phase === 'ready') { sub = '首掷免费 · 空格'; }
  else if (run.phase === 'selecting') { sub = '先选择骰子'; }
  $('b', button).textContent = label;
  $('em', button).textContent = sub;
  button.classList.toggle('is-pulsing', run.phase === 'ready' && !app.busy);
}

function renderDangerStrip() {
  const run = app.run;
  const strip = $('#danger-strip');
  if (!run) return;
  const show = run.rerolls <= 0 && run.score < run.target
    && !['won', 'run-won', 'lost', 'shop', 'hot', 'cleared'].includes(run.phase);
  strip.hidden = !show;
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
   Tooltips
   ═══════════════════════════════════════════════════════════════════ */
let tooltipCurrent = null;

function bindTooltip() {
  const tip = $('#tooltip');
  if (!tip) return;
  document.addEventListener('pointerover', (event) => {
    const el = event.target.closest('[data-die-tip],[data-item-tip],[data-set-tip],[data-barrel-tip]');
    if (!el) return;
    if (tooltipCurrent === el) return;
    tooltipCurrent = el;
    const html = tooltipFor(el);
    if (!html) return;
    tip.innerHTML = html;
    tip.hidden = false;
    positionTooltip(event);
  });
  document.addEventListener('pointerout', (event) => {
    if (!tooltipCurrent) return;
    if (event.relatedTarget && tooltipCurrent.contains(event.relatedTarget)) return;
    const next = event.relatedTarget?.closest?.('[data-die-tip],[data-item-tip],[data-set-tip],[data-barrel-tip]');
    if (next === tooltipCurrent) return;
    tooltipCurrent = null;
    tip.hidden = true;
  });
  document.addEventListener('pointermove', (event) => {
    if (!tooltipCurrent || tip.hidden) return;
    positionTooltip(event);
  });
  document.addEventListener('scroll', () => { tooltipCurrent = null; tip.hidden = true; }, true);

  function positionTooltip(event) {
    const pad = 16;
    const rect = tip.getBoundingClientRect();
    let left = event.clientX + 18;
    let top = event.clientY + 18;
    if (left + rect.width + pad > window.innerWidth) left = event.clientX - rect.width - 18;
    if (top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
    tip.style.left = `${Math.max(pad, left)}px`;
    tip.style.top = `${Math.max(pad, top)}px`;
  }
}

function hideTooltip() {
  tooltipCurrent = null;
  const tip = $('#tooltip');
  if (tip) tip.hidden = true;
}

function tooltipFor(el) {
  if (el.dataset.dieTip) return dieTooltip(el.dataset.dieTip);
  if (el.dataset.itemTip) return itemTooltip(el.dataset.itemTip);
  if (el.dataset.setTip) return setTooltip(el.dataset.setTip);
  if (el.dataset.barrelTip) return barrelTooltip(el.dataset.barrelTip);
  return '';
}

function dieTooltip(dieId) {
  const spec = DICE_BY_ID[dieId] || STANDARD_DIE;
  const rarity = rarityOf(spec);
  const set = spec.setId ? DICE_SETS[spec.setId] : null;
  const barrel = app.run ? Engine.getBarrel(app.run) : BARRELS[0];
  const probs = Engine.effectiveProbs(spec.id, barrel.id);
  const bars = probs.map((p, i) => {
    const height = Math.max(3, Math.round(p * 30));
    return `<div class="tip-prob"><i style="height:${height}px"></i><span>${i + 1}</span><em>${Math.round(p * 100)}%</em></div>`;
  }).join('');
  return `
    <h5>${h(spec.name)}</h5>
    <div class="tip-sub">${h(rarity.name)}${set ? ` · ${h(set.name)}套组` : ' · 标准骰'}</div>
    <p>${h(spec.desc)}</p>
    <div class="tip-probs">${bars}</div>
    <p style="color:#756755;font-size:8px">当前骰桶「${h(barrel.name)}」修正后的点数概率</p>
    ${spec.bonus ? `<p class="tip-bonus">${h(spec.bonus.label)}</p>` : ''}
    ${set ? `<p style="color:#8d7c64;font-size:8px">${h(set.motto)}</p>` : ''}
  `;
}

function itemTooltip(itemId) {
  const item = ITEM_BY_ID[itemId];
  if (!item) return '';
  const rarity = rarityOf(item);
  return `
    <h5>${h(item.name)}</h5>
    <div class="tip-sub">${h(rarity.name)} · ${item.consumable ? '一次性物品' : item.type === 'active' ? '主动物品' : '被动物品'}</div>
    <p>${h(item.desc)}</p>
    <p class="tip-bonus">${h(item.flavor)}</p>
  `;
}

function setTooltip(setId) {
  const set = DICE_SETS[setId];
  if (!set) return '';
  const counts = app.run ? Engine.setCounts(app.run) : { [setId]: { count: 0 } };
  const count = counts[setId]?.count || 0;
  return `
    <h5>${h(set.name)}套组</h5>
    <div class="tip-sub">${count} / 4 枚 · ${h(set.motto)}</div>
    ${set.bonuses.map((bonus) => `<p class="${count >= bonus.pieces ? 'tip-bonus' : ''}">${count >= bonus.pieces ? '✦' : '◇'} ${bonus.pieces} 件：${h(bonus.text)}</p>`).join('')}
  `;
}

function barrelTypeLabel(barrel) {
  if (barrel.type === 'gesture') return '仪式';
  if (barrel.type === 'probability') return '概率';
  if (barrel.type === 'faceScore') return '点数加成';
  if (barrel.type === 'wildScore') return '赖子加成';
  return '普通';
}

function barrelTooltip(barrelId) {
  const barrel = BARREL_BY_ID[barrelId];
  if (!barrel) return '';
  return `
    <h5>${h(barrel.name)}</h5>
    <div class="tip-sub">${h(rarityOf(barrel).name)} · ${barrelTypeLabel(barrel)}骰桶</div>
    <p>${h(barrel.desc)}</p>
    ${barrel.type === 'probability' ? `<p class="tip-bonus">偏向：${h(barrel.short)}</p>` : ''}
    ${barrel.type === 'faceScore' ? `<p class="tip-bonus">指定点数：${h(barrel.short)}</p>` : ''}
    ${barrel.type === 'wildScore' ? `<p class="tip-bonus">赖子加成：${h(barrel.short)}</p>` : ''}
    ${barrel.gesture ? '<p class="tip-bonus">完成仪式后，本次投掷获得加成。</p>' : ''}
  `;
}

/* ═══════════════════════════════════════════════════════════════════
   Overlay plumbing
   ═══════════════════════════════════════════════════════════════════ */
function openOverlay(html, { dismissible = true } = {}) {
  hideTooltip();
  clearTimeout(app.overlayTimer);
  if (app.gestureCleanup) { app.gestureCleanup(); app.gestureCleanup = null; }
  app.gestureReset = null;
  const root = $('#overlay-root');
  root.innerHTML = `<div class="overlay" data-overlay>${html}</div>`;
  app.overlayDismissible = dismissible;
  const overlay = $('[data-overlay]', root);
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay && app.overlayDismissible) closeOverlay();
  });
  const close = $('[data-action="close-overlay"]', root);
  if (close) close.hidden = !dismissible;
  requestAnimationFrame(() => {
    const focusable = $('button.primary-button, [data-action="close-overlay"]', root);
    focusable?.focus?.({ preventScroll: true });
  });
}

function closeOverlay() {
  const root = $('#overlay-root');
  if (!root) return;
  const overlay = $('.overlay', root);
  if (!overlay) return;
  app.overlayDismissible = false;
  if (app.gestureCleanup) { app.gestureCleanup(); app.gestureCleanup = null; }
  app.gestureReset = null;
  overlay.classList.add('is-closing');
  const shop = $('.shop-screen');
  if (shop) shop.style.pointerEvents = 'none';
  clearTimeout(app.overlayTimer);
  app.overlayTimer = setTimeout(() => {
    root.innerHTML = '';
    if (shop) shop.style.pointerEvents = '';
    app.pendingReplace = null;
  }, 220);
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
   Shop
   ═══════════════════════════════════════════════════════════════════ */
function openShopScreen() {
  closeOverlay();
  app.shopOpen = true;
  let screen = $('.shop-screen');
  if (screen) screen.remove();
  screen = document.createElement('section');
  screen.className = 'shop-screen';
  document.body.append(screen);
  renderShopScreen();
}

function closeShopScreen() {
  $('.shop-screen')?.remove();
  app.shopOpen = false;
}

function renderShopScreen() {
  if (!app.run || !app.run.shop) return;
  const screen = $('.shop-screen');
  if (!screen) return;
  const bodyScroll = $('.shop-body', screen)?.scrollTop || 0;
  const run = app.run;
  discoverLoadout(run);
  discoverShop(run);
  const shop = run.shop;
  const nextLevel = run.level + 1;
  const nextTable = getTable(nextLevel);
  const reward = run.levelReward?.total ?? projectedReward();
  const band = SHOP_RARITY_WEIGHTS.find((entry) => nextLevel <= entry.untilLevel)
    || SHOP_RARITY_WEIGHTS[SHOP_RARITY_WEIGHTS.length - 1];
  const stockNote = Object.entries(band.weights)
    .filter(([, weight]) => weight > 0)
    .map(([rarity, weight]) => `${RARITIES[rarity].short} ${Math.round(weight / Object.values(band.weights).reduce((a, b) => a + b, 0) * 100)}%`)
    .join(' · ');
  const slots = Engine.shopSlots(run);
  const slotNote = (count, unit, defaultCount, tail) => (count > defaultCount
    ? `货架 ${count} ${unit}（含 +1）· ${tail}`
    : `货架 ${defaultCount} ${unit} · ${tail}`);

  screen.innerHTML = `
    <header class="shop-head">
      <div class="shop-title">
        <div class="shop-title-icon"><svg><use href="#i-shop"></use></svg></div>
        <div><h2>行商帐篷</h2><p>第 ${run.level} 关之后 · 下一站 ${h(nextTable.name)}</p></div>
      </div>
      <div class="shop-head-right">
        <div class="shop-coin"><svg><use href="#i-coin"></use></svg>${num(run.coins)}<span>银币</span></div>
        <button class="ghost-button" data-action="open-rules"><svg><use href="#i-help"></use></svg><span>规则</span></button>
      </div>
    </header>
    <div class="shop-body">
      <div class="shop-intro">
        <p><b>“看一看，摸一摸，别问来路。”</b> 每关之间只有一次市集。骰子、骰桶和物品会改变你下一关能走多远；随身物品也可以半价卖回。<span style="color:#d9b46a"> 本关骰子货架权重：${stockNote}。</span></p>
        <span class="rail-note">本关奖励已入袋：<b style="color:#e5c278">${num(reward)}</b> 银币</span>
      </div>
      <div class="shop-zones">
        ${shopZone('dice', '骰子', slotNote(slots.dice, '枚', 2, '购入后替换骰袋中的骰子'), shop.dice, renderDiceShopCard)}
        ${shopZone('barrel', '骰桶', slotNote(slots.barrel, '只', 1, '立即替换当前骰桶'), shop.barrel, renderBarrelShopCard)}
        ${shopZone('item', '物品', slotNote(slots.item, '件', 3, '主动物品栏上限 4'), shop.item, renderItemShopCard)}
      </div>
      ${renderSellShelf(run)}
    </div>
    <footer class="shop-footer">
      <div class="loadout-strip">
        <span class="loadout-label">当前骰袋</span>
        <div class="loadout-dice">${run.bag.map((entry) => {
          const spec = Engine.getDieSpec(entry.dieId);
          const weighted = favoredFaces(spec).length > 0;
          return `<span class="mini-die rarity-${spec.rarity} ${spec.setId === 'demon' ? 'is-demon' : ''} ${weighted ? 'is-weighted' : ''}" style="${dieSkinStyle(spec)}" data-pips="${spec.setId === 'demon' ? '魔' : (spec.setId ? spec.name[0] : '骰')}" title="${h(spec.name)}"></span>`;
        }).join('')}</div>
        <span class="loadout-label" style="margin-left:8px">骰桶</span>
        <div class="barrel-thumb" style="width:25px;height:32px"><img src="assets/cups/${Engine.getBarrel(run).art}.svg" alt=""></div>
        <div class="loadout-items">${run.activeItems.concat(run.passiveItems).map((id) => `<img src="assets/items/${ITEM_BY_ID[id].icon}.svg" alt="${h(ITEM_BY_ID[id].name)}" title="${h(ITEM_BY_ID[id].name)}">`).join('')}</div>
      </div>
      <div class="shop-continue">
        <button class="primary-button" data-action="leave-shop">前往第 ${nextLevel} 关 · ${h(nextTable.name)} <svg><use href="#i-arrow"></use></svg></button>
      </div>
    </footer>
  `;
  const body = $('.shop-body', screen);
  if (body) body.scrollTop = bodyScroll;
}

function renderSellShelf(run) {
  const owned = Engine.getOwnedItemIds(run);
  const cards = owned.map((id) => {
    const item = ITEM_BY_ID[id];
    if (!item) return '';
    const check = Engine.canSellItem(run, id);
    const rarity = rarityOf(item);
    const price = Engine.itemSellPrice(item);
    return `<article class="sell-card" style="--rarity:${rarity.color}">
      <img src="assets/items/${item.icon}.svg" alt="${h(item.name)}">
      <div class="sell-copy">
        <div class="sell-tags"><span>${item.consumable ? '一次性' : item.type === 'active' ? '主动' : '被动'}</span><b>${rarity.name}</b></div>
        <strong>${h(item.name)}</strong>
        <em>${check.ok ? `半价回收 +${price}` : h(check.error)}</em>
      </div>
      <button class="sell-button" data-action="sell-item" data-item-id="${h(id)}" ${check.ok ? '' : 'disabled'} title="${h(check.ok ? `以 ${price} 银币出售` : check.error)}">
        <svg><use href="#i-coin"></use></svg>+${price}
      </button>
    </article>`;
  }).join('');
  return `<section class="shop-sell">
    <header class="shop-sell-head">
      <div><h3>随身物品 · 半价回收</h3><p>出售自己拥有的主动或被动物品，立即换取一半价格。</p></div>
      <span class="rail-note">可出售 ${owned.length} 件</span>
    </header>
    ${owned.length ? `<div class="sell-grid">${cards}</div>` : '<div class="sell-empty">行囊里还没有可出售的物品。</div>'}
  </section>`;
}

function shopZone(section, title, subtitle, entries, cardRenderer) {
  const cost = Engine.refreshCost(app.run, section);
  const cards = entries.length
    ? entries.map((entry, index) => cardRenderer(entry, index)).join('')
    : `<div class="empty-stock"><svg><use href="#i-lock"></use></svg><span>这一栏已经空了。<br>${section === 'barrel' ? '你已收集所有骰桶。' : '没有更多货品。'}</span></div>`;
  return `
    <section class="shop-zone">
      <header class="shop-zone-head">
        <div><h3>${h(title)}</h3><p>${h(subtitle)}</p></div>
        <button class="refresh-button" data-action="refresh-shop" data-section="${section}" ${app.run.coins < cost ? 'disabled' : ''}>
          <svg><use href="#i-restart"></use></svg>刷新 <b>${cost}</b>
        </button>
      </header>
      <div class="shop-grid ${section}">${cards}</div>
    </section>`;
}

function renderDiceShopCard(entry, index) {
  if (!entry || !entry.id) return emptyShopCard();
  const spec = DICE_BY_ID[entry.id];
  if (!spec) return emptyShopCard();
  const rarity = rarityOf(spec);
  const set = spec.setId ? DICE_SETS[spec.setId] : null;
  const price = Engine.shopPrice(app.run, spec.price);
  const affordable = app.run.coins >= price;
  const full = app.run.bag.length >= Engine.getDiceCapacity(app.run);
  const probs = Engine.effectiveProbs(spec.id, Engine.getBarrel(app.run).id);
  const bars = probabilityBars(probs, spec.rarity);
  return `
    <article class="shop-card ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow}">
      <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${set ? h(set.name) + '套组' : '无套组'}</span></div>
      <div class="card-art" data-die-tip="${h(spec.id)}">${artDieHtml(spec)}</div>
      <h4>${h(spec.name)}</h4>
      <div class="card-sub">${h(spec.desc)}</div>
      ${bars}
      ${spec.bonus ? `<div class="card-bonus">${h(spec.bonus.label)}</div>` : '<div class="card-bonus" style="opacity:.4">没有额外骰面特性</div>'}
      <div class="card-foot">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}<small>${full ? '需替换' : '购入'}</small></span>
        <button class="buy-button" data-action="buy-die" data-index="${index}" ${entry.sold || !affordable ? 'disabled' : ''}>${affordable ? '购入' : '银币不足'}</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function renderBarrelShopCard(entry, index) {
  if (!entry || !entry.id) return emptyShopCard();
  const barrel = BARREL_BY_ID[entry.id];
  if (!barrel) return emptyShopCard();
  const rarity = rarityOf(barrel);
  const price = Engine.shopPrice(app.run, barrel.price);
  const affordable = app.run.coins >= price;
  return `
    <article class="shop-card ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow};min-height:306px" data-barrel-tip="${h(barrel.id)}">
      <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${barrelTypeLabel(barrel)}</span></div>
      <div class="card-art"><img class="art-cup" src="assets/cups/${barrel.art}.svg" alt="${h(barrel.name)}"></div>
      <h4>${h(barrel.name)}</h4>
      <div class="card-sub">${h(barrel.short)}</div>
      <div class="card-desc">${h(barrel.desc)}</div>
      <div class="card-foot">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}<small>换上</small></span>
        <button class="buy-button" data-action="buy-barrel" data-index="${index}" ${entry.sold || !affordable ? 'disabled' : ''}>${affordable ? '换上' : '银币不足'}</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function renderItemShopCard(entry, index) {
  if (!entry || !entry.id) return emptyShopCard();
  const item = ITEM_BY_ID[entry.id];
  if (!item) return emptyShopCard();
  const rarity = rarityOf(item);
  const price = Engine.shopPrice(app.run, item.price);
  const affordable = app.run.coins >= price;
  const full = item.type === 'active' && app.run.activeItems.length >= Engine.ACTIVE_ITEM_SLOTS;
  return `
    <article class="shop-card ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow};min-height:306px" data-item-tip="${h(item.id)}">
      <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${item.type === 'active' ? '主动' : '被动'}</span></div>
      <div class="card-art"><img src="assets/items/${item.icon}.svg" alt="${h(item.name)}" style="width:64px;height:64px"></div>
      <h4>${h(item.name)}</h4>
      <div class="card-sub">${item.consumable ? '一次性物品 · 使用后消失' : item.type === 'active' ? '主动物品 · 每关一次' : '被动物品 · 永久生效'}</div>
      <div class="card-desc">${h(item.desc)}</div>
      <div class="card-foot">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}<small>购入</small></span>
        <button class="buy-button" data-action="buy-item" data-index="${index}" ${entry.sold || !affordable || full ? 'disabled' : ''}>${full ? '栏位已满' : affordable ? '购入' : '银币不足'}</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function emptyShopCard() {
  return '<div class="empty-stock"><svg><use href="#i-lock"></use></svg><span>空货位</span></div>';
}

function probabilityBars(probs, rarity) {
  return `<div class="prob-bars">${probs.map((p, i) => {
    const height = Math.max(3, Math.round(p * 34));
    return `<div class="prob-bar" style="--rarity:${rarityOf({ rarity }).color}"><i style="height:${height}px"></i><span>${i + 1}</span><em>${Math.round(p * 100)}%</em></div>`;
  }).join('')}</div>`;
}

function refreshShop(section) {
  if (!app.run) return;
  const result = Engine.refreshSection(app.run, section);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  sound.click();
  renderShopScreen();
  showToast(`刷新${Engine.sectionLabel(section)}，花费 ${result.cost} 银币。`);
}

function buyDie(index) {
  if (!app.run) return;
  const result = Engine.buyDie(app.run, index);
  if (!result.ok) {
    if (result.needReplace) {
      app.pendingReplace = { index, die: result.die, price: result.price };
      showReplaceModal();
    } else {
      showToast(result.error, 'error');
    }
    return;
  }
  sound.item();
  renderShopScreen();
  showToast(`购入「${result.die.name}」，花费 ${result.price} 银币。`, 'good');
}

function buyBarrel(index) {
  if (!app.run) return;
  const result = Engine.buyBarrel(app.run, index);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  sound.item();
  renderShopScreen();
  showToast(`换上「${result.barrel.name}」。`, 'good');
}

function buyItem(index) {
  if (!app.run) return;
  const result = Engine.buyItem(app.run, index);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  sound.item();
  renderShopScreen();
  showToast(`购入「${result.item.name}」，花费 ${result.price} 银币。`, 'good');
}

function sellShopItem(itemId) {
  if (!app.run) return;
  const result = Engine.sellItem(app.run, itemId);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  sound.item();
  renderShopScreen();
  showToast(`出售「${result.item.name}」，获得 ${result.price} 银币（半价）。`, 'good');
}

function showReplaceModal() {
  if (!app.run || !app.pendingReplace) return;
  const { die, price } = app.pendingReplace;
  const options = app.run.bag.map((entry) => {
    const spec = Engine.getDieSpec(entry.dieId);
    const rarity = rarityOf(spec);
    return `
      <button class="replace-option" data-action="confirm-replace" data-bag-uid="${h(entry.uid)}">
        ${artDieHtml(spec)}
        <b>${h(spec.name)}</b><span>${rarity.name}${spec.setId ? ` · ${DICE_SETS[spec.setId].name}` : ''}</span>
      </button>`;
  }).join('');
  openOverlay(`
    <div class="modal" style="width:min(620px,100%);padding:36px 38px">
      <p class="modal-kicker">DICE BAG FULL</p>
      <h2 class="modal-title" style="font-size:28px;margin-top:5px">骰袋已满</h2>
      <p class="modal-text" style="margin-top:8px">要购入「${h(die.name)}」（${num(price)} 银币），请选择一枚被替换的骰子。被替换的骰子将离开本局。</p>
      <div class="replace-grid">${options}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="cancel-replace">取消</button></div>
    </div>
  `, { dismissible: true });
}

function confirmReplace(bagUid) {
  if (!app.run || !app.pendingReplace) return;
  const { index } = app.pendingReplace;
  const result = Engine.buyDie(app.run, index, bagUid);
  if (!result.ok) { showToast(result.error, 'error'); return; }
  app.pendingReplace = null;
  closeOverlay();
  sound.item();
  renderShopScreen();
  showToast(`购入「${result.die.name}」并替换了旧骰。`, 'good');
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
   Rules
   ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   Tutorial / first-run briefing
   ═══════════════════════════════════════════════════════════════════ */
function tutorialDieHtml(value) {
  const positions = pipIndexes(value);
  return `<span class="tut-die" role="img" aria-label="${value} 点">${Array.from({ length: 9 }, (_, i) => positions.includes(i)
    ? `<i class="tut-pip" style="grid-row:${Math.floor(i / 3) + 1};grid-column:${(i % 3) + 1}"></i>` : '').join('')}</span>`;
}

function tutorialDice(values) {
  return `<div class="tut-dice">${values.map((value) => tutorialDieHtml(value)).join('')}</div>`;
}

function tutorialCombo({ title, values, points, note, formula = '', highlight = false }) {
  return `<article class="tut-combo ${highlight ? 'is-highlight' : ''}">
    <div class="tut-combo-head"><b>${title}</b><strong>${points}<small>分</small></strong></div>
    ${tutorialDice(values)}
    <p>${note}</p>
    ${formula ? `<span class="tut-formula">${formula}</span>` : ''}
  </article>`;
}

function tutorialHtml() {
  const triples = [1, 2, 3, 4, 5, 6].map((face) => {
    const points = face === 1 ? 1000 : face * 100;
    return tutorialCombo({
      title: `三个 ${face}`, values: [face, face, face], points: num(points),
      note: face === 1 ? '三个 1 是特别高的基础分。' : '三个相同点数 = 点数 × 100。',
      formula: face === 1 ? '基础 1000' : `${face} × 100`,
    });
  }).join('');
  const bosses = BOSSES.map((boss) => `<div class="tut-boss">
    <b>${h(boss.name)}<span>第 ${boss.level} 关</span></b>
    <p><strong>${h(boss.effectName)}</strong>：${h(boss.effectDesc)}</p>
  </div>`).join('');
  return `
  <div class="modal tutorial-modal">
    <header class="tutorial-head">
      <div>
        <p class="modal-kicker">THE FIRST NIGHT AT THE TABLE</p>
        <h2>图解赌桌教程</h2>
        <p>从“三个三为什么是 300 分”开始，把整张赌桌的规则一次讲清楚。</p>
      </div>
      <button class="modal-close" data-action="close-overlay" aria-label="关闭教程"><svg><use href="#i-close"></use></svg></button>
    </header>
    <nav class="tutorial-nav" aria-label="教程章节">
      <button class="tutorial-nav-button is-active" data-action="tutorial-nav" data-target="tut-goal">01 目标与流程</button>
      <button class="tutorial-nav-button" data-action="tutorial-nav" data-target="tut-score">02 计分图解</button>
      <button class="tutorial-nav-button" data-action="tutorial-nav" data-target="tut-risk">03 本轮与下一关</button>
      <button class="tutorial-nav-button" data-action="tutorial-nav" data-target="tut-gear">04 骰桶与市集</button>
      <button class="tutorial-nav-button" data-action="tutorial-nav" data-target="tut-start">05 开局清单</button>
    </nav>
    <div class="tutorial-body" id="tutorial-body">
      <section class="tut-section" id="tut-goal">
        <div class="tut-section-head"><span>01</span><div><p>THE SHAPE OF A RUN</p><h3>先看目标：一关一关把分数堆上去</h3></div></div>
        <p class="tut-lede">你坐在长桌这一侧，用六颗骰子去够每关的目标分。达到目标后不会自动结束，可以继续加注；准备好了，再亲自点击「下一关」。</p>
        <div class="tut-cards three">
          <div class="tut-card"><b>${LEVEL_COUNT} 关 · ${BOSSES.length} 位庄家</b><p>第 ${BOSSES.map((boss) => boss.level).join('、')} 关各有一位庄家，两场庄家之间的空档越拖越长：${MINION_GAPS.join('、')} 关。庄家有自己的桌规，击败他会拿到永久重投上限。</p></div>
          <div class="tut-card"><b>6 颗骰子 · 5 次重投</b><p>每关第一掷免费；之后每掷一次消耗 1 次重投。骰子、骰桶、物品会改变你能走多远。</p></div>
          <div class="tut-card"><b>目标分是算出来的</b><p>第 1 关 ${LEVEL_CURVE.targetBase} 分，之后每关 ×${LEVEL_CURVE.targetGrowth}；庄家的桌子再乘上自己的系数（赏金最高 ×${Math.max(...BOSSES.map((boss) => boss.curve.reward)).toFixed(2)}），所以庄家关总是比隔壁贵一档。分数在左上角：大字是“已得”，本轮挂账单独显示。</p></div>
        </div>
        <div class="tut-flow">
          <div><i>1</i><b>摇骰</b><span>按住骰桶摇动，2 秒后落骰</span></div>
          <div><i>2</i><b>选骰</b><span>点选要计分的骰子，所有选中骰都必须合法</span></div>
          <div><i>3</i><b>计分</b><span>继续 / 重投 / 无重投时结算</span></div>
          <div><i>4</i><b>达标</b><span>目标达成后，点左下角「下一关」</span></div>
        </div>
        <div class="tut-callout">
          <b>“继续”和“重投”有什么区别？</b>
          <p><strong>计分并继续</strong>：把选中的骰子放到一边，只重投剩下的骰子。<strong>计分并重投</strong>：把六颗骰子全部收回骰桶，重新摇六颗。两种都消耗 1 次重投。</p>
        </div>
      </section>

      <section class="tut-section" id="tut-score">
        <div class="tut-section-head"><span>02</span><div><p>THE ONLY MATH YOU NEED</p><h3>计分图解：三个相同点数，就是“三连”</h3></div></div>
        <p class="tut-lede">不用记术语，先看骰子。下面每一张牌都把“应该选哪几颗”和“最后拿多少分”画出来了。</p>
        <div class="tut-callout is-key">
          <b>最重要的例子：三个 3 = 300 分。</b>
          <p>“三连”只是说<strong>三个相同点数</strong>。四个 3 是 300 × 2 = 600；五个 3 是 300 × 4 = 1200；六个 3 是 300 × 8 = 2400。</p>
        </div>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '单颗 1', values: [1], points: '100', note: '一颗 1 就能单独计分。', formula: '100' })}
          ${tutorialCombo({ title: '单颗 5', values: [5], points: '50', note: '一颗 5 就能单独计分。', formula: '50' })}
          ${tutorialCombo({ title: '三个 3（三连）', values: [3, 3, 3], points: '300', note: '三个相同点数先看基础分。', formula: '3 × 100 = 300', highlight: true })}
        </div>

        <h4 class="tut-subtitle">三个相同点数的基础分</h4>
        <div class="tut-triple-grid">${triples}</div>

        <h4 class="tut-subtitle">四个、五个、六个相同点数</h4>
        <p>先算“三个”的基础分，再按数量翻倍。以 3 点为例：</p>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '四个 3（四连）', values: [3, 3, 3, 3], points: '600', note: '四个相同点数 = 三个的基础分 × 2。', formula: '300 × 2 = 600', highlight: true })}
          ${tutorialCombo({ title: '五个 3（五连）', values: [3, 3, 3, 3, 3], points: '1,200', note: '五个相同点数 = 三个的基础分 × 4。', formula: '300 × 4 = 1,200' })}
          ${tutorialCombo({ title: '六个 3（六连）', values: [3, 3, 3, 3, 3, 3], points: '2,400', note: '六个相同点数 = 三个的基础分 × 8。', formula: '300 × 8 = 2,400' })}
        </div>
        <div class="tut-multiplier-strip">
          <span><b>3 个</b> ×1</span><span><b>4 个</b> ×2</span><span><b>5 个</b> ×4</span><span><b>6 个</b> ×8</span>
        </div>
        <div class="tut-callout">
          <b>1 点是唯一例外。</b>
          <p>三个 1 = 1000 分，所以四个 1 = 2000、五个 1 = 4000、六个 1 = 8000。2–6 的三连基础分分别是 200 / 300 / 400 / 500 / 600。</p>
        </div>

        <h4 class="tut-subtitle">顺子：五个或六个连续点数</h4>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '顺子 1–2–3–4–5', values: [1, 2, 3, 4, 5], points: '500', note: '五颗连续点数。', formula: '500' })}
          ${tutorialCombo({ title: '顺子 2–3–4–5–6', values: [2, 3, 4, 5, 6], points: '750', note: '另一种五颗连续点数。', formula: '750' })}
          ${tutorialCombo({ title: '通天顺 1–6', values: [1, 2, 3, 4, 5, 6], points: '1,500', note: '六颗骰子刚好组成一条完整顺子。', formula: '1,500', highlight: true })}
        </div>

        <h4 class="tut-subtitle">一次选择必须把每一颗都算进去</h4>
        <p>例如同时选三颗 1 和两颗 5：三个 1 = 1000，两个 5 = 100，合计 1100。系统会在合法拆法里自动取最高分，但不会替你忽略“算不进去”的骰子。</p>
        <div class="tut-combo is-highlight">
          <div class="tut-combo-head"><b>混合例子：三个 1 + 两个 5</b><strong>1,100<small>分</small></strong></div>
          ${tutorialDice([1, 1, 1, 5, 5])}
          <p>三个 1 是一组，两个 5 是一组；所有选中的骰子都被用上了。</p>
          <span class="tut-formula">1000 + 50 + 50 = 1,100</span>
        </div>
        <div class="tut-callout is-warning"><b>如果选中的骰子无法全部组成合法组合，就不能计分。</b><p>例如把 2、3、4 单独选中，没有计分方式；先把能计分的骰子选出来。</p></div>
      </section>

      <section class="tut-section" id="tut-risk">
        <div class="tut-section-head"><span>03</span><div><p>THE RISK OF THE NEXT THROW</p><h3>已得、本轮未计入、掷空与下一关</h3></div></div>
        <p class="tut-lede">左上角的计分面板会拆成两笔：已经安全的分数，和本轮还没确认的分数。</p>
        <div class="tut-score-demo">
          <div class="tut-score-demo-top"><span>本关已得</span><span>目标 450</span></div>
          <div class="tut-score-demo-number"><strong>220</strong><em>+80 本轮</em><span>/450</span></div>
          <div class="tut-score-demo-labels"><span>已得 220</span><span>本轮未计入 80</span></div>
          <div class="tut-score-demo-bar"><i style="width:49%"></i><b style="width:18%"></b></div>
        </div>
        <div class="tut-cards">
          <div class="tut-card"><b>下一次投掷仍能计分</b><p>上一笔“本轮未计入”会转为“已得”，然后你可以继续选骰计分。</p></div>
          <div class="tut-card"><b>下一次投掷掷空</b><p>本次投掷没有任何可计分组合时，这一笔“本轮未计入”全部作废；已得分数保留。</p></div>
          <div class="tut-card"><b>目标达成后</b><p>不会自动过关。可以继续得分，直到你亲自点击左上角「下一关」。终局按钮是「查看结局」。</p></div>
          <div class="tut-card is-gold"><b>收手换钱</b><p>过关结算时，每剩 1 次未使用的重投可以折 <b style="display:inline;font-size:10px;color:#e5c278">${REROLL_REFUND} 银币</b>带走。带着 3 次重投收手 = +${REROLL_REFUND * 3} 银币；想刷分就得把它花掉，这是明码标价的取舍。</p></div>
        </div>
        <h4 class="tut-subtitle">超额赏金 · 把目标甩得越远，拿得越多</h4>
        <div class="tut-cards three">
          ${OVERSHOOT_TIERS.slice().reverse().map((tier) => `
          <div class="tut-card is-gold"><b>${h(tier.label.split(' · ')[1])} · ${h(tier.label.split(' · ')[0])}</b><p>本关得分达到目标的 <b style="display:inline;font-size:10px;color:#e5c278">${tier.ratio} 倍</b>，结算额外 <b style="display:inline;font-size:10px;color:#e5c278">+${tier.value} 银币</b>。只取达到的最高一档，不叠加。</p></div>`).join('')}
        </div>
        <div class="tut-callout is-key"><b>收手还是加注？</b><p>达标那一刻，左上角「胜利奖励」会实时变成你现在收手能拿到的数目（含剩余重投折价与已达成的超额档位），鼠标悬停可以看到明细。再赌一把可能跨到 2 倍、3 倍，也可能一次掷空把本轮挂账全丢掉——已得分数不会丢，但也不会再多给你一枚银币。</p></div>
        <div class="tut-callout">
          <b>全骰（Hot Dice）</b>
          <p>如果六颗骰子全部被计分，它们会全部归位，下一次投掷免费，不消耗重投次数。但本轮未计入的分数仍然要等下一次投掷确认。</p>
        </div>
        <div class="tut-callout">
          <b>重投耗尽</b>
          <p>没有重投次数时，选择骰子后会出现「计分并结算」。达到目标就进入下一关；没达到目标，本关失败。</p>
        </div>
      </section>

      <section class="tut-section" id="tut-gear">
        <div class="tut-section-head"><span>04</span><div><p>THE REST OF THE TABLE</p><h3>骰桶、骰子、物品、市集与庄家</h3></div></div>
        <div class="tut-cards">
          <div class="tut-card"><b>骰桶 · 8 只</b><p>初始橡木桶之外，3 只概率桶偏向某些点数，2 只骰型桶（狼图腾桶奖励 3、恶魔契桶奖励赖子），2 只仪式桶需要画阵。按住骰桶后桌面会显示五芒星或顺时针圆轨迹，2 秒内沿着画；偏差过大会失败。五芒星每关只能生效一次，也可点右下角「画阵」。</p></div>
          <div class="tut-card"><b>骰子 · ${DICE.length} 枚 · 两套 + 无套</b><p>${RARITIES.common.name} ${DICE.filter((d) => d.rarity === 'common').length}、${RARITIES.rare.name} ${DICE.filter((d) => d.rarity === 'rare').length}、${RARITIES.epic.name} ${DICE.filter((d) => d.rarity === 'epic').length}、${RARITIES.legendary.name} ${DICE.filter((d) => d.rarity === 'legendary').length}。每枚骰子有自己的六面概率，悬停可看真实概率；<b>额外加分只出现在史诗与传说</b>上。<b>狼裔 5 枚</b>把 3 的概率抬高，2 / 4 件分别让每颗计分的 3 加分、三连 3 大幅加分。<b>恶魔 5 枚</b>把掷出的 1 变成「恶魔赖子」——能补三连或顺子（顺子最多替 1 颗），但不能单独计分。剩下的 <b>10 枚无套组</b>走极端骰型：只有单数、只有双数、非 1 即 6、阶梯、照面……它们不参与套装，但随时能买能卖。</p></div>
          <div class="tut-card"><b>物品 · ${ITEMS.length} 件</b><p>${ITEMS.filter((i) => i.type === 'active').length} 主动、${ITEMS.filter((i) => i.type === 'passive').length} 被动，其中 <b>${ITEMS.filter((i) => i.consumable).length} 件一次性</b>（烈酒、加注契约、幸运粉、盐、静默赦令）——用完即消失，但效果比同价位常驻物品更直接。主动物品每关恢复一次；被动物品永久生效。<b>三层骰架 / 双孔桶架 / 暗格货架</b>分别让市集的骰子、骰桶、物品各 +1 个货位。丰饶骰袋 +1 骰、裂痕骰袋 -1 骰但计分 +25%，这两件整局各只能获取一次。</p></div>
          <div class="tut-card"><b>市集</b><p>每关之后进入：骰子 2 枚、骰桶 1 只、物品 3 件；带上货架类被动会各 +1。骰子按等级加权：前 6 关以普通 / 稀有为主，过了 24 关才真正放出传说。每次刷新都消耗银币；随身物品可以半价卖回，出售后不会再次上架。</p></div>
          <div class="tut-card"><b>赌桌 · ${TABLES.length} 张</b><p>木头、青石、黑铁、黄金、钻石。五张桌子平分 ${LEVEL_COUNT} 关（${LEVEL_CURVE.targetBase} 分起步），庄家按难度穿插落座：越晚的桌子越贵，也越不像人坐的地方。</p></div>
        </div>
        <h4 class="tut-subtitle">${BOSSES.length} 位庄家的桌规</h4>
        <div class="tut-bosses">${bosses}</div>
        <div class="tut-callout">
          <b>操作速记</b>
          <p>按住骰桶拖动会开始 2 秒倒计时，倒计时结束自动落骰；仪式桶会显示桌面轨迹，需要沿着轨迹描画，偏差过大会失败。也可以点击右侧自动摇骰；空格自动摇；数字键 1 / 2 是「计分并继续」「计分并重投」。</p>
        </div>
      </section>

      <section class="tut-section" id="tut-start">
        <div class="tut-section-head"><span>05</span><div><p>READY TO SIT DOWN</p><h3>开局清单</h3></div></div>
        <ul class="tut-checklist">
          <li><b>先看目标：</b>左上角大字是已得分数，金色小字是本轮未计入。</li>
          <li><b>先选 1 和 5：</b>单颗就能计分；三个相同点数从 200（三个 2）到 1000（三个 1）。</li>
          <li><b>记住乘以几：</b>四个 ×2、五个 ×4、六个 ×8。</li>
          <li><b>不要乱选：</b>所选骰子必须全部被合法组合吃掉。</li>
          <li><b>达标不等于结束：</b>可以继续刷分，准备好再点「下一关」。</li>
          <li><b>收手有价：</b>每剩 1 次重投折 ${REROLL_REFUND} 银币；得分达到目标 1.5 / 2 / 3 倍，再分别 +25 / +60 / +140 银币。左上角奖励数字会实时告诉你现在收手能拿多少。</li>
        </ul>
        <div class="tut-final-line">骰子落下之前，命运只是一句空话。<br><span>现在，去把它掷出来。</span></div>
      </section>
    </div>
    <footer class="tutorial-foot">
      <span>${app.run ? '教程随时可以在右上角规则里重看。' : '教程看完了，准备好就入座。'}</span>
      <button class="primary-button" data-action="${app.run ? 'close-overlay' : 'start-direct'}">${app.run ? '回到赌桌' : '入座开局'} <svg><use href="#i-arrow"></use></svg></button>
    </footer>
  </div>`;
}

function showStartPrompt() {
  openOverlay(`
    <div class="modal start-choice-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <p class="modal-kicker">FIRST TIME AT THE TABLE?</p>
      <div class="start-choice-mark"><svg><use href="#i-die"></use></svg></div>
      <h2>要先看看怎么玩吗？</h2>
      <p class="start-choice-lede">计分规矩会用骰子图一张张画出来：三个 3 = 300，四个 3 = 600，五个 3 = 1200，六个 3 = 2400。第一次坐下的话，建议先看一遍。</p>
      <div class="start-choice-actions">
        <button class="primary-button" data-action="open-tutorial">进入图解教程 <svg><use href="#i-book"></use></svg></button>
        <button class="secondary-button" data-action="start-direct">不用了，直接开局</button>
      </div>
      <p class="start-choice-note">开局后也可以随时点右上角规则查看简版；完整图解教程会保留在开始页。</p>
    </div>
  `, { dismissible: true });
}

function openTutorial() {
  if (app.introOpen) app.introOpen = false;
  openOverlay(tutorialHtml(), { dismissible: true });
  const body = $('#tutorial-body');
  if (body) body.scrollTop = 0;
}

function scrollTutorial(targetId) {
  const target = document.getElementById(targetId);
  const body = $('#tutorial-body');
  if (!target || !body) return;
  $$('.tutorial-nav-button').forEach((button) => button.classList.toggle('is-active', button.dataset.target === targetId));
  body.scrollTo({ top: Math.max(0, target.offsetTop - 4), behavior: 'smooth' });
}

function openRules() {
  if (app.introOpen) app.introOpen = false;
  const rows = SCORING_ROWS.map((row) => `<tr><td>${h(row.label)}<br><span style="font-size:8px;color:#6f6352">${h(row.detail)}</span></td><td>${h(row.points)}</td></tr>`).join('');
  openOverlay(`
    <div class="modal rules-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <div class="rules-head">
        <div>
          <p class="modal-kicker">THE RULES OF THE TABLE</p>
          <h2>赌桌规矩</h2>
          <p>采用《天国：拯救 2》的骰子计分。每关有目标分数，用六颗骰子和五次重投去够到它。没被计分的骰子才能重投；当六颗骰子全部计分，会触发“全骰”，六颗一起免费重投。</p>
        </div>
      </div>
      <div class="rules-columns">
        <div class="rules-section">
          <h3>计分组合</h3>
          <table class="scoring-table">${rows}</table>
          <div class="rules-note">一次计分必须把所选骰子全部纳入合法组合。1 和 5 可以单颗计分；其他点数至少三颗才能计分。所有组合取最高合法分值。</div>
          <h3 style="margin-top:18px">一掷的流程</h3>
          <p>1. 按住骰桶摇动，2 秒倒计时后落骰；或点击自动摇骰。<br>2. 点击选择要计分的骰子。<br>3. 选择「计分并继续」，计分后把选中骰放一边、重投剩余骰子；或「计分并重投」，计分后把全部六颗骰子重新投。两者各消耗 1 次重投。<br>4. 六颗骰子全部计分会触发「全骰」，免费重投全部骰子。<br>5. 没有重投次数时，按钮变为「计分并结算」，得分后本关结束。</p>
          <div class="rules-note">开局有 5 次重投。每击败一位庄家，你会夺下他的徽记：后续关卡重投上限 +1。门房还会送你一枚每关都能使用的幸运币。</div>
          <h3 style="margin-top:18px">收手换钱与超额赏金</h3>
          <p>过关结算时，每剩 1 次<b style="color:#e5c278">未使用的重投折 ${REROLL_REFUND} 银币</b>带走——带着 5 次重投收手就是 +${REROLL_REFUND * 5}。此外，本关得分达到目标分的 <b style="color:#e5c278">1.5 倍 +25、2 倍 +60、3 倍 +140</b> 银币，只取达到的最高一档。</p>
          <div class="rules-note">达标后左上角「胜利奖励」会实时变成你现在收手能拿到的数目，悬停可看明细：继续加注可以追更高的倍数，也可能一次掷空把本轮挂账全部丢掉。</div>
        </div>
        <div class="rules-section">
          <h3>${BOSSES.length} 位庄家</h3>
          ${BOSSES.map((boss) => `
            <div class="rule-boss">
              <b>${h(boss.name)}<span>${h(boss.title)} · 第 ${boss.level} 关 · 悬赏 ×${boss.curve.reward.toFixed(2)}</span></b>
              <p>${h(boss.effectName)}：${h(boss.effectDesc)}</p>
            </div>`).join('')}
          <h3 style="margin-top:16px">装备与市集</h3>
          <p>骰子有各自的点数概率与套组效果，${DICE.length} 枚秘骰分为普通、稀有、史诗、传说：狼裔 5 枚、恶魔 5 枚，其余 10 枚无套组。鼠标移到骰子上查看六面概率；额外加分只出现在史诗与传说骰上。骰桶分为概率偏向与仪式加成两类，点「画阵」完成星阵或旋涡，能为本次投掷争取优势。</p>
          <p>每关之后进入市集：骰子区默认 2 枚、骰桶区 1 只、物品区 3 件，刷新均需银币。三层骰架 / 双孔桶架 / 暗格货架会各让对应区域多摆 1 件。主动物品每关恢复一次，被动物品永久生效；烈酒、加注契约、幸运粉、盐、静默赦令是一次性消耗品，用完即消失。市集下方可以把随身物品按半价卖回。</p>
          <div class="rules-note">提示：空格投掷，数字键 1 / 2 分别使用「计分并继续」「计分并重投」。“计分并继续”会触发金冠赌王的抽成。</div>
        </div>
      </div>
      <div class="rules-footer">
        <span>“运气是赌桌上唯一诚实的谎言。”</span>
        <button class="primary-button" data-action="close-overlay">看懂了</button>
      </div>
    </div>
  `, { dismissible: true });
}

/* ═══════════════════════════════════════════════════════════════════
   Compendium
   ═══════════════════════════════════════════════════════════════════ */
function openCompendium(tab = app.compendiumTab) {
  if (app.introOpen) app.introOpen = false;
  if (app.run) {
    discoverLoadout(app.run);
    discoverShop(app.run);
  }
  app.compendiumTab = tab;
  const tabs = [
    ['dice', '秘骰 20'], ['barrels', '骰桶 8'], ['items', `物品 ${ITEMS.length}`], ['tables', '赌桌 5'], ['bosses', '庄家与小兵'],
  ];
  openOverlay(`
    <div class="modal compendium-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <header class="compendium-head">
        <div><p class="modal-kicker">THE GAMBLER'S ARCHIVE</p><h2>赌徒图鉴</h2><p>五张桌子，二十枚秘骰，六只骰桶，十件物品，以及坐在对面的那些东西。</p></div>
        <span class="rail-note">收录内容 · 可随时查阅</span>
      </header>
      <div class="compendium-tabs">${tabs.map(([id, label]) => `<button class="compendium-tab ${id === tab ? 'is-active' : ''}" data-action="switch-compendium-tab" data-tab="${id}">${h(label)}</button>`).join('')}</div>
      <div class="compendium-body" id="compendium-body">${compendiumBody(tab)}</div>
    </div>
  `, { dismissible: true });
}

function switchCompendiumTab(tab) {
  hideTooltip();
  app.compendiumTab = tab;
  $$('.compendium-tab').forEach((el) => el.classList.toggle('is-active', el.dataset.tab === tab));
  const body = $('#compendium-body');
  if (body) body.innerHTML = compendiumBody(tab);
}

function compendiumLockedCard(category) {
  return `<article class="compendium-card is-locked" aria-label="${h(category)}尚未遇见">
    <div class="locked-card"><svg><use href="#i-lock"></use></svg><b>尚未遇见</b><span>在赌局或市集中遇见后解锁</span></div>
  </article>`;
}

function compendiumProgress(kind, total) {
  const seen = app.discovered[kind]?.filter((id) => kind !== 'dice' || codexDice().some((die) => die.id === id)).length || 0;
  return `<strong class="codex-progress">已遇见 ${seen} / ${total}</strong>`;
}

function compendiumBody(tab) {
  if (tab === 'dice') {
    const dice = codexDice();
    return `<p class="compendium-intro">每一枚秘骰都像一张有偏向的牌：点数概率不同。狼裔 5 枚把筹码押在 3 上，恶魔 5 枚把掷出的 1 变成赖子，同套组集齐 2 枚与 4 枚会解锁额外效果；另外 10 枚无套组，走的是极端骰型，不参与套装但随时能买卖。额外加分只出现在史诗与传说骰上。${compendiumProgress('dice', dice.length)}</p>
      <div class="compendium-grid">${dice.map((spec) => {
        if (!isDiscovered('dice', spec.id)) return compendiumLockedCard('这枚骰子');
        const rarity = rarityOf(spec);
        const set = DICE_SETS[spec.setId];
        const setTag = set ? `${set.name}套组` : '无套组';
        const bars = probabilityBars(spec.probs, spec.rarity);
        return `<article class="compendium-card compendium-die" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-die-tip="${h(spec.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${h(setTag)}</span></div>
          <div class="comp-art"><div class="card-art" style="height:74px">${artDieHtml(spec)}</div></div>
          <h4>${h(spec.name)}</h4>
          <div class="comp-sub">${h(spec.desc)}</div>
          ${bars}
          <p>${h(spec.bonus?.label || spec.flavor)}</p>
        </article>`;
      }).join('')}</div>`;
  }
  if (tab === 'barrels') {
    return `<p class="compendium-intro">骰桶决定骰子怎样离手。三只偏向特定点数，两只奖励指定骰型，两只要求你先在桌上画出一个仪式。默认的旧橡木桶不偏不倚。${compendiumProgress('barrels', BARRELS.length)}</p>
      <div class="compendium-grid">${BARRELS.map((barrel) => {
        if (!isDiscovered('barrels', barrel.id)) return compendiumLockedCard('这只骰桶');
        const rarity = rarityOf(barrel);
        return `<article class="compendium-card barrel-compendium" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-barrel-tip="${h(barrel.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${barrelTypeLabel(barrel)}</span></div>
          <div class="comp-art"><img src="assets/cups/${barrel.art}.svg" alt="${h(barrel.name)}"></div>
          <h4>${h(barrel.name)}</h4>
          <div class="comp-sub">${h(barrel.short)}</div>
          <p>${h(barrel.desc)}</p>
        </article>`;
      }).join('')}</div>`;
  }
  if (tab === 'items') {
    return `<p class="compendium-intro">${ITEMS.filter((i) => i.type === 'active').length} 件主动物品、${ITEMS.filter((i) => i.type === 'passive').length} 件被动物品，其中 ${ITEMS.filter((i) => i.consumable).length} 件是一次性消耗品：烈酒、加注契约、幸运粉、盐、静默赦令。主动物品每关恢复一次，被动物品永久生效；三种货架被动分别让市集某一区多摆 1 件。丰饶骰袋与裂痕骰袋整局各只能获取一次。${compendiumProgress('items', ITEMS.length)}</p>
      <div class="compendium-grid">${ITEMS.map((item) => {
        if (!isDiscovered('items', item.id)) return compendiumLockedCard('这件物品');
        const rarity = rarityOf(item);
        return `<article class="compendium-card item-compendium" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-item-tip="${h(item.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${item.consumable ? '一次性' : item.type === 'active' ? '主动' : '被动'}</span></div>
          <div class="comp-art"><img src="assets/items/${item.icon}.svg" alt="${h(item.name)}"></div>
          <h4>${h(item.name)}</h4>
          <div class="comp-sub">${h(item.desc)}</div>
          <p>${h(item.flavor)}</p>
        </article>`;
      }).join('')}</div>`;
  }
  if (tab === 'tables') {
    return `<p class="compendium-intro">五张赌桌，五种材质。关卡越深，桌面越昂贵，坐在对面的东西也越不像人。前四幕各 6 关、终幕 4 关，每幕有两位庄家看守，庄家之间的小兵越排越长。</p>
      <div class="compendium-grid tables-grid">
        ${TABLES.map((table) => `<article class="compendium-card table-comp-card" style="--rarity:${table.accent};--glow:${table.glow};min-height:280px;overflow:hidden">
          <div class="comp-table-bg" style="background-image:url('assets/tables/${table.art}.svg')"></div>
          <div class="comp-table-content">
            <div class="comp-sub">第 ${chapterLevelSpan(table.group)[0]}–${chapterLevelSpan(table.group)[1]} 关 · ${h(table.material)}</div>
            <h4>${h(table.name)}</h4>
            <p style="color:${table.accent};font-size:9px;margin-top:3px">${h(table.subtitle)}</p>
            <p>${h(table.desc)}</p>
          </div>
        </article>`).join('')}
      </div>`;
  }
  if (tab === 'bosses') {
    return `<p class="compendium-intro">每一位庄家都有一句自己的规矩。第 ${BOSSES.map((boss) => boss.level).join('、')} 关庄家亲自落座，两场之间的小兵关越拖越长（${MINION_GAPS.join('、')}）；击败他们，桌子会随章节换成下一种材质。</p>
      <h3 style="font-family:var(--serif);font-weight:400;font-size:18px;color:#e4cd9f;margin:8px 0 12px;letter-spacing:.1em">${BOSSES.length} 位庄家</h3>
      <div class="compendium-grid bosses-grid">
        ${BOSSES.map((boss) => `<article class="compendium-card boss-compendium-card" style="--rarity:${boss.accent};--glow:${boss.accent}33">
          <img class="comp-portrait" src="assets/portraits/${boss.art}.svg" alt="${h(boss.name)}">
          <div class="comp-content">
            <div class="comp-sub">第 ${boss.level} 关 · ${h(boss.title)} · 悬赏 ×${boss.curve.reward.toFixed(2)}</div>
            <h4>${h(boss.name)}</h4>
            <div class="effect"><b>${h(boss.effectName)}</b><p>${h(boss.effectDesc)}</p></div>
            <p style="color:#8f7f69;font-size:8px">“${h(boss.intro)}”</p>
          </div>
        </article>`).join('')}
      </div>
      <h3 style="font-family:var(--serif);font-weight:400;font-size:18px;color:#e4cd9f;margin:22px 0 12px;letter-spacing:.1em">五位小兵</h3>
      <div class="compendium-grid minions-grid">
        ${MINIONS.map((minion) => `<article class="compendium-card" style="--rarity:${minion.accent};--glow:${minion.accent}22;overflow:hidden;min-height:250px">
          <img src="assets/portraits/${minion.art}.svg" alt="${h(minion.name)}" style="position:absolute;right:-8%;bottom:-2%;width:78%;opacity:.62;-webkit-mask-image:linear-gradient(180deg,#000 65%,transparent);mask-image:linear-gradient(180deg,#000 65%,transparent)">
          <div style="position:relative;z-index:2;max-width:64%">
            <div class="comp-sub">${h(minion.title)}</div>
            <h4>${h(minion.name)}</h4>
            <p style="font-size:8px">“${h(minion.intro)}”</p>
          </div>
        </article>`).join('')}
      </div>`;
  }
  return '';
}

/* ═══════════════════════════════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════════════════════════════ */
function showToast(text, type = '') {
  const stack = $('#toast-stack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type ? `is-${type}` : ''}`;
  toast.textContent = text;
  stack.append(toast);
  setTimeout(() => toast.classList.add('is-out'), 2400);
  setTimeout(() => toast.remove(), 2800);
}

function clearToasts() {
  const stack = $('#toast-stack');
  if (stack) stack.innerHTML = '';
}

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
