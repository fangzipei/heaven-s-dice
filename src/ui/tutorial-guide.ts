// ui/tutorial-guide.ts — first-level, action-gated guide for the current UI.
import { showToast } from './components/toast.ts';
import type { RunState } from '../core/types.ts';

type Gate = 'next' | 'rail' | 'closeRail' | 'roll' | 'hint' | 'continue'
  | 'reroll' | 'selectTriple' | 'selectFullStraight';

interface Step {
  selector: string;
  extraSelector?: string;
  allowAction?: string;
  title: string;
  body: string;
  gate: Gate;
}

const STEPS: Step[] = [
  {
    selector: '.score-panel',
    title: '先看分数面板',
    body: '左上角的大数字是已经落袋的分数；旁边是本轮还没入袋的浮动分；右边是本关目标。教程结束后会从正式第一关重新开始。',
    gate: 'next',
  },
  {
    selector: '.rail-paper-ball',
    title: '认识废纸团',
    body: '右侧现在默认收成一颗废纸团。点开它，就能查看随身物品、骰型规则、套组和赌桌记录。',
    gate: 'rail',
  },
  {
    selector: '.rail-card.items-card',
    title: '随身物品',
    body: '这里会放主动物品和被动物品。现在还是空的；之后的市集才会给你第一件物品。',
    gate: 'next',
  },
  {
    selector: '.rail-collapse',
    title: '收起情报',
    body: '看完后点右上角的 X 收起废纸团，回到牌桌。',
    gate: 'closeRail',
  },
  {
    selector: '.cup-zone',
    extraSelector: '.action-dock',
    title: '摇第一手',
    body: '按住右侧骰桶摇动约 2 秒，骰子会落桌；也可以直接点下方「自动投掷」。',
    gate: 'roll',
  },
  {
    selector: '.hint-score-button',
    title: '提示最高分',
    body: '不用自己算。点「提示最高分」，系统会选出当前能组成的最高分组合；你仍然可以手动改选。',
    gate: 'hint',
  },
  {
    selector: '[data-action="score-reroll"]',
    allowAction: 'score-reroll',
    title: '计分并重投',
    body: '点「计分并重投」：本轮分数落袋，六颗骰子重新开始，并消耗 1 次重投。',
    gate: 'reroll',
  },
  {
    selector: '[data-action="auto-roll"]',
    allowAction: 'auto-roll',
    title: '自动投掷',
    body: '点「自动投掷」，让六颗骰子重新落桌。',
    gate: 'roll',
  },
  {
    selector: '.dice-zone',
    title: '选出三条 3',
    body: '点选三颗 3，组成三条。三条 3 的基础分是 300。',
    gate: 'selectTriple',
  },
  {
    selector: '[data-action="score-reroll"]',
    allowAction: 'score-reroll',
    title: '计分并重投',
    body: '点「计分并重投」：本轮分数落袋，六颗骰子重新开始，并消耗 1 次重投。',
    gate: 'reroll',
  },
  {
    selector: '.cup-zone',
    extraSelector: '.action-dock',
    title: '再摇一手',
    body: '摇出这一手的完整顺子。',
    gate: 'roll',
  },
  {
    selector: '.dice-zone',
    title: '选中完整顺子',
    body: '点选 1、2、3、4、5、6 六颗骰子，组成天地顺。基础分是 1500。',
    gate: 'selectFullStraight',
  },
  {
    selector: '[data-action="score-continue"]',
    allowAction: 'score-continue',
    title: '全骰与继续',
    body: '点「计分并继续」。六颗骰子全部计分会触发全骰：免费重投六颗，但本轮不会结束。',
    gate: 'continue',
  },
  {
    selector: '.score-panel',
    extraSelector: '.score-pending',
    title: '红框里的浮动分',
    body: '红框标出的是本轮浮动分：它还没有真正落袋。下一次掷空会清空它；只有「计分并重投」才会把它收进本关已得。',
    gate: 'next',
  },
  {
    selector: '.action-dock',
    title: '教程结束',
    body: '你已走完一手完整流程。点下面按钮进入正式第一关；之后随时可以点右上角规则重看说明。',
    gate: 'next',
  },
];

