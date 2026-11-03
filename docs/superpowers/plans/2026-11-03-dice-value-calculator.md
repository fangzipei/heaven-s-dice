# 骰子收益计算器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `tools/dice-value.mjs`，对每颗骰输出四轴综合收益评估（强度快照 / 金钱经济 / 获取难度 / 综合评级），支持 `--bag` 任意 6 骰阵容与 `--json`。

**Architecture:** 单文件 Node 脚本（沿用 tools/ 下 dice-ev.mjs 的组织惯例）：CLI 解析 → 贪心策略关卡模拟（配对 RNG）→ `createShop` 蒙特卡洛出现率 → 归一加权评级 → CJK 对齐表格输出。只读引擎，不改任何 src/ 文件。

**Tech Stack:** Node ≥24 原生跑 .ts import（项目既有方式）、`src/core/engine.ts`、`src/core/scoring.ts`、`src/content/index.ts`。

**Spec:** `docs/superpowers/specs/2026-11-03-dice-value-calculator-design.md`

**关键事实（实现者必读）：**
- 金币入账唯一入口是 `awardLevel`（engine.ts:1158），在 `advanceLevel` → `completeLevel` 内触发；含未用重投 20% 折算、超 2 倍目标 +50%、金币收益 +10% 系数，最后 `state.coins += total`。所以模拟中把 `state.coins` 清零后通关，读回的就是真实每关金币收入。
- 商店骰位默认 2 个（`shopSlots`，engine.ts:2450）；`diceOffers`（engine.ts:2358）按稀有度带权重分摊到档内骰子、恶魔骰 ×0.5、已持有套装 ×1.5、unique 已持有过滤——蒙特卡洛必须用真实 `createShop` 而不是手算权重。
- 刷新成本 `refreshCost`（engine.ts:2285）：骰区基价 20，每刷翻倍。
- 庄家关在 3/7/11/15/20/24/25；快照等级取非庄家关 4/9/13/18/23，恰好各落在一个商店权重带（≤6/≤12/≤18/≤24）。
- `DICE`（36 颗）不含 standard；`getDieSpec('standard')` 有效，用于补位。
- 共享工作区：**只 `git add tools/dice-value.mjs` 与本目录文档**，绝不 `git add -A`。

---

### Task 1: 脚本骨架 — CLI + 显示辅助 + 关卡模拟核心 + 基准行

**Files:**
- Create: `tools/dice-value.mjs`

- [ ] **Step 1: 写入文件头、imports、CLI 解析与显示辅助**

创建 `tools/dice-value.mjs`，内容如下（完整文件，后续任务在末尾追加段落）：

