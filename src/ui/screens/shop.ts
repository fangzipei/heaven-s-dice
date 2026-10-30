// ui/screens/shop.ts — 关卡之间的行商帐篷：三个货区、刷新、购入与半价回收。
//
// 从 app.js「Shop」一节原样搬出。卡片文案、货位上限与按钮状态被
// tools/shop-sell-test.mjs 与截图比对依赖，这里只把 Engine.* 换成命名 import，
// 并补上类型标注。替换骰子的弹窗也留在这里，它只服务于买入流程。
import {
  BARREL_BY_ID, DICE_BY_ID, DICE_SETS, ITEM_BY_ID, RARITIES, SHOP_RARITY_WEIGHTS,
  getTable, rarityOf,
} from '../../content/index.ts';
import {
  buyBarrel as engineBuyBarrel, buyDie as engineBuyDie,
  buyItem as engineBuyItem, canSellItem, useItem as engineUseItem,
  getBarrel, getDiceCapacity, getDieSpec, getOwnedItemIds, itemSellPrice,
  refreshCost, refreshSection, sectionLabel, sellItem, shopPrice, shopSlots, activeItemCapacity,
} from '../../core/engine.ts';
import type { RunState, ShopOffer } from '../../core/types.ts';
import { h, num } from '../../core/util.ts';
import { artDieImageHtml } from '../../render/dice-dom.ts';
import { dieSkinStyle, favoredFaces } from '../../render/dice-skins.ts';
import { closeOverlay, openOverlay } from '../components/overlay.ts';
import { showToast } from '../components/toast.ts';
import { barrelTypeLabel } from '../components/tooltip.ts';
import { $ } from '../dom.ts';
import { sound } from '../../platform/sound.ts';
import { getRunRecord, recordShop } from '../../platform/run-record.ts';
import { saveGame } from '../../platform/save.ts';
import { discoverLoadout, discoverShop } from '../../platform/storage.ts';
import { projectedReward } from '../reward.ts';
import { app } from '../state.ts';

export function openShopScreen(): void {
  closeOverlay();
  app.shopOpen = true;
  let screen = $('.shop-screen');
  if (screen) screen.remove();
  screen = document.createElement('section');
  screen.className = 'shop-screen';
  document.body.append(screen);
  renderShopScreen();
}

export function closeShopScreen(): void {
  $('.shop-screen')?.remove();
  app.shopOpen = false;
}

