// ui/components/toast.ts — 右下角的一次性提示条。
//
// 从 app.js 的 Toast 一节原样搬出：2.4s 后开始淡出、2.8s 后移除，
// 这个节奏被 tools/*.mjs 的 `toast` 断言依赖。
import { $ } from '../dom.ts';

export function showToast(text: string, type = ''): void {
  const stack = $('#toast-stack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type ? `is-${type}` : ''}`;
  toast.textContent = text;
  stack.append(toast);
  setTimeout(() => toast.classList.add('is-out'), 2400);
  setTimeout(() => toast.remove(), 2800);
}

export function clearToasts(): void {
  const stack = $('#toast-stack');
  if (stack) stack.innerHTML = '';
}
