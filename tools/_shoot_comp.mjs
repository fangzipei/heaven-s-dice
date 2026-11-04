/* Screenshot the compendium's table cards so the hall plates can be checked
 * outside the battle scene.
 *
 *   node tools/_shoot_comp.mjs --tab tables --out vibe_images/_compendium_tables.png
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(argOf('port', '9360'));
const TAB = argOf('tab', 'tables');
const OUT = path.resolve(ROOT, argOf('out', 'vibe_images/_compendium_tables.png'));
const W = Number(argOf('width', '1600'));
const H = Number(argOf('height', '900'));

await mkdir(path.dirname(OUT), { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile-comp`, { recursive: true });

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-comp`,
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false, screenWidth: W, screenHeight: H });
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return `ERR ${r.exceptionDetails.exception?.description}`; return r.result.value; };

await send('Page.navigate', { url: 'http://localhost:5199/' });
for (let i = 0; i < 40; i += 1) { await sleep(500); if (await js(`document.body ? document.title : ''`)) break; }
await sleep(2500);
await js(`window.HeavensDice && window.HeavensDice.openCompendium(${JSON.stringify(TAB)})`);
await sleep(1800);

const report = await js(`(() => {
  const cards = [...document.querySelectorAll('.comp-table-bg')];
  return JSON.stringify(cards.map((c) => ({
    bg: getComputedStyle(c).backgroundImage.slice(0, 120),
    loaded: (() => { const u = /url\\("?(.*?)"?\\)/.exec(getComputedStyle(c).backgroundImage); if (!u) return false; const img = new Image(); img.src = u[1]; return img.complete && img.naturalWidth > 0; })(),
  })), null, 1);
})()`);
console.log(report);

const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(OUT, Buffer.from(r.data, 'base64'));
console.log(`shot -> ${OUT}`);
ws.close();
edge.kill();