export function renderShopScreen(): void {
  if (!app.run || !app.run.shop) return;
  const screen = $('.shop-screen');
  if (!screen) return;
  const bodyScroll = $('.shop-body', screen)?.scrollTop || 0;
  const run = app.run;
  discoverLoadout(run);
  discoverShop(run);
  const shop = run.shop!;
  const nextLevel = run.level + 1;
  const nextTable = getTable(nextLevel);
  const reward = run.levelReward?.total ?? projectedReward();
  const band = SHOP_RARITY_WEIGHTS.find((entry) => nextLevel <= entry.untilLevel)
    || SHOP_RARITY_WEIGHTS[SHOP_RARITY_WEIGHTS.length - 1]!;
  const stockNote = Object.entries(band.weights)
    .filter(([, weight]) => weight > 0)
    .map(([rarity, weight]) => {
      const share = weight / Object.values(band.weights).reduce((a, b) => a + b, 0) * 100;
      const label = share >= 1 ? `${Math.round(share)}%` : `${share.toFixed(2)}%`;
      return `${RARITIES[rarity as keyof typeof RARITIES].short} ${label}`;
    })
    .join(' · ');
  const slots = shopSlots(run);
  const slotNote = (count: number, unit: string, defaultCount: number, tail: string) => (count > defaultCount
    ? `货架 ${count} ${unit}（含 +1）· ${tail}`
    : `货架 ${defaultCount} ${unit} · ${tail}`);

  screen.innerHTML = `
    <header class="shop-head">
      <div class="shop-title">
        <div class="shop-title-icon"><svg><use href="#i-shop"></use></svg></div>
        <div><h2>行商帐篷</h2><p>第 ${run.level} 关之后 · 下一站 ${h(nextTable.name)}</p></div>
      </div>
      <div class="shop-head-right">
        <span class="shop-reward">本关 +${num(reward)}</span>
        <div class="shop-coin"><svg><use href="#i-coin"></use></svg>${num(run.coins)}<span>银币</span></div>
        <button class="ghost-button" data-action="open-rules"><svg><use href="#i-help"></use></svg><span>规则</span></button>
      </div>
    </header>
    <div class="shop-body">
      <div class="shop-board">
        <div class="shop-zones">
          ${shopZone('dice', '骰子', slotNote(slots.dice, '枚', 2, '购入后替换骰袋'), shop.dice, renderDiceShopCard)}
          ${shopZone('barrel', '骰桶', slotNote(slots.barrel, '只', 1, '立即换上'), shop.barrel, renderBarrelShopCard)}
          ${shopZone('item', '物品', slotNote(slots.item, '件', 3, '随身携带'), shop.item, renderItemShopCard)}
        </div>
        <div class="shop-stock-line">本关骰子货架权重：${stockNote}</div>
        ${renderSellShelf(run)}
      </div>
    </div>
    <footer class="shop-footer">
      <div class="loadout-strip">
        <span class="loadout-label">当前骰袋</span>
        <div class="loadout-dice">${run.bag.map((entry) => {
          const spec = getDieSpec(entry.dieId);
          const weighted = favoredFaces(spec).length > 0;
          return `<span class="mini-die rarity-${spec.rarity} ${spec.setId === 'demon' ? 'is-demon' : ''} ${weighted ? 'is-weighted' : ''}" style="${dieSkinStyle(spec)}" data-pips="${spec.setId === 'demon' ? '魔' : (spec.setId ? spec.name[0]! : '骰')}" data-die-tip="${h(spec.id)}"></span>`;
        }).join('')}</div>
        <span class="loadout-label" style="margin-left:8px">骰桶</span>
        <div class="barrel-thumb" style="width:25px;height:32px" data-barrel-tip="${h(getBarrel(run).id)}"><img src="assets/art/barrels/${getBarrel(run).art}-cup.svg" alt=""></div>
        <div class="loadout-items">${run.activeItems.concat(run.passiveItems).map((id) => `<img src="assets/art/items/${id}-cut.svg" alt="${h(ITEM_BY_ID[id]!.name)}" data-item-tip="${h(id)}">`).join('')}</div>
      </div>
      <div class="shop-continue">
        <button class="primary-button" data-action="leave-shop">前往第 ${nextLevel} 关 · ${h(nextTable.name)} <svg><use href="#i-arrow"></use></svg></button>
      </div>
    </footer>
  `;
  const body = $('.shop-body', screen);
  if (body) body.scrollTop = bodyScroll;
  saveGame(run, getRunRecord());
}

function renderSellShelf(run: RunState): string {
  const owned = getOwnedItemIds(run);
  const cards = owned.map((id) => {
    const item = ITEM_BY_ID[id];
    if (!item) return '';
    const check = canSellItem(run, id);
    const rarity = rarityOf(item);
    const price = itemSellPrice(item);
    return `<article class="sell-card" style="--rarity:${rarity.color}" data-item-tip="${h(item.id)}">
      <img src="assets/art/items/${item.id}-cut.svg" alt="${h(item.name)}">
      <div class="sell-copy">
        <div class="sell-tags"><span>${item.consumable ? '一次性' : item.type === 'active' ? '主动' : '被动'}</span><b>${rarity.name}</b></div>
        <strong>${h(item.name)}</strong>
        <em>${check.ok ? `半价回收 +${price}` : h(check.error)}</em>
      </div>
      <button class="sell-button" data-action="sell-item" data-item-id="${h(id)}" ${check.ok ? '' : 'disabled'} title="${h(check.ok ? `以 ${price} 银币出售` : check.error)}">
        <svg><use href="#i-coin"></use></svg>+${price}
      </button>
    </article>`;
  }).join('');
  return `<section class="shop-sell">
    <header class="shop-sell-head">
      <div><h3>随身物品 · 半价回收</h3></div>
      <span class="rail-note">可出售 ${owned.length} 件</span>
    </header>
    ${owned.length ? `<div class="sell-grid">${cards}</div>` : '<div class="sell-empty">行囊里还没有可出售的物品。</div>'}
  </section>`;
}

