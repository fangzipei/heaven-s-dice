import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9345;
const OUT = 'D:\\vs_workspace\\Heaven\'s Dice\\tools';
const DOCS = 'D:\\vs_workspace\\Heaven\'s Dice\\docs\\screenshots';
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-cup`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } if (m.method === 'Runtime.consoleAPICalled') events.push(m.params.type); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1200);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(r.data, 'base64');
  await writeFile(`${OUT}\\${name}.png`, buffer);
  if (docsName) await writeFile(`${DOCS}\\${docsName}`, buffer);
}
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);
const cup = await js(`document.querySelector('#cup').getBoundingClientRect().toJSON()`);
const cx = cup.x + cup.width / 2, cy = cup.y + cup.height / 2;
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
for (let i = 0; i <= 8; i += 1) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + Math.sin(i * .7) * 70, y: cy, button: 'none', buttons: 1 });
  await sleep(20);
}
await sleep(180); await shot('cup-01-gather');
await sleep(700); await shot('cup-02-inverted-hold', '10-cup-inverted.png');
const holdState = await js(`({phase:window.HeavensDice.run.phase,busy:window.HeavensDice.app.busy,inverted:document.querySelector('#cup').classList.contains('is-inverted'),shake:document.querySelector('#cup').classList.contains('is-shaking'),dice:document.querySelectorAll('.die').length})`);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 30, y: cy, button: 'left', buttons: 0, clickCount: 1 });
await sleep(220); await shot('cup-03-pour');
await sleep(1400); await shot('cup-04-landed');
const finalState = await js(`({phase:window.HeavensDice.run.phase,throwNumber:window.HeavensDice.run.throwNumber,busy:window.HeavensDice.app.busy,inverted:document.querySelector('#cup').classList.contains('is-inverted')})`);
console.log(JSON.stringify({ holdState, finalState, consoleEvents: events }, null, 2));
ws.close(); edge.kill();

