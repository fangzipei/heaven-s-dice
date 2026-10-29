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

/** Product of the CSS zooms on an element and its ancestors (1 if unsupported).
 *  Pointer coordinates are viewport px, style lengths inside a zoomed subtree
 *  are not, so anything JS writes into one has to be divided by this. */
export function uiZoom(el: Element | null | undefined): number {
  let zoom = 1;
  for (let node: Element | null = el ?? null; node; node = node.parentElement) {
    const value = Number.parseFloat(getComputedStyle(node).zoom);
    if (Number.isFinite(value) && value > 0) zoom *= value;
  }
  return zoom > 0 ? zoom : 1;
}
