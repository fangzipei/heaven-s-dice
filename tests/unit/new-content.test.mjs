import { describe, expect, test } from 'vitest';

import {
  DICE_BY_ID, ITEM_BY_ID, ITEMS,
} from '../../src/content/index.ts';
import {
  advanceLevel, applyItemGrant, applyScore, buildScore, bustRound, createRun, createShop, getDiceCapacity, initLevel,
  makeRng, refreshSection, rollDice, shopPrice, useItem,
} from '../../src/core/engine.ts';

function blankState({ barrel = 'oak', rerolls = 3 } = {}) {
  const state = createRun({ rng: makeRng(11) });
  state.rng = makeRng(11);
  state.bag = Array.from({ length: 6 }, (_, index) => ({ uid: `b${index}`, dieId: 'standard' }));
  state.barrelId = barrel;
  state.phase = 'selecting';
  state.rerolls = rerolls;
  state.target = 99_999;
  state.score = 0;
  state.roundScore = 0;
  state.flags = { roundSinglesOnly: true };
  return state;
}

function select(state, dice) {
  state.dice = dice.map((entry, index) => ({
    uid: `d${index}`,
    bagUid: entry.bagUid || `b${index}`,
    dieId: entry.dieId || 'standard',
    value: entry.value,
    blank: false,
    wild: false,
    scored: false,
    probs: entry.probs,
  }));
  state.selected = state.dice.map((die) => die.uid);
  return state;
}

const totalFor = (state) => buildScore(state, 'reroll').total;

describe('条子术语与新被动物品', () => {
  test('三条/四条/五条/六条/顺子/天地顺/一点五点各自乘算', () => {
    const triple = blankState();
    select(triple, [{ value: 3 }, { value: 3 }, { value: 3 }]);
    expect(totalFor(triple)).toBe(300);
    triple.passiveItems = ['triple_charm'];
    expect(totalFor(triple)).toBe(345);

    const quad = blankState();
    select(quad, [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }]);
    quad.passiveItems = ['quad_seal'];
    expect(totalFor(quad)).toBe(720);

    const quint = blankState();
    select(quint, [3, 3, 3, 3, 3].map((value) => ({ value })));
    quint.passiveItems = ['quint_clasp'];
    expect(totalFor(quint)).toBe(1500);

    const sext = blankState();
    select(sext, [3, 3, 3, 3, 3, 3].map((value) => ({ value })));
    sext.passiveItems = ['sext_crown'];
    expect(totalFor(sext)).toBe(3600);

    const straight = blankState();
    select(straight, [1, 2, 3, 4, 5].map((value) => ({ value })));
    straight.passiveItems = ['straight_bell'];
    expect(totalFor(straight)).toBe(560);

    const full = blankState();
    select(full, [1, 2, 3, 4, 5, 6].map((value) => ({ value })));
    full.passiveItems = ['heaven_plate'];
    expect(totalFor(full)).toBe(1800);

    const pips = blankState();
    select(pips, [{ value: 1 }]);
    pips.passiveItems = ['pip_ward'];
    expect(totalFor(pips)).toBe(110);
  });

  test('三条物品不会误吃到四条', () => {
    const state = blankState();
    select(state, [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }]);
    state.passiveItems = ['triple_charm'];
    expect(totalFor(state)).toBe(600);
  });
});