```js
/* ============================================================
   Dice value calculator — 四轴综合收益评估
   ------------------------------------------------------------
   dice-ev.mjs answers "how strong is this die". This tool answers
   the buying question: strong AND affordable AND findable. Per die,
   bag = [die] + 5 standard vs the 6-standard baseline, paired RNG:

   strength : level score Δ at snapshot levels (non-boss, one per
              shop rarity band).
   money    : per-level coin EV Δ measured from what awardLevel
              actually credits (win × reward + spare-reroll refund
              + overshoot + coin effects), payback levels, net gain
              over the remaining run.
   access   : appearance rate per shop visit via real createShop
              Monte Carlo (rarity bands, demon ×0.5, owned-set ×1.5,
              unique filtering all included), expected shops and
              expected acquisition cost (base refresh 20 each).
   composite: min-max normalized strength/money/access blend
              (default 50/30/20) → S/A/B/C grade.

   Usage: node tools/dice-value.mjs [options]
     --trials=600    level simulations per configuration
     --shop=20000    shop draws per snapshot level
     --level=9       reference level for money/access columns
     --w=50,30,20    composite weights: strength, money, access
     --bag=a,b,c     evaluate an arbitrary bag instead of the roster
     --die=id        restrict the roster to one die
     --rarity=...    restrict the roster to one rarity
     --quick         quarter the sample counts
     --json          machine-readable output
   ============================================================ */

import { DICE, DICE_SETS, LEVEL_COUNT, getLevelConfig } from '../src/content/index.ts';
import {
  createRun, rollDice, applyScore, getScorePreview, availableDice,
  advanceLevel, isBossDieBlocked, initLevel, createShop, makeRng,
  getDieSpec, BASE_REROLLS,
} from '../src/core/engine.ts';
import { bestSelection } from '../src/core/scoring.ts';

// ── CLI ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split('=')[1]);
  return Number.isFinite(value) ? value : fallback;
}
function argStr(name, fallback) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}
const TRIALS = arg('trials', 600);
const SHOP_TRIALS = arg('shop', 20000);
const QUICK = argv.includes('--quick');
const JSON_OUT = argv.includes('--json');
const REF_LEVEL = Math.min(Math.max(arg('level', 9), 1), LEVEL_COUNT);
const WEIGHTS = argStr('w', '50,30,20').split(',').map(Number);
const BAG_ARG = argStr('bag', '');
const DIE_FILTER = argStr('die', '');
const RARITY = argStr('rarity', '');
const T = QUICK ? Math.max(60, Math.round(TRIALS / 4)) : TRIALS;
if (WEIGHTS.length !== 3 || WEIGHTS.some((v) => !Number.isFinite(v))) {
  console.error('--w 需要三个数字，如 --w=50,30,20');
  process.exit(1);
}

/** Non-boss snapshots, one per shop rarity band (≤6/≤12/≤18/≤24). */
const SNAPSHOT_LEVELS = [...new Set([4, 9, 13, 18, 23, REF_LEVEL])].sort((a, b) => a - b);

// ── display helpers (CJK aware) ────────────────────────────────────────────
const widthOf = (s) => [...String(s)].reduce(
  (w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0,
);
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - widthOf(s)));
const padL = (s, n) => ' '.repeat(Math.max(0, n - widthOf(s))) + String(s);
const num = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '-');

// ── bag recipes ────────────────────────────────────────────────────────────
const STANDARD_BAG = () => [0, 0, 0, 0, 0, 0].map(() => 'standard');
function bagSolo(dieId) {
  const bag = STANDARD_BAG();
  bag[0] = dieId;
  return bag;
}

// ── simulation ─────────────────────────────────────────────────────────────
function makeState(bagIds, level, rng) {
  const state = createRun({ rng });
  state.bag = bagIds.map((id, index) => ({ uid: `dv-${index}`, dieId: id }));
  state.level = level;
  state.activeItems = [];
  state.passiveItems = [];
  state.acquiredItemIds = [];
  initLevel(state);
  // Zeroing here means state.coins after a won level is exactly what
  // awardLevel credited: reward + reroll refund + overshoot + coin effects.
  state.coins = 0;
  return state;
}

/** Greedy policy: always bank the best legal selection, reroll when behind. */
function playLevel(state) {
  let guard = 0;
  const stats = { dead: 0, throws: 0 };
  while (!['won', 'run-won', 'lost'].includes(state.phase) && guard++ < 200) {
    if (state.score >= state.target) {
      if (!advanceLevel(state).ok) break;
      break;
    }
    if (['ready', 'dead', 'hot'].includes(state.phase)) {
      const free = state.phase === 'hot';
      const before = state.phase;
      const result = rollDice(state, { free });
      if (!result.ok) break;
      stats.throws += 1;
      if (state.phase === 'dead' && before !== 'dead') stats.dead += 1;
      continue;
    }
    if (state.phase === 'selecting') {
      const best = bestSelection(
        availableDice(state).filter((die) => !isBossDieBlocked(state, die)),
      );
      if (!best) { state.phase = 'dead'; continue; }
      state.selected = best.dice.map((d) => d.uid);
      const preview = getScorePreview(state);
      if (!preview.valid) break;
      const needTarget = state.score + preview.totalContinue >= state.target;
      const action = state.rerolls <= 0
        ? 'bank'
        : (needTarget || preview.totalContinue >= preview.totalReroll) ? 'continue' : 'reroll';
      const result = applyScore(state, action);
      if (!result.ok) break;
      if (state.phase === 'reroll-pending' && !rollDice(state).ok) break;
      continue;
    }
    if (state.phase === 'reroll-pending') {
      if (!rollDice(state).ok) break;
      continue;
    }
    break;
  }
  return stats;
}

/** @returns {{score:number, win:number, coins:number, deadRate:number}} */
function levelEV(bagIds, { level, trials = T } = {}) {
  let score = 0;
  let wins = 0;
  let coins = 0;
  let dead = 0;
  let throws = 0;
  for (let t = 0; t < trials; t += 1) {
    const rng = makeRng((0x9e3779b9 + t * 2654435761) >>> 0);
    const state = makeState(bagIds, level, rng);
    const stats = playLevel(state);
    score += state.score;
    wins += state.score >= state.target ? 1 : 0;
    coins += state.coins;
    dead += stats.dead;
    throws += stats.throws;
  }
  return {
    score: score / trials,
    win: wins / trials,
    coins: coins / trials,
    deadRate: throws ? dead / throws : 0,
  };
}
```

