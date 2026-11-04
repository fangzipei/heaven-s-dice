/* Check that the dealer's bust is welded to the desk edge.
 *
 * The room plate is cropped by height (`background-size: auto 180%`), so the
 * desk edge (plate row 600) lands at a fixed fraction of the frame. This
 * recomputes where that edge ends up on screen and compares it with the
 * bottom of the cropped bust.
 *
 *   node tools/_check_edge.mjs --width 1600 --height 900
 */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";
const PORT = 9380;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const W = Number(argOf('width', '1600'));
const H = Number(argOf('height', '900'));
const MOBILE = args.includes('--mobile');
const LEVEL = Number(argOf('level', '3'));

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-edge`,
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

await send('Page.navigate', { url: 'http://localhost:5199/' });
for (let i = 0; i < 40; i += 1) { await sleep(500); if (await js(`document.body ? document.title : ''`)) break; }
await sleep(2000);
const hasRun = async () => js(`!!(window.HeavensDice && window.HeavensDice.run)`);
const startRun = async () => {
  for (let i = 0; i < 60; i += 1) {
    await sleep(400);
    if (await js(`!!(window.HeavensDice && document.querySelector('[data-action="start-run"]'))`)) break;
  }
  await js(`document.querySelector('[data-action="start-run"]')?.click()`);
  await sleep(1200);
  await js(`document.querySelector('[data-action="start-direct"]')?.click()`);
  for (let i = 0; i < 40; i += 1) { await sleep(400); if (await hasRun()) return true; }
  return false;
};
if (!await startRun()) { await sleep(1500); if (!await startRun()) throw new Error('the run never started'); }
await sleep(700);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(900);
if (LEVEL) { await js(`window.HeavensDice.setLevel(${LEVEL})`); await sleep(1200); }

const out = await js(`(() => {
  const PLATE_EDGE_ROW = 600;
  const PLATE_ROWS = 1000;
  const scene = document.querySelector('#scene');
  const back = document.querySelector('.room-wall.back');
  const opp = document.querySelector('.opponent');
  const zoom = Number(getComputedStyle(document.getElementById('game-screen')).zoom) || 1;

  const sRect = scene.getBoundingClientRect();
  const oRect = opp.getBoundingClientRect();
  const cs = getComputedStyle(back);

  // background-size: "<w> <h>" with % and px parts; only the height matters.
  const parts = cs.backgroundSize.split(' ').map((p) => p.trim());
  const hPart = parts.length > 1 ? parts[1] : parts[0];
  let bgH = 0;
  if (hPart.endsWith('%')) bgH = (parseFloat(hPart) / 100) * sRect.height / zoom;
  else if (hPart.endsWith('px')) bgH = parseFloat(hPart);

  // background-position: "<x> <y>", percentages of the leftover space.
  const posParts = cs.backgroundPosition.split(' ').map((p) => p.trim());
  const yPart = posParts.length > 1 ? posParts[1] : posParts[0];
  let offset = 0;
  const leftover = bgH - sRect.height / zoom;
  const yPct = yPart.endsWith('%') ? parseFloat(yPart) : 50;
  const yPx = yPart.endsWith('px') ? parseFloat(yPart) : 0;
  offset = (yPct / 100) * leftover + yPx;

  const edgeFromTop = (PLATE_EDGE_ROW / PLATE_ROWS) * bgH - offset;   // layout px
  const edgeScreenY = sRect.top + edgeFromTop * zoom;
  const bustBottomScreenY = oRect.bottom;

  return JSON.stringify({
    viewport: { w: innerWidth, h: innerHeight },
    zoom,
    bgSize: cs.backgroundSize, bgPos: cs.backgroundPosition,
    scene: { w: Math.round(sRect.width), h: Math.round(sRect.height) },
    plateRowsVisible: [
      Math.round((offset / bgH) * PLATE_ROWS),
      Math.round(((offset + sRect.height / zoom) / bgH) * PLATE_ROWS),
    ],
    deskEdgeScreenY: Math.round(edgeScreenY * 10) / 10,
    bustBottomScreenY: Math.round(bustBottomScreenY * 10) / 10,
    delta: Math.round((bustBottomScreenY - edgeScreenY) * 10) / 10,
  }, null, 1);
})()`);
console.log(`=== ${W}x${H}${MOBILE ? ' (mobile)' : ''} level ${LEVEL} ===`);
console.log(out);
ws.close();
edge.kill();
