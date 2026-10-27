// ui/tutorial-guide.ts — first-level, action-gated 15-step guide.
import { showToast } from './components/toast.ts';
import type { RunState } from '../core/types.ts';

type Gate = 'next' | 'roll' | 'selectOneFive' | 'continue' | 'selectTriple' | 'reroll'
  | 'selectStraight' | 'bust' | 'selectFullStraight' | 'selectFour';

interface Step { selector: string; title: string; body: string; gate: Gate }

const STEPS: Step[] = [
  { selector: '.score-panel', title: '先认识牌桌', body: '左上角是本关得分与目标；中间是骰桌；右侧是随身物品。点「下一步」继续。', gate: 'next' },
  { selector: '.cup-zone', title: '手动摇桶', body: '按住右侧骰桶，左右拖动约 2 秒后松手。教程会固定给你 1·5·1·5·2·3。', gate: 'roll' },
  { selector: '.dice-zone', title: '点选 1 和 5', body: '点选两颗 1 和两颗 5；选中后浮动分会出现在计分板。', gate: 'selectOneFive' },
  { selector: '.action-dock', title: '点「计分并继续」', body: '点击「计分并继续」：这四颗骰子移出，教程会继续发下一手。', gate: 'continue' },
  { selector: '.cup-zone', title: '点「自动摇骰」', body: '这次点自动摇骰，让系统代摇。教程会固定给你三颗 3。', gate: 'roll' },
  { selector: '.dice-zone', title: '点选三条 3', body: '选中三颗 3，组成条子。三个 3 = 300 分。', gate: 'selectTriple' },
  { selector: '.action-dock', title: '点「计分并重投」', body: '点击「计分并重投」结束本轮，把累计分落袋，并消耗一次重投。', gate: 'reroll' },
  { selector: '.cup-zone', title: '再摇一手顺子', body: '手动摇桶。教程会固定给你 1·2·3·4·5·6。', gate: 'roll' },
  { selector: '.dice-zone', title: '点选小顺子', body: '点选 1、2、3、4、5，组成小顺子。', gate: 'selectStraight' },
  { selector: '.action-dock', title: '点「计分并继续」', body: '把顺子计分并继续。教程会发一手没有分型的骰子，让你看掷空。', gate: 'continue' },
  { selector: '.score-panel', title: '摇出掷空', body: '现在摇桶。这一手没有任何分型，本轮浮动分会清零。', gate: 'bust' },
  { selector: '.cup-zone', title: '点「重投」', body: '掷空后消耗一次重投，重新摇桶。教程会固定给你通天顺。', gate: 'roll' },
  { selector: '.dice-zone', title: '点选通天顺', body: '点选 1 到 6 六颗骰子，组成通天顺。', gate: 'selectFullStraight' },
  { selector: '.action-dock', title: '点「计分并继续」', body: '六颗骰子全部得分时，继续会把六颗一起免费重投，形成全骰。', gate: 'continue' },
  { selector: '.action-dock', title: '选四条并「计分并重投」', body: '选中四颗 2，再点「计分并重投」结束本关。条子按点数 × 数量倍率计算，四条远高于三条。', gate: 'reroll' },
];

const ROLLS: number[][] = [
  [1, 5, 1, 5, 2, 3],
  [3, 3, 3, 5, 2, 3],
  [1, 2, 3, 4, 5, 6],
  [2, 3, 4, 6, 2, 3],
  [1, 2, 3, 4, 5, 6],
  [2, 2, 2, 2, 5, 6],
];

let guideIndex = 0;
let guideRoot: HTMLElement | null = null;
let rollIndex = 0;

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
    case 'selectOneFive': return run.selected.some((uid) => run.dice.find((d) => d.uid === uid)?.value === 1)
      && run.selected.some((uid) => run.dice.find((d) => d.uid === uid)?.value === 5);
    case 'selectTriple': return [...c.values()].some((n) => n >= 3);
    case 'selectStraight': return hasStraight(run, 5);
    case 'selectFullStraight': return hasStraight(run, 6);
    case 'selectFour': return [...c.values()].some((n) => n >= 4);
    default: return false;
  }
}

function advance(): void {
  if (guideIndex >= STEPS.length - 1) { endTutorialGuide(); showToast('引导结束，继续完成这一关吧。', 'good'); return; }
  guideIndex += 1;
  paint();
}

function paint(): void {
  const step = STEPS[guideIndex]!;
  document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
  document.querySelector(step.selector)?.classList.add('guide-highlight');
  if (!guideRoot) return;
  const manual = step.gate === 'next';
  guideRoot.innerHTML = `
    <section class="guide-card" role="dialog" aria-label="鏂版墜寮曞">
      <header><span>鏂版墜寮曞</span><em>${guideIndex + 1} / ${STEPS.length}</em></header>
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      <div class="guide-actions">
        ${manual ? '<button class="primary-button" data-guide="next">涓嬩竴姝?/button>' : '<span class="guide-wait">鎸夋彁绀烘搷浣滃悗鑷姩缁х画</span>'}
        <button class="text-button" data-guide="close">璺宠繃寮曞</button>
      </div>
    </section>`;
  guideRoot.querySelector('[data-guide="next"]')?.addEventListener('click', advance);
  guideRoot.querySelector('[data-guide="close"]')?.addEventListener('click', () => endTutorialGuide());
}

export function startTutorialGuide(): void {
  endTutorialGuide();
  guideIndex = 0;
  rollIndex = 0;
  guideRoot = document.createElement('div');
  guideRoot.id = 'tutorial-guide';
  document.body.appendChild(guideRoot);
  paint();
}

export function nextTutorialRoll(): number[] | undefined {
  if (!guideRoot) return undefined;
  const values = ROLLS[Math.min(rollIndex, ROLLS.length - 1)];
  rollIndex += 1;
  return values ? [...values] : undefined;
}

/** Game calls this after a throw / selection / score action. */
export function guideEvent(kind: 'roll' | 'selection' | 'continue' | 'reroll', run: RunState): void {
  if (!guideRoot) return;
  const step = STEPS[guideIndex]!;
  if (kind === 'roll') {
    if (step.gate === 'roll') { advance(); return; }
    if (step.gate === 'bust' && run.phase === 'dead') { advance(); return; }
    return;
  }
  if (kind === 'selection' && step.gate.startsWith('select') && gateMet(step, run)) { advance(); return; }
  if (kind === 'continue' && step.gate === 'continue') { advance(); return; }
  if (kind === 'reroll' && step.gate === 'reroll') advance();
}

export function endTutorialGuide(): void {
  document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
  guideRoot?.remove();
  guideRoot = null;
}