- [ ] **Step 2: 追加 main 骨架 — 表头打印与基准行**

在文件末尾追加：

```js
// ── main ───────────────────────────────────────────────────────────────────
const started = Date.now();
const ROSTER = DICE.filter((die) => (!DIE_FILTER || die.id === DIE_FILTER)
  && (!RARITY || die.rarity === RARITY));

if (!JSON_OUT) {
  console.log('');
  console.log('════ 骰子综合价值评估 ════');
  console.log(`快照关卡：${SNAPSHOT_LEVELS.join(' / ')} · 参考关 L${REF_LEVEL} · 重投 ${BASE_REROLLS} 次 · 无道具 · 骰桶橡木`);
  console.log(`样本：关卡 ${T} 局/配置 · 商店 ${SHOP_TRIALS} 次/快照 · 综合权重 ${WEIGHTS.join('/')}`);
  console.log('\n计算基准中…');
}

const baseByLevel = new Map();
for (const level of SNAPSHOT_LEVELS) {
  baseByLevel.set(level, levelEV(STANDARD_BAG(), { level }));
  const base = baseByLevel.get(level);
  if (!JSON_OUT) {
    const cfg = getLevelConfig(level);
    console.log(
      `  L${padL(level, 2)}（目标 ${num(cfg.target)} · 赏金 ${num(cfg.reward)}）：`
      + `基准分 ${num(base.score, 1)} · 达标率 ${num(base.win * 100, 1)}% · 金币/关 ${num(base.coins, 1)}`,
    );
  }
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --trials=60`
Expected: 表头四行 + 每个快照关一行基准（L4/L9/L13/L18/L23 各含目标、赏金、基准分、达标率、金币/关），无报错。基准分应随关卡上升（几百到数千），达标率在 0–100% 之间。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value calculator skeleton with paired-RNG level sim"
```

---

### Task 2: 强度轴 — 全骰快照 Δ 表（表 A）

**Files:**
- Modify: `tools/dice-value.mjs`（末尾追加）

- [ ] **Step 1: 追加 roster 循环**

```js
// ── roster sweep ───────────────────────────────────────────────────────────
const rows = [];
for (const die of ROSTER) {
  const deltas = {};
  const wins = {};
  const coinDeltas = {};
  const deadRates = {};
  for (const level of SNAPSHOT_LEVELS) {
    const ev = levelEV(bagSolo(die.id), { level });
    const base = baseByLevel.get(level);
    deltas[level] = ev.score - base.score;
    wins[level] = ev.win;
    coinDeltas[level] = ev.coins - base.coins;
    deadRates[level] = ev.deadRate;
  }
  rows.push({ die, deltas, wins, coinDeltas, deadRates });
  if (!JSON_OUT) process.stdout.write(`  · ${die.name}\n`);
}
```

- [ ] **Step 2: 追加表 A 输出**

```js
// ── table A: strength ──────────────────────────────────────────────────────
if (!JSON_OUT) {
  console.log('\n── 表 A：强度 · 关卡分 Δ（bag = 该骰 + 5 标准 vs 6 标准） ──');
  const head = ['骰子', '套组', '稀有', '价', ...SNAPSHOT_LEVELS.map((l) => `ΔL${l}`), `达标%@L${REF_LEVEL}`, `死掷%@L${REF_LEVEL}`];
  console.log([
    pad(head[0], 14), pad(head[1], 8), pad(head[2], 6), padL(head[3], 5),
    ...head.slice(4, -2).map((h) => padL(h, 8)),
    padL(head.at(-2), 11), padL(head.at(-1), 11),
  ].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      pad(DICE_SETS[row.die.setId]?.name || '-', 8),
      pad(row.die.rarity, 6),
      padL(String(row.die.price), 5),
      ...SNAPSHOT_LEVELS.map((l) => padL(num(row.deltas[l], 0), 8)),
      padL(`${num(row.wins[REF_LEVEL] * 100, 0)}%`, 11),
      padL(num(row.deadRates[REF_LEVEL] * 100, 1), 11),
    ].join(' '));
  }
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --trials=60 --rarity=common`
Expected: 打印 11 颗普通骰的表 A。多数 Δ 为正；bias 系骰的 ΔL 列应明显为正（40% 高面）；`bias_three`/`bystander` 等各有差异。若整列全为 0 或 NaN，检查 `baseByLevel` 键类型（number）与快照等级一致。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value strength axis with per-band snapshot deltas"
```

