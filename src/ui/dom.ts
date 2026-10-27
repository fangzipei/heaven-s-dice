// ui/dom.ts — 最薄的一层 DOM 查询封装，从 app.js 顶部原样搬来。
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function setCss(el: HTMLElement | null | undefined, name: string, value: string): void {
  el?.style?.setProperty(name, value);
}