const ROLLS: number[][] = [
  [1, 5, 1, 5, 2, 3],
  [3, 3, 3, 5, 2, 3],
  [1, 2, 3, 4, 5, 6],
];

let guideIndex = 0;
let guideRoot: HTMLElement | null = null;
let rollIndex = 0;
let highlightObserver: MutationObserver | null = null;
let onComplete: (() => void) | null = null;

function counts(run: RunState): Map<number, number> {
  const map = new Map<number, number>();
  for (const die of run.dice) {
    if (!run.selected.includes(die.uid) || die.value == null) continue;
    map.set(die.value, (map.get(die.value) || 0) + 1);
  }
  return map;
}

function hasStraight(run: RunState, length: number): boolean {
  const values = new Set<number>();
  for (const die of run.dice) {
    if (run.selected.includes(die.uid) && typeof die.value === 'number') values.add(die.value);
  }
  const faces = [...values].sort((a, b) => a - b);
  if (length === 6) return faces.length === 6 && faces[0] === 1 && faces[5] === 6;
  return faces.some((face, i) => faces.slice(i, i + length).every((v, j) => v === face + j));
}

function gateMet(step: Step, run: RunState): boolean {
  const c = counts(run);
  switch (step.gate) {
    case 'selectTriple': return [...c.values()].some((n) => n >= 3);
    case 'selectFullStraight': return hasStraight(run, 6);
    default: return false;
  }
}

function highlightedNodes(): HTMLElement[] {
  const step = STEPS[guideIndex];
  if (!step) return [];
  return [step.selector, step.extraSelector]
    .filter((selector): selector is string => Boolean(selector))
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((node): node is HTMLElement => Boolean(node));
}

function applyHighlights(): void {
  const step = STEPS[guideIndex];
  if (!step) return;
  document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
  document.querySelectorAll('.guide-focus-red').forEach((el) => el.classList.remove('guide-focus-red'));
  highlightedNodes().forEach((node) => node.classList.add('guide-highlight'));
  if (step.extraSelector === '.score-pending') {
    document.querySelector('.score-pending')?.classList.add('guide-focus-red');
  }
}

function paint(): void {
  const step = STEPS[guideIndex]!;
  applyHighlights();
  if (!guideRoot) return;
  const manual = step.gate === 'next';
  guideRoot.innerHTML = `
    <section class="guide-card" role="dialog" aria-label="新手引导">
      <header><span>新手引导</span><em>${guideIndex + 1} / ${STEPS.length}</em></header>
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      <div class="guide-actions">
        ${manual ? '<button class="primary-button" data-guide="next">下一步</button>' : '<span class="guide-wait">按提示操作后自动继续</span>'}
        <button class="text-button" data-guide="close">跳过引导</button>
      </div>
    </section>`;
  guideRoot.querySelector('[data-guide="next"]')?.addEventListener('click', advance);
  guideRoot.querySelector('[data-guide="close"]')?.addEventListener('click', () => finishGuide());
  placeCard();
}

function advance(): void {
  if (guideIndex >= STEPS.length - 1) { finishGuide(true); return; }
  guideIndex += 1;
  paint();
  // Some steps introduce a control during the same action's deferred render
  // (for example the hint button after the first throw). Re-apply the frame
  // once that render has landed.
  requestAnimationFrame(paint);
}

function finishGuide(completed = false): void {
  if (completed) showToast('教程完成，进入第一关。', 'good');
  endTutorialGuide();
}

