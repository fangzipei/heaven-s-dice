import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9353;
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const OUT = `${ROOT}\\tools`;
await mkdir(`${OUT}\\edge-profile-range`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-range`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1200);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);
const rect = await js(`document.querySelector('#cup').getBoundingClientRect().toJSON()`);
const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
const hit = await js(`document.elementFromPoint(${cx}, ${cy})?.id || document.elementFromPoint(${cx}, ${cy})?.className || 'none'`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
for (let i = 1; i <= 10; i += 1) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 46, y: cy, button: 'none', buttons: 1 });
  await sleep(20);
}
await sleep(120);
const moved = await js(`(() => { const r=document.querySelector('#cup').getBoundingClientRect(); return {left:r.left,dx:r.left-${rect.x},transform:document.querySelector('#cup').style.transform,busy:window.HeavensDice.app.busy}; })()`);
const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(`${OUT}\\cup-range.png`, Buffer.from(shot.data, 'base64'));
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 460, y: cy, button: 'left', buttons: 0, clickCount: 1 });
await sleep(3500);
const after = await js(`({phase:window.HeavensDice.run.phase,busy:window.HeavensDice.app.busy,inverted:document.querySelector('#cup').classList.contains('is-inverted')})`);
const errors = events.map((e) => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text);
console.log(JSON.stringify({ startLeft: rect.left, hit, moved, after, errors }, null, 2));
ws.close(); edge.kill();
