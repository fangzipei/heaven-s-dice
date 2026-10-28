/* ui/screens/shop.ts 是从 app.js「Shop」一节搬出来的行商帐篷。
   三个货区、刷新、购入、半价回收与骰袋替换弹窗都在这里；按钮状态与文案被
   tools/shop-sell-test.mjs 依赖。下面用桩 DOM + 真引擎跑一遍买入卖出，
   断言店铺页与吐司文案没有变。 */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';

import { app } from '../../src/ui/state.ts';
import {
  buyBarrel, buyDie, buyItem, closeShopScreen, confirmReplace, openShopScreen,
  refreshShop, sellShopItem, showReplaceModal,
} from '../../src/ui/screens/shop.ts';
import { createRun, createShop, getDiceCapacity, refreshCost, sectionLabel, shopPrice } from '../../src/core/engine.ts';
import { DICE_BY_ID, ITEM_BY_ID, getTable } from '../../src/content/index.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';
import { assemblySource, legacyAppSource } from '../helpers/legacy-app.mjs';

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  app.run = createRun({ rng: () => 0.5 });
  app.run.coins = 500;
  app.busy = false;
  app.pendingReplace = null;
  app.shopOpen = false;
  app.discovered = { dice: [], barrels: [], items: [] };
});

const screen = () => dom.html('.shop-screen');
const toast = () => dom.node('#toast-stack').children.at(-1)?.textContent ?? '';
const openShop = () => {
  createShop(app.run);
  openShopScreen();
};

describe('市集页搬到 ui/screens/shop.ts 之后仍然写同样的文案', () => {
  test('打开市集：标题、下一站、三个货区与继续按钮', () => {
    openShop();
    const html = screen();
    expect(app.shopOpen).toBe(true);
    expect(html).toContain('<h2>行商帐篷</h2>');
    expect(html).toContain(`第 1 关之后 · 下一站 ${getTable(2).name}`);
    expect(html).toContain('货架 2 枚 · 购入后替换骰袋');
    expect(html).toContain('货架 1 只 · 立即换上');
    expect(html).toContain('货架 3 件 · 随身携带');
    expect(html).toContain('shop-card stock-row');
    for (const section of ['dice', 'barrel', 'item']) {
      expect(html).toContain(`data-action="refresh-shop" data-section="${section}"`);
    }
    expect((html.match(/class="stock-list"/g) || []).length).toBe(3);
    expect(html).toContain(`data-action="leave-shop">前往第 2 关 · ${getTable(2).name}`);
    expect(html).toContain('当前骰袋');
    expect(dom.body.children.some((child) => child.className === 'shop-screen')).toBe(true);
  });

  test('刷新：扣费并重开货位，吐司报花费', () => {
    openShop();
    const cost = refreshCost(app.run, 'dice');
    const coins = app.run.coins;
    refreshShop('dice');
    expect(app.run.coins).toBe(coins - cost);
    expect(toast()).toBe(`刷新${sectionLabel('dice')}，花费 ${cost} 银币。`);
  });

  test('购入物品：扣费、标记售出并报名字', () => {
    openShop();
    const offer = app.run.shop.item[0];
    const item = ITEM_BY_ID[offer.id];
    const price = shopPrice(app.run, item.price);
    const coins = app.run.coins;
    buyItem(0);
    expect(offer.sold).toBe(true);
    expect(app.run.coins).toBe(coins - price);
    expect(toast()).toBe(`购入「${item.name}」，花费 ${price} 银币。`);
  });

  test('骰袋满时先弹替换窗，再确认替换', () => {
    openShop();
    expect(app.run.bag.length).toBe(getDiceCapacity(app.run));
    buyDie(0);
    expect(app.pendingReplace).toBeTruthy();
    const modal = dom.html('#overlay-root');
    expect(modal).toContain('DICE BAG FULL');
    expect(modal).toContain('骰袋已满');
    expect((modal.match(/data-action="confirm-replace"/g) || []).length).toBe(app.run.bag.length);
    const outgoing = app.run.bag[0].uid;
    const incoming = app.run.shop.dice[0].id;
    confirmReplace(outgoing);
    expect(app.pendingReplace).toBeNull();
    // 替换是原地换骰：槽位 uid 不变，只换 dieId。
    expect(app.run.bag.find((entry) => entry.uid === outgoing).dieId).toBe(incoming);
    expect(toast()).toBe(`购入「${DICE_BY_ID[incoming].name}」并替换了旧骰。`);
  });

  test('换桶：扣费后立即成为当前骰桶', () => {
    openShop();
    const offer = app.run.shop.barrel[0];
    const before = app.run.barrelId;
    buyBarrel(0);
    expect(offer.sold).toBe(true);
    expect(app.run.barrelId).not.toBe(before);
    expect(toast()).toContain('换上「');
  });

  test('半价回收随身物品', () => {
    openShop();
    sellShopItem('lucky_coin');
    expect(app.run.activeItems).not.toContain('lucky_coin');
    expect(toast()).toContain('出售「幸运币」');
    expect(toast()).toContain('（半价）。');
  });

  test('关闭市集：屏幕摘掉并复位开关', () => {
    openShop();
    closeShopScreen();
    expect(app.shopOpen).toBe(false);
  });
});

describe('替换弹窗可以直接被调用', () => {
  test('没有挂起订单时不开窗', () => {
    app.pendingReplace = null;
    showReplaceModal();
    expect(dom.html('#overlay-root')).toBe('');
  });
});

describe('市集只有一份实现', () => {
  const legacy = legacyAppSource();
  const shop = readFileSync(new URL('../../src/ui/screens/shop.ts', import.meta.url), 'utf8');

  for (const name of [
    'openShopScreen', 'closeShopScreen', 'renderShopScreen', 'renderSellShelf', 'shopZone',
    'renderDiceShopCard', 'renderBarrelShopCard', 'renderItemShopCard', 'emptyShopCard',
    'refreshShop', 'buyDie', 'buyBarrel', 'buyItem', 'sellShopItem', 'showReplaceModal', 'confirmReplace',
  ]) {
    test(`app.js 不再自己声明 ${name}`, () => {
      expect(legacy, `app.js 重新声明了 ${name}`).not.toMatch(new RegExp(`function ${name}\\s*\\(`));
      expect(shop).toMatch(new RegExp(`function ${name}\\s*\\(`));
    });
  }

  test('app.js 从 ui/screens/shop.ts 取用', () => {
    expect(assemblySource()).toMatch(/from '\.\/screens\/shop\.ts'/);
  });

  test('市集屏不反向 import 组装层', () => {
    expect(shop).not.toMatch(/from '\.\.\/app\.ts'/);
  });
});
