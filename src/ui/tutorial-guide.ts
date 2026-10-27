// ui/tutorial-guide.ts — first-level guided overlay.
//
// The full tutorial is a sequence of 15 short cards. It intentionally sits
// above the table without blocking it (pointer-events only on the card), so
// the player can look at the highlighted control while reading.
import { showToast } from './components/toast.ts';

interface GuideStep {
  selector: string;
  title: string;
  body: string;
}

const STEPS: GuideStep[] = [
  { selector: '.score-panel', title: '先认识牌桌', body: '左上角是本关得分与目标；下方是骰桌；右侧是随身物品。先不用急着操作。' },
  { selector: '.cup-zone', title: '手动摇桶', body: '按住右侧骰桶，左右拖动。摇动约 2 秒后松手，骰子会落桌。' },
  { selector: '.dice-zone', title: '选择 1 和 5', body: '1 点和 5 点都是计分骰。点选它们，上方会显示本次可得的浮动分。' },
  { selector: '.action-dock', title: '计分并继续', body: '点击「计分并继续」：选中的骰子移出，剩下的骰子免费重投，本轮分数仍挂在账上。' },
  { selector: '.cup-zone', title: '自动摇桶', body: '也可以点「自动摇骰」让系统代摇；两种摇法结果等价。' },
  { selector: '.dice-zone', title: '选择三条', body: '三个相同点数就是条子。三个 2 = 200，三个 1 = 1000。' },
  { selector: '.action-dock', title: '计分并重投', body: '「计分并重投」会结束本轮，把本轮累计分全部落袋，并消耗一次重投。' },
  { selector: '.dice-zone', title: '选择顺子', body: '连续五个点数组成小顺，连续六个点数组成通天顺。' },
  { selector: '.action-dock', title: '继续计分', body: '再点「计分并继续」，把顺子计分，其余骰子继续重投。' },
  { selector: '.score-panel', title: '掷空会清零', body: '如果一次投掷没有任何可计分组合，本轮浮动分会全部作废，但已经落袋的分不会退回。' },
  { selector: '.cup-zone', title: '重投', body: '掷空后仍可消耗一次重投；这次会把全部骰子重新放回桌上。' },
  { selector: '.dice-zone', title: '选择通天顺', body: '1 到 6 各一颗就是通天顺。它是本作最高的顺子分型。' },
  { selector: '.action-dock', title: '全骰继续', body: '如果六颗骰子全部得分，「计分并继续」会把六颗骰子一起重新投，形成全骰。' },
  { selector: '.dice-zone', title: '选择四条', body: '四个相同点数就是四条。条子分数按「点数 × 数量倍率」计算，四条比三条高得多。' },
  { selector: '.action-dock', title: '进入下一关', body: '「计分并重投」结束本关后，达标即可进入下一关。之后可以在市集补骰子、骰桶和物品。' },
];

let guideIndex = 0;
let guideRoot: HTMLElement | null = null;

function paintGuide(): void {
  const step = STEPS[guideIndex]!;
  document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
  document.querySelector(step.selector)?.classList.add('guide-highlight');
  if (!guideRoot) return;
  guideRoot.innerHTML = `
    <section class="guide-card" role="dialog" aria-label="新手引导">
      <header><span>新手引导</span><em>${guideIndex + 1} / ${STEPS.length}</em></header>
      <h3>${step.title}</h3>
      <p>${step.body}</p>
      <div class="guide-actions">
        <button class="secondary-button" data-guide="prev" ${guideIndex === 0 ? 'disabled' : ''}>上一步</button>
        <button class="primary-button" data-guide="next">${guideIndex === STEPS.length - 1 ? '开始对局' : '下一步'}</button>
        <button class="text-button" data-guide="close">跳过引导</button>
      </div>
    </section>`;
  guideRoot.querySelector('[data-guide="prev"]')?.addEventListener('click', () => {
    if (guideIndex > 0) { guideIndex -= 1; paintGuide(); }
  });
  guideRoot.querySelector('[data-guide="next"]')?.addEventListener('click', () => {
    if (guideIndex < STEPS.length - 1) { guideIndex += 1; paintGuide(); return; }
    endTutorialGuide();
    showToast('引导结束。桌上是你的第一关。', 'good');
  });
  guideRoot.querySelector('[data-guide="close"]')?.addEventListener('click', () => endTutorialGuide());
}

export function startTutorialGuide(): void {
  endTutorialGuide(false);
  guideIndex = 0;
  guideRoot = document.createElement('div');
  guideRoot.id = 'tutorial-guide';
  document.body.appendChild(guideRoot);
  paintGuide();
}

export function endTutorialGuide(notify = false): void {
  document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
  guideRoot?.remove();
  guideRoot = null;
  if (notify) showToast('已跳过引导。', 'good');
}