---

### Task 3: 金钱轴 — 每关金币 Δ / 回本关数 / 剩余净收益（表 B）

**Files:**
- Modify: `tools/dice-value.mjs`（末尾追加）

- [ ] **Step 1: 追加金钱指标计算**

```js
// ── money axis ─────────────────────────────────────────────────────────────
/** Each snapshot level stands for its ~5-level chapter of the run. */
const CHAPTER_SPAN = 5;
for (const row of rows) {
  const refCoin = row.coinDeltas[REF_LEVEL];
  row.coinPerLevel = refCoin;
  row.payback = refCoin > 0 ? row.die.price / refCoin : Infinity;
  row.netGain = SNAPSHOT_LEVELS
    .filter((l) => l >= REF_LEVEL)
    .reduce((sum, l) => sum + row.coinDeltas[l] * CHAPTER_SPAN, 0) - row.die.price;
}
```

- [ ] **Step 2: 追加表 B 输出**

```js
if (!JSON_OUT) {
  console.log('\n── 表 B：金钱 · 每关金币 EV Δ（含达标率、重投折算、超额奖励） ──');
  console.log([pad('骰子', 14), padL('金币Δ/关', 10), padL('回本关数', 10), padL('剩余净收益', 12), padL('价格', 8)].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      padL(num(row.coinPerLevel, 1), 10),
      padL(Number.isFinite(row.payback) ? num(row.payback, 1) : '∞', 10),
      padL(num(row.netGain, 0), 12),
      padL(String(row.die.price), 8),
    ].join(' '));
  }
  console.log(`  （金币Δ = [骰+5标准] 金币 EV − 基准金币 EV @L${REF_LEVEL}；剩余净收益 = Σ(快照金币Δ × ${CHAPTER_SPAN}) − 价格）`);
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --trials=100 --rarity=common`
Expected: 表 B 每行有金币Δ（可为小数甚至负数——达标率下降会真扣钱）；强骰回本关数在 1–10 之间；`bystander` 之类弱骰可能出现 `∞`。数值合理即可，不设硬阈值。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value money axis (coin EV, payback, net gain)"
```

---

### Task 4: 获取轴 — createShop 蒙特卡洛出现率（表 C）

**Files:**
- Modify: `tools/dice-value.mjs`（末尾追加）

- [ ] **Step 1: 追加蒙特卡洛出现率**

```js
// ── access axis ────────────────────────────────────────────────────────────
/** Appearance rate per shop visit, from the real shop generator so rarity
    bands, the demon ×0.5 penalty, owned-set ×1.5 nudge and unique filtering
    are all in the measurement. Bag = [die]+5 standard: the die itself is
    not owned yet, and set nudge is off (no set member in the baseline bag). */