function shopZone(
  section: string, title: string, subtitle: string,
  entries: ShopOffer[], cardRenderer: (entry: ShopOffer, index: number) => string,
): string {
  const cost = refreshCost(app.run!, section);
  const cards = entries.length
    ? entries.map((entry, index) => cardRenderer(entry, index)).join('')
    : `<div class="empty-stock"><svg><use href="#i-lock"></use></svg><span>这一栏已经空了。<br>${section === 'barrel' ? '你已收集所有骰桶。' : '没有更多货品。'}</span></div>`;
  return `
    <section class="shop-zone">
      <header class="zone-head">
        <div><h3>${h(title)}<span class="zone-count">${entries.filter((entry) => !entry.sold).length}</span></h3><p>${h(subtitle)}</p></div>
        <button class="refresh-button" data-action="refresh-shop" data-section="${section}" ${app.run!.coins < cost ? 'disabled' : ''}>
          <svg><use href="#i-restart"></use></svg>刷新 <b>${cost}</b>
        </button>
      </header>
      <div class="stock-list">${cards}</div>
    </section>`;
}

function renderDiceShopCard(entry: ShopOffer, index: number): string {
  if (!entry || !entry.id) return emptyShopCard();
  const spec = DICE_BY_ID[entry.id];
  if (!spec) return emptyShopCard();
  const rarity = rarityOf(spec);
  const set = spec.setId ? DICE_SETS[spec.setId] : null;
  const price = shopPrice(app.run!, spec.price);
  const affordable = app.run!.coins >= price;
  const full = app.run!.bag.length >= getDiceCapacity(app.run!);
  return `
    <article class="shop-card stock-row ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-die-tip="${h(spec.id)}">
      <div class="stock-art">${artDieImageHtml(spec)}</div>
      <div class="stock-copy">
        <div class="stock-tags"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${set ? h(set.name) + '套组' : '无套组'}</span></div>
        <h4>${h(spec.name)}</h4>
        <p class="stock-line">${h(spec.desc)}</p>
        <p class="stock-effect">${h(spec.bonus?.label || '没有额外骰面特性')}</p>
      </div>
      <div class="stock-buy">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}</span>
        <button class="buy-button" data-action="buy-die" data-index="${index}" ${entry.sold || !affordable ? 'disabled' : ''}>${full ? '替换' : '购入'}</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function renderBarrelShopCard(entry: ShopOffer, index: number): string {
  if (!entry || !entry.id) return emptyShopCard();
  const barrel = BARREL_BY_ID[entry.id];
  if (!barrel) return emptyShopCard();
  const rarity = rarityOf(barrel);
  const price = shopPrice(app.run!, barrel.price);
  const affordable = app.run!.coins >= price;
  return `
    <article class="shop-card stock-row ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-barrel-tip="${h(barrel.id)}">
      <div class="stock-art"><img class="art-cup" src="assets/art/barrels/${barrel.art}-cut.svg" alt="${h(barrel.name)}"></div>
      <div class="stock-copy">
        <div class="stock-tags"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${h(barrelTypeLabel(barrel))}</span></div>
        <h4>${h(barrel.name)}</h4>
        <p class="stock-line">${h(barrel.desc)}</p>
        <p class="stock-effect">${h(barrel.short)}</p>
      </div>
      <div class="stock-buy">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}</span>
        <button class="buy-button" data-action="buy-barrel" data-index="${index}" ${entry.sold || !affordable ? 'disabled' : ''}>换上</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function renderItemShopCard(entry: ShopOffer, index: number): string {
  if (!entry || !entry.id) return emptyShopCard();
  const item = ITEM_BY_ID[entry.id];
  if (!item) return emptyShopCard();
  const rarity = rarityOf(item);
  const price = shopPrice(app.run!, item.price);
  const affordable = app.run!.coins >= price;
  const activeFull = item.type === 'active' && app.run!.activeItems.length >= activeItemCapacity(app.run!);
  return `
    <article class="shop-card stock-row ${entry.sold ? 'is-sold' : ''}" style="--rarity:${rarity.color};--glow:${rarity.glow}" data-item-tip="${h(item.id)}">
      <div class="stock-art"><img src="assets/art/items/${item.id}-cut.svg" alt="${h(item.name)}"></div>
      <div class="stock-copy">
        <div class="stock-tags"><span class="rarity-tag">${rarity.name}</span><span class="set-tag">${item.consumable ? '一次性' : item.type === 'active' ? '主动' : '被动'}</span></div>
        <h4>${h(item.name)}</h4>
        <p class="stock-line">${h(item.desc)}</p>
      </div>
      <div class="stock-buy">
        <span class="price-tag"><svg><use href="#i-coin"></use></svg>${num(price)}</span>
        <button class="buy-button" data-action="buy-item" data-index="${index}" ${entry.sold || !affordable || activeFull ? 'disabled' : ''}>${activeFull ? '主动已满' : '购入'}</button>
      </div>
      ${entry.sold ? '<span class="sold-stamp">SOLD</span>' : ''}
    </article>`;
}

