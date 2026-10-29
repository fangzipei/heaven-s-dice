import { beforeEach, expect, test } from 'vitest';
import { CHANGELOG } from '../../src/content/changelog.ts';
import { openChangelog, refreshHomeChangelog } from '../../src/ui/screens/changelog.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
});

test('home shows the latest changelog summary', () => {
  refreshHomeChangelog();
  expect(dom.node('#home-update-title').textContent).toContain(CHANGELOG[0].title);
  expect(dom.node('#home-update-summary').textContent).toBe(CHANGELOG[0].summary);
});

test('changelog overlay lists every release and item', () => {
  openChangelog();
  const html = dom.html('#overlay-root');
  expect(html).toContain('更新日志');
  for (const entry of CHANGELOG) {
    expect(html).toContain(entry.title);
    expect(html).toContain(entry.items[0]);
  }
});
