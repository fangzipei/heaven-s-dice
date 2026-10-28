// ui/screens/tutorial.ts — 开始页的图解教程与对局中的简版规则。
//
// 从 app.js「Rules」「Tutorial / first-run briefing」两节原样搬出。教程正文、
// 计分示例与规则表是截图脚本与新手体验的验收对象，这里只改 import、类型标注。
import {
  BARRELS, BOSSES, DICE, ITEMS, LEVEL_COUNT, LEVEL_CURVE, MINION_GAPS,
  RARITIES, REROLL_BONUS_RATE, OVERSHOOT_BONUS_RATE, STANDARD_DIE, TABLES,
} from '../../content/index.ts';
import { SCORING_ROWS } from '../../core/scoring.ts';
import { h, num } from '../../core/util.ts';
import { paperDieFaceHtml } from '../../render/dice-dom.ts';
import { openOverlay } from '../components/overlay.ts';
import { $, $$ } from '../dom.ts';
import { app } from '../state.ts';

/* ═══════════════════════════════════════════════════════════════════
   Rules
   ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   Tutorial / first-run briefing
   ═══════════════════════════════════════════════════════════════════ */
function tutorialDieHtml(value: number): string {
  return `<span class="tut-die" role="img" aria-label="${value} 点">${paperDieFaceHtml(value, STANDARD_DIE)}</span>`;
}

function tutorialDice(values: number[]): string {
  return `<div class="tut-dice">${values.map((value) => tutorialDieHtml(value)).join('')}</div>`;
}

function tutorialCombo({ title, values, points, note, formula = '', highlight = false }: {
  title: string; values: number[]; points: string; note: string; formula?: string; highlight?: boolean;
}): string {
  return `<article class="tut-combo ${highlight ? 'is-highlight' : ''}">
    <div class="tut-combo-head"><b>${title}</b><strong>${points}<small>分</small></strong></div>
    ${tutorialDice(values)}
    <p>${note}</p>
    ${formula ? `<span class="tut-formula">${formula}</span>` : ''}
  </article>`;
}