function appearanceCounts(bagIds) {
  const shopState = createRun({ rng: makeRng(0x2545f491) });
  shopState.bag = bagIds.map((id, index) => ({ uid: `shop-${index}`, dieId: id }));
  shopState.activeItems = [];
  shopState.passiveItems = [];
  shopState.acquiredItemIds = [];
  const perLevel = new Map();
  let shelfFill = 0;
  for (const level of SNAPSHOT_LEVELS) {
    const hits = new Map();
    for (let t = 0; t < SHOP_TRIALS; t += 1) {
      shopState.level = level;
      const shop = createShop(shopState, { rng: makeRng((0x1b873593 + t * 97 + level * 7919) >>> 0) });
      for (const offer of shop.dice) {
        if (!offer.id) continue;
        shelfFill += 1;
        hits.set(offer.id, (hits.get(offer.id) || 0) + 1);
      }
    }
    perLevel.set(level, hits);
  }
  return { perLevel, shelfFill };
}

const mc = appearanceCounts(STANDARD_BAG());
for (const row of rows) {
  row.access = {};
  for (const level of SNAPSHOT_LEVELS) {
    row.access[level] = (mc.perLevel.get(level).get(row.die.id) || 0) / SHOP_TRIALS;
  }
  const p = row.access[REF_LEVEL] || 0;
  row.visitP = p;
  row.expectedShops = p > 0 ? 1 / p : Infinity;
  // Assume the player waits one free shelf per level and buys one extra
  // base-priced refresh (20 coins) per additional shop needed.
  row.acquisitionCost = row.die.price + 20 * Math.max(0, row.expectedShops - 1);
}
```

- [ ] **Step 2: 追加表 C 输出**

```js
if (!JSON_OUT) {
  console.log('\n── 表 C：获取 · 每店出现率（真实商店蒙特卡洛） ──');
  const cols = SNAPSHOT_LEVELS.map((l) => `P@L${l}`);
  console.log([pad('骰子', 14), pad('稀有', 6), ...cols.map((c) => padL(c, 8)), padL('期望店数', 10), padL('期望成本', 10)].join(' '));
  for (const row of rows) {
    console.log([
      pad(row.die.name, 14),
      pad(row.die.rarity, 6),
      ...SNAPSHOT_LEVELS.map((l) => padL(`${num((row.access[l] || 0) * 100, 2)}%`, 8)),
      padL(Number.isFinite(row.expectedShops) ? num(row.expectedShops, 1) : '∞', 10),
      padL(num(row.acquisitionCost, 0), 10),
    ].join(' '));
  }
  console.log('  （期望成本 = 价格 + 20 × (期望店数 − 1)，假设每店最多多刷一次基价货架）');
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --trials=60 --rarity=legendary --shop=4000`
Expected: 传说骰 P@L4 全部 ≤ 1%（权重带传奇 1%），P@L23 明显更高；恶魔系传说若在表中，出现率应低于同稀有度非恶魔骰。期望店数 = 1/P 自洽。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value access axis via createShop Monte Carlo"
```

---

### Task 5: 综合评级 + 告警（表 D）

**Files:**
- Modify: `tools/dice-value.mjs`（末尾追加）

- [ ] **Step 1: 追加归一加权评级**

```js
// ── composite rating ───────────────────────────────────────────────────────
const norm = (v, min, max) => (max > min ? (v - min) / (max - min) : 0.5);
const median = (list) => {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

for (const row of rows) {
  row.strengthScore = mean(SNAPSHOT_LEVELS.map((l) => row.deltas[l]));
}
const strengthRange = rows.length > 1
  ? [Math.min(...rows.map((r) => r.strengthScore)), Math.max(...rows.map((r) => r.strengthScore))]
  : [0, 1];
const moneyRange = rows.length > 1
  ? [Math.min(...rows.map((r) => r.netGain)), Math.max(...rows.map((r) => r.netGain))]
  : [0, 1];
const costRange = rows.length > 1
  ? [Math.min(...rows.map((r) => r.acquisitionCost)), Math.max(...rows.map((r) => r.acquisitionCost))]
  : [0, 1];
for (const row of rows) {
  const s = norm(row.strengthScore, strengthRange[0], strengthRange[1]);
  const m = norm(row.netGain, moneyRange[0], moneyRange[1]);
  // Cheaper to acquire scores higher, so the axis is inverted.
  const a = 1 - norm(row.acquisitionCost, costRange[0], costRange[1]);
  row.axis = { strength: s, money: m, access: a };
  row.value = (WEIGHTS[0] * s + WEIGHTS[1] * m + WEIGHTS[2] * a)
    / WEIGHTS.reduce((x, y) => x + y, 0);
  row.grade = row.value >= 0.75 ? 'S' : row.value >= 0.55 ? 'A' : row.value >= 0.35 ? 'B' : 'C';
}
```

- [ ] **Step 2: 追加表 D 与告警输出**

```js
if (!JSON_OUT) {
  console.log(`\n── 表 D：综合评级（强度 ${WEIGHTS[0]} / 金钱 ${WEIGHTS[1]} / 获取 ${WEIGHTS[2]}） ──`);
  console.log([pad('骰子', 14), pad('稀有', 6), padL('强度轴', 8), padL('金钱轴', 8), padL('获取轴', 8), padL('综合分', 8), padL('评级', 6)].join(' '));
  for (const row of [...rows].sort((x, y) => y.value - x.value)) {
    console.log([
      pad(row.die.name, 14),
      pad(row.die.rarity, 6),
      padL(num(row.axis.strength, 2), 8),
      padL(num(row.axis.money, 2), 8),
      padL(num(row.axis.access, 2), 8),
      padL(num(row.value, 2), 8),
      padL(row.grade, 6),
    ].join(' '));
  }

  const warnings = [];
  for (const row of rows) {
    if (row.coinPerLevel <= 0 && row.die.price >= 130) {
      warnings.push(`${row.die.name}（${row.die.rarity}）：金币Δ/关 ${num(row.coinPerLevel, 1)} ≤ 0，价格 ${row.die.price}。`);
    }
    if (Number.isFinite(row.payback) && row.payback > LEVEL_COUNT - REF_LEVEL) {
      warnings.push(`${row.die.name}：回本需 ${num(row.payback, 1)} 关，超过 L${REF_LEVEL} 后剩余关卡（剩 ${LEVEL_COUNT - REF_LEVEL} 关）。`);
    }
  }
  const bands = ['common', 'rare', 'epic', 'legendary'];
  const bandMedian = new Map(bands.map((rarity) => [rarity, median(
    rows.filter((r) => r.die.rarity === rarity).map((r) => r.value),
  )]));
  for (let i = 1; i < bands.length; i += 1) {
    const prev = bandMedian.get(bands[i - 1]);
    const cur = bandMedian.get(bands[i]);
    if (prev && cur && cur < prev) {
      warnings.push(`稀有度倒挂：${bands[i]} 综合分中位 ${num(cur, 2)} 低于 ${bands[i - 1]} 的 ${num(prev, 2)}。`);
    }
  }
  console.log('\n── 告警 ──');
  if (warnings.length) for (const w of warnings) console.log(`  ⚠ ${w}`);
  else console.log('  无。');
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --trials=80 --quick`
Expected: 全 36 骰四张表齐全；表 D 按综合分降序、评级 S/A/B/C 分布合理（不是全 S 或全 C）；告警区打印（可能有也可能无）。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value composite rating and balance warnings"
```

---

### Task 6: --bag 阵容模式 + --json 输出

**Files:**
- Modify: `tools/dice-value.mjs`（在 roster 循环之前插入 bag 分支——见代码注释的位置说明）

- [ ] **Step 1: 在「── main ───」基准计算之前插入 --bag 分支**

在 `// ── main ──` 注释行之后、`const ROSTER = ...` 之前插入：

```js
// ── bag mode: evaluate an arbitrary bag, then exit ─────────────────────────
if (BAG_ARG) {
  const ids = BAG_ARG.split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    if (!getDieSpec(id)) {
      console.error(`未知骰子 id：${id}（可用 id 见 src/content/dice/）`);
      process.exit(1);
    }
  }
  while (ids.length < 6) ids.push('standard');
  if (ids.length > 6) {
    console.error(`最多 6 颗骰（收到 ${ids.length}）`);
    process.exit(1);
  }
  const bagBase = new Map();
  const bagEval = new Map();
  for (const level of SNAPSHOT_LEVELS) {
    bagBase.set(level, levelEV(STANDARD_BAG(), { level }));
    bagEval.set(level, levelEV(ids, { level }));
  }
  if (JSON_OUT) {
    console.log(JSON.stringify({
      bag: ids,
      levels: SNAPSHOT_LEVELS.map((level) => {
        const base = bagBase.get(level);
        const ev = bagEval.get(level);
        return {
          level, target: getLevelConfig(level).target,
          baseScore: base.score, bagScore: ev.score,
          baseWin: base.win, bagWin: ev.win,
          baseCoins: base.coins, bagCoins: ev.coins,
        };
      }),
    }, null, 2));
  } else {
    console.log('');
    console.log(`════ 阵容评估：${ids.map((id) => getDieSpec(id).name).join(' + ')} ════`);
    console.log([pad('关卡', 8), padL('目标', 9), padL('基准分', 9), padL('阵容分', 9), padL('Δ分', 8), padL('基准达标', 10), padL('阵容达标', 10), padL('金币Δ/关', 10)].join(' '));
    for (const level of SNAPSHOT_LEVELS) {
      const base = bagBase.get(level);
      const ev = bagEval.get(level);
      console.log([
        pad(`L${level}`, 8),
        padL(num(getLevelConfig(level).target), 9),
        padL(num(base.score, 0), 9),
        padL(num(ev.score, 0), 9),
        padL(num(ev.score - base.score, 0), 8),
        padL(`${num(base.win * 100, 0)}%`, 10),
        padL(`${num(ev.win * 100, 0)}%`, 10),
        padL(num(ev.coins - base.coins, 1), 10),
      ].join(' '));
    }
  }
  console.log(`\n用时 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
  process.exit(0);
}
```

- [ ] **Step 2: 在文件最末尾追加 --json 输出（roster 模式）**

```js
// ── JSON output ────────────────────────────────────────────────────────────
if (JSON_OUT) {
  console.log(JSON.stringify({
    snapshotLevels: SNAPSHOT_LEVELS,
    refLevel: REF_LEVEL,
    weights: WEIGHTS,
    baseline: SNAPSHOT_LEVELS.map((level) => ({
      level, ...baseByLevel.get(level), target: getLevelConfig(level).target,
    })),
    rows: rows.map((row) => ({
      die: row.die.id, name: row.die.name, rarity: row.die.rarity,
      setId: row.die.setId || null, price: row.die.price,
      deltas: row.deltas, winRates: row.wins, coinDeltas: row.coinDeltas,
      coinPerLevel: row.coinPerLevel,
      payback: Number.isFinite(row.payback) ? row.payback : null,
      netGain: row.netGain,
      access: row.access, acquisitionCost: row.acquisitionCost,
      composite: { ...row.axis, value: row.value, grade: row.grade },
    })),
  }, null, 2));
}
```

- [ ] **Step 3: 运行验证**

Run: `node tools/dice-value.mjs --bag=wolf_whelp,wolf_bloodmoon,wolf_alpha,wolf_ancestor --trials=100`
Expected: 打印狼裔 4 骰 + 2 标准的阵容表，Δ 分在各关卡为正且明显高于单骰 Δ（4 件套效果）；命令以 exit 0 结束。

Run: `node tools/dice-value.mjs --bag=not_a_die`
Expected: 报错 `未知骰子 id：not_a_die`，exit 1。

Run: `node tools/dice-value.mjs --trials=60 --json --rarity=rare | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);if(!j.rows.length||typeof j.rows[0].composite.value!=='number')process.exit(1);console.log('json ok',j.rows.length)})"
Expected: `json ok 10`（稀有骰 10 颗）。