/** Keep the card out of the dice tray and action dock at every viewport. */
function placeCard(): void {
  const card = guideRoot?.querySelector<HTMLElement>('.guide-card');
  if (!card) return;
  const step = STEPS[guideIndex];
  const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
  const tray = rect('.dice-zone');
  const dock = rect('.action-dock');
  const cup = rect('.cup-zone');
  const score = rect('.score-panel');
  const topEdge = Math.max(score?.bottom ?? 0, 64) + 8;
  const bottomEdge = Math.min(
    tray?.top ?? Infinity,
    cup?.top ?? Infinity,
    dock?.top ?? Infinity,
  ) - 8;

  card.style.bottom = 'auto';
  card.style.overflowY = 'auto';
  card.style.maxHeight = Math.max(160, Math.min(380, bottomEdge - topEdge)) + 'px';
  const railStep = Boolean(step?.selector.includes('rail'));
  if (window.innerWidth >= 1000) {
    // Desktop never scrolls the teaching card; its copy is short and the
    // right/top band is kept clear of the dice tray.
    card.style.overflowY = 'visible';
    card.style.maxHeight = 'none';
    card.style.width = '360px';
    card.style.top = '88px';
    if (railStep) {
      card.style.left = '12px';
      card.style.right = 'auto';
    } else {
      card.style.left = 'auto';
      card.style.right = '20px';
    }
    return;
  }
  card.style.left = '12px';
  card.style.right = '12px';
  card.style.width = 'auto';
  card.style.top = Math.round(topEdge) + 'px';
}

export function startTutorialGuide(complete?: () => void): void {
  endTutorialGuide();
  guideIndex = 0;
  rollIndex = 0;
  onComplete = complete || null;
  guideRoot = document.createElement('div');
  guideRoot.id = 'tutorial-guide';
  document.body.appendChild(guideRoot);
  document.body.classList.add('guide-active');
  highlightObserver = new MutationObserver(() => applyHighlights());
  highlightObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', placeCard);
  paint();
}

export function isTutorialGuideActive(): boolean {
  return Boolean(guideRoot);
}

/** The click dispatcher uses this to block everything except the highlighted area. */
export function guideAllows(target: EventTarget | null): boolean {
  if (!guideRoot) return true;
  const element = target instanceof Element ? target : null;
  if (!element) return false;
  if (element.closest('#tutorial-guide')) return true;
  const step = STEPS[guideIndex];
  if (!step) return false;
  if (step.allowAction) {
    return Boolean(element.closest(`[data-action="${step.allowAction}"]`));
  }
  return [step.selector, step.extraSelector]
    .filter((selector): selector is string => Boolean(selector))
    .some((selector) => Boolean(element.closest(selector)));
}

export function nextTutorialRoll(): number[] | undefined {
  if (!guideRoot) return undefined;
  const values = ROLLS[Math.min(rollIndex, ROLLS.length - 1)];
  rollIndex += 1;
  return values ? [...values] : undefined;
}

/** Game calls this after a throw / selection / score / hint / rail action. */
export function guideEvent(
  kind: 'roll' | 'selection' | 'continue' | 'reroll' | 'hint' | 'rail' | 'closeRail',
  run: RunState,
): void {
  if (!guideRoot) return;
  const step = STEPS[guideIndex]!;
  if (kind === 'roll' && step.gate === 'roll') { advance(); return; }
  if (kind === 'selection' && step.gate.startsWith('select') && gateMet(step, run)) { advance(); return; }
  if (kind === 'continue' && step.gate === 'continue') { advance(); return; }
  if (kind === 'reroll' && step.gate === 'reroll') { advance(); return; }
  if (kind === 'hint' && step.gate === 'hint') { advance(); return; }
  if (kind === 'rail' && step.gate === 'rail') { advance(); return; }
  if (kind === 'closeRail' && step.gate === 'closeRail') advance();
}

export function endTutorialGuide(): void {
  if (!guideRoot) return;
  const callback = onComplete;
  onComplete = null;
  document.body.classList.remove('guide-active');
  highlightObserver?.disconnect();
  highlightObserver = null;
  window.removeEventListener('resize', placeCard);
  document.querySelectorAll('.guide-highlight, .guide-focus-red').forEach((el) => {
    el.classList.remove('guide-highlight', 'guide-focus-red');
  });
  guideRoot.remove();
  guideRoot = null;
  callback?.();
}
