import { readFileSync } from 'node:fs';
import { beforeEach, expect, test, vi } from 'vitest';
import { openChangelog, primeChangelog, refreshHomeChangelog } from '../../src/ui/screens/changelog.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';

const CHANGELOG = JSON.parse(readFileSync(new URL('../../server/changelog.json', import.meta.url), 'utf8'));

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  primeChangelog(CHANGELOG);
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    json: async () => ({ entries: CHANGELOG }),
  }));
});

test('home shows the latest changelog summary', async () => {
  await refreshHomeChangelog();
  expect(dom.node('#home-update-title').textContent).toContain(CHANGELOG[0].title);
  expect(dom.node('#home-update-summary').textContent).toBe(CHANGELOG[0].summary);
});

test('changelog overlay lists every release and item', async () => {
  await openChangelog();
  expect(dom.html('#overlay-root')).toContain('更新日志');
  const html = dom.html('.changelog-list');
  for (const entry of CHANGELOG) {
    expect(html).toContain(entry.title);
    expect(html).toContain(entry.items[0]);
  }
});
