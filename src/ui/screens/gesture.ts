// ui/screens/gesture.ts — 骰桶仪式：五芒星与旋涡的描线小游戏。
//
// 从 app.js「Gesture minigame」一节原样搬出。画布与判定阈值被
// tools/cup-trace-test.mjs 依赖；成功之后由 game.ts 的 renderGame 重画牌桌，
// 所以这里 import 的是对局控制而不是组装层。
import { applyGesture, getBarrel } from '../../core/engine.ts';
import { h } from '../../core/util.ts';
import { sound } from '../../platform/sound.ts';
import { closeOverlay, openOverlay } from '../components/overlay.ts';
import { showToast } from '../components/toast.ts';
import { $, $$ } from '../dom.ts';
import { renderGame } from '../game.ts';
import { app } from '../state.ts';

/* ═══════════════════════════════════════════════════════════════════
   Gesture minigame
   ═══════════════════════════════════════════════════════════════════ */
export function openGesture(): void {
  if (!app.run || app.busy) return;
  const barrel = getBarrel(app.run);
  const gesture = barrel.type === 'gesture' ? barrel.gesture : null;
  if (!gesture) return;
  if (app.run.flags.gestureUsedThisThrow) { showToast('本次投掷已经完成过仪式。'); return; }
  if (gesture === 'pentagram' && app.run.flags.starUsed) { showToast('五芒星每关只能生效一次。'); return; }
  if (gesture === 'circle' && app.run.flags.vortexUsed) { showToast('旋涡桶的额外重投每关只能获得一次。'); return; }
  closeOverlay();
  const isStar = gesture === 'pentagram';
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

function starNodes(): { x: number; y: number; index: number; order: number }[] {
  const positions = [
    { x: 50, y: 9 }, { x: 90, y: 37 }, { x: 76, y: 87 }, { x: 24, y: 87 }, { x: 10, y: 37 },
  ];
  // Star path order: top -> lower-right -> upper-left -> upper-right -> lower-left.
  const order = [0, 2, 4, 1, 3];
  return positions.map((pos, index) => ({ ...pos, index, order: order.indexOf(index) }));
}

function initGestureBoard(isStar: boolean, nodes: { x: number; y: number; index: number; order: number }[]): void {
  const board = $('#gesture-board');
  const canvas = $<HTMLCanvasElement>('#gesture-canvas');
  if (!board || !canvas) return;
  const status = $('#gesture-status')!;
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let drawing = false;
  let points: { x: number; y: number; w: number; h: number }[] = [];
  let nodeHits: number[] = [];
  let totalPositive = 0;
  let totalNegative = 0;
  let lastAngle: number | null = null;
  let radiusSamples: number[] = [];
  let finished = false;

  const resize = () => {
    const rect = board.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  };
  const localPoint = (event: PointerEvent) => {
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
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i]!.x, points[i]!.y);
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
    $$('.gesture-node', board!).forEach((node) => node.classList.remove('is-lit'));
    status.textContent = isStar ? '从任意星点开始，沿五角星描线。' : '在圆盘内顺时针画一圈。';
    status.className = 'gesture-status';
    redraw();
  };
  app.gestureReset = reset;
  window.addEventListener('resize', resize);

  const registerNodeHits = (point: { x: number; y: number; w: number; h: number }) => {
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

  const pointerDown = (event: PointerEvent) => {
    if (finished) return;
    event.preventDefault();
    drawing = true;
    points = [];
    nodeHits = [];
    totalPositive = 0;
    totalNegative = 0;
    lastAngle = null;
    radiusSamples = [];
    $$('.gesture-node', board!).forEach((node) => node.classList.remove('is-lit'));
    const point = localPoint(event);
    points.push(point);
    registerNodeHits(point);
    board.setPointerCapture(event.pointerId);
    redraw();
  };
  const pointerMove = (event: PointerEvent) => {
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
  const pointerUp = (event: PointerEvent) => {
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
    const minRadius = board!.getBoundingClientRect().width * .2;
    const maxRadius = board!.getBoundingClientRect().width * .48;
    const inBand = radiusSamples.length && radiusSamples.every((r) => r >= minRadius * .65 && r <= maxRadius * 1.1);
    if (totalPositive >= Math.PI * 1.55 && totalNegative < totalPositive * .35 && inBand) {
      finishSuccess('旋涡闭合，骰桶开始自行转动。');
    } else if (totalNegative > totalPositive) {
      finishFail('方向反了。顺时针再画一次。');
    } else {
      finishFail('圈还没有画满。保持在一个圆上，顺时针画一整圈。');
    }
  }

  function finishSuccess(message: string) {
    if (finished) return;
    finished = true;
    status.textContent = message;
    status.className = 'gesture-status is-success';
    sound.gesture();
    const result = applyGesture(app.run!, isStar ? 'pentagram' : 'circle');
    setTimeout(() => {
      if (result.ok) {
        closeOverlay();
        renderGame();
        showToast(result.message!, 'good');
      } else {
        finished = false;
        status.textContent = result.error ?? '';
        status.className = 'gesture-status is-fail';
      }
    }, 850);
  }
  function finishFail(message: string) {
    status.textContent = message;
    status.className = 'gesture-status is-fail';
    points = [];
    nodeHits = [];
    totalPositive = 0;
    totalNegative = 0;
    lastAngle = null;
    redraw();
    $$('.gesture-node', board!).forEach((node) => node.classList.remove('is-lit'));
  }

  board.addEventListener('pointerdown', pointerDown);
  board.addEventListener('pointermove', pointerMove);
  board.addEventListener('pointerup', pointerUp);
  board.addEventListener('pointercancel', pointerUp);
  resize();
  app.gestureCleanup = () => window.removeEventListener('resize', resize);
}

function starSequenceValid(seq: number[]): boolean {
  const unique = seq.filter((value, index) => value !== seq[index - 1]);
  if (unique.length < 5) return false;
  const first = unique[0]!;
  const cycle = [];
  let index = unique.indexOf(first);
  if (index === -1) return false;
  for (let i = 0; i < 5; i += 1) {
    cycle.push(unique[(index + i) % unique.length]!);
  }
  const pattern = [0, 2, 4, 1, 3];
  const reversePattern = [...pattern].reverse();
  const rotations = (arr: number[]) => Array.from({ length: 5 }, (_, r) => arr.map((_, i) => arr[(i + r) % 5]).join(','));
  return rotations(pattern).includes(cycle.join(',')) || rotations(reversePattern).includes(cycle.join(','));
}