describe('新骰子计分规则', () => {
  test('衡心 +180 / 孤崖 +400', () => {
    const balance = blankState();
    select(balance, [{ dieId: 'balance', value: 3 }, { value: 3 }, { value: 3 }]);
    expect(totalFor(balance)).toBe(480);

    const cliff = blankState();
    select(cliff, [{ dieId: 'cliff', value: 3 }, { value: 3 }, { value: 3 }]);
    expect(totalFor(cliff)).toBe(700);
  });

  test('重奏在条子里额外结算一次', () => {
    const triple = blankState();
    select(triple, [{ dieId: 'refrain', value: 3 }, { value: 3 }, { value: 3 }]);
    expect(totalFor(triple)).toBe(400);

    const quad = blankState();
    select(quad, [{ dieId: 'refrain', value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }]);
    expect(totalFor(quad)).toBe(750);
  });

  test('末路在没有重投时 ×1.5', () => {
    const state = blankState({ rerolls: 0 });
    select(state, [{ dieId: 'last_road', value: 1 }]);
    expect(totalFor(state)).toBe(150);
  });

  test('商旅每次商店重随只记一次，计分加成累加', () => {
    const state = blankState();
    state.bag[0] = { uid: 'b0', dieId: 'merchant' };
    state.shop = { dice: [], barrel: [], item: [], refreshes: { dice: 0 } };
    state.coins = 999;
    refreshSection(state, 'dice');
    refreshSection(state, 'dice');
    expect(state.bag[0].shopRerolls).toBe(1);
    state.phase = 'selecting';
    select(state, [{ bagUid: 'b0', dieId: 'merchant', value: 1 }]);
    expect(totalFor(state)).toBe(110);
  });

  test('史诗及以上的骰子只按百分比加分', () => {
    const flatTypes = ['hasFace', 'wildFlat', 'anyTriple', 'faceFlat', 'fiveAndSix', 'tripleFace', 'straightFlat', 'flatScored'];
    const offenders = Object.values(DICE_BY_ID)
      .filter((die) => die && (die.rarity === 'epic' || die.rarity === 'legendary'))
      .filter((die) => die.bonus && flatTypes.includes(die.bonus.type))
      .map((die) => die.id);
    expect(offenders).toEqual([]);
  });

  test('百分比加分只在触发条件成立时生效', () => {
    const ace = blankState();
    select(ace, [{ dieId: 'ace', value: 1 }]);
    expect(totalFor(ace)).toBe(130);

    const five = blankState();
    select(five, [{ dieId: 'ace', value: 5 }]);
    expect(totalFor(five)).toBe(50);
  });

  test('金痕骰只在锁分时给银币，继续时先挂账', () => {
    const state = blankState();
    select(state, [{ dieId: 'gilded_trace', value: 1 }, { value: 5 }]);
    const result = applyScore(state, 'continue');
    expect(result.ok).toBe(true);
    expect(state.coins).toBe(0);
    expect(state.roundCoins).toBe(33);
    expect(result.coins).toBe(0);

    // Banking the round pays every 金痕 die scored during it.
    state.rerolls = 0;
    select(state, [{ value: 1 }, { value: 5 }]);
    const bank = applyScore(state, 'bank');
    expect(bank.ok).toBe(true);
    expect(state.coins).toBe(33);
    expect(state.roundCoins).toBe(0);
    expect(bank.coins).toBe(33);
  });

  test('过关离开赌桌时金痕挂账照常入账', () => {
    const state = blankState();
    select(state, [{ dieId: 'gilded_trace', value: 1 }, { value: 5 }]);
    applyScore(state, 'continue');
    expect(state.roundCoins).toBe(33);
    state.score = state.target;
    expect(advanceLevel(state).ok).toBe(true);
    // The level reward lands on top, so only the floor and the cleared pool
    // are pinned here.
    expect(state.coins).toBeGreaterThanOrEqual(33);
    expect(state.roundCoins).toBe(0);
    expect(state.log.some((entry) => String(entry.text || '').includes('+33 银币'))).toBe(true);
  });

  test('金痕骰在掷空时连同挂账一起作废', () => {
    const state = blankState();
    select(state, [{ dieId: 'gilded_trace', value: 1 }, { value: 5 }]);
    applyScore(state, 'continue');
    expect(state.roundCoins).toBe(33);
    bustRound(state);
    expect(state.coins).toBe(0);
    expect(state.roundCoins).toBe(0);
  });

  test('计分并重投时金痕当场结算', () => {
    const state = blankState();
    select(state, [{ dieId: 'gilded_trace', value: 1 }, { value: 5 }]);
    const result = applyScore(state, 'reroll');
    expect(result.ok).toBe(true);
    expect(state.coins).toBe(33);
    expect(result.coins).toBe(33);
  });

  test('鎏金桶的金币与金痕骰一样，锁分后才入账', () => {
    const state = blankState({ barrel: 'gilded' });
    state.dice = [{ uid: 'd0', bagUid: 'b0', dieId: 'standard', value: 1, blank: false, wild: false, scored: false, gilded: true }];
    state.selected = ['d0'];
    const continued = applyScore(state, 'continue');
    expect(continued.coins).toBe(0);
    expect(continued.pendingCoins).toBe(110);
    expect(state.coins).toBe(0);
    expect(state.roundCoins).toBe(110);

    // Locking the round pays the pending gold.
    state.rerolls = 0;
    state.dice = [{ uid: 'd1', bagUid: 'b0', dieId: 'standard', value: 5, blank: false, wild: false, scored: false }];
    state.selected = ['d1'];
    const banked = applyScore(state, 'bank');
    expect(banked.coins).toBe(110);
    expect(state.coins).toBe(110);
    expect(state.roundCoins).toBe(0);
  });

  test('鎏金桶的挂账金币在掷空时作废', () => {
    const state = blankState({ barrel: 'gilded' });
    state.dice = [{ uid: 'd0', bagUid: 'b0', dieId: 'standard', value: 1, blank: false, wild: false, scored: false, gilded: true }];
    state.selected = ['d0'];
    applyScore(state, 'continue');
    expect(state.roundCoins).toBe(110);
    bustRound(state);
    expect(state.coins).toBe(0);
    expect(state.roundCoins).toBe(0);
  });
});