function emptyShopCard(): string {
  return '<div class="empty-stock"><svg><use href="#i-lock"></use></svg><span>空货位</span></div>';
}

export function refreshShop(section: string): void {
  if (!app.run) return;
  const result = refreshSection(app.run, section);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  recordShop(app.run, { action: 'refresh', kind: section, price: result.cost });
  sound.click();
  renderShopScreen();
  showToast(`刷新${sectionLabel(section)}，花费 ${result.cost} 银币。`);
}

export function buyDie(index: number): void {
  if (!app.run) return;
  const result = engineBuyDie(app.run, index);
  if (!result.ok) {
    if (result.needReplace) {
      app.pendingReplace = { index, die: result.die!, price: result.price! };
      showReplaceModal();
    } else {
      showToast(result.error!, 'error');
    }
    return;
  }
  recordShop(app.run, { action: 'buy', kind: 'die', id: result.die!.id, name: result.die!.name, price: result.price });
  sound.item();
  renderShopScreen();
  showToast(`购入「${result.die!.name}」，花费 ${result.price} 银币。`, 'good');
}

export function buyBarrel(index: number): void {
  if (!app.run) return;
  const result = engineBuyBarrel(app.run, index);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  recordShop(app.run, { action: 'buy', kind: 'barrel', id: result.barrel!.id, name: result.barrel!.name, price: result.price });
  sound.item();
  renderShopScreen();
  showToast(`换上「${result.barrel!.name}」。`, 'good');
}

export function buyItem(index: number): void {
  if (!app.run) return;
  const result = engineBuyItem(app.run, index);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  recordShop(app.run, { action: 'buy', kind: 'item', id: result.item!.id, name: result.item!.name, price: result.price });
  sound.item();
  if (result.item! && 'grant' in result.item! && result.item!.grant) {
    const opened = engineUseItem(app.run, result.item!.id);
    if (opened.ok && opened.grant) {
      app.pendingGrant = { itemId: result.item!.id, candidates: opened.grant.candidates };
      renderShopScreen();
      void import('../game.ts').then(({ showGrantModal }) => showGrantModal());
      return;
    }
  }
  renderShopScreen();
  showToast(`购入「${result.item!.name}」，花费 ${result.price} 银币。`, 'good');
}

export function sellShopItem(itemId: string): void {
  if (!app.run) return;
  const result = sellItem(app.run, itemId);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  recordShop(app.run, { action: 'sell', kind: 'item', id: result.item!.id, name: result.item!.name, price: result.price });
  sound.item();
  renderShopScreen();
  showToast(`出售「${result.item!.name}」，获得 ${result.price} 银币（半价）。`, 'good');
}

export function showReplaceModal(): void {
  if (!app.run || !app.pendingReplace) return;
  const { die, price } = app.pendingReplace;
  const options = app.run.bag.map((entry) => {
    const spec = getDieSpec(entry.dieId);
    const rarity = rarityOf(spec);
    return `
      <button class="replace-option" data-action="confirm-replace" data-bag-uid="${h(entry.uid)}" data-die-tip="${h(spec.id)}">
        ${artDieImageHtml(spec)}
        <b>${h(spec.name)}</b><span>${rarity.name}${spec.setId ? ` · ${DICE_SETS[spec.setId].name}` : ''}</span>
      </button>`;
  }).join('');
  openOverlay(`
    <div class="modal" style="width:min(620px,100%);padding:36px 38px">
      <p class="modal-kicker">DICE BAG FULL</p>
      <h2 class="modal-title" style="font-size:28px;margin-top:5px">骰袋已满</h2>
      <p class="modal-text" style="margin-top:8px">要购入「${h(die.name)}」（${num(price)} 银币），请选择一枚被替换的骰子。被替换的骰子将离开本局。</p>
      <div class="replace-grid">${options}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="cancel-replace">取消</button></div>
    </div>
  `, { dismissible: true });
}

export function confirmReplace(bagUid: string): void {
  if (!app.run || !app.pendingReplace) return;
  const { index } = app.pendingReplace;
  const result = engineBuyDie(app.run, index, bagUid);
  if (!result.ok) { showToast(result.error!, 'error'); return; }
  recordShop(app.run, { action: 'buy-replace', kind: 'die', id: result.die!.id, name: result.die!.name, price: result.price });
  app.pendingReplace = null;
  closeOverlay();
  sound.item();
  renderShopScreen();
  showToast(`购入「${result.die!.name}」并替换了旧骰。`, 'good');
}
