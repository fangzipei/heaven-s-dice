import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9381;
const OUT = `D:\\vs_workspace\\Heaven's Dice\\tools`;
await mkdir(`${OUT}\\edge-profile-account`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-account`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const url = process.env.BASE_URL || 'http://127.0.0.1:4179/';
const id = `ui${Date.now().toString(36)}`;
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await send('Page.navigate', { url }); await sleep(3000);
await js(`localStorage.clear(); location.reload()`); await sleep(3000);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(700);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(300);
await js(`(() => { const r=window.HeavensDice.run; r.phase='lost'; r.score=0; window.HeavensDice.defeat(); })()`); await sleep(500);
const before = await js(`({history:JSON.parse(localStorage.getItem('heavensDice.history.v2')||'[]').length,profile:JSON.parse(localStorage.getItem('heavensDice.profile.v1')||'null')})`);
await js(`document.querySelector('[data-action="open-account"]').click()`); await sleep(300);
await js(`document.querySelector('[data-action="account-switch"]')?.click()`); await sleep(300);
await js(`document.querySelector('#account-id').value='${id}'; document.querySelector('#account-password').value='testpass123'; document.querySelector('[data-action="account-sync"]').click()`); await sleep(3000);
const after = await js(`({profile:JSON.parse(localStorage.getItem('heavensDice.profile.v1')||'null'),history:JSON.parse(localStorage.getItem('heavensDice.history.v2')||'[]').length,pending:JSON.parse(localStorage.getItem('heavensDice.pendingSync.v2')||'[]').length,toasts:[...document.querySelectorAll('#toast-stack *')].map(e=>e.textContent).join(' | '),name:document.querySelector('#account-name')?.textContent,overlay:!!document.querySelector('#overlay')})`);
let me = null; let lead = null;
try { me = await js(`(async()=>{const p=JSON.parse(localStorage.getItem('heavensDice.profile.v1')); const r=await fetch('./api/me',{headers:{Authorization:'Bearer '+p.token}}); return {status:r.status,body:await r.json()};})()`); } catch (e) { me = String(e); }
try { lead = await js(`(async()=>{const r=await fetch('./api/leaderboards?board=luck&limit=5'); return {status:r.status,body:await r.json()};})()`); } catch (e) { lead = String(e); }
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ id, before, after, me, lead, errors }, null, 2));
ws.close(); edge.kill();
