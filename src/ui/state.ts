// ui/state.ts — 界面状态单例。
//
// 原来就是 app.js 顶部那个 `const app = {…}`，字段、初值一个没改，只是搬了个家：
// 拆出去的 ui 组件要读它，而 app.js 里的代码还有一大半没搬完，两边都得能用同一个对象。
// 等 app.js 拆空之后，这个对象由 ui/app.ts 在启动时创建并持有（见 Phase 3c-3）。
import type { PricedDie, RunState } from '../core/types.ts';

export interface Discovery {
  dice: string[];
  barrels: string[];
  items: string[];
}

export interface CupPoint {
  x: number;
  y: number;
}

/** 杯垫仪式正在描的那条轨迹：引导线、已画点与对应的 SVG 折线。 */
export interface CupTrace {
  gesture: string;
  name: string;
  center: CupPoint;
  /** Trace points use the overlay's local pixel space, not viewport client pixels. */
  origin: CupPoint;
  radius: number;
  guide: CupPoint[];
  guides: CupPoint[];
  points: CupPoint[];
  drawn: Element | null;
}

/** 描线结果，收尾时留给调试桥与测试脚本读。 */
export interface CupTraceResult {
  ok: boolean;
  reason: string;
  /** 轨迹太短时提前返回，下面这些测量值就还没有。 */
  coverage?: number;
  length?: number;
  guideLength?: number;
  sweep?: number;
  gesture: string;
  points: number;
  recorded: CupPoint[];
  guide: CupPoint[];
}

export interface UiState {
  run: RunState | null;
  discovered: Discovery;
  /** 一次动画/结算正在进行，输入应被锁住。 */
  busy: boolean;
  /** 骰子正在滚动，决定 DOM 兜底要不要挂 is-rolling。 */
  rolling: boolean;
  introOpen: boolean;
  shopOpen: boolean;
  screen: string;
  soundEnabled: boolean;
  compendiumTab: string;
  /** 骰袋已满时，市集买入流程挂起的那笔订单。 */
  pendingReplace: { index: number; die: PricedDie; price: number } | null;
  /** 裂痕骰袋购买中：等待玩家选择要丢弃的骰子。 */
  pendingDrop: { index: number; itemId: string; itemName: string; price: number } | null;
  /** 一次性骰子礼包开出的候选，等待玩家挑一枚。 */
  pendingGrant: { itemId: string; candidates: PricedDie[] } | null;
  /** 骰子礼包已选中骰子，但骰袋已满，等待选择被替换的骰子。 */
  pendingGrantReplace: { itemId: string; die: PricedDie } | null;
  speechTimer: ReturnType<typeof setTimeout> | null;
  rollTimer: ReturnType<typeof setTimeout> | null;
  overlayTimer: ReturnType<typeof setTimeout> | null;
  bustTimer: ReturnType<typeof setTimeout> | null;
  cupCueTimer: ReturnType<typeof setTimeout> | null;
  /** 覆盖层关闭时要跑的清理函数（手势小游戏用它拆监听器）。 */
  gestureCleanup: (() => void) | null;
  gestureReset: (() => void) | null;
  overlayDismissible: boolean;
  // ── 桶：以下字段目前只被 app.js 里的摇桶代码读写 ──
  cupHoldStarted: boolean;
  cupHoldPromise: Promise<unknown> | null;
  cupInverted: boolean;
  cupAnimating: boolean;
  cupCountdownTimer: ReturnType<typeof setInterval> | null;
  cupCountdownEnd: number;
  cupAutoTimer: ReturnType<typeof setTimeout> | null;
  cupTrace: CupTrace | null;
  /** 最近一次仪式描线的判定结果。 */
  lastTraceResult: CupTraceResult | null;
  cupPointerId: number | null;
  coinGainTimer: ReturnType<typeof setTimeout> | null;
  resultShown: boolean;
}

export const app: UiState = {
  run: null,
  discovered: { dice: [], barrels: [], items: [] },
  busy: false,
  rolling: false,
  introOpen: false,
  shopOpen: false,
  screen: 'start',
  soundEnabled: true,
  compendiumTab: 'dice',
  pendingReplace: null,
  pendingDrop: null,
  pendingGrant: null,
  pendingGrantReplace: null,
  speechTimer: null,
  rollTimer: null,
  overlayTimer: null,
  bustTimer: null,
  cupCueTimer: null,
  gestureCleanup: null,
  gestureReset: null,
  overlayDismissible: false,
  cupHoldStarted: false,
  cupHoldPromise: null,
  cupInverted: false,
  cupAnimating: false,
  cupCountdownTimer: null,
  cupCountdownEnd: 0,
  cupAutoTimer: null,
  cupTrace: null,
  coinGainTimer: null,
  lastTraceResult: null,
  cupPointerId: null,
  resultShown: false,
};
