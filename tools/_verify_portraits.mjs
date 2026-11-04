// Headless check that the four-state portraits render and swap in the real game.
//
// Drives the running dev server with headless Edge over CDP, walks a few levels,
// reads the opponent <img> src before and after a scoring action, and captures a
// screenshot of the table.
//
// Usage:
//    node tools/_verify_portraits.mjs            # expects a server on 5173
//    BASE_URL=http://127.0.0.1:4173/ node tools/_verify_portraits.mjs
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9361;
const ROOT = `D:\\vs_workspace\\Heaven's Dice`;
const OUT = `${ROOT}\\tools`;
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173/';

await mkdir(`${OUT}\\edge-profile-portraitcheck`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-portraitcheck`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
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
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) errors.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
});
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Page.navigate', { url: BASE_URL });
await sleep(1500);
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

let booted = false;
for (let i = 0; i < 40; i += 1) {
  booted = await js(`!!window.HeavensDice`).catch(() => false);
  if (booted) break;
  await sleep(500);
}
if (!booted) {
  console.error('game never exposed window.HeavensDice');
  console.error('page errors:', errors.slice(0, 8));
  console.error('dynamic import:', await js(`import('/src/ui/app.ts').then(() => 'imported').catch((e) => 'ERR ' + e.message)`).catch(() => 'n/a'));
  console.error('url:', await js(`location.href`).catch(() => 'n/a'));
  console.error('title:', await js(`document.title`).catch(() => 'n/a'));
  console.error('has #opponent:', await js(`!!document.querySelector('#opponent')`).catch(() => 'n/a'));
  edge.kill();
  process.exit(1);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64'));
}

await js(`document.querySelector('[data-action="start-run"]')?.click(); document.querySelector('[data-action="start-direct"]')?.click()`);
await sleep(700);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(500);

const readPortrait = () => js(`(() => {
  const img = document.querySelector('#opponent-image');
  const box = document.querySelector('#opponent');
  return {
    id: box?.dataset.paperId || '',
    name: document.querySelector('#opponent-name')?.textContent || '',
    state: img?.dataset.portraitState || '',
    src: (img?.getAttribute('src') || '').split('/').slice(-2).join('/'),
    w: img?.naturalWidth || 0,
    h: img?.naturalHeight || 0,
  };
})()`);

const rows = [];
for (const level of [1, 3, 5, 8, 12, 18, 24]) {
  await js(`window.HeavensDice.setLevel(${level}); window.HeavensDice.render()`);
  await sleep(600);
  const idle = await readPortrait();

  // select every die and score, so the hit/critical pose fires
  await js(`(() => { const r = window.HeavensDice.run; r.phase='selecting'; r.dice.forEach((d,i)=>{ d.value=[6,5,4,3,2,1][i]; d.blank=false; d.scored=false; }); r.selected = r.dice.map(d=>d.uid); window.HeavensDice.render(); })()`);
  await sleep(250);
  await js(`document.querySelector('[data-action="score-continue"]')?.click()`);
  await sleep(450);
  const posed = await readPortrait();
  rows.push({ level, id: idle.id, name: idle.name, idle: idle.src, posed: posed.src, state: posed.state, loaded: posed.w > 0 });
  await sleep(1400);
}

await js(`window.HeavensDice.setLevel(3); window.HeavensDice.render()`);
await sleep(600);
await shot('portrait-check-boss');

console.log(JSON.stringify(rows, null, 1));
edge.kill();
process.exit(0);
