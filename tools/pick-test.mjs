/* Verify the raycast pick path: tap a die, expect selection + ring + score. */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9353;
const edge = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${ROOT}\\tools\\edge-profile-pick`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('no cdp');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:4173/?t=${Date.now()}` }); await sleep(1600);
await send('Runtime.evaluate', { expression: 'try { localStorage.clear() } catch {}' });
await send('Page.navigate', { url: `http://127.0.0.1:4173/?t=${Date.now()}` }); await sleep(1600);
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await js('document.querySelector(\'[data-action="start-run"]\').click()');
await sleep(500);
await js('document.querySelector(\'[data-action="start-direct"]\')?.click()');
await sleep(800);
await js('document.querySelector(\'[data-action="close-intro"]\')?.click()');
await sleep(900);

// Deterministic state, then click the first die via dispatched pointer events.
await js(`(() => {
  const api = window.HeavensDice;
  const run = api.run;
  const vals = [5, 1, 1, 6, 3, 2];
  run.dice.forEach((d, i) => { d.value = vals[i]; d.scored = false; });
  run.phase = 'selecting'; run.throwNumber = 1; run.stats.levelRolls = 1;
  api.app.busy = false;
  api.render();
})()`);
await sleep(400);

const report = await js(`(() => {
  const t = HeavensDice.diceTable();
  const canvas = t.canvas;
  const rect = canvas.getBoundingClientRect();
  const entry = t.entries[0]; // the 5
  // project the die's world position to screen
  const p = entry.mesh.position.clone(); p.y = 0.55;
  p.project(t.camera);
  const sx = rect.left + (p.x + 1) / 2 * rect.width;
  const sy = rect.top + (1 - p.y) / 2 * rect.height;
  const hitBefore = t.pickAt(sx, sy);
  canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: sx, clientY: sy, bubbles: true }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: sx, clientY: sy, bubbles: true }));
  const run = HeavensDice.run;
  return {
    hitBefore,
    selectedNow: run.selected.length,
    selectedUid: run.selected[0] === entry.uid,
    ringOpacity: entry.ring?.material.opacity,
    ariaPressed: document.querySelector('.die-a11y-button')?.getAttribute('aria-pressed'),
  };
})()`);
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();
