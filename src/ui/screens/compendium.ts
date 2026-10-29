// ui/screens/compendium.ts — 赌徒图鉴：五个页签、解锁态与进度。
//
// 从 app.js「Compendium」一节原样搬出。卡片 markup 与文案是 tools/codex-test.mjs
// 与截图比对依赖的，这里只允许改 import、类型标注和已知的索引写法。
import {
  BARRELS, BOSS_CATALOG, DICE, DICE_SETS, ITEMS, MINIONS, MINION_GAPS, TABLES, chapterLevelSpan, rarityOf,
} from '../../content/index.ts';
import { h } from '../../core/util.ts';
import type { DiscoveryKind } from '../../platform/storage.ts';
import { discoverLoadout, discoverShop, isDiscovered } from '../../platform/storage.ts';
import { artDieImageHtml } from '../../render/dice-dom.ts';
import { probabilityBars } from '../components/cards.ts';
import { openOverlay } from '../components/overlay.ts';
import { barrelTypeLabel, hideTooltip } from '../components/tooltip.ts';
import { $, $$ } from '../dom.ts';
import { app } from '../state.ts';

const codexDice = () => DICE.filter((die) => !die.isStandard);

export function openCompendium(tab: string = app.compendiumTab): void {
  if (app.introOpen) app.introOpen = false;
  if (app.run) {
    discoverLoadout(app.run);
    discoverShop(app.run);
  }
  app.compendiumTab = tab;
  const tabs: [string, string][] = [
    ['dice', `秘骰 ${DICE.length}`], ['barrels', `骰桶 ${BARRELS.length}`], ['items', `物品 ${ITEMS.length}`], ['tables', '赌桌 5'], ['bosses', '庄家与小兵'],
  ];
  openOverlay(`
    <div class="modal compendium-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <header class="compendium-head">
        <div><p class="modal-kicker">THE GAMBLER'S ARCHIVE</p><h2>赌徒图鉴</h2><p>五张桌子，${DICE.length} 枚秘骰，${BARRELS.length} 只骰桶，${ITEMS.length} 件物品，以及坐在对面的那些东西。</p></div>
        <span class="rail-note">收录内容 · 可随时查阅</span>
      </header>
      <div class="compendium-tabs">${tabs.map(([id, label]) => `<button class="compendium-tab ${id === tab ? 'is-active' : ''}" data-action="switch-compendium-tab" data-tab="${id}">${h(label)}</button>`).join('')}</div>
      <div class="compendium-body" id="compendium-body">${compendiumBody(tab)}</div>
    </div>
  `, { dismissible: true });
}

export function switchCompendiumTab(tab: string): void {
  hideTooltip();
  app.compendiumTab = tab;
  $$('.compendium-tab').forEach((el) => el.classList.toggle('is-active', el.dataset.tab === tab));
  const body = $('#compendium-body');
  if (body) body.innerHTML = compendiumBody(tab);
}

function compendiumLockedCard(category: string): string {
  return `<article class="compendium-card is-locked" aria-label="${h(category)}尚未遇见">
    <div class="locked-card"><svg><use href="#i-lock"></use></svg><b>尚未遇见</b><span>在赌局或市集中遇见后解锁</span></div>
  </article>`;
}

function compendiumProgress(kind: DiscoveryKind, total: number): string {
  const seen = app.discovered[kind]?.filter((id) => kind !== 'dice' || codexDice().some((die) => die.id === id)).length || 0;
  return `<strong class="codex-progress">已遇见 ${seen} / ${total}</strong>`;
}

