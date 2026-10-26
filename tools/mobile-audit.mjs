/* Mobile viewport: capture every screen + measure frame budget and layout cost.
   Usage: node tools/mobile-audit.mjs   (needs the dev server on :4173) */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";
const PORT = 9351;
const OUT = `${ROOT}\\docs\\screenshots\\mobile`;
await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile-ma`, { recursive: true });

const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${ROOT}\\tools\\edge-profile-ma`, '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {}
    await sleep(250);
  }
  throw new Error('No CDP');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
});
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Performance.enable');

const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64'));
};

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await sleep(1500);
for (let i = 0; i < 20 && !(await js(`Boolean(document.querySelector('[data-action="start-run"]'))`)); i += 1) await sleep(300);

await shot('01-home');

// start a run
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`);
await sleep(500);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(600);
await shot('02-game-idle');

await js(`document.querySelector('[data-action="auto-roll"]')?.click()`);
await sleep(900);
await shot('03-game-rolled');

// select a couple of dice so the dock is populated
await js(`
  (() => { const d=[...document.querySelectorAll('.die')].filter(x=>!x.disabled).slice(0,3);
    d.forEach(x=>x.click()); return d.length; })()
`);
await sleep(500);
await shot('04-game-selected');

// rail open
await js(`document.querySelector('.rail-toggle')?.click()`); await sleep(500);
await shot('05-rail-open');
await js(`document.querySelector('.rail-toggle')?.click()`); await sleep(400);

// shop
await js(`window.HeavensDice.openShop?.()`); await sleep(700);
await shot('06-shop');

// compendium
await js(`window.HeavensDice.openCompendium?.()`); await sleep(700);
await shot('07-compendium');

// ── perf probe on the live game board ───────────────────────────────────
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await sleep(1000);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`);
await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(600);
await js(`document.querySelector('[data-action="auto-roll"]')?.click()`);
await sleep(1200);

const perf = await js(`(async () => {
  const before = performance.getEntriesByType('measure');
  let frames = 0; let longFrames = 0; let last = performance.now();
  const durations = [];
  await new Promise((res) => {
    function step(t) {
      const dt = t - last; last = t; frames += 1; durations.push(dt);
      if (dt > 24) longFrames += 1;
      if (frames < 180) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  });
  durations.sort((a, b) => a - b);
  const p95 = durations[Math.floor(durations.length * .95)] || 0;
  const avgFrame = durations.reduce((a, b) => a + b, 0) / durations.length;

  // how many animated / compositing-heavy styles are live
  const all = [...document.querySelectorAll('*')];
  const count = (fn) => all.filter(fn).length;
  const cs = (el) => getComputedStyle(el);
  return {
    avgFrameMs: +avgFrame.toFixed(2),
    approxFps: +(1000 / avgFrame).toFixed(1),
    p95FrameMs: +p95.toFixed(2),
    longFrames,
    domNodes: all.length,
    infiniteAnimations: count((e) => cs(e).animationIterationCount === 'infinite' || cs(e).animationIterationCount === '-1'),
    animatedNodes: count((e) => cs(e).animationName !== 'none'),
    backdropFilter: count((e) => { const v = cs(e).backdropFilter || cs(e).webkitBackdropFilter; return v && v !== 'none'; }),
    cssFilters: count((e) => cs(e).filter !== 'none'),
    blendModes: count((e) => cs(e).mixBlendMode !== 'normal'),
    preserve3d: count((e) => cs(e).transformStyle === 'preserve-3d'),
    layerCount: count((e) => cs(e).willChange !== 'auto'),
    boxShadow: count((e) => cs(e).boxShadow !== 'none'),
    memoryMb: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  };
})()`);

const metrics = (await send('Performance.getMetrics')).metrics;
const perfCounts = Object.fromEntries(metrics.filter((m) => ['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'].includes(m.name)).map((m) => [m.name, +m.value.toFixed(4)]));

console.log(JSON.stringify({ perf, perfCounts }, null, 2));
ws.close(); edge.kill();