function tutorialHtml(): string {
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
          <div class="tut-card"><b>6 颗骰子 · 3 次重投</b><p>每关第一掷免费；「计分并继续」免费重投剩余骰子，只有「计分并重投」消耗 1 次重投。骰子、骰桶、物品会改变你能走多远。</p></div>
          <div class="tut-card"><b>目标分是算出来的</b><p>第 1 关 ${LEVEL_CURVE.targetBase} 分，之后每关 ×${LEVEL_CURVE.targetGrowth}；庄家的桌子再乘上自己的系数（赏金最高 ×${Math.max(...BOSSES.map((boss) => boss.curve.reward!)).toFixed(2)}），所以庄家关总是比隔壁贵一档。分数在左上角：大字是“已得”，本轮挂账单独显示。</p></div>
        </div>
        <div class="tut-flow">
          <div><i>1</i><b>摇骰</b><span>按住骰桶摇动，2 秒后落骰</span></div>
          <div><i>2</i><b>选骰</b><span>点选要计分的骰子，所有选中骰都必须合法</span></div>
          <div><i>3</i><b>计分</b><span>继续 / 重投 / 无重投时结算</span></div>
          <div><i>4</i><b>达标</b><span>目标达成后，点左下角「下一关」</span></div>
        </div>
        <div class="tut-callout">
          <b>“继续”和“重投”有什么区别？</b>
          <p><strong>计分并继续</strong>：把选中的骰子放到一边，只重投剩下的骰子，<strong>不消耗重投</strong>。<strong>计分并重投</strong>：把六颗骰子全部收回骰桶，重新摇六颗，消耗 1 次重投。</p>
        </div>
      </section>

      <section class="tut-section" id="tut-score">
        <div class="tut-section-head"><span>02</span><div><p>THE ONLY MATH YOU NEED</p><h3>计分图解：三个及以上相同点数，就是“条子”</h3></div></div>
        <p class="tut-lede">三个相同是<strong>三条</strong>，四个是<strong>四条</strong>，五个是<strong>五条</strong>，六个是<strong>六条</strong>；这一整类现在统称“条子”。下面每一张牌都把“应该选哪几颗”和“最后拿多少分”画出来了。</p>
        <div class="tut-callout is-key">
          <b>最重要的例子：三个 3 = 300 分。</b>
          <p>“三条”只是说<strong>三个相同点数</strong>。四个 3 是 300 × 2 = 600；五个 3 是 300 × 4 = 1200；六个 3 是 300 × 8 = 2400。</p>
        </div>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '单颗 1', values: [1], points: '100', note: '一颗 1 就能单独计分。', formula: '100' })}
          ${tutorialCombo({ title: '单颗 5', values: [5], points: '50', note: '一颗 5 就能单独计分。', formula: '50' })}
          ${tutorialCombo({ title: '三个 3（三条）', values: [3, 3, 3], points: '300', note: '三个相同点数先看基础分。', formula: '3 × 100 = 300', highlight: true })}
        </div>

        <h4 class="tut-subtitle">三个相同点数的基础分</h4>
        <div class="tut-triple-grid">${triples}</div>

        <h4 class="tut-subtitle">四个、五个、六个相同点数</h4>
        <p>先算“三个”的基础分，再按数量翻倍。以 3 点为例：</p>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '四个 3（四条）', values: [3, 3, 3, 3], points: '600', note: '四个相同点数 = 三个的基础分 × 2。', formula: '300 × 2 = 600', highlight: true })}
          ${tutorialCombo({ title: '五个 3（五条）', values: [3, 3, 3, 3, 3], points: '1,200', note: '五个相同点数 = 三个的基础分 × 4。', formula: '300 × 4 = 1,200' })}
          ${tutorialCombo({ title: '六个 3（六条）', values: [3, 3, 3, 3, 3, 3], points: '2,400', note: '六个相同点数 = 三个的基础分 × 8。', formula: '300 × 8 = 2,400' })}
        </div>
        <div class="tut-multiplier-strip">
          <span><b>3 个</b> ×1</span><span><b>4 个</b> ×2</span><span><b>5 个</b> ×4</span><span><b>6 个</b> ×8</span>
        </div>
        <div class="tut-callout">
          <b>1 点是唯一例外。</b>
          <p>三个 1 = 1000 分，所以四个 1 = 2000、五个 1 = 4000、六个 1 = 8000。2–6 的三条基础分分别是 200 / 300 / 400 / 500 / 600。</p>
        </div>

        <h4 class="tut-subtitle">顺子：五个或六个连续点数</h4>
        <div class="tut-combo-grid">
          ${tutorialCombo({ title: '顺子 1–2–3–4–5', values: [1, 2, 3, 4, 5], points: '500', note: '五颗连续点数。', formula: '500' })}
          ${tutorialCombo({ title: '顺子 2–3–4–5–6', values: [2, 3, 4, 5, 6], points: '750', note: '另一种五颗连续点数。', formula: '750' })}
          ${tutorialCombo({ title: '天地顺 1–6', values: [1, 2, 3, 4, 5, 6], points: '1,500', note: '六颗骰子刚好组成一条完整顺子。', formula: '1,500', highlight: true })}
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
        <p class="tut-lede">一轮可以连续多次「计分并继续」累积；只有「计分并重投」结束本轮并落袋，或者掷空让本轮全部清零。</p>
        <div class="tut-score-demo">
          <div class="tut-score-demo-top"><span>本关已得</span><span>目标 450</span></div>
          <div class="tut-score-demo-number"><strong>220</strong><em>+80 本轮</em><span>/450</span></div>
          <div class="tut-score-demo-labels"><span>已得 220</span><span>本轮未计入 80</span></div>
          <div class="tut-score-demo-bar"><i style="width:49%"></i><b style="width:18%"></b></div>
        </div>
        <div class="tut-cards">
          <div class="tut-card"><b>计分并继续</b><p>本轮挂账继续累积，仍处于风险中。继续多少次都可以，直到你决定结束本轮。</p></div>
          <div class="tut-card"><b>计分并重投</b><p>结束本轮：本轮累计分全部落袋，再重新投六颗骰子，开始新的一轮。</p></div>
          <div class="tut-card"><b>掷空</b><p>投掷后没有任何可计分组合时，本轮累计分全部作废；已经落袋的分数保留。</p></div>
          <div class="tut-card is-gold"><b>收手换钱</b><p>过关结算时，每次未使用的重投奖励<b style="display:inline;font-size:10px;color:var(--gold-bright)">基础赏金的 ${Math.round(REROLL_BONUS_RATE * 100)}%</b>。得分超过目标 2 倍，再奖励基础赏金的 ${Math.round(OVERSHOOT_BONUS_RATE * 100)}%。</p></div>
        </div>
        <h4 class="tut-subtitle">超额赏金 · 只有甩过目标 2 倍才加钱</h4>
        <div class="tut-cards three">
          <div class="tut-card is-gold"><b>超过 2 倍目标</b><p>本关得分严格超过目标分的 2 倍，结算额外奖励<b style="display:inline;font-size:10px;color:var(--gold-bright)">基础赏金的 ${Math.round(OVERSHOOT_BONUS_RATE * 100)}%</b>。刚好 2 倍不算。</p></div>
        </div>
        <div class="tut-callout is-key"><b>收手还是加注？</b><p>达标那一刻，左上角「胜利奖励」会实时变成你现在收手能拿到的数目（含未用重投奖励与 2 倍超额奖励），悬停可看明细。再赌一把可能跨过 2 倍目标，也可能一次掷空把本轮挂账全丢掉——已得分数不会丢。</p></div>
        <div class="tut-callout">
          <b>全骰（Hot Dice）</b>
          <p>六颗骰子全部计分会免费重投全部骰子，但不会结束本轮；本轮累计分仍然处于风险中，直到点击「计分并重投」。</p>
        </div>
        <div class="tut-callout">
          <b>重投耗尽</b>
          <p>没有重投次数时，选择骰子后会出现「计分并结算」。达到目标就进入下一关；没达到目标，本关失败。</p>
        </div>
      </section>

      <section class="tut-section" id="tut-gear">
        <div class="tut-section-head"><span>04</span><div><p>THE REST OF THE TABLE</p><h3>骰桶、骰子、物品、市集与庄家</h3></div></div>
        <div class="tut-cards">
          <div class="tut-card"><b>骰桶 · ${BARRELS.length} 只</b><p>初始橡木桶之外，概率桶偏向某些点数，点数/赖子桶奖励指定结果，还有染金、定点、补顺、增殖与单骰桶会在落骰时插手。仪式桶需要按住后沿桌面轨迹画阵，五芒星每关只能生效一次，也可点右下角「画阵」。</p></div>
          <div class="tut-card"><b>骰子 · ${DICE.length} 枚 · 两套 + 无套</b><p>${RARITIES.common.name} ${DICE.filter((d) => d.rarity === 'common').length}、${RARITIES.rare.name} ${DICE.filter((d) => d.rarity === 'rare').length}、${RARITIES.epic.name} ${DICE.filter((d) => d.rarity === 'epic').length}、${RARITIES.legendary.name} ${DICE.filter((d) => d.rarity === 'legendary').length}。每枚骰子有自己的六面概率，悬停可看真实概率；普通骰也可能带一条明确的计分规则。<b>狼裔 5 枚</b>把 3 的概率抬高，2 / 4 件分别让每颗计分的 3 加分、三条 3 大幅加分。<b>恶魔 5 枚</b>把掷出的 1 变成「恶魔赖子」——能补三条或顺子（顺子最多替 1 颗；顺子已完整时可以顶替其中一面，把该面的自然骰解放出来单独计分），但不能单独计分。剩下的 <b>${DICE.filter((d) => !d.setId).length} 枚无套组</b>走极端骰型、顺序互动与商店成长：复制第一颗、贴邻前一颗、每关换面、重随成长……它们不参与套装，但随时能买能卖。</p></div>
          <div class="tut-card"><b>物品 · ${ITEMS.length} 件</b><p>${ITEMS.filter((i) => i.type === 'active').length} 主动、${ITEMS.filter((i) => i.type === 'passive').length} 被动，其中 <b>${ITEMS.filter((i) => i.consumable).length} 件一次性</b>——用完即消失，但效果比同价位常驻物品更直接。被动物品里有专门抬高三条/四条/五条/六条/顺子/天地顺/一点五点得分的护符，也有能随机开出史诗骰、或从两枚稀有骰里挑一枚的骰匣。主动物品每关恢复一次；被动物品永久生效。<b>三层骰架 / 双孔桶架 / 暗格货架</b>分别让市集的骰子、骰桶、物品各 +1 个货位。丰饶骰袋 +1 骰、裂痕骰袋 -1 骰但计分 +25%，这两件整局各只能获取一次。</p></div>
          <div class="tut-card"><b>市集</b><p>每关之后进入：骰子 2 枚、骰桶 1 只、物品 3 件；带上货架类被动会各 +1。骰子按等级加权：前 6 关以普通 / 稀有为主，过了 24 关才真正放出传说。每次刷新都消耗银币；随身物品可以半价卖回，出售后不会再次上架。</p></div>
          <div class="tut-card"><b>赌桌 · ${TABLES.length} 张</b><p>木头、青石、黑铁、黄金、钻石。五张桌子平分 ${LEVEL_COUNT} 关（${LEVEL_CURVE.targetBase} 分起步），庄家按难度穿插落座：越晚的桌子越贵，也越不像人坐的地方。</p></div>
        </div>
        <h4 class="tut-subtitle">${BOSSES.length} 位庄家的桌规</h4>
        <div class="tut-bosses">${bosses}</div>
        <div class="tut-callout">
          <b>操作速记</b>
          <p>按住骰桶拖动会开始 2 秒倒计时，倒计时结束自动落骰；PC 与手机都能拖遍整个界面。仪式桶会显示桌面轨迹，需要沿着轨迹描画，偏差过大会失败。也可以点下方「自动投掷」；空格自动摇；数字键 1 / 2 是「计分并继续」「计分并重投」。</p>
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
          <li><b>收手有价：</b>每次未用重投奖励基础赏金的 ${Math.round(REROLL_BONUS_RATE * 100)}%；得分超过目标 2 倍再奖励基础赏金的 ${Math.round(OVERSHOOT_BONUS_RATE * 100)}%。左上角奖励数字会实时告诉你现在收手能拿多少。</li>
        </ul>
        <div class="tut-final-line">骰子落下之前，命运只是一句空话。<br><span>现在，去把它掷出来。</span></div>
      </section>
    </div>
    <footer class="tutorial-foot">
      <span>${app.run ? '教程随时可以在右上角规则里重看。' : '想边玩边学的话，直接进入第一关引导。'}</span>
      ${app.run ? '<button class="primary-button" data-action="close-overlay">回到赌桌 <svg><use href="#i-arrow"></use></svg></button>'
    : '<button class="secondary-button" data-action="start-direct">直接开局</button><button class="primary-button" data-action="start-guided">进入第一关引导 <svg><use href="#i-arrow"></use></svg></button>'}
    </footer>
  </div>`;
}

export function showStartPrompt(): void {
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

export function openTutorial(): void {
  if (app.introOpen) app.introOpen = false;
  openOverlay(tutorialHtml(), { dismissible: true });
  const body = $('#tutorial-body');
  if (body) body.scrollTop = 0;
}

export function scrollTutorial(targetId: string): void {
  const target = document.getElementById(targetId);
  const body = $('#tutorial-body');
  if (!target || !body) return;
  $$('.tutorial-nav-button').forEach((button) => button.classList.toggle('is-active', button.dataset.target === targetId));
  body.scrollTo({ top: Math.max(0, target.offsetTop - 4), behavior: 'smooth' });
}

export function openRules(): void {
  if (app.introOpen) app.introOpen = false;
  const rows = SCORING_ROWS.map((row) => `<tr><td>${h(row.label)}<br><span style="font-size:8px;color:var(--muted)">${h(row.detail)}</span></td><td>${h(row.points)}</td></tr>`).join('');
  openOverlay(`
    <div class="modal rules-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <div class="rules-head">
        <div>
          <p class="modal-kicker">THE RULES OF THE TABLE</p>
          <h2>赌桌规矩</h2>
          <p>采用《天国：拯救 2》的骰子计分。每关有目标分数，用六颗骰子和三次重投去够到它。没被计分的骰子才能重投；当六颗骰子全部计分，会触发“全骰”，六颗一起免费重投。</p>
        </div>
      </div>
      <div class="rules-columns">
        <div class="rules-section">
          <h3>计分组合</h3>
          <table class="scoring-table">${rows}</table>
          <div class="rules-note">三个及以上相同点数统称“条子”：三个是三条、四个是四条、五个是五条、六个是六条。</div>
          <div class="rules-note">一次计分必须把所选骰子全部纳入合法组合。1 和 5 可以单颗计分；其他点数至少三颗才能计分。所有组合取最高合法分值。</div>
          <h3 style="margin-top:18px">一掷的流程</h3>
          <p>1. 按住骰桶摇动，2 秒倒计时后落骰；或点击下方「自动投掷」。<br>2. 点击选择要计分的骰子。<br>3. 选择「计分并继续」，计分后把选中骰放一边、免费重投剩余骰子；或「计分并重投」，计分后把全部六颗骰子重新投，消耗 1 次重投。<br>4. 六颗骰子全部计分会触发「全骰」，免费重投全部骰子。<br>5. 没有重投次数时，仍可免费「计分并继续」，也可以「计分并结算」。</p>
          <div class="rules-note">轮次：可以连续「计分并继续」累积本轮挂账；「计分并重投」结束本轮并把累计分全部落袋，再开始新一轮。若某次投掷没有任何可计分组合，本轮累计分全部清零，已落袋分保留；**下一次重投会把全部骰子放回桌上**（包括本轮先前已计分的骰子）。计分面板右下角的大号「本关重投」显示剩余 / 上限，低于 2 次变橙，耗尽变红。</div>
          <div class="rules-note">每关基础 3 次重投；击败庄家不会累积上限。烈酒、时间沙漏、加注契约和旋涡桶仪式可以临时增加重投次数。门房还会送你一枚开局就能用的幸运币（一次性）。</div>
          <h3 style="margin-top:18px">收手换钱与超额赏金</h3>
          <p>过关结算时，每次<b style="color:var(--gold-bright)">未使用的重投奖励基础赏金的 ${Math.round(REROLL_BONUS_RATE * 100)}%</b>。此外，本关得分严格超过目标分的 <b style="color:var(--gold-bright)">2 倍</b>，再奖励基础赏金的 ${Math.round(OVERSHOOT_BONUS_RATE * 100)}%。</p>
          <div class="rules-note">达标后左上角「胜利奖励」会实时变成你现在收手能拿到的数目，悬停可看明细：继续加注可以追更高的倍数，也可能一次掷空把本轮挂账全部丢掉。</div>
        </div>
        <div class="rules-section">
          <h3>${BOSSES.length} 位庄家</h3>
          ${BOSSES.map((boss) => `
            <div class="rule-boss">
              <b>${h(boss.name)}<span>${h(boss.title)} · 第 ${boss.level} 关 · 悬赏 ×${boss.curve.reward!.toFixed(2)}</span></b>
              <p>${h(boss.effectName)}：${h(boss.effectDesc)}</p>
            </div>`).join('')}
          <h3 style="margin-top:16px">装备与市集</h3>
          <p>骰子有各自的点数概率与套组效果，${DICE.length} 枚秘骰分为普通、稀有、史诗、传说：狼裔 5 枚、恶魔 5 枚，其余 ${DICE.filter((d) => !d.setId).length} 枚无套组。鼠标移到骰子上查看六面概率；普通骰也可能带计分规则。骰桶分为概率、点数/赖子、染金/定点/补顺/增殖/单骰与仪式等类型，点「画阵」完成星阵或旋涡，能为本次投掷争取优势。</p>
          <p>每关之后进入市集：骰子区默认 2 枚、骰桶区 1 只、物品区 3 件，刷新均需银币。三层骰架 / 双孔桶架 / 暗格货架会各让对应区域多摆 1 件。主动物品每关恢复一次，被动物品永久生效；一次性消耗品用完即消失。市集下方可以把随身物品按半价卖回。</p>
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