- [ ] **Step 4: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value --bag mode and JSON output"
```

---

### Task 7: 内置自检 + 全量验证

**Files:**
- Modify: `tools/dice-value.mjs`（末尾追加）

- [ ] **Step 1: 追加自检段（非 JSON 模式最后打印）**

```js
// ── self-checks ────────────────────────────────────────────────────────────
if (!JSON_OUT && !BAG_ARG) {
  const issues = [];
  const probeLevel = SNAPSHOT_LEVELS[0];
  const a = levelEV(STANDARD_BAG(), { level: probeLevel, trials: 60 });
  const b = levelEV(STANDARD_BAG(), { level: probeLevel, trials: 60 });
  if (a.score !== b.score || a.coins !== b.coins) {
    issues.push('基准重复运行结果不一致——配对 RNG 失效。');
  }
  const expectedFill = 2 * SHOP_TRIALS * SNAPSHOT_LEVELS.length;
  if (Math.abs(mc.shelfFill - expectedFill) > 0.01 * expectedFill) {
    issues.push(`货架填充 ${mc.shelfFill} ≠ 期望 ${expectedFill}——商店模拟异常。`);
  }
  const legendaryAtFirst = DICE
    .filter((die) => die.rarity === 'legendary')
    .map((die) => (mc.perLevel.get(probeLevel).get(die.id) || 0) / SHOP_TRIALS);
  if (Math.max(...legendaryAtFirst, 0) > 0.06) {
    issues.push('传说骰在首个快照关出现率 > 6%——权重带没生效。');
  }
  console.log('\n── 自检 ──');
  if (issues.length) for (const issue of issues) console.log(`  ✗ ${issue}`);
  else console.log('  通过：基准可复现 · 货架填满 · 权重带生效。');
}