function compendiumBody(tab: string): string {
  if (tab === 'dice') {
    const dice = codexDice();
    return `<p class="compendium-intro">每一枚秘骰都像一张有偏向的牌：点数概率不同。狼裔 5 枚把筹码押在 3 上，恶魔 5 枚把掷出的 1 变成赖子，同套组集齐 2 枚与 4 枚会解锁额外效果；其余 ${dice.filter((die) => !die.setId).length} 枚无套组，走极端骰型、顺序互动或商店成长。额外加分不再只属于史诗与传说，普通骰也可能带一条明确的计分规则。${compendiumProgress('dice', dice.length)}</p>
      <div class="compendium-grid">${dice.map((spec) => {
        if (!isDiscovered('dice', spec.id)) return compendiumLockedCard('这枚骰子');
        const rarity = rarityOf(spec);
        const set = spec.setId ? DICE_SETS[spec.setId] : undefined;
        const setTag = set ? `${set.name}套组` : '无套组';
        const bars = probabilityBars(spec.probs, spec.rarity);
        return `<article class="compendium-card compendium-die" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-die-tip="${h(spec.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${h(setTag)}</span></div>
          <div class="comp-art"><div class="card-art" style="height:74px">${artDieImageHtml(spec)}</div></div>
          <h4>${h(spec.name)}</h4>
          <div class="comp-sub">${h(spec.desc)}</div>
          ${bars}
          <p>${h(spec.bonus?.label || spec.flavor)}</p>
        </article>`;
      }).join('')}</div>`;
  }
  if (tab === 'barrels') {
    return `<p class="compendium-intro">骰桶决定骰子怎样离手：概率桶改写六面权重，点数/赖子桶奖励指定结果，染金、定点、补顺、增殖与单骰桶在落骰时插手，仪式桶则需要你先在桌上画出一个图案。默认的旧橡木桶不偏不倚。${compendiumProgress('barrels', BARRELS.length)}</p>
      <div class="compendium-grid">${BARRELS.map((barrel) => {
        if (!isDiscovered('barrels', barrel.id)) return compendiumLockedCard('这只骰桶');
        const rarity = rarityOf(barrel);
        return `<article class="compendium-card barrel-compendium" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-barrel-tip="${h(barrel.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${barrelTypeLabel(barrel)}</span></div>
          <div class="comp-art"><img src="assets/art/barrels/${barrel.art}-cut.svg" alt="${h(barrel.name)}"></div>
          <h4>${h(barrel.name)}</h4>
          <div class="comp-sub">${h(barrel.short)}</div>
          <p>${h(barrel.desc)}</p>
        </article>`;
      }).join('')}</div>`;
  }
  if (tab === 'items') {
    return `<p class="compendium-intro">${ITEMS.filter((i) => i.type === 'active').length} 件主动物品、${ITEMS.filter((i) => i.type === 'passive').length} 件被动物品，其中 ${ITEMS.filter((i) => i.consumable).length} 件是一次性消耗品。主动物品每关恢复一次，被动物品永久生效；三种货架被动分别让市集某一区多摆 1 件。丰饶骰袋与裂痕骰袋整局各只能获取一次。${compendiumProgress('items', ITEMS.length)}</p>
      <div class="compendium-grid">${ITEMS.map((item) => {
        if (!isDiscovered('items', item.id)) return compendiumLockedCard('这件物品');
        const rarity = rarityOf(item);
        return `<article class="compendium-card item-compendium" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-item-tip="${h(item.id)}">
          <div class="card-topline"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${item.bossOnly ? '庄家掉落' : item.consumable ? '一次性' : item.type === 'active' ? '主动' : '被动'}</span></div>
          <div class="comp-art"><img src="assets/art/items/${item.id}-cut.svg" alt="${h(item.name)}"></div>
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
          <div class="comp-table-bg" style="background-image:url('assets/paper/tables/${table.art}.svg')"></div>
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
    return `<p class="compendium-intro">每一位庄家都有一句自己的规矩。每局开始时，3、7 关从稀有池、11、15 关从史诗池、20、24 关从传说池随机抽签；小兵空档为 ${MINION_GAPS.join('、')}。击败他们，桌子会随章节换成下一种材质。</p>
      <h3 style="font-family:var(--serif);font-weight:400;font-size:20px;color:var(--ink);margin:8px 0 12px;letter-spacing:.06em">${BOSS_CATALOG.length} 位庄家</h3>
      <div class="compendium-grid bosses-grid">
        ${BOSS_CATALOG.map((boss) => `<article class="compendium-card boss-compendium-card" style="--rarity:${boss.accent};--glow:${boss.accent}33">
          <img class="comp-portrait" src="assets/portraits/paper/${boss.art}.svg" alt="${h(boss.name)}">
          <div class="comp-content">
            <div class="comp-sub">${rarityOf(boss).name}庄家池 · ${h(boss.title)} · 悬赏 ×${boss.curve.reward!.toFixed(2)}</div>
            <h4>${h(boss.name)}</h4>
            <div class="effect"><b>${h(boss.effectName)}</b><p>${h(boss.effectDesc)}</p></div>
            <p style="color:var(--muted);font-size:11px">“${h(boss.intro)}”</p>
          </div>
        </article>`).join('')}
      </div>
      <h3 style="font-family:var(--serif);font-weight:400;font-size:20px;color:var(--ink);margin:22px 0 12px;letter-spacing:.06em">五位小兵</h3>
      <div class="compendium-grid minions-grid">
        ${MINIONS.map((minion) => `<article class="compendium-card" style="--rarity:${minion.accent};--glow:${minion.accent}22;overflow:hidden;min-height:250px">
          <img src="assets/portraits/paper/${minion.art}.svg" alt="${h(minion.name)}" style="position:absolute;right:-8%;bottom:-2%;width:78%;opacity:.78;-webkit-mask-image:linear-gradient(180deg,#000 65%,transparent);mask-image:linear-gradient(180deg,#000 65%,transparent)">
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
