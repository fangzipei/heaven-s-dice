// core/util.ts — 不带依赖、不碰 DOM 的纯函数，供各层共用。
// 这里没有游戏规则：只有从 app.js 里提出来的字符串/数值小工具，
// 目的是让 render 与 ui 都能拿到同一份转义与格式化实现。

/** Escape a value on its way into an HTML string. */
export const h = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/** Thousands-separated zh-CN number, with the `|| 0` the UI relied on for null. */
export const num = (value: number | null | undefined): string => Number(value || 0).toLocaleString('zh-CN');

/** 0.167 → "16.7%" */
export const pct = (value: number): string => `${Math.round(value * 1000) / 10}%`;

export const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