if (!JSON_OUT) console.log(`\n用时 ${((Date.now() - started) / 1000).toFixed(1)} 秒`);
```

注意：Task 6 的 bag 分支里已有一行 `用时` 打印并在其后 `process.exit(0)`，本步的通用 `用时` 只会落在 roster 模式路径上，不冲突。

- [ ] **Step 2: 快速全量验证**

Run: `node tools/dice-value.mjs --quick`
Expected: 四张表 + 告警 + `── 自检 ── 通过：基准可复现 · 货架填满 · 权重带生效。`，总用时在几十秒内。

- [ ] **Step 3: 默认参数完整跑一遍（后台）**

Run（可放后台）: `node tools/dice-value.mjs`
Expected: 与 quick 相同结构，数值更稳；无 NaN、无未对齐崩溃。记录最强/最弱骰与告警条目，供后续数值调参参考。

- [ ] **Step 4: 回归确认项目零影响**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 无输出通过；vitest 381/381 全绿（本工具不触碰 src/ 与 tests/，任何失败都与本任务无关——若失败先查是否共享工作区另一会话的改动，不回退别人的东西）。

- [ ] **Step 5: Commit**

```bash
git add tools/dice-value.mjs
git commit -m "feat(tools): dice-value self-checks and full verification"
```

---

## Self-Review 结论

- **Spec 覆盖**：四轴指标、CLI 全参数、`--bag`、`--json`、自检三条均有对应 Task（1–7）；骰子设计方向清单按 spec 属于"暂不实装"，不在本计划内。
- **占位符**：无 TBD/TODO；每个代码步骤给出完整代码。
- **类型一致性**：`row.deltas/coinDeltas/wins/deadRates` 键均为 number 关卡号（SNAPSHOT_LEVELS 元素）；`mc.perLevel.get(level)` 返回 Map；`row.access[level]` 与表 C 列一致；bag 分支在 ROSTER 之前插入并 `process.exit(0)`，roster 表格不会在 bag 模式打印。
