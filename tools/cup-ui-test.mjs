import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9361;
const ROOT = `D:\\vs_workspace\\Heaven's Dice`;
const OUT = `${ROOT}\\tools`;
const DOCS = `${ROOT}\\docs\\screenshots`;
await mkdir(`${OUT}\\edge-profile-cupui`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-cupui`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(3500);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const boot = await js(`({dice:typeof window.HeavensDice,run:!!window.HeavensDice?.run,start:!!document.querySelector('[data-action="start-run"]'),cup:!!document.querySelector('#cup-zone')})`);
const bootErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log('BOOT', boot, JSON.stringify(bootErrors));
async function shot(name, docsName = null) { const r = await send('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(r.data, 'base64'); await writeFile(`${OUT}\\${name}.png`, b); if (docsName) await writeFile(`${DOCS}\\${docsName}`, b); }
const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });

await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(600);
const started = await js(`({dice:typeof window.HeavensDice,run:!!window.HeavensDice?.run,prompt:!!document.querySelector('.start-choice-modal')})`);
console.log('STARTED', started);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(450);
const desktop = await js(`({
  parent:document.querySelector('#cup-zone').parentElement.id,
  position:getComputedStyle(document.querySelector('#cup-zone')).position,
  breathing:document.querySelector('#cup').classList.contains('is-breathing'),
  autoButton:!!document.querySelector('#auto-roll'),
  actionButtons:[...document.querySelectorAll('#action-dock button')].map(b=>b.innerText.trim().replace(/\\s+/g,' ')),
})`);
await js(`(() => {
  const r=window.HeavensDice.run;
  r.dice.forEach((d,i)=>{ d.value=i<3?1:2; d.blank=false; d.scored=false; });
  r.selected=r.dice.slice(0,3).map(d=>d.uid);
  r.phase='selecting';
  window.HeavensDice.render();
})()`); await sleep(250);
await js(`window.HeavensDice.score('continue')`); await sleep(850);
const afterContinue = await js(`({
  phase:window.HeavensDice.run.phase,
  breathing:document.querySelector('#cup').classList.contains('is-breathing'),
  autoButton:!!document.querySelector('#auto-roll'),
  dockButtons:[...document.querySelectorAll('#action-dock button')].map(b=>({text:b.innerText.trim().replace(/\\s+/g,' '),points:b.querySelector('.action-points')?.innerText.trim()})),
})`);
await shot('cup-ui-action', '36-single-throw-button.png');

// Mobile viewport: verify the cup can travel beyond the table.
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.reload'); await sleep(3500);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(600);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(450);
const mobileBefore = await js(`({cup:document.querySelector('#cup').getBoundingClientRect().toJSON(),breathing:document.querySelector('#cup').classList.contains('is-breathing'),viewport:{w:innerWidth,h:innerHeight}})`);
const cx = mobileBefore.cup.x + mobileBefore.cup.width / 2;
const cy = mobileBefore.cup.y + mobileBefore.cup.height / 2;
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
for (let i = 1; i <= 14; i += 1) { await move(cx + i * 20, cy - i * 34); await sleep(18); }
await sleep(120);
const mobileAfter = await js(`({cup:document.querySelector('#cup').getBoundingClientRect().toJSON(),busy:window.HeavensDice.app.busy})`);
await shot('cup-ui-mobile', '37-cup-mobile-range.png');
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 280, y: cy - 476, button: 'left', buttons: 0, clickCount: 1 });
await sleep(1200);
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ desktop, afterContinue, mobileBefore, mobileAfter, errors }, null, 2));
ws.close(); edge.kill();
