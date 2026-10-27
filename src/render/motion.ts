/*
 * Motion layer.
 *
 * Every animation in the game goes through GSAP instead of hand-written CSS
 * keyframes: one rAF driver (gsap.ticker) feeds both the DOM tweens and the
 * WebGL dice table, so there is no second loop competing for the main thread
 * and no long list of compositor layers kept alive by `animation:` rules.
 *
 * GSAP ships as a UMD bundle in /vendor so the game still runs offline.
 */
import type { gsap as GsapGlobal } from 'gsap';
import type { CustomBounce as CustomBounceGlobal } from 'gsap/CustomBounce';
import type { CustomEase as CustomEaseGlobal } from 'gsap/CustomEase';
import type { CustomWiggle as CustomWiggleGlobal } from 'gsap/CustomWiggle';

/* 运行时用 index.html 里 <script> 挂上来的 UMD，类型才借 npm 的 gsap 包。
   `import type` 会被编译期抹掉，所以打包产物仍然只有 vendor 那一份 GSAP。 */
declare global {
  interface Window {
    gsap?: typeof GsapGlobal;
    CustomEase?: typeof CustomEaseGlobal;
    CustomBounce?: typeof CustomBounceGlobal;
    CustomWiggle?: typeof CustomWiggleGlobal;
  }
}

/** 动效能对着一枚骰子改的三样东西。three 的 Vector3/Euler 结构上就满足它，
 *  所以这一层不必依赖 three 的类型，DOM 兜底以后也能复用同一套动效。 */
export interface MotionVec3 { x: number; y: number; z: number }

/** 需要就地写入初始姿态的那几根轴：Vector3、Euler 都有 set（Euler 多一个可选
 *  order 参数，结构类型照样兼容）。 */
export interface MotionSettable extends MotionVec3 {
  set(x: number, y: number, z: number): unknown;
}

export interface MotionMesh {
  position: MotionSettable;
  rotation: MotionSettable;
  scale: MotionSettable;
  visible?: boolean;
}

/** 动效只关心“这颗骰子被选中了吗”；其余状态位由表格自己解释。 */
export interface MotionDieState { selected?: boolean }

export interface MotionDieEntry {
  uid: string;
  mesh: MotionMesh;
  /** 静止时在这一行里的水平位置（世界坐标 x）。 */
  baseX: number;
  /** 表格按状态算好的静止高度；没算过时按骰子半径兜底。 */
  restY?: number;
  state?: MotionDieState | null;
}

/** motion 对 WebGL 桌面的全部要求。DiceTable 结构上满足，不需要 implements。 */
export interface MotionDiceTable {
  entries: MotionDieEntry[];
  hovered?: string | null;
  restRotation(): MotionVec3;
  render(): void;
}

/** 世界坐标里的一个点：骰子从杯口飞出时的出发点。 */
export interface MotionPoint { x?: number; y?: number; z?: number }

/** 杯子和界面元素：GSAP 的 CSSPlugin 直接改它们的内联样式。 */
export type MotionElement = HTMLElement | null | undefined;

const gsap = window.gsap;

const DIE_HALF = 0.5; // dice are unit cubes resting on y = 0

const plugins = [window.CustomEase, window.CustomBounce, window.CustomWiggle]
  .filter((plugin): plugin is NonNullable<typeof plugin> => Boolean(plugin));
if (gsap && plugins.length) gsap.registerPlugin(...plugins);

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Nothing animates for free: when nothing is moving the WebGL table stops
   rendering, which is what actually keeps a phone cool. */
const loop: {
  targets: Set<MotionDiceTable>;
  active: number;
  dirty: boolean;
  started?: boolean;
} = {
  targets: new Set(),
  active: 0,
  dirty: true,
};

let easesReady = false;

function ensureEases() {
  if (easesReady || !window.CustomWiggle || !window.CustomBounce) return;
  window.CustomWiggle.create('cupWiggle', { wiggles: 7, type: 'easeOut' });
  window.CustomWiggle.create('cupRattle', { wiggles: 4, type: 'uniform' });
  window.CustomBounce.create('dieLand', { strength: 0.32, squash: 0 });
  easesReady = true;
}
ensureEases();

