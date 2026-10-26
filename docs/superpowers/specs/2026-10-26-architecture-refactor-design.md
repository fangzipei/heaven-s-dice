# Heaven's Dice 架构重构设计（方案 A：分层 + 内容注册表）

日期：2026-10-26 · 分支：`refactor/architecture` · 状态：待审阅

## 1. 目标与约束

- **第一目标**：降低改代码的心智负担——加一枚骰子/一件物品/一个庄家只碰一个文件。
- **节奏**：一次性大重写（TS），但**渐进执行、每阶段可运行可回滚**，全部在新分支完成前不动 `main`。
- **保持**：玩法数值 1:1 不变；美术资源（`assets/`）原样复用。
- **放开**：UI 层（DOM 结构、面板组织）允许重塑。
- **工具链**：允许 Vite + TypeScript（strict）。

## 2. 现状结论（分析依据）

- `src/app.js` 3539 行、20 个注释分块，承担 UI/流程/存档/动画/输入/音频 6 类职责。
- `src/engine.js`（1492 行）、`scoring.js`、`data.js` **零 DOM 引用**（已验证），可整体移植为纯逻辑核心。
- `data.js` 混有派生逻辑（`buildLevelTable:652`、`overshootTier:691`、`activeSetBonuses:738`）。
- `engine.js:1492` 原样再导出 data 常量，形成双访问路径。
- PIP 表双份维护：`app.js:42 PIP_MAP` 与 `dice-3d.js:23 PIP_LAYOUT`。
- 音效合成器 `SoundKit` 内嵌 `app.js:143-225`。
- `window.HeavensDice`（`app.js:3510`）是 tools CDP 测试脚本的依赖契约，必须保留。
- gsap/three 已在 npm 依赖；vendor 中 CustomEase/CustomBounce/CustomWiggle/Draggable 为 GSAP 商业插件，继续走 vendor。

## 3. 目标结构

```
src/
  core/                 # 纯游戏逻辑，零 DOM、零渲染知识
    engine/             # engine.js 按域拆分
      run.ts            # createRun/initLevel/phase 迁移
      scoring-bridge.ts # buildScore/cashOutValue/结算
      items.ts          # 物品效果应用
      boss.ts           # 庄家规则与状态
      shop.ts           # 商店生成与买卖
      dice-ops.ts       # toggleDie/syncBag/容量/套装判定
      rng.ts            # makeRng
    scoring.ts          # 原 scoring.js 移植
    types.ts            # RunState/Die/Barrel/Boss 等全部模型
    events.ts           # 引擎事件定义（见 §4）
  content/              # 内容注册表：一种内容一个文件
    dice/               # 每枚骰子（或每套）一个模块，导出 DiceDef
    barrels/            # 骰桶
    items/              # 物品（主动/被动效果同文件）
    bosses/             # 庄家定义
    tables/             # 五张桌子
    levels/             # 关卡曲线 + buildLevelTable（派生逻辑归此）
    index.ts            # 聚合注册表；开发模式跑 schema 校验
  render/               # three/GSAP 表现层
    dice-table.ts       # dice-3d.js 移植（DiceTable 类）
    dice-dom.ts         # DOM 兜底渲染（app.js:1184-1494 块）
    pip-layout.ts       # PIP 单一来源，消灭双份表
    motion.ts           # motion.js 移植
  ui/                   # 场景生命周期（吸收方案 C）
    scene.ts            # Scene 接口：enter/exit/handle(events)
    screens/            # start/game/shop/codex/rules/gesture 各一
    components/         # toast/tooltip/overlay/hud 等小组件
    app.ts              # 组装：事件订阅 → 场景调度
  platform/             # 浏览器能力适配
    storage.ts          # 存档 + codex 发现记录（键名不变）
    sound.ts            # SoundKit 原样迁出
    input.ts            # 骰桶拖拽/手势/视口绑定
    debug-bridge.ts     # window.HeavensDice（契约保持）
```

依赖方向单向：`ui → core + content + platform`，`render → content + core`，`core ↛ 任何其他层`。

## 4. 核心机制：引擎事件流

UI 与 core 之间以不可变事件通信，渲染层只"回放"，不反向改状态：