describe('停审令牌', () => {
  function pardonState() {
    const state = blankState({ rerolls: 3 });
    state.phase = 'reroll-pending';
    state.flags.rerollAll = true;
    state.passiveItems = ['judge_relic'];
    state.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    state.selected = [];
    return state;
  }

  test('触发时豁免这一次重投，并把 pardon 交给界面', () => {
    const state = pardonState();
    const result = rollDice(state, { rng: () => 0.1 });
    expect(result.ok).toBe(true);
    expect(result.pardon).toBe(true);
    expect(state.rerolls).toBe(3);
    expect(state.flags.judgeRelicUsed).toBe(true);
    expect(state.log.some((entry) => String(entry.text || '').includes('停审令牌'))).toBe(true);
  });

  test('没触发时照常扣一次重投', () => {
    const state = pardonState();
    const result = rollDice(state, { rng: () => 0.9 });
    expect(result.pardon).toBe(false);
    expect(state.rerolls).toBe(2);
    expect(state.flags.judgeRelicUsed).toBeFalsy();
  });

  test('同一关只触发一次', () => {
    const state = pardonState();
    state.flags.judgeRelicUsed = true;
    const result = rollDice(state, { rng: () => 0.1 });
    expect(result.pardon).toBe(false);
    expect(state.rerolls).toBe(2);
  });
});

describe('全骰连击', () => {
  test('本关每次全骰再叠一层 ×1.2，并累计整局全骰次数', () => {
    const state = blankState();
    select(state, [1, 1, 1, 1, 1, 1].map((value) => ({ value })));
    const first = applyScore(state, 'continue');
    expect(first.hot).toBe(true);
    expect(first.hotCount).toBe(1);
    expect(first.hotMultiplier).toBeCloseTo(1.2);
    expect(first.total).toBe(Math.round(8000 * 1.2));

    select(state, [1, 1, 1, 1, 1, 1].map((value) => ({ value })));
    const second = applyScore(state, 'continue');
    expect(second.hot).toBe(true);
    expect(second.hotCount).toBe(2);
    expect(second.hotMultiplier).toBeCloseTo(1.44);
    expect(second.total).toBe(Math.round(8000 * 1.44));
    expect(state.stats.hotDice).toBe(2);
  });

  test('没触发全骰的一手不加倍', () => {
    const state = blankState();
    select(state, [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 6 }, { value: 6 }]);
    state.selected = [state.dice[0].uid];
    const result = applyScore(state, 'continue');
    expect(result.hot).toBe(false);
    expect(result.total).toBe(100);
    expect(state.hotCount).toBe(0);
    expect(state.stats.hotDice).toBe(0);
  });

  test('进入新关卡清零全骰计数（整局记录保留）', () => {
    const state = blankState();
    state.hotCount = 4;
    state.stats.hotDice = 7;
    initLevel(state);
    expect(state.hotCount).toBe(0);
    expect(state.stats.hotDice).toBe(7);
  });
});

