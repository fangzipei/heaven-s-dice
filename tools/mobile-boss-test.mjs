import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9367;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools');
const DOCS = join(ROOT, 'docs', 'screenshots');
await mkdir(join(OUT, 'edge-profile-mobileboss'), { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, 'edge-profile-mobileboss')}`, '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const mobileHeight = Number(process.env.MOBILE_H || 844);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: mobileHeight, deviceScaleFactor: 1, mobile: true });
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(3500);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) { const r = await send('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(r.data, 'base64'); await writeFile(join(OUT, `${name}.png`), b); if (docsName) await writeFile(join(DOCS, docsName), b); }
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(600);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(450);
await js(`window.HeavensDice.setLevel(3); window.HeavensDice.render()`); await sleep(500);
const ready = await js(`(() => {
  const dock=document.querySelector('#action-dock'); const d=dock?.getBoundingClientRect();
  const buttons=[...document.querySelectorAll('#action-dock [data-action]')];
  return { phase:window.HeavensDice.run.phase, level:window.HeavensDice.run.level,
    viewport:{w:innerWidth,h:innerHeight,vh:visualViewport?.height}, scrollY,
    dock:d?.toJSON(), dockDisplay:dock?getComputedStyle(dock).display:null,
    buttons:buttons.map(b=>({action:b.dataset.action,text:b.innerText.replace(/\\n/g,' | '),rect:b.getBoundingClientRect().toJSON(),display:getComputedStyle(b).display})),
    hit:d?document.elementFromPoint(d.left+d.width/2,d.top+d.height/2)?.className:null,
    bodyOverflow:getComputedStyle(document.body).overflow,
    cup:document.querySelector('#cup')?.getBoundingClientRect().toJSON() };
})()`);
await shot('mobile-boss-ready', '40-mobile-boss-ready.png');
await js(`window.HeavensDice.intro()`); await sleep(450);
const intro = await js(`(() => {
  const overlay=document.querySelector('[data-overlay]'); const modal=document.querySelector('.modal'); const action=document.querySelector('[data-action="close-intro"]');
  const o=overlay?.getBoundingClientRect(); const m=modal?.getBoundingClientRect(); const a=action?.getBoundingClientRect();
  return { overlay:o?.toJSON(), modal:m?.toJSON(), action:a?.toJSON(), actionText:action?.innerText,
    actionVisible:action? (a.top < innerHeight && a.bottom > 0 && getComputedStyle(action).display!=='none') : false,
    scrollHeight:modal?.scrollHeight, clientHeight:modal?.clientHeight,
    overlapAtButton: action?document.elementFromPoint(Math.min(innerWidth-8,Math.max(8,a.left+a.width/2)), Math.min(innerHeight-8,Math.max(8,a.top+a.height/2)))?.className:null };
})()`);
await shot('mobile-boss-intro', '41-mobile-boss-intro.png');
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(500);
const afterClose = await js(`({introOpen:window.HeavensDice.app.introOpen,phase:window.HeavensDice.run.phase,overlay:!!document.querySelector('[data-overlay]'),dockButtons:[...document.querySelectorAll('#action-dock [data-action]')].map(b=>b.dataset.action)})`);
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ ready, intro, afterClose, errors }, null, 2));
ws.close(); edge.kill();