```ts
type EngineEvent =
  | { type: 'dice:rolled'; dice: DieResult[] }
  | { type: 'dice:selected'; uid: string }
  | { type: 'score:preview'; combo: ComboAnalysis }
  | { type: 'level:cashout'; coins: number; breakdown: CashRow[] }
  | { type: 'shop:stocked'; entries: ShopEntry[] }
  | { type: 'shop:purchase'; ok: boolean; itemId: string }
  | { type: 'boss:effect'; key: string; detail: unknown }
  | { type: 'run:ended'; victory: boolean; reason: string };
```

实现方式：**包装而非改写**。`core/engine` 各公开函数保持现有 mutate 语义（数值零风险），新增薄封装层在每次操作后 diff 出事件（或从返回值显式产出）。手势小游戏、摇骰动画等表现全部订阅事件。

## 5. 内容注册表（"加骰子只碰一个文件"）

```
content/dice/iron-back.ts  →  export default { id, name, rarity, faces, effect, ... } satisfies DiceDef
```

- `content/index.ts` 用 `import.meta.glob('./dice/*.ts', { eager: true })` 自动聚合。
- 开发模式与 vitest 中跑一致性校验（id 唯一、稀有度合法、faces 概率和为 1、引用效果键存在）。
- 商店价格、图鉴解锁、套装判定全部从注册表派生，不再散落 switch。

## 6. 工具链

| 项 | 决策 |
|---|---|
| 构建 | Vite（dev + build），替换手写 `server.js`（保留至 Phase 3 结束再删） |
| 语言 | TypeScript strict；`tsconfig` 开 `noUncheckedIndexedAccess` |
| 单测 | vitest，原 `tests/*.test.mjs` 3 个文件平移至 core 层 |
| three | npm 包直接 import，移除 `three.module.js`/`three.core.js` vendor 副本 |
| gsap | npm 核心 + vendor 商业插件（以 `@ts-ignore` 薄声明文件桥接） |
| CDP 验收 | `tools/*-test.mjs` 保留，继续依赖 `window.HeavensDice` 契约 |
| 资源 | `assets/`、`css/` 原样引用；CSS 拆分列为 Phase 4 可选 |

## 7. 分阶段执行计划（每阶段结束都可运行、可验证、可回滚）

1. **Phase 0 — 工具链地基**：Vite + TS + vitest 接管；现有 7 个 js 文件原样并入 `src/legacy/` 保持可运行；测试从 `node --test` 迁到 vitest。**验证：dev server 起、33 关截图与现版一致。**
2. **Phase 1 — core + content 移植**：engine/scoring/data → `core/` + `content/`（TS 化、注册表聚合、单测平移）。UI 仍为 legacy app.js，仅改 import 路径。**验证：core 全量单测绿 + balance 模拟 EV 与现版一致。**
3. **Phase 2 — 事件流 + platform**：加事件封装层；SoundKit/storage/debug-bridge 迁出 app.js。**验证：CDP 脚本跑通对局、音效存档正常。**
4. **Phase 3 — render/ui 场景化重写**：app.js 剩余 UI 块拆入 `ui/screens` + `render/`；DOM 结构允许重塑；PIP 表合一。**验证：全量 CDP 回归 + 手工过一遍 33 关流程。** 删除 legacy 目录与 server.js。
5. **Phase 4 — 可选收尾**：CSS 按场景拆分、tools/ 清理（profile 移出项目、硬编码路径参数化）。

回滚策略：每阶段一个独立 commit；出现不可修问题即回退该 commit，前序成果不受影响。

## 8. 风险与对策

- **数值漂移**：Phase 1 用 `tools/balance.mjs` 对相同 seed 跑 EV 对比，作为硬性通过线。
- **表现回归**：UI 重塑范围大，Phase 3 前保留 DOM 兜底渲染路径的行为快照（docs/screenshots 对照）。
- **商业插件缺失**：vendor 的 GSAP 插件无 npm 授权版，构建必须走 vendor 路径，Vite 里以 `optimizeDeps.exclude` 处理。
- **范围膨胀**：本重构不做玩法改动、不做移动端适配新需求、不引框架（React/Vue）。

## 9. 验收标准

1. `src/app.js` 不复存在，任何单文件 < 500 行。
2. 新增一枚测试骰子：只新建 `content/dice/*.ts` 一个文件即在游戏中生效。
3. vitest：core/content 覆盖率主体，`npm test` 全绿；CDP 回归脚本全绿。
4. `window.HeavensDice` 契约字段不减；存档/codex 键名不变，老档可读。
5. 相同 seed 下 33 关目标值、庄家行为与现版本逐位一致。
