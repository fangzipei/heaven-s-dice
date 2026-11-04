/* Measure the real on-screen geometry of the scene parts the background art
 * has to line up with: opponent card, name plate, dice tray, combo strip,
 * action dock, cup, and the room art frame itself.
 *
 *   node tools/_measure_scene.mjs --width 1600 --height 900
 */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";
const PORT = 9347;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const W = Number(argOf('width', '1600'));
const H = Number(argOf('height', '900'));
const MOBILE = args.includes('--mobile');
const URL_BASE = argOf('url', 'http://localhost:5199/');

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-measure`,
  `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(p) {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${p}`); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('no CDP endpoint');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return `ERR ${r.exceptionDetails.exception?.description}`; return r.result.value; };

await send('Page.navigate', { url: URL_BASE });
for (let i = 0; i < 40; i += 1) {
  await sleep(500);
  if (await js(`document.body ? document.title : ''`)) break;
}
await sleep(1500);
const hasRun = async () => js(`!!(window.HeavensDice && window.HeavensDice.run)`);
const startRun = async () => {
  for (let i = 0; i < 60; i += 1) {
    await sleep(400);
    if (await js(`!!(window.HeavensDice && document.querySelector('[data-action="start-run"]'))`)) break;
  }
  await js(`document.querySelector('[data-action="start-run"]')?.click()`);
  await sleep(1200);
  await js(`document.querySelector('[data-action="start-direct"]')?.click()`);
  for (let i = 0; i < 40; i += 1) {
    await sleep(400);
    if (await hasRun()) return true;
  }
  return false;
};
if (!await startRun()) {
  await sleep(1500);
  if (!await startRun()) throw new Error('the run never started');
}
await sleep(700);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(900);

const data = await js(`(() => {
  const sel = ['#scene', '.room-wall.back', '.opponent', '.opponent-image-wrap', '.opponent-image-wrap img', '.opponent-plate',
    '.speech-bubble', '.dice-zone', '.dice-tray', '.dice-canvas', '.combo-preview', '.action-dock',
    '.cup-zone', '.score-panel', '.chapter-tag', '.topbar'];
  const out = {};
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[s] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
               bottom: Math.round(r.bottom), display: cs.display, vis: cs.visibility, opacity: cs.opacity };
  }
  out.__scene = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio, body: document.body.className };
  out.__roomBg = (() => { const cs = getComputedStyle(document.getElementById('room-back')); return { size: cs.backgroundSize, pos: cs.backgroundPosition }; })();
  return JSON.stringify(out, null, 1);
})()`);
console.log(`=== ${W}x${H}${MOBILE ? ' (mobile)' : ''} ===`);
console.log(data);
ws.close(); edge.kill();
