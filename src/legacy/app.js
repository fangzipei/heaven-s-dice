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
import { showDefeat, showVictory } from '../ui/screens/result.ts';
import {
  advanceCurrentLevel, beginRoll, bindCupDrag, cancelCupHold, forfeitRun, handleScore,
  pulseCup, renderGame, setSpeech, startCupHold, useItem,
} from '../ui/game.ts';

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
