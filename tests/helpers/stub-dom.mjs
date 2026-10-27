/* tests/helpers/stub-dom.mjs — 给 ui/ 渲染器用的极简 DOM 桩。
 *
 * 这些渲染器只用到 querySelector、textContent/innerHTML 与 classList，
 * 不值得为它引一个 jsdom；浏览器端的真实渲染由 tools/ 的 CDP 脚本负责。
 * 桩节点记下所有写入值，断言直接从 nodes 里读。 */

function makeNode(selector) {
  const node = {
    selector,
    textContent: '',
    innerHTML: '',
    hidden: false,
    disabled: false,
    title: '',
    src: '',
    className: '',
    offsetWidth: 0,
    offsetTop: 0,
    scrollTop: 0,
    dataset: {},
    attrs: {},
    listeners: {},
    parent: null,
    children: [],
    style: { width: '', setProperty() {} },
    classList: {
      toggles: [],
      added: [],
      removed: [],
      toggle(name, on) { this.toggles.push(`${name}=${Boolean(on)}`); },
      add(name) { this.added.push(name); },
      remove(name) { this.removed.push(name); },
    },
    addEventListener(type, fn) { (node.listeners[type] ||= []).push(fn); },
    getAttribute(key) { return node.attrs[key] ?? null; },
    setAttribute(key, value) { node.attrs[key] = String(value); },
    focus() { node.focused = true; },
    scrollTo(options) { node.scrolled = options; },
    append(child) { node.children.push(child); child.parent = node; },
    remove() {
      if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node);
    },
    _sub: new Map(),
    querySelector(sub) {
      if (!this._sub.has(sub)) this._sub.set(sub, makeNode(sub));
      return this._sub.get(sub);
    },
  };
  return node;
}

export function installDomStub() {
  const nodes = new Map();
  const nodeFor = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, makeNode(selector));
    return nodes.get(selector);
  };
  const body = makeNode('body');
  globalThis.document = {
    body,
    querySelector: (selector) => nodeFor(selector),
    getElementById: (id) => nodeFor(`#${id}`),
    querySelectorAll: () => [],
    createElement: () => makeNode('created'),
  };
  return {
    nodes,
    body,
    node: nodeFor,
    text: (selector) => nodeFor(selector).textContent,
    html: (selector) => nodeFor(selector).innerHTML,
    subText: (selector, sub) => nodeFor(selector).querySelector(sub).textContent,
  };
}