describe('新骰桶与新骰子礼包', () => {
  test('定一桶会把一颗骰子指定为 1', () => {
    const state = blankState({ barrel: 'marker' });
    state.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    // 6 次落骰都是 4 点，随后 0.0 触发 10% 概率、0.0 选中第一颗。
    const seq = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5];
    let cursor = 0;
    const rng = () => seq[cursor++] ?? 0.5;
    rollDice(state, { free: true, rng });
    expect(state.dice.filter((die) => die.value === 1).length).toBe(1);
  });

  test('顺遂桶会把只差一颗的骰型补成天地顺', () => {
    const state = blankState({ barrel: 'guide' });
    state.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    // 1, 2, 3, 4, 6, 6 → 补成 1, 2, 3, 4, 5, 6。
    const seq = [0.1, 0.25, 0.4, 0.6, 0.9, 0.95, 0.5, 0.5, 0.5, 0.5, 0.5];
    let cursor = 0;
    const rng = () => seq[cursor++] ?? 0.5;
    rollDice(state, { free: true, rng });
    const values = state.dice.map((die) => die.value).sort((a, b) => a - b);
    expect(values).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('鎏金桶会给一颗落骰打上金痕', () => {
    const state = blankState({ barrel: 'gilded' });
    state.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    const seq = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5];
    let cursor = 0;
    const rng = () => seq[cursor++] ?? 0.5;
    rollDice(state, { free: true, rng });
    expect(state.dice.filter((die) => die.gilded).length).toBe(1);
  });

  test('史诗骰匣只开史诗骰，并消耗自身', () => {
    const state = blankState();
    state.activeItems = ['epic_chest'];
    state.itemCharges = { epic_chest: 1 };
    const used = useItem(state, 'epic_chest');
    expect(used.ok).toBe(true);
    expect(used.grant.candidates.length).toBe(1);
    expect(used.grant.candidates[0].rarity).toBe('epic');
    const chosen = used.grant.candidates[0];
    const needsSlot = applyItemGrant(state, 'epic_chest', chosen.id);
    expect(needsSlot.needReplace).toBe(true);
    expect(state.activeItems).toContain('epic_chest');
    const applied = applyItemGrant(state, 'epic_chest', chosen.id, state.bag[0].uid);
    expect(applied.ok).toBe(true);
    expect(applied.replaced).toBeTruthy();
    expect(state.activeItems).not.toContain('epic_chest');
    expect(state.bag.some((entry) => entry.dieId === chosen.id)).toBe(true);
  });

  test('每次摇骰都会打乱整桌骰子的顺序', () => {
    const state = blankState();
    const ids = ['balance', 'cliff', 'refrain', 'shifting', 'merchant', 'gilded_trace'];
    state.bag = ids.map((dieId, index) => ({ uid: `b${index}`, dieId }));
    state.dice = ids.map((dieId, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId,
      value: null, blank: false, wild: false, scored: false,
    }));
    const orders = new Set();
    for (let i = 0; i < 12; i += 1) {
      state.phase = 'ready';
      for (const die of state.dice) { die.value = null; die.scored = false; }
      rollDice(state, { free: true, rng: makeRng(18000 + i) });
      orders.add(state.dice.map((die) => die.dieId).join(','));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  test('独注桶只在整轮单骰计分时 +20%', () => {
    const state = blankState({ barrel: 'singles' });
    select(state, [{ value: 1 }]);
    expect(totalFor(state)).toBe(120);

    state.flags.roundSinglesOnly = false;
    expect(totalFor(state)).toBe(100);
  });

  test('增殖桶会临时多出一颗骰，并在下一掷收回', () => {
    const state = blankState({ barrel: 'brood' });
    state.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    let sawExtra = false;
    for (let i = 0; i < 120 && !sawExtra; i += 1) {
      state.phase = 'ready';
      for (const die of state.dice) { die.value = null; die.scored = false; }
      rollDice(state, { free: true, rng: makeRng(8000 + i) });
      sawExtra = state.dice.some((die) => die.extra);
    }
    expect(sawExtra).toBe(true);
    expect(state.dice.length).toBe(7);
    state.phase = 'ready';
    rollDice(state, { free: true, rng: makeRng(9999) });
    expect(state.dice.length).toBe(6);
  });

  test('稀有骰函给出两枚候选，选定后消耗并替换标准骰', () => {
    const state = blankState();
    state.activeItems = ['rare_pair'];
    state.itemCharges = { rare_pair: 1 };
    const used = useItem(state, 'rare_pair');
    expect(used.ok).toBe(true);
    expect(used.grant.candidates.length).toBe(2);
    expect(used.grant.choose).toBe(1);
    expect(state.activeItems).toContain('rare_pair');

    const chosen = used.grant.candidates[0];
    const needsSlot = applyItemGrant(state, 'rare_pair', chosen.id);
    expect(needsSlot.needReplace).toBe(true);
    expect(state.activeItems).toContain('rare_pair');
    const targetUid = state.bag[0].uid;
    const applied = applyItemGrant(state, 'rare_pair', chosen.id, targetUid);
    expect(applied.ok).toBe(true);
    expect(applied.replaced).toBeTruthy();
    expect(state.activeItems).not.toContain('rare_pair');
    expect(state.bag.some((entry) => entry.dieId === chosen.id)).toBe(true);
    expect(state.bag.length).toBe(getDiceCapacity(state));
  });

  test('随影复制第一颗，邻行贴向上一颗，浮面每关换概率', () => {
    const copy = blankState();
    copy.bag[0] = { uid: 'b0', dieId: 'shadow' };
    copy.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: index === 0 ? 'shadow' : 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    let copied = 0;
    let copyCases = 0;
    for (let i = 0; i < 120; i += 1) {
      copy.phase = 'ready';
      for (const die of copy.dice) { die.value = null; die.scored = false; }
      rollDice(copy, { free: true, rng: makeRng(12000 + i) });
      const index = copy.dice.findIndex((die) => die.dieId === 'shadow');
      if (index > 0) {
        copyCases += 1;
        if (copy.dice[index].value === copy.dice[0].value) copied += 1;
      }
    }
    expect(copyCases).toBeGreaterThan(20);
    expect(copied).toBe(copyCases);

    const neighbor = blankState();
    neighbor.bag[0] = { uid: 'b0', dieId: 'neighbor' };
    neighbor.dice = Array.from({ length: 6 }, (_, index) => ({
      uid: `d${index}`, bagUid: `b${index}`, dieId: index === 0 ? 'neighbor' : 'standard',
      value: null, blank: false, wild: false, scored: false,
    }));
    let adjacent = 0;
    let neighborCases = 0;
    for (let i = 0; i < 120; i += 1) {
      neighbor.phase = 'ready';
      for (const die of neighbor.dice) { die.value = null; die.scored = false; }
      rollDice(neighbor, { free: true, rng: makeRng(15000 + i) });
      const index = neighbor.dice.findIndex((die) => die.dieId === 'neighbor');
      if (index > 0) {
        neighborCases += 1;
        const value = neighbor.dice[index].value;
        const prev = neighbor.dice[index - 1].value;
        if (value === prev - 1 || value === prev + 1) adjacent += 1;
      }
    }
    expect(neighborCases).toBeGreaterThan(20);
    expect(adjacent / neighborCases).toBeGreaterThan(0.5);

    const shifting = blankState();
    shifting.bag[0] = { uid: 'b0', dieId: 'shifting' };
    initLevel(shifting);
    const first = [...shifting.bag[0].probs];
    initLevel(shifting);
    expect(shifting.bag[0].probs).not.toEqual(first);
  });
});

describe('商店涨价', () => {
  test('骰子和物品的稀有度刷新概率使用同一组档位', () => {
    const state = blankState();
    state.level = 1;
    const rng = makeRng(20261027);
    const itemCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const dieCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 2000; i += 1) {
      const shop = createShop(state, { rng });
      for (const offer of shop.item) itemCounts[ITEM_BY_ID[offer.id].rarity] += 1;
      for (const offer of shop.dice) dieCounts[DICE_BY_ID[offer.id].rarity] += 1;
    }
    const itemTotal = Object.values(itemCounts).reduce((sum, n) => sum + n, 0);
    const dieTotal = Object.values(dieCounts).reduce((sum, n) => sum + n, 0);
    expect(itemCounts.common / itemTotal).toBeGreaterThan(0.58);
    expect(itemCounts.common / itemTotal).toBeLessThan(0.72);
    expect(itemCounts.rare / itemTotal).toBeGreaterThan(0.20);
    expect(itemCounts.rare / itemTotal).toBeLessThan(0.34);
    expect(Math.abs(itemCounts.common / itemTotal - dieCounts.common / dieTotal)).toBeLessThan(0.06);
    expect(Math.abs(itemCounts.rare / itemTotal - dieCounts.rare / dieTotal)).toBeLessThan(0.06);
    expect(itemCounts.legendary / itemTotal).toBeLessThanOrEqual(0.02);
  });

  test('所有货品在标价基础上上浮 25%', () => {
    const state = blankState();
    expect(shopPrice(state, 35)).toBe(44);
    expect(shopPrice(state, 100)).toBe(125);
    expect(shopPrice(state, 210)).toBe(263);
  });
});
