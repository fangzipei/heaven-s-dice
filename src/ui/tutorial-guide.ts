// ui/tutorial-guide.ts — first-level, action-gated 15-step guide.
import { showToast } from './components/toast.ts';
import type { RunState } from '../core/types.ts';

type Gate = 'next' | 'roll' | 'selectOneFive' | 'continue' | 'selectTriple' | 'reroll'
  | 'selectStraight' | 'bust' | 'selectFullStraight' | 'selectFour';

interface Step { selector: string; title: string; body: string; gate: Gate }

const STEPS: Step[] = [
  { selector: '.score-panel', title: '先认识牌桌', body: '左上角是本关得分与目标；中间是骰桌；右侧是随身物品。点「下一步」继续。', gate: 'next' },
  { selector: '.cup-zone', title: '手动摇桶', body: '按住右侧骰桶，左右拖动约 2 秒后松手。摇出骰子后这一步才会前进。', gate: 'roll' },
  { selector: '.dice-zone', title: '选择 1 和 5', body: '点选一颗 1 和一颗 5；两块都选上后，浮动分会出现在计分板。', gate: 'selectOneFive' },
  { selector: '.action-dock', title: '计分并继续', body: '点击「计分并继续」：选中的骰子移出，剩下的骰子免费重投，本轮分数继续挂账。', gate: 'continue' },
  { selector: '.cup-zone', title: '自动摇桶', body: '这次点「自动摇骰」让系统代摇；摇出结果后继续。', gate: 'roll' },
  { selector: '.dice-zone', title: '选择三条', body: '选中三颗相同点数，组成条子。三个 1 = 1000 分。', gate: 'selectTriple' },
  { selector: '.action-dock', title: '计分并重投', body: '点击「计分并重投」结束本轮，把累计分落袋，并消耗一次重投。', gate: 'reroll' },
  { selector: '.dice-zone', title: '摇出顺子', body: '先摇一次，然后选中连续五个点数，组成小顺。', gate: 'next' },
  { selector: '.dice-zone', title: '选择顺子', body: '选中连续五个点数；选中后这一步会自动继续。', gate: 'selectStraight' },
  { selector: '.action-dock', title: '继续计分', body: '再点「计分并继续」，把顺子计分，其余骰子继续重投。', gate: 'continue' },
  { selector: '.score-panel', title: '掷空会清零', body: '如果下一次摇出没有任何分型，本轮浮动分会全部作废，已经落袋的分不会退回。看完点下一步。', gate: 'next' },
  { selector: '.cup-zone', title: '重投', body: '掷空后仍可消耗一次重投；这次会把全部骰子重新放回桌上。摇一次继续。', gate: 'roll' },
  { selector: '.dice-zone', title: '选择通天顺', body: '1 到 6 各一颗是通天顺。选中六颗骰子。', gate: 'selectFullStraight' },
  { selector: '.action-dock', title: '全骰继续', body: '六颗骰子全部得分时，「计分并继续」会把六颗一起免费重投。点它继续。', gate: 'continue' },
  { selector: '.dice-zone', title: '选择四条', body: '选中四颗相同点数，再点「计分并重投」结束本关。条子按「点数 × 数量倍率」计算，四条远高于三条。', gate: 'reroll' },
  { selector: '.action-dock', title: '进入下一关', body: '点「计分并重投」结束本关。之后可以在市集补骰子、骰桶和物品。', gate: 'reroll' },
];

/* Roll script keeps the interactive steps teachable instead of random. */
const ROLLS: number[][] = [
  [1, 5, 1, 5, 2, 3],
  [1, 1, 1, 5, 2, 3],
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
