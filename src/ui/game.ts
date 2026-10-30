// ui/game.ts — 牌桌上的对局控制：画桌面、摇桶、掷骰、选骰计分与杯垫仪式。
//
// 从 app.js「Rendering — game」「Roll / score interactions」「Items」「Cup drag」
// 四节原样搬出。面板本身在 ui/hud.ts、骰子在 ui/tray.ts、动画在 render/motion.ts，
// 这里只负责把它们串成一次投掷。动画时序被 tools/cup-*.mjs 与截图依赖。
import { ITEM_BY_ID, LEVEL_COUNT, getOpponent, rarityOf, DICE_SETS } from '../content/index.ts';
import {
  advanceLevel, applyGesture, applyItemGrant, applyScore, canUseItem, forfeit, getBarrel,
  barrelGesture, barrelLoanCost,
  getDieSpec, getScorePreview, resolveSaltOffer as engineResolveSaltOffer, resolveLoanOffer as engineResolveLoanOffer,
  setTwoFaceFaces, settleFloatingBust, selectBestScoring, rollDice, selectedDice,
  handTypeName, activeBoss,
  useItem as engineUseItem,
} from '../core/engine.ts';
import type { ScoreAction } from '../core/engine.ts';
import type { PricedDie, RunState } from '../core/types.ts';
import { clamp, h, num, sleep } from '../core/util.ts';
import { motion, type MotionPoint } from '../render/motion.ts';
import { artDieImageHtml } from '../render/dice-dom.ts';
import { sound } from '../platform/sound.ts';
import { discoverLoadout } from '../platform/storage.ts';
import { recordScore, recordThrow, getRunRecord } from '../platform/run-record.ts';
import { saveGame } from '../platform/save.ts';
import { uploadActiveGame } from '../platform/sync.ts';
import { closeOverlay, openOverlay } from './components/overlay.ts';
import { showToast } from './components/toast.ts';
import { guideEvent, nextTutorialRoll } from './tutorial-guide.ts';
import { renderActionDock, renderComboPreview, renderDangerStrip } from './dock.ts';
import { $, setCss, uiZoom } from './dom.ts';
import { renderOpponentPlate, renderRail, renderScorePanel, renderTopbar, showBustNotice } from './hud.ts';
import type { CupTrace } from './state.ts';
import { app } from './state.ts';
import { showDefeat, showVictory } from './screens/result.ts';
import { diceTable, renderDiceTray } from './tray.ts';

/* ═══════════════════════════════════════════════════════════════════
   Rendering — game
   ═══════════════════════════════════════════════════════════════════ */
/* The individual panels live in ui/hud.ts; renderGame is the one call that
   paints the whole table and still has to reach the tray and the dock below. */
export function renderGame(): void {
  if (!app.run) return;
  const run = app.run;
  document.body.classList.toggle('layer-dark-1', run.level > 7);
  document.body.classList.toggle('layer-dark-2', run.level > 15);
  discoverLoadout(run);
  renderTopbar();
  renderScorePanel();
  renderRail();
  renderDiceTray();
  renderComboPreview();
  renderActionDock();
  renderDangerStrip();
  renderOpponentPlate();
  const canManuallyThrow = !app.busy && !app.introOpen
    && (run.phase === 'ready' || run.phase === 'hot' || run.phase === 'selecting' || run.phase === 'reroll-pending'
      || (run.phase === 'dead' && run.rerolls > 0));
  $('#cup')?.classList.toggle('is-breathing', canManuallyThrow);
}

/* ═══════════════════════════════════════════════════════════════════
   Roll / score interactions
   ═══════════════════════════════════════════════════════════════════ */
const isElement = (value: HTMLElement | null): value is HTMLElement => Boolean(value);

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cupDiceToGather(run: RunState) {
  if (run.phase === 'dead') return run.dice.slice();
  if (run.flags.rerollAll || run.flags.hotDice) return run.dice.slice();
  return run.dice.filter((die) => !die.scored);
}

function dieElement(uid: string) {
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

async function slowSpinTableDice(run: RunState) {
  if (prefersReducedMotion() || run.stats.levelRolls === 0) return;
  const uids = run.dice.filter((die) => die.value != null).map((die) => die.uid);
  if (!uids.length) return;
  if (diceTable) {
    await motion.tumble(diceTable, uids);
    return;
  }
  // ── DOM fallback ──
  const gatherUids = new Set(cupDiceToGather(run).map((die) => die.uid));
  const elements = uids.map((uid) => dieElement(uid)).filter(isElement);
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
    if (!gatherUids.has(element.dataset.dieUid!)) element.classList.remove('is-rerolling');
  });
}

/** The middle of the cup art: where dice disappear into / spill out of it. */
function cupMouthPoint(): { x: number; y: number } {
  const cupImage = $('#cup-image') || $('#cup');
  if (!cupImage) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = cupImage.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height * .55 };
}

