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
  cupTrace: unknown;
  cupPointerId: number | null;
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
  cupPointerId: null,
  resultShown: false,
};
