import { beforeEach, expect, test } from 'vitest';
import { createRun } from '../../src/core/engine.ts';
import { app } from '../../src/ui/state.ts';
import { showHeavenGate } from '../../src/ui/screens/heaven.ts';
import { bossTooltip } from '../../src/ui/components/tooltip.ts';
import { installDomStub } from '../helpers/stub-dom.mjs';

let dom;

beforeEach(() => {
  dom = installDomStub();
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };
  globalThis.document.body = dom.node('body');
  app.run = createRun({ rng: () => 0.5 });
  app.run.level = 24;
  app.resultShown = false;
});

test('heaven gate offers the final fight only after 50 hot dice', () => {
  app.run.stats.hotDice = 51;
  showHeavenGate();
  const html = dom.html('#overlay-root');
  expect(html).toContain('这里好像并不是天堂');
  expect(html).toContain('data-action="heaven-fight"');
  expect(html).toContain('data-action="heaven-leave"');
});

test('a quiet run can simply enter heaven', () => {
  app.run.stats.hotDice = 12;
  showHeavenGate();
  const html = dom.html('#overlay-root');
  expect(html).toContain('data-action="heaven-enter"');
  expect(html).not.toContain('data-action="heaven-fight"');
});

test('boss tooltip exposes the full boss effect', () => {
  const html = bossTooltip('satan');
  expect(html).toContain('撒旦');
  expect(html).toContain('撒旦的恩赐');
  expect(html).toContain('80000');
});