async function gatherDiceToCup(uids: string[]) {
  if (prefersReducedMotion()) return;
  if (!uids.length) return;
  if (diceTable) {
    // Pass a callback, not a snapshot: the cup is dragged while the dice fly.
    await motion.gather(diceTable, uids, () => cupWorldPoint());
    return;
  }
  // ── DOM fallback ──
  const mouth = cupMouthPoint();
  const elements = uids.map((uid) => dieElement(uid)).filter(isElement);
  if (!elements.length) return;
  const cup = $('#cup');
  const animations = elements.map((element, index) => {
    const rect = element.getBoundingClientRect();
    const zoom = uiZoom(element);
    const dx = (mouth.x - (rect.left + rect.width / 2)) / zoom;
    const dy = (mouth.y - (rect.top + rect.height / 2)) / zoom;
    element.style.pointerEvents = 'none';
    const dir = index % 2 ? 1 : -1;
    return element.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      {
        transform: `translate(${dx * .5 + dir * 22}px, ${dy * .34 - 42}px) scale(.62) rotate(${dir * 70}deg)`,
        opacity: .94, offset: .48,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(${dir * 150}deg)`,
        opacity: 0,
      },
    ], { duration: 380, delay: index * 24, easing: 'cubic-bezier(.4,0,.16,1)', fill: 'forwards' })
      .finished.catch(() => {});
  });
  cup?.classList.add('is-catching');
  await Promise.all(animations);
  elements.forEach((element) => { element.style.opacity = '0'; });
  if (!cup) return;
  setTimeout(() => cup.classList.remove('is-catching'), 220);
}

/**
 * 2D pour: each new die starts at the cup and lands on its resting spot.
 * Runs on the freshly rendered tray, before the next repaint.
 */
async function pourDiceFromCup(uids: string[]) {
  if (prefersReducedMotion()) return;
  const host = $('#dice-dom-fallback');
  if (!host || !uids.length) return;
  host.classList.remove('is-rolling');
  const mouth = cupMouthPoint();
  const targets = uids
    .map((uid) => host.querySelector<HTMLElement>(`[data-die-uid="${CSS.escape(uid)}"]`))
    .filter((el): el is HTMLElement => Boolean(el))
    .filter((el) => !el.classList.contains('is-hidden') && !el.classList.contains('is-scored'));
  if (!targets.length) return;
  for (const [index, element] of targets.entries()) {
    const rect = element.getBoundingClientRect();
    const zoom = uiZoom(element);
    const dx = (mouth.x - (rect.left + rect.width / 2)) / zoom;
    const dy = (mouth.y - (rect.top + rect.height / 2)) / zoom;
    element.style.setProperty('--pour-x', `${dx.toFixed(1)}px`);
    element.style.setProperty('--pour-y', `${dy.toFixed(1)}px`);
    element.style.setProperty('--pour-rot', `${(index % 2 ? 1 : -1) * (70 + index * 12)}deg`);
    element.style.setProperty('--pour-delay', `${index * 54}ms`);
    element.classList.add('is-pouring');
  }
  void host.offsetWidth;
  host.classList.add('is-pouring');
  await sleep(640 + targets.length * 54);
  host.classList.remove('is-pouring');
  targets.forEach((element) => {
    element.classList.remove('is-pouring');
    element.style.removeProperty('--pour-x');
    element.style.removeProperty('--pour-y');
    element.style.removeProperty('--pour-rot');
    element.style.removeProperty('--pour-delay');
  });
}

/* Pour every rerolled die out of the cup and let it settle. */
async function pourDiceIntoTable(uids: string[], from?: MotionPoint | null) {
  if (!diceTable || !uids.length) return;
  await motion.rollDice(diceTable, uids, from ?? cupWorldPoint(), { stagger: 0.045, duration: 0.58 });
}

export function pulseCup(): void {
  const cup = $('#cup');
  if (!cup) return;
  motion.cupCue(cup);
  clearTimeout(app.cupCueTimer ?? undefined);
  app.cupCueTimer = setTimeout(() => { /* GSAP owns the tween now */ }, 1400);
}

function stopCupShake(): void {
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

function clearCupTimers(): void {
  clearInterval(app.cupCountdownTimer ?? undefined);
  clearTimeout(app.cupAutoTimer ?? undefined);
  app.cupCountdownTimer = null;
  app.cupAutoTimer = null;
}

function removeCupOverlays(): void {
  $('#cup-countdown')?.remove();
  $('#cup-trace')?.remove();
  $('#cup')?.classList.remove('is-tracing');
  app.cupTrace = null;
}

function resetCupVisuals(): void {
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

function cupGestureInfo(run: RunState): { gesture: string; name: string } | null {
  const barrel = run ? getBarrel(run) : null;
  const gesture = barrel ? barrelGesture(barrel) : null;
  if (!gesture) return null;
  if (gesture === 'pentagram' && run.flags.starUsed) return null;
  if (gesture === 'circle' && run.flags.vortexUsed) return null;
  return { gesture, name: gesture === 'pentagram' ? '五芒星' : '旋涡' };
}

function traceStarPoints(cx: number, cy: number, radius: number) {
  const angles = [-90, -18, 54, 126, 198].map((deg) => (deg * Math.PI) / 180);
  const base = angles.map((a) => ({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius }));
  return [0, 2, 4, 1, 3, 0].map((index) => base[index]!);
}

function traceCirclePoints(cx: number, cy: number, radius: number) {
  return Array.from({ length: 97 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 96) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function samplePath(points: { x: number; y: number }[], count = 140) {
  if (!points?.length) return [];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const length = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
    lengths.push(length);
    total += length;
  }
  if (!total) return points.slice(0, 1);
  const samples = [];
  for (let i = 0; i <= count; i += 1) {
    let target = (i / count) * total;
    let segment = 0;
    while (segment < lengths.length && target > lengths[segment]!) {
      target -= lengths[segment]!;
      segment += 1;
    }
    const a = points[Math.min(segment, points.length - 2)]!;
    const b = points[Math.min(segment + 1, points.length - 1)]!;
    const t = lengths[segment] ? target / lengths[segment]! : 0;
    samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return samples;
}

function beginCupTrace(
  center: { x: number; y: number }, radius: number, info: NonNullable<ReturnType<typeof cupGestureInfo>>,
) {
  removeCupOverlays();
  if (!info) return;
  $('#cup')?.classList.add('is-tracing');
  const guide = info.gesture === 'pentagram'
    ? traceStarPoints(center.x, center.y, radius)
    : traceCirclePoints(center.x, center.y, radius);
  const overlay = document.createElement('div');
  overlay.id = 'cup-trace';
  overlay.setAttribute('aria-hidden', 'true');
  // Keep the SVG in the overlay's own pixel space. A viewBox based on
  // window.innerWidth gets rescaled on PCs where .game-screen has CSS zoom,
  // which is what made the pointer trail drift into the bottom-right corner.
  overlay.innerHTML = `<svg>
    <polyline class="cup-trace-guide" points=""></polyline>
    <polyline class="cup-trace-drawn" points=""></polyline>
  </svg>`;
  document.body.append(overlay);
  const overlayRect = overlay.getBoundingClientRect();
  const origin = { x: overlayRect.left, y: overlayRect.top };
  const local = (point: { x: number; y: number }) => ({ x: point.x - origin.x, y: point.y - origin.y });
  const localGuide = guide.map(local);
  const guides = samplePath(localGuide);
  $('.cup-trace-guide', overlay)?.setAttribute('points', localGuide.map((p) => `${p.x},${p.y}`).join(' '));
  app.cupTrace = {
    ...info, center: local(center), origin, radius, guide: localGuide, guides, points: [],
    drawn: $('.cup-trace-drawn', overlay),
  };
}

function recordCupTrace(clientX: number, clientY: number) {
  const trace = app.cupTrace;
  if (!trace) return;
  const x = clientX - trace.origin.x;
  const y = clientY - trace.origin.y;
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
    length += Math.hypot(trace.points[i]!.x - trace.points[i - 1]!.x, trace.points[i]!.y - trace.points[i - 1]!.y);
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
    ? sum + Math.hypot(point.x - trace.guides[index - 1]!.x, point.y - trace.guides[index - 1]!.y) : 0, 0);
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
  const result = applyGesture(app.run!, gesture);
  if (!result.ok) {
    showToast(result.error!, 'error');
    return false;
  }
  sound.gesture();
  showToast(result.message!, 'good');
  return true;
}

function beginCupCountdown(onDone: () => void) {
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

/* Motion is cosmetic. A stalled tween (throttled tab, slow GPU, cancelled
   animation) must never leave the table stuck in `busy` with the reroll
   unspent, so every visual step gets a ceiling. */
function capped<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => { setTimeout(resolve, ms); }),
  ]);
}

async function performCupRoll({ free = false, prepared = false, from = null }: {
  free?: boolean; prepared?: boolean; from?: MotionPoint | null;
} = {}) {
  const run = app.run;
  if (!run) return;
  const previousPhase = run.phase;
  const isFreeThrow = free || run.phase === 'hot';
  // Which dice the cup actually swallows — captured before the engine
  // rewrites the values, so the pour animation targets the right meshes.
  const pouring = cupDiceToGather(run).map((die) => die.uid);
  try {
    /* Commit the throw first. The token has to be spent the instant the
       player commits; the ceremony below is only theatre. */
    /* The tutorial scripts a full six-die hand for every throw; clear the
       table first so a continue doesn't make the next script partial. */
    const tutorialValues = nextTutorialRoll();
    if (tutorialValues) {
      for (const die of run.dice) {
        die.value = null;
        die.scored = false;
        die.blank = false;
        die.wild = false;
      }
      run.selected = [];
    }
    const result = rollDice(run, { free: isFreeThrow, forced: tutorialValues });
    if (!result.ok) {
      resetCupVisuals();
      app.busy = false;
      app.rolling = false;
      renderGame();
      showToast(result.error!, 'error');
      return;
    }
    guideEvent('roll', run);
    if (run.flags.guideTriggered) {
      run.flags.guideTriggered = false;
      showGuideFixFx();
    }
    if (activeBoss(run)?.effectKey === 'banTypeEachThrow' && run.flags.bossBannedType) {
      showToast(`路西法封禁「${handTypeName(run.flags.bossBannedType)}」：本投该骰型不计分。`, 'error');
    }
    recordThrow(run, {
      values: run.lastRoll ? [...run.lastRoll] : [],
      hot: Boolean(result.hot),
      bust: Number(result.bust) || 0,
    });
    app.rolling = true;
    // Counters and dock repaint now; the tray keeps the old faces until the
    // pour so the throw still reads as a throw.
    renderTopbar();
    renderScorePanel();
    renderRail();
    renderActionDock();
    renderDangerStrip();
    if (result.pardon) showJudgePardon();
    if (!prepared) {
      await capped(slowSpinTableDice(run), 1500);
      await capped(gatherDiceToCup(pouring), 1500);
      const cup = $('#cup');
      cup?.classList.add('is-ritual');
      motion.cupRattle($('#cup-vessel'), { cycles: 2 });
      sound.rattle();
      await sleep(prefersReducedMotion() ? 0 : 300);
      await capped(invertCup(), 900);
    } else if (!app.cupInverted) {
      await capped(invertCup(), 900);
    } else {
      stopCupShake();
    }
    sound.dice();
    rightCup();
    renderGame();
    if (result.bust) showBustNotice(result.bust);
    // The dice pour out of the cup and settle; wait for the real motion
    // instead of a guessed timeout.
    const pourUids = pouring.length ? pouring : run.dice.map((die) => die.uid);
    if (diceTable) await capped(pourDiceIntoTable(pourUids, from), 2500);
    else await capped(pourDiceFromCup(pourUids), 1900);
    app.busy = false;
    app.rolling = false;
    app.cupAnimating = false;
    app.cupHoldStarted = false;
    app.cupHoldPromise = null;
    $('#cup')?.classList.remove('is-ritual');
    renderGame();
    if (run.flags.saltOffer) showSaltOffer();
    else if (run.flags.loanOffer) showLoanOffer();
    else if (run.phase === 'lost') showDefeat();
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

/* A bust with salt in the bag is put on hold: the table asks before burning
   the round. Both buttons route back into the engine, which owns the outcome. */
export function showSaltOffer(): void {
  const run = app.run;
  if (!run || !run.flags.saltOffer) return;
  const saved = Math.max(0, run.roundScore || 0);
  openOverlay(`
    <div class="modal result-modal" style="width:min(440px,100%);padding:34px">
      <p class="modal-kicker">A BUST ON THE TABLE</p>
      <h2 style="font-size:26px;margin-top:6px">掷空了，要撒盐吗？</h2>
      <p class="result-sub">${saved > 0 ? `本轮 ${num(saved)} 分还摆在桌上。` : '本轮还没有分数可保。'}撒盐会把它们收进本关得分，盐会被消耗掉。</p>
      <div class="modal-actions" style="margin-top:22px">
        <button class="secondary-button" data-action="salt-decline">不用，认栽</button>
        <button class="primary-button" data-action="salt-use">撒盐 · 保住本轮</button>
      </div>
    </div>`, { dismissible: false });
}

export function answerSaltOffer(use: boolean): void {
  const run = app.run;
  if (!run) return;
  const result = engineResolveSaltOffer(run, use);
  if (!result.ok) {
    showToast(result.error!, 'error');
    return;
  }
  closeOverlay();
  renderGame();
  if (use) {
    showToast(result.saved
      ? `盐保住了本轮 ${num(result.saved)} 分。`
      : '盐撒下去了，但本轮本来没有分数可保。', 'good');
  } else if (result.lost) {
    showBustNotice(result.lost);
  }
  if (run.phase === 'lost') showDefeat();
}

export function showLoanOffer(): void {
  const run = app.run;
  if (!run || !run.flags.loanOffer) return;
  const barrel = getBarrel(run);
  const loanCost = barrelLoanCost(barrel) ?? 40;
  const saved = Math.max(0, run.roundScore || 0);
  openOverlay(`
    <div class="modal result-modal" style="width:min(440px,100%);padding:34px">
      <p class="modal-kicker">A BUST ON THE TABLE</p>
      <h2 style="font-size:26px;margin-top:6px">要借运重投吗？</h2>
      <p class="result-sub">${saved > 0 ? `本轮 ${num(saved)} 分还摆在桌上。` : '本轮还没有分数可保。'}支付 ${loanCost} 银币，这一手可以重来一次；每关只能借一次。</p>
      <div class="modal-actions" style="margin-top:22px">
        <button class="secondary-button" data-action="loan-decline">不借，认栽</button>
        <button class="primary-button" data-action="loan-pay">借运 · 付 ${loanCost} 银币重投</button>
      </div>
    </div>
  `, { dismissible: false });
}

export function answerLoanOffer(pay: boolean): void {
  const run = app.run;
  if (!run) return;
  const result = engineResolveLoanOffer(run, pay);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  closeOverlay();
  renderGame();
  if (pay) showToast(`借运桶付出 ${result.paid} 银币，重新落骰。`, 'good');
  if (run.flags.loanOffer) showLoanOffer();
  else if (run.flags.saltOffer) showSaltOffer();
  else if (run.phase === 'lost') showDefeat();
}

export function showTwoFaceOffer(): void {
  const run = app.run;
  if (!run || !run.flags.twoFacePending) return;
  openOverlay(`
    <div class="modal result-modal" style="width:min(440px,100%);padding:34px">
      <p class="modal-kicker">CHOOSE TWO FACES</p>
      <h2 style="font-size:26px;margin-top:6px">双面桶要偏向哪两面？</h2>
      <p class="result-sub">选择两个点数，本关这两面的出现概率会大幅提高。</p>
      <div class="twoface-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0">
        ${[1, 2, 3, 4, 5, 6].map((face) => `<button class="secondary-button twoface-face" data-action="twoface-face" data-face="${face}">${face}</button>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="primary-button" data-action="twoface-confirm">定下两面</button>
      </div>
    </div>
  `, { dismissible: false });
}

export function answerTwoFace(): void {
  const run = app.run;
  if (!run) return;
  const faces = [...document.querySelectorAll<HTMLElement>('.twoface-face.is-selected')]
    .map((el) => Number(el.dataset.face));
  const result = setTwoFaceFaces(run, faces);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  closeOverlay();
  beginRoll();
}

export function toggleTwoFace(face: number): void {
  const buttons = [...document.querySelectorAll<HTMLElement>('.twoface-face')];
  const selected = buttons.filter((el) => el.classList.contains('is-selected'));
  const target = buttons.find((el) => Number(el.dataset.face) === face);
  if (!target) return;
  if (target.classList.contains('is-selected')) {
    target.classList.remove('is-selected');
    return;
  }
  if (selected.length >= 2) selected[0]?.classList.remove('is-selected');
  target.classList.add('is-selected');
}

export function hintBestScore(): void {
  const run = app.run;
  if (!run) return;
  const result = selectBestScoring(run);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  renderGame();
  showToast(`已选择本次最高分组合：+${num(result.total || 0)}`, 'good');
}

export function beginRoll({ free = false }: { free?: boolean } = {}): void {
  if (!app.run || app.busy || app.introOpen) return;
  const run = app.run;
  if (run.flags.twoFacePending) { showTwoFaceOffer(); return; }
  const allowedNormal = ['ready', 'dead', 'hot', 'selecting', 'reroll-pending'].includes(run.phase);
  if (!allowedNormal && !free) return;
  const freeContinuation = run.phase === 'reroll-pending' && !run.flags.rerollAll;
  if (!free && run.phase === 'dead' && run.flags.floatingBustPending && run.rerolls <= 0) {
    settleFloatingBust(run);
    renderGame();
    showDefeat();
    return;
  }
  if (run.rerolls <= 0 && run.phase !== 'hot' && run.phase !== 'ready' && !free && !freeContinuation) {
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
export function startCupHold(onReady?: () => void): boolean {
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
  const gatherUids = cupDiceToGather(run).map((die) => die.uid);
  app.cupHoldPromise = (async () => {
    if (prefersReducedMotion()) {
      onReady?.();
      return;
    }
    // The held cup is already the anticipation beat; skip the slow table spin
    // so the gather starts immediately and the 2s countdown is not competing
    // with a delayed animation.
    await capped(gatherDiceToCup(gatherUids), 1500);
    if (!app.cupHoldStarted) return;
    // Start the throw timer once the dice have visibly reached the cup. The
    // cup can finish rattling/inverting during the countdown.
    onReady?.();
    motion.cupRattle($('#cup-vessel'), { cycles: 1 });
    sound.rattle();
    await sleep(320);
    if (!app.cupHoldStarted) return;
    if (!ritualHold) {
      await capped(invertCup(), 900);
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

export function cancelCupHold(): void {
  if (!app.cupHoldStarted) return;
  resetCupVisuals();
  app.busy = false;
  app.rolling = false;
  app.cupAnimating = false;
  renderGame();
}

export function handleScore(action: ScoreAction): void {
  if (!app.run || app.busy || app.introOpen) return;
  const run = app.run;
  if (run.phase !== 'selecting') return;
  const selected = selectedDice(run);
  if (!selected.length) { showToast('先选择要计分的骰子。'); return; }
  const preview = getScorePreview(run);
  if (!preview.valid) { showToast(preview.error!, 'error'); return; }
  if (action === 'reroll' && run.rerolls <= 0) { showToast('没有剩余重投次数。', 'error'); return; }
  const rect = selected[0] ? $(`[data-die-uid="${CSS.escape(selected[0].uid)}"]`)?.getBoundingClientRect() : null;
  const wasReached = run.score >= run.target;
  const chosen = action === 'continue' ? preview.continue : action === 'bank' ? preview.bank : preview.reroll;
  const selectedValues = selected.map((die) => die.wild ? 'wild' : (die.value ?? 'blank'));
  const combos = chosen.analysis.combos.map((combo) => combo.label);
  const result = applyScore(run, action);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  guideEvent(action === 'continue' ? 'continue' : 'reroll', run);
  recordScore(run, {
    selectedValues,
    selectedDice: selected.map((die) => ({
      uid: die.uid,
      dieId: die.dieId,
      value: die.wild ? 'wild' : (die.value ?? 'blank'),
    })),
    combos,
    points: result.total || 0,
    action,
  });
  app.busy = true;
  sound.score(result.total!);
  showScoreFloat(result.total!, rect, result.hotMultiplier || 1);
  showCoinFloat(result.coins || 0, result.pendingCoins || 0, run);
  renderGame();
  if (result.hot) showHotComboCallout(result.hotCount || 0);
  speakOnScore(result.total!, run);
  clearTimeout(app.rollTimer ?? undefined);
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

export function advanceCurrentLevel(): void {
  if (!app.run || app.busy || app.introOpen) return;
  const result = advanceLevel(app.run);
  if (!result.ok) {
    showToast(result.error!, 'error');
    return;
  }
  app.busy = true;
  app.resultShown = false;
  clearTimeout(app.rollTimer ?? undefined);
  renderGame();
  saveGame(app.run, getRunRecord());
  void uploadActiveGame(app.run, getRunRecord());
  setTimeout(() => {
    app.busy = false;
    showVictory();
  }, 260);
}

/* Hand-drawn flame frames, swapped at a deliberately choppy step rate. */
const FIRE_FRAMES = [1, 2, 3, 4].map((n) => `assets/art/fx/fire-${n}.svg`);
const FIRE_TIERS = [
  { min: 6000, className: 'is-blaze', flames: 3 },
  { min: 2000, className: 'is-flame', flames: 2 },
  { min: 1000, className: 'is-spark', flames: 1 },
];

function scoreFireHtml(flames: number): string {
  const frames = FIRE_FRAMES.map((src) => `<img src="${src}" alt="">`).join('');
  return Array.from({ length: flames }, (_, index) => `<span class="float-fire" style="--flux:${index}">${frames}</span>`).join('');
}

let longScoreFloat: HTMLElement | null = null;
let longScoreTimer: ReturnType<typeof setTimeout> | null = null;
let longScoreValue = 0;

function scoreFloatHtml(total: number, tier: (typeof FIRE_TIERS)[number] | undefined, hotMultiplier = 1): string {
  return `${tier ? scoreFireHtml(tier.flames) : ''}+${num(total)}<small>SCORE</small>${hotMultiplier > 1 ? `<em class="float-chain">全骰连击 ×${hotMultiplier.toFixed(2)}</em>` : ''}`;
}

function showGuideFixFx(): void {
  const cup = $('#cup');
  const rect = cup?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const fx = document.createElement('div');
  fx.id = 'barrel-fx';
  fx.className = 'guide-fix-fx';
  fx.style.left = `${x}px`;
  fx.style.top = `${y}px`;
  fx.innerHTML = '<i></i><b>顺遂</b><small>补成顺子</small>';
  document.body.append(fx);
  sound.tone(760, .12, 'sine', .025);
  window.setTimeout(() => fx.remove(), 950);
}

function showScoreFloat(total: number, rect: DOMRect | null | undefined, hotMultiplier = 1) {
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top - 10 : window.innerHeight / 2;
  // A high-value hit keeps its numbers on screen for ten seconds. Any score
  // that lands during that window is added to the same float and restarts it.
  if (longScoreFloat && document.body.contains(longScoreFloat)) {
    longScoreValue += total;
    const mergedTier = FIRE_TIERS.find((entry) => longScoreValue > entry.min);
    longScoreFloat.className = `score-float is-long${mergedTier ? ` ${mergedTier.className}` : ''}`;
    longScoreFloat.style.left = `${x}px`;
    longScoreFloat.style.top = `${y}px`;
    longScoreFloat.innerHTML = scoreFloatHtml(longScoreValue, mergedTier, hotMultiplier);
    if (longScoreTimer) clearTimeout(longScoreTimer);
    longScoreTimer = setTimeout(() => {
      longScoreFloat?.remove();
      longScoreFloat = null;
      longScoreTimer = null;
      longScoreValue = 0;
    }, 10000);
    return;
  }

  const tier = FIRE_TIERS.find((entry) => total > entry.min);
  const el = document.createElement('div');
  el.className = `score-float${tier ? ` ${tier.className}` : ''}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = scoreFloatHtml(total, tier, hotMultiplier);
  document.body.append(el);
  if (tier) {
    el.classList.add('is-long');
    longScoreFloat = el;
    longScoreValue = total;
    longScoreTimer = setTimeout(() => {
      el.remove();
      longScoreFloat = null;
      longScoreTimer = null;
      longScoreValue = 0;
    }, 10000);
  } else {
    setTimeout(() => el.remove(), 1400);
  }
}

/** The hot counter escalates: a hop at the corner, and from the third hot the
 *  number itself slams in full-screen and shrinks onto the badge. */
function showHotComboCallout(count: number) {
  const badge = $('#hot-combo');
  if (!badge) return;
  badge.classList.remove('is-landing');
  void badge.offsetWidth;
  badge.classList.add('is-landing');
  setTimeout(() => badge.classList.remove('is-landing'), 900);
  if (count < 3) return;
  const target = badge.getBoundingClientRect();
  const callout = document.createElement('div');
  callout.className = 'hot-callout';
  callout.innerHTML = `<div class="hot-callout-body"><span>全骰</span><b>×${count}</b></div>`;
  callout.style.setProperty('--fly-x', `${target.left + target.width / 2 - window.innerWidth / 2}px`);
  callout.style.setProperty('--fly-y', `${target.top + target.height / 2 - window.innerHeight / 2}px`);
  document.body.append(callout);
  // Hold the full-screen number long enough to read, then shrink it into the badge.
  setTimeout(() => callout.classList.add('is-flying'), 380);
  setTimeout(() => callout.remove(), 1500);
}

/** 金痕 coins only land when the round is locked in, so a continue shows the
 *  amount as pending next to the coin pill instead of moving the counter. */
function showCoinFloat(paid: number, pending: number, run: RunState) {
  if (!paid && !pending) return;
  const pill = $('#coin-pill')?.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = paid ? 'coin-float' : 'coin-float is-pending';
  const x = pill ? pill.left + pill.width / 2 : window.innerWidth / 2;
  const y = pill ? pill.bottom + 14 : 120;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = paid
    ? `+${num(paid)}<small>银币</small>`
    : `待入账 +${num(run.roundCoins || 0)}<small>锁分后入账</small>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1500);
}

/** 停审令牌 waives this reroll: pulse the reroll badge and float a note. */
function showJudgePardon() {
  const badge = $('#reroll-inline');
  if (badge) {
    badge.classList.remove('is-pardoned');
    void badge.offsetWidth;
    badge.classList.add('is-pardoned');
    setTimeout(() => badge.classList.remove('is-pardoned'), 1300);
  }
  const rect = badge?.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'coin-float is-pardon';
  el.style.left = `${rect ? rect.left + rect.width / 2 : window.innerWidth - 90}px`;
  el.style.top = `${rect ? rect.bottom + 10 : 240}px`;
  el.innerHTML = `停审令牌<small>本次重投不扣次数</small>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1700);
  sound.item();
}

function showHotBurst() {
  const burst = document.createElement('div');
  burst.className = 'hot-burst';
  burst.innerHTML = '<span>全骰 · HOT DICE</span>';
  $('#scene')?.append(burst);
  sound.win();
  setTimeout(() => burst.remove(), 1700);
}

function speakOnScore(total: number, run: RunState) {
  if (total >= 700 || run.score >= run.target * .75) {
    const opponent = getOpponent(run.level, run)!;
    const lines = opponent.taunts || [];
    if (lines.length) setSpeech(lines[Math.floor(Math.random() * lines.length)]!);
  }
}

function speakRandomTaunt(probability = .3) {
  if (!app.run || Math.random() > probability) return;
  const opponent = getOpponent(app.run.level, app.run)!;
  const lines = opponent.taunts || [];
  if (lines.length) setSpeech(lines[Math.floor(Math.random() * lines.length)]!);
}

export function setSpeech(text: string): void {
  const bubble = $('#speech-bubble');
  const textEl = $('#speech-text');
  if (!bubble || !textEl || !text) return;
  clearTimeout(app.speechTimer ?? undefined);
  bubble.classList.add('is-changing');
  app.speechTimer = setTimeout(() => {
    textEl.textContent = text;
    bubble.classList.remove('is-changing');
  }, 180);
}

/* ═══════════════════════════════════════════════════════════════════
   Items
   ═══════════════════════════════════════════════════════════════════ */
/* Active items always ask first: a one-shot has no undo. */
export function requestUseItem(itemId: string): void {
  const run = app.run;
  if (!run || app.busy || app.introOpen) return;
  const check = canUseItem(run, itemId);
  if (!check.ok) {
    showToast(check.error!, 'error');
    return;
  }
  const item = ITEM_BY_ID[itemId]!;
  openOverlay(`
    <div class="modal result-modal" style="width:min(440px,100%);padding:34px">
      <p class="modal-kicker">USE AN ITEM</p>
      <h2 style="font-size:26px;margin-top:6px">使用「${h(item.name)}」？</h2>
      <p class="result-sub">${h(item.desc)}</p>
      <div class="modal-actions" style="margin-top:22px">
        <button class="secondary-button" data-action="close-overlay">再想想</button>
        <button class="primary-button" data-action="confirm-use-item" data-item-id="${h(itemId)}">使用</button>
      </div>
    </div>`);
}

export function confirmUseItem(itemId: string): void {
  closeOverlay();
  useItem(itemId);
}

export function useItem(itemId: string): void {
  if (!app.run || app.busy || app.introOpen) return;
  const wasReached = app.run.score >= app.run.target;
  const check = canUseItem(app.run, itemId);
  if (!check.ok) { showToast(check.error!, 'error'); return; }
  const result = engineUseItem(app.run, itemId);
  if (!result.ok) { showToast(result.error!, 'error'); return; }

  // Dice-granting consumables open their own choice panel before being spent.
  if (result.grant) {
    if (result.grant.candidates.length <= 1) {
      grantItemDie(itemId, result.grant.candidates[0]!.id);
      return;
    }
    app.pendingGrant = { itemId, candidates: result.grant.candidates };
    showGrantModal();
    return;
  }

  sound.item();
  showToast(`${ITEM_BY_ID[itemId]!.name}：${ITEM_BY_ID[itemId]!.desc}`, 'good');
  renderGame();
  if (result.rerollFree) {
    setTimeout(() => beginRoll({ free: true }), 380);
  } else if (!wasReached && app.run.score >= app.run.target) {
    showToast('目标已达成 · 可以继续得分，准备好后再点「下一关」。', 'good');
  } else if (app.run.phase === 'lost') {
    setTimeout(() => showDefeat(), 500);
  }
}

export function showGrantModal(): void {
  if (!app.run || !app.pendingGrant) return;
  const { itemId, candidates } = app.pendingGrant;
  const item = ITEM_BY_ID[itemId]!;
  const cards = candidates.map((die: PricedDie) => {
    const rarity = rarityOf(die);
    return `<button class="replace-option" data-action="choose-grant-die" data-die-id="${h(die.id)}" style="--rarity:${rarity.color};--glow:${rarity.glow}">
      ${artDieImageHtml(die)}
      <b>${h(die.name)}</b><span>${rarity.name}${die.setId ? ` · ${h(DICE_SETS[die.setId].name)}` : ''}</span>
      <small style="display:block;color:var(--muted);font-size:10px;line-height:1.6;margin-top:4px">${h(die.desc)}</small>
    </button>`;
  }).join('');
  openOverlay(`
    <div class="modal" style="width:min(660px,100%);padding:34px 36px">
      <p class="modal-kicker">OPEN THE DICE CASE</p>
      <h2 class="modal-title" style="font-size:28px;margin-top:5px">选择一枚骰子</h2>
      <p class="modal-text" style="margin-top:8px">「${h(item.name)}」开出 ${candidates.length} 枚稀有骰子；选择其中 1 枚收入骰袋。骰袋已满时，下一步再选择要替换的骰子。</p>
      <div class="replace-grid">${cards}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="cancel-grant">放弃</button></div>
    </div>
  `, { dismissible: true });
}

export function chooseGrantDie(dieId: string): void {
  if (!app.run || !app.pendingGrant) return;
  grantItemDie(app.pendingGrant.itemId, dieId);
}

function grantItemDie(itemId: string, dieId: string): void {
  if (!app.run) return;
  const result = applyItemGrant(app.run, itemId, dieId);
  if (!result.ok) {
    if (result.needReplace && result.die) {
      app.pendingGrant = null;
      app.pendingGrantReplace = { itemId, die: result.die };
      showGrantReplaceModal();
      return;
    }
    showToast(result.error!, 'error');
    return;
  }
  finishGrant(result);
}

function showGrantReplaceModal(): void {
  if (!app.run || !app.pendingGrantReplace) return;
  const { die } = app.pendingGrantReplace;
  const item = ITEM_BY_ID[app.pendingGrantReplace.itemId]!;
  const options = app.run.bag.map((entry) => {
    const spec = getDieSpec(entry.dieId);
    const rarity = rarityOf(spec);
    return `<button class="replace-option" data-action="confirm-grant-replace" data-bag-uid="${h(entry.uid)}" data-die-tip="${h(spec.id)}">
      ${artDieImageHtml(spec)}
      <b>${h(spec.name)}</b><span>${rarity.name}${spec.setId ? ` · ${h(DICE_SETS[spec.setId].name)}` : ''}</span>
    </button>`;
  }).join('');
  openOverlay(`
    <div class="modal" style="width:min(620px,100%);padding:36px 38px">
      <p class="modal-kicker">DICE BAG FULL</p>
      <h2 class="modal-title" style="font-size:28px;margin-top:5px">骰袋已满</h2>
      <p class="modal-text" style="margin-top:8px">「${h(item.name)}」开出了「${h(die.name)}」。请选择一枚被替换的骰子；被替换的骰子将离开本局。</p>
      <div class="replace-grid">${options}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="cancel-grant-replace">取消</button></div>
    </div>
  `, { dismissible: true });
}

export function confirmGrantReplace(bagUid: string): void {
  if (!app.run || !app.pendingGrantReplace) return;
  const { itemId, die } = app.pendingGrantReplace;
  const result = applyItemGrant(app.run, itemId, die.id, bagUid);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  finishGrant(result);
}

function finishGrant(result: ReturnType<typeof applyItemGrant>): void {
  const inShop = app.run?.phase === 'shop';
  app.pendingGrant = null;
  app.pendingGrantReplace = null;
  closeOverlay();
  sound.item();
  renderGame();
  if (inShop) {
    void import('./screens/shop.ts').then(({ renderShopScreen }) => renderShopScreen());
  }
  const suffix = result.replaced ? `，替换了「${result.replaced.name}」` : '';
  showToast(`获得「${result.die!.name}」${suffix}。`, 'good');
}

export function cancelGrant(): void {
  app.pendingGrant = null;
  app.pendingGrantReplace = null;
  closeOverlay();
}

export function cancelGrantReplace(): void {
  app.pendingGrantReplace = null;
  closeOverlay();
}

export function forfeitRun(): void {
  if (!app.run || app.busy) return;
  const result = forfeit(app.run);
  if (!result.ok) return;
  renderGame();
  showDefeat();
}

/* ═══════════════════════════════════════════════════════════════════
   Cup drag — horizontal only, exactly as the brief asks
   ═══════════════════════════════════════════════════════════════════ */
export function bindCupDrag(): void {
  const cup = $('#cup');
  if (!cup) return;
  let dragging = false;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragZoom = 1;
  let dx = 0;
  let dy = 0;
  let traceRadius = 86;
  let traceCenter = { x: 0, y: 0 };
  let cupCenter = { x: 0, y: 0 };
  let dragMin = -138;
  let dragMax = 138;
  let dragMinY = -138;
  let dragMaxY = 138;

  const canDrag = () => app.run && !app.busy && !app.introOpen
    && (app.run.phase === 'ready' || app.run.phase === 'hot' || app.run.phase === 'selecting' || app.run.phase === 'reroll-pending'
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
    dragZoom = uiZoom(cup);
    dx = 0;
    dy = 0;
    const cupRect = cup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    cupCenter = { x: cupRect.left + cupRect.width / 2, y: cupRect.top + cupRect.height / 2 };
    traceCenter = { ...cupCenter };
    traceRadius = clamp(viewportWidth * .1, 64, 108);
    dragMin = margin - cupRect.left;
    dragMax = viewportWidth - margin - cupRect.right;
    dragMinY = margin - cupRect.top;
    dragMaxY = viewportHeight - margin - cupRect.bottom;
    if (dragMax < dragMin) { dragMin = 0; dragMax = 0; }
    if (dragMaxY < dragMinY) { dragMinY = 0; dragMaxY = 0; }
    const minCenterX = cupCenter.x + dragMin;
    const maxCenterX = cupCenter.x + dragMax;
    const minCenterY = cupCenter.y + dragMinY;
    const maxCenterY = cupCenter.y + dragMaxY;
    traceRadius = Math.min(
      traceRadius,
      Math.max(36, (maxCenterX - minCenterX) / 2),
      Math.max(36, (maxCenterY - minCenterY) / 2),
    );
    traceCenter.x = clamp(traceCenter.x, minCenterX + traceRadius, maxCenterX - traceRadius);
    traceCenter.y = clamp(traceCenter.y, minCenterY + traceRadius, maxCenterY - traceRadius);
    try { cup.setPointerCapture(pointerId); } catch { /* pointerup fallback below */ }
    cup.classList.add('is-dragging');
  });

  const onCupMove = (event: PointerEvent) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dx = clamp(event.clientX - startX, dragMin, dragMax);
    dy = clamp(event.clientY - startY, dragMinY, dragMaxY);
    const tilt = clamp(dx * .02, -9, 9);
    cup.style.transform = `translate(${dx / dragZoom}px, ${dy / dragZoom}px) rotate(${tilt}deg)`;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      sound.rattle();
      if (!app.cupHoldStarted) {
        if (startCupHold(() => {
          if (dragging && app.cupHoldStarted) beginCupCountdown(finish);
        })) {
          const info = cupGestureInfo(app.run!);
          if (info) beginCupTrace(traceCenter, traceRadius, info);
        }
      }
      if (app.cupTrace) recordCupTrace(event.clientX, event.clientY);
    }
  };
  cup.addEventListener('pointermove', onCupMove);
  // Pointer capture is not guaranteed in every browser/headless shell. Keep
  // tracking on window so the cup can travel across the entire tabletop.
  window.addEventListener('pointermove', onCupMove);

  const finish = async (event?: Event) => {
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
      // Capture where the player actually let go before the cup snaps home;
      // the dice must reappear from that spot.
      const releaseFrom = cupWorldPoint();
      cup.style.transform = '';
      if (!app.cupHoldStarted) return;
      await performCupRoll({ prepared: true, free: app.run?.phase === 'hot', from: releaseFrom });
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
  // Dragging the cup out of the window should commit the throw immediately
  // instead of leaving the cup mid-shake forever.
  window.addEventListener('mouseout', (event) => {
    if (dragging && !event.relatedTarget) void finish();
  });
  window.addEventListener('blur', () => { if (dragging) void finish(); });

  cup.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      if (canDrag()) beginRoll();
    }
  });
}