export const motion = {
  gsap,
  ready: Boolean(gsap),

  /* ── shared clock ──────────────────────────────────────────────────── */
  attach(table: MotionDiceTable) {
    if (!table || loop.targets.has(table)) return;
    loop.targets.add(table);
    loop.dirty = true;
  },

  detach(table: MotionDiceTable) {
    loop.targets.delete(table);
  },

  markDirty() {
    loop.dirty = true;
  },

  startClock() {
    if (!gsap || loop.started) return;
    loop.started = true;
    gsap.ticker.lagSmoothing(220, 33);
    gsap.ticker.add(() => {
      if (document.hidden || !loop.targets.size) return;
      if (loop.active <= 0 && !loop.dirty) return;
      loop.dirty = false;
      loop.targets.forEach((table) => table.render());
    });
  },

  /* Wrap an animation so the renderer knows to keep drawing. */
  busy(promise: Promise<unknown>) {
    loop.active += 1;
    const done = () => { loop.active = Math.max(0, loop.active - 1); loop.dirty = true; };
    Promise.resolve(promise).then(done, done);
    return promise;
  },

  /* ── dice ──────────────────────────────────────────────────────────── */
  /* Dice fly out of the cup mouth, tumble, bounce and settle square to the
     camera. `from` is a world-space point (the cup rim). */
  rollDice(table: MotionDiceTable | null, uids: string[], from?: MotionPoint | null,
    options: { stagger?: number; duration?: number } = {}) {
    if (!table || !gsap) return Promise.resolve();
    const stagger = options.stagger ?? 0.055;
    const duration = reduced() ? 0.01 : (options.duration ?? 0.66);
    const rest = table.restRotation();
    const timelines: gsap.core.Timeline[] = [];
    uids.forEach((uid, index) => {
      const entry = table.entries.find((item) => item.uid === uid);
      if (!entry) return;
      const mesh = entry.mesh;
      const targetX = entry.baseX;
      const spinY = Math.PI * 2 * (1 + (index % 2 ? 1 : 2));
      const spinX = Math.PI * 2 * (index % 3 === 0 ? 1 : 2);
      mesh.visible = true;
      mesh.rotation.set(rest.x - spinX, rest.y + spinY, rest.z);
      // Start exactly at the cup mouth at zero size, then grow while flying to
      // the table. The gather left these meshes hidden at scale 0.
      mesh.position.set(from?.x ?? 0, from?.y ?? 3.4, from?.z ?? 1.1);
      mesh.scale.set(0.001, 0.001, 0.001);
      const tl = gsap.timeline({ delay: reduced() ? 0 : index * stagger });
      tl.to(mesh.position, {
        x: targetX, z: 0, duration, ease: 'power2.out',
      }, 0);
      tl.to(mesh.position, {
        y: DIE_HALF, duration: duration * 1.05,
        ease: easesReady ? 'dieLand' : 'bounce.out',
      }, 0);
      tl.to(mesh.rotation, {
        x: rest.x, y: rest.y, z: rest.z,
        duration: duration * 1.25, ease: 'power3.out',
      }, 0);
      tl.fromTo(mesh.scale,
        { x: 0.001, y: 0.001, z: 0.001 },
        { x: 1, y: 1, z: 1, duration: duration * 1.1, ease: 'back.out(1.8)' }, 0);
      timelines.push(tl);
    });
    if (!timelines.length) return Promise.resolve();
    return this.busy(Promise.all(timelines.map((tl) => tl.then())));
  },

  /* In-place tumble used before a reroll sweep. */
  tumble(table: MotionDiceTable | null, uids: string[], options: { duration?: number } = {}) {
    if (!table || !gsap) return Promise.resolve();
    const duration = reduced() ? 0.01 : (options.duration ?? 0.46);
    const rest = table.restRotation();
    const tweens = uids.map((uid, index) => {
      const entry = table.entries.find((item) => item.uid === uid);
      if (!entry) return null;
      const mesh = entry.mesh;
      const from = { y: rest.y + Math.PI * 2, x: rest.x + Math.PI * (index % 2 ? 1 : -1) };
      mesh.rotation.set(from.x, from.y, rest.z);
      return gsap.timeline({ delay: reduced() ? 0 : index * 0.02 })
        .to(mesh.rotation, { x: rest.x, y: rest.y, duration, ease: 'power2.inOut' }, 0)
        .to(mesh.position, { y: DIE_HALF + 0.18, duration: duration * 0.5, ease: 'sine.out' }, 0)
        .to(mesh.position, { y: DIE_HALF, duration: duration * 0.5, ease: 'sine.in' }, duration * 0.5)
        .then();
    }).filter(Boolean) as Promise<unknown>[];
    if (!tweens.length) return Promise.resolve();
    return this.busy(Promise.all(tweens));
  },

  /* Sweep dice back into the cup before a reroll. */
  gather(table: MotionDiceTable | null, uids: string[],
    target?: MotionPoint | null | (() => MotionPoint | null),
    options: { duration?: number } = {}) {
    if (!table || !gsap) return Promise.resolve();
    const duration = reduced() ? 0.01 : (options.duration ?? 0.5);
    const targetAt = typeof target === 'function' ? target : () => target;
    const items = uids.map((uid, index) => {
      const entry = table.entries.find((item) => item.uid === uid);
      if (!entry) return null;
      const { mesh } = entry;
      return {
        mesh, index,
        sx: mesh.position.x, sy: mesh.position.y, sz: mesh.position.z,
        rx: mesh.rotation.x, ry: mesh.rotation.y, rz: mesh.rotation.z,
      };
    }).filter(Boolean) as {
      mesh: MotionDiceTable['entries'][number]['mesh']; index: number;
      sx: number; sy: number; sz: number; rx: number; ry: number; rz: number;
    }[];
    if (!items.length) return Promise.resolve();
    // The cup itself is draggable. Read its world point every frame so the
    // dice keep flying into wherever the cup is *now*, not where it was when
    // the gesture started. At the end they shrink to zero and disappear.
    const startedAt = performance.now() / 1000;
    const promise = new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now() / 1000;
        const point = targetAt();
        let finished = true;
        for (const item of items) {
          const local = (now - startedAt - item.index * 0.022) / duration;
          const p = Math.max(0, Math.min(1, local));
          if (p < 1) finished = false;
          const ease = p * p * (3 - 2 * p);
          const tx = (point?.x ?? 0) + (item.index - 2) * 0.05;
          const ty = point?.y ?? 1.4;
          const tz = point?.z ?? 0.9;
          item.mesh.position.set(
            item.sx + (tx - item.sx) * ease,
            item.sy + (ty - item.sy) * ease + Math.sin(Math.PI * p) * 0.28,
            item.sz + (tz - item.sz) * ease,
          );
          item.mesh.rotation.set(
            item.rx + Math.PI * 0.8 * ease,
            item.ry + Math.PI * 1.2 * ease,
            item.rz,
          );
          // Hold full size for the first half of the flight, then shrink all
          // the way to zero: no half-size ghosts left at the old cup position.
          const shrink = p < 0.55 ? 0 : Math.pow((p - 0.55) / 0.45, 2);
          const scale = Math.max(0, 1 - shrink);
          item.mesh.scale.set(scale, scale, scale);
          if (p >= 1) item.mesh.visible = false;
        }
        loop.dirty = true;
        if (finished) {
          gsap!.ticker.remove(tick);
          loop.dirty = true;
          resolve();
        }
      };
      tick();
      gsap.ticker.add(tick);
    });
    return this.busy(promise);
  },

  /* Selection / scoring lift. Cheap enough to fire on every tap. */
  settle(table: MotionDiceTable | null, uids: string[]) {
    if (!table) return;
    if (!gsap || reduced()) {
      uids.forEach((uid) => {
        const entry = table.entries.find((item) => item.uid === uid);
        if (entry) entry.mesh.position.y = entry.restY ?? DIE_HALF;
      });
      return;
    }
    uids.forEach((uid) => {
      const entry = table.entries.find((item) => item.uid === uid);
      if (!entry) return;
      const target = entry.restY ?? DIE_HALF;
      if (Math.abs(entry.mesh.position.y - target) < 0.001) return;
      // Position tween only — never touch scale/rotation here.
      gsap.to(entry.mesh.position, {
        y: target,
        keyframes: [
          { y: target + (entry.state?.selected ? 0.16 : 0.05), duration: 0.08, ease: 'power2.out' },
          { y: target, duration: 0.16, ease: 'power2.in' },
        ],
        overwrite: 'auto',
        onUpdate: () => { loop.dirty = true; },
        onComplete: () => { loop.dirty = true; },
      });
    });
  },

  /* Small bump when a die is tapped. */
  tapDie(table: MotionDiceTable | null, uid: string) {
    if (!table || !gsap || reduced()) return;
    const entry = table.entries.find((item) => item.uid === uid);
    if (!entry) return;
    const mesh = entry.mesh;
    gsap.timeline()
      .to(mesh.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.08, ease: 'power2.out' })
      .to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.22, ease: 'elastic.out(1, .5)' });
  },

  hoverDie(table: MotionDiceTable | null, uid: string | null) {
    if (!table || !gsap) return;
    const changed = table.hovered !== uid;
    table.hovered = uid;
    if (changed) loop.dirty = true;
  },

  /* ── cup ───────────────────────────────────────────────────────────── */
  cupRattle(element: MotionElement, { cycles = 1 }: { cycles?: number } = {}) {
    if (!element || !gsap || reduced()) return Promise.resolve();
    gsap.killTweensOf(element);
    return this.busy(gsap.fromTo(element,
      { rotation: -2.6, y: 0 },
      {
        rotation: 2.6, y: -2, duration: 0.42 * cycles,
        ease: easesReady ? 'cupRattle' : 'sine.inOut',
        repeat: Math.max(0, cycles - 1), transformOrigin: '50% 92%',
      }).then());
  },

  cupLift(element: MotionElement) {
    if (!element || !gsap) return Promise.resolve();
    gsap.killTweensOf(element);
    return this.busy(gsap.to(element, {
      y: -15, rotation: -2.4, duration: reduced() ? 0.01 : 0.3,
      ease: 'power2.out', transformOrigin: '50% 92%',
    }).then());
  },

  cupDrop(element: MotionElement) {
    if (!element || !gsap) return Promise.resolve();
    gsap.killTweensOf(element);
    return this.busy(gsap.to(element, {
      y: 0, rotation: 0, duration: reduced() ? 0.01 : 0.34,
      ease: 'power2.out', transformOrigin: '50% 92%',
    }).then());
  },

  cupCue(element: MotionElement) {
    if (!element || !gsap || reduced()) return;
    gsap.killTweensOf(element);
    gsap.fromTo(element,
      { scale: 0.94 },
      {
        scale: 1, duration: 0.5,
        ease: easesReady ? 'cupWiggle' : 'elastic.out(1, .4)',
        transformOrigin: '50% 92%',
      });
  },

  /* ── interface ─────────────────────────────────────────────────────── */
  rise(element: MotionElement, options: { y?: number; scale?: number; duration?: number } = {}) {
    if (!element || !gsap) return;
    gsap.fromTo(element,
      { opacity: 0, y: options.y ?? 14, scale: options.scale ?? 0.985 },
      {
        opacity: 1, y: 0, scale: 1, duration: reduced() ? 0.01 : (options.duration ?? 0.34),
        ease: 'power2.out', overwrite: 'auto', clearProps: 'transform',
      });
  },

  fadeOut(element: MotionElement, options: { y?: number; duration?: number } = {}) {
    if (!element || !gsap) return Promise.resolve();
    return gsap.to(element, {
      opacity: 0, y: options.y ?? 8, duration: reduced() ? 0.01 : (options.duration ?? 0.22),
      ease: 'power1.in', overwrite: 'auto',
    }).then();
  },

  toastIn(element: MotionElement) {
    if (!element || !gsap) return Promise.resolve();
    return gsap.fromTo(element,
      { opacity: 0, x: 18 },
      { opacity: 1, x: 0, duration: reduced() ? 0.01 : 0.26, ease: 'power2.out' }).then();
  },

  toastOut(element: MotionElement) {
    if (!element || !gsap) return Promise.resolve();
    return gsap.to(element, {
      opacity: 0, x: 14, duration: reduced() ? 0.01 : 0.2, ease: 'power1.in', overwrite: 'auto',
    }).then();
  },

  floatScore(element: MotionElement) {
    if (!element || !gsap) return Promise.resolve();
    gsap.killTweensOf(element);
    return gsap.timeline()
      .fromTo(element,
        { opacity: 0, y: 0, scale: 0.7 },
        { opacity: 1, scale: 1.06, duration: 0.18, ease: 'back.out(2)' })
      .to(element, { opacity: 1, duration: 0.5 })
      .to(element, { opacity: 0, y: -76, scale: 0.98, duration: 0.34, ease: 'power1.in' })
      .then();
  },

  pulse(element: MotionElement,
    { scale = 1.06, duration = 0.5, repeat = -1 }: { scale?: number; duration?: number; repeat?: number } = {}) {
    if (!element || !gsap || reduced()) return null;
    return gsap.to(element, {
      scale, duration, repeat, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 50%',
    });
  },

  shake(element: MotionElement) {
    if (!element || !gsap || reduced()) return Promise.resolve();
    return gsap.fromTo(element,
      { x: -5 },
      { x: 5, duration: 0.06, repeat: 5, yoyo: true, ease: 'none', clearProps: 'x' }).then();
  },
};

export default motion;
