import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9336;
const OUT = `${ROOT}\\tools`;
await mkdir(`${ROOT}\\tools\\edge-profile4`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile4`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64')); };

const results = [];
for (const [w, h, name] of [[900, 700, '19-tablet'], [390, 844, '20-mobile'], [1366, 768, '21-laptop']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await sleep(1000);
  await js(`document.querySelector('[data-action="start-run"]').click()`); await sleep(400);
  await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);
  await js(`document.querySelector('[data-action="auto-roll"]')?.click()`); await sleep(900);
  const metrics = await js(`(() => ({
    innerWidth, innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    railDisplay: getComputedStyle(document.querySelector('.rail')).transform,
    railToggleDisplay: getComputedStyle(document.querySelector('.rail-toggle')).display,
    dock: document.querySelector('.action-dock')?.getBoundingClientRect().toJSON(),
    tray: document.querySelector('.dice-tray')?.getBoundingClientRect().toJSON(),
    cup: document.querySelector('#cup')?.getBoundingClientRect().toJSON()
  }))()`);
  results.push({ name, metrics });
  await shot(name);
}
console.log(JSON.stringify(results, null, 2));
ws.close(); edge.kill();
