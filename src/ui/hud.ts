// ui/hud.ts — 牌桌 HUD：顶栏、计分板、庄家铭牌、目标栏、物品槽、套组、日志。
//
// 从 app.js「Rendering — game」一节原样搬出。节点 id、类名与文案一字未改，
// 因为 tools/ 的 CDP 截图和 boss-test 都在比对这里渲染出的文本；任何一处
// 改动都会让 docs/screenshots 基线失效。
import {
  DICE_SETS, ITEM_BY_ID, LEVEL_COUNT, LEVELS, getLevelConfig, getOpponent, getTable,
} from '../content/index.ts';
import {
  ACTIVE_ITEM_SLOTS, bossStatusText, canUseItem, getBarrel, isFloatingScore, setCounts,
} from '../core/engine.ts';
import type { BossDef } from '../core/types.ts';
import { clamp, h, num } from '../core/util.ts';
import { showToast } from './components/toast.ts';
import { $ } from './dom.ts';
import { cashOutHint, projectedReward } from './reward.ts';
import { app } from './state.ts';

export function renderTopbar() {
  const run = app.run;
  if (!run) return;
  $('#coin-value')!.textContent = num(run.coins);
  const table = getTable(run.level);
  $('#chapter-label')!.textContent = `${table.subtitle}`;
  $('#level-label')!.textContent = `第 ${run.level} / ${LEVEL_COUNT} 关`;
  const track = $('#level-track')!;
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

export function renderScorePanel() {
  const run = app.run!;
  const round = Math.max(0, run.roundScore || 0);
  const secured = Math.max(0, run.score - round);
  // 悬秤人：整桌都是漂浮分，没有“已落袋”的一半可说。
  const floating = isFloatingScore(run);
  $('#score-value')!.textContent = num(floating ? run.score : secured);
  $('#secured-value')!.textContent = num(secured);
  $('#target-value')!.textContent = num(run.target);
  $('#target-value-2')!.textContent = num(run.target);
  $('#score-pending')!.hidden = floating || round <= 0;
  $('#round-value')!.textContent = num(round);
  $('#round-breakdown')!.hidden = floating || round <= 0;
  $('#round-value-2')!.textContent = num(round);
  $('#secured-note')!.hidden = floating;
  $('#float-note')!.hidden = !floating;
  const target = Math.max(1, run.target);
  const securedProgress = clamp((secured / target) * 100, 0, 100);
  const totalProgress = clamp((run.score / target) * 100, 0, 100);
  $('#score-progress')!.style.width = `${securedProgress}%`;
  $('#score-progress-pending')!.style.width = `${totalProgress}%`;
  const rerollInline = $('#reroll-inline')!;
  rerollInline.innerHTML = `<span class="reroll-hud-label">本关重投</span><b>${run.rerolls}</b><em>/ ${run.maxRerolls}</em>`;
  rerollInline.classList.toggle('is-low', run.rerolls > 0 && run.rerolls <= 2);
  rerollInline.classList.toggle('is-empty', run.rerolls <= 0);
  $('#score-panel')!.classList.toggle('is-floating', floating);
  $('#score-panel')!.classList.toggle('is-danger', run.rerolls <= 0 && run.score < run.target);
  const canAdvance = run.score >= run.target && !['won', 'run-won', 'lost', 'shop'].includes(run.phase);
  const nextButton = $('#next-level')!;
  nextButton.hidden = !canAdvance || app.busy;
  $('#next-level-label')!.textContent = run.level >= LEVEL_COUNT ? '查看结局' : '下一关';
  $('#score-panel')!.classList.toggle('is-cleared', canAdvance);
  if (round > 0 || run.throwNumber === 0 || run.phase === 'selecting') {
    $('#score-bust')!.hidden = true;
    $('#score-panel')!.classList.remove('is-bust');
  }
}

export function showBustNotice(lost: number) {
  const panel = $('#score-panel');
  const note = $('#score-bust');
  if (!panel || !note) return;
  const floating = isFloatingScore(app.run!);
  note.hidden = false;
  note.textContent = floating ? `秤翻了 · 整桌 ${num(lost)} 分消散` : `本轮 ${num(lost)} 分作废`;
  panel.classList.remove('is-bust');
  void panel.offsetWidth;
  panel.classList.add('is-bust');
  showToast(floating
    ? `没有可计分的组合，秤翻了：整桌 ${num(lost)} 分漂浮分全部消散。`
    : `没有可计分的组合，本轮 ${num(lost)} 分作废。`, 'error');
  clearTimeout(app.bustTimer ?? undefined);
  app.bustTimer = setTimeout(() => {
    note.hidden = true;
    panel.classList.remove('is-bust');
  }, 2800);
}

export function renderOpponentPlate() {
  const run = app.run!;
  const opponent = getOpponent(run.level)!;
  const isBoss = Boolean(getLevelConfig(run.level).boss);
  $('#opponent-name')!.textContent = opponent.name;
  $('#opponent-kicker')!.textContent = isBoss ? `第 ${run.level} 关 · 庄家` : opponent.title;
  $('#boss-badge')!.hidden = !isBoss;
  $('#boss-effect-card')!.hidden = !isBoss;
  if (isBoss) {
    const boss = opponent as BossDef;
    $('#boss-effect-name')!.textContent = boss.effectName;
    $('#boss-effect-title')!.textContent = boss.effectName;
    const status = bossStatusText(run);
    $('#boss-effect-desc')!.textContent = `${boss.effectDesc}${status ? ` · ${status}` : ''}`;
  }
}

export function renderRail() {
  const run = app.run!;
  const opponent = getOpponent(run.level)!;
  const isBoss = Boolean(getLevelConfig(run.level).boss);
  $('#objective-level')!.textContent = `第 ${run.level} 关`;
  $('#objective-name')!.textContent = opponent.name;
  $('#objective-role')!.textContent = opponent.title;
  $('#objective-target')!.textContent = num(run.target);
  const rewardEl = $('#objective-reward')!;
  rewardEl.textContent = num(projectedReward());
  rewardEl.title = `现在收手可带走：\n${cashOutHint()}`;
  $('#objective-dice')!.textContent = String(run.bag.length);
  const taunt = $('#objective-taunt')!;
  if (isBoss) {
    const boss = opponent as BossDef;
    taunt.innerHTML = `<b style="color:#d29b8c;font-weight:400">${h(boss.effectName)}</b> · ${h(boss.effectDesc)}`;
  } else {
    taunt.textContent = `“${opponent.taunts[0]}”`;
  }
  $('#reroll-note')!.textContent = `剩余 ${run.rerolls} 次`;
  const maxTokens = Math.max(run.maxRerolls, run.rerolls, 1);
  $('#reroll-row')!.innerHTML = Array.from({ length: Math.min(12, maxTokens) }, (_, index) => {
    const active = index < run.rerolls;
    const extra = index >= 5;
    return `<span class="reroll-token ${active ? '' : 'is-spent'} ${extra ? 'is-extra' : ''}" title="${active ? '可用重投' : '已消耗'}"></span>`;
  }).join('') + `<span class="reroll-count">${run.rerolls}<small style="color:#6f6352;font-size:8px"> / ${run.maxRerolls}</small></span>`;

  const barrel = getBarrel(run);
  $('#barrel-name')!.textContent = barrel.name;
  $('#barrel-short')!.textContent = barrel.short;
  $<HTMLImageElement>('#barrel-thumb')!.src = `assets/cups/${barrel.art}.svg`;
  $('#barrel-thumb')!.dataset.barrelTip = barrel.id;
  $('#cup')!.dataset.barrelTip = barrel.id;
  const gestureButton = $<HTMLButtonElement>('#gesture-button')!;
  if ('gesture' in barrel && barrel.gesture) {
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

export function renderRollHint() {
  const run = app.run!;
  const hint = $('#roll-hint')!;
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

export function renderItems() {
  const run = app.run!;
  const active = run.activeItems;
  const container = $('#active-items')!;
  const slots: string[] = [];
  for (let i = 0; i < ACTIVE_ITEM_SLOTS; i += 1) {
    const id = active[i];
    if (!id) {
      slots.push('<div class="item-slot is-empty" aria-hidden="true"></div>');
      continue;
    }
    const item = ITEM_BY_ID[id]!;
    const charges = run.itemCharges[id] || 0;
    const check = canUseItem(run, id);
    slots.push(`
      <button class="item-slot" data-action="use-item" data-item-id="${h(id)}" data-item-tip="${h(id)}"
        aria-disabled="${check.ok ? 'false' : 'true'}" title="${h(item.name)}" aria-label="使用${h(item.name)}">
        <img src="assets/items/${item.icon}.svg" alt="">
        <span class="charge">${charges > 0 ? charges : '×'}</span>
        <span class="item-name">${h(item.name)}</span>
      </button>`);
  }
  container.innerHTML = slots.join('');
  $('#item-slot-note')!.textContent = `${active.length} / ${ACTIVE_ITEM_SLOTS}`;
  const passives = run.passiveItems;
  const passiveEl = $('#passive-items')!;
  if (!passives.length) {
    passiveEl.innerHTML = '<span class="passive-empty">还没有被动物品 · <button data-action="open-compendium" data-tab="items">查看物品</button></span>';
  } else {
    passiveEl.innerHTML = passives.map((id) => {
      const item = ITEM_BY_ID[id]!;
      return `<span class="passive-chip" data-item-tip="${h(id)}"><img src="assets/items/${item.icon}.svg" alt="">${h(item.name)}</span>`;
    }).join('');
  }
}

export function renderSets() {
  const run = app.run!;
  const counts = setCounts(run);
  $('#set-list')!.innerHTML = Object.values(DICE_SETS).map((set) => {
    const count = counts[set.id]?.count || 0;
    const tier = counts[set.id]?.tier || 0;
    const pips = Array.from({ length: 4 }, (_, i) => `<i class="${i < count ? 'on' : ''}"></i>`).join('');
    let text = count === 0 ? '还差 2 枚激活 2 件套' : '再集 1 枚激活 2 件套';
    if (tier >= 4) text = `4 件：${set.bonuses[1]!.text}`;
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

export function renderLog() {
  const log = app.run!.log.slice(0, 5);
  $('#game-log')!.innerHTML = log.map((line) => `
    <div class="log-line type-${h(line.type)}"><i></i><span>${h(line.text)}</span></div>
  `).join('') || '<div class="log-line"><i></i><span>骰子已经摆好，等你落座。</span></div>';
}
