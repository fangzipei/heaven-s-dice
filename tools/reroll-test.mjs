/* Verify the two clarified reroll scopes through the real UI. */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9341;
await mkdir(`${ROOT}\\tools\\edge-profile-reroll`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-reroll`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1100);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const state = () => js(`(() => {const r=window.HeavensDice.run;return {phase:r.phase,score:r.score,rerolls:r.rerolls,values:r.dice.map(d=>d.value),scored:r.dice.map(d=>d.scored),selected:r.selected.length,overlay:document.querySelector('.result-modal h2')?.textContent||''}})()`);
async function setup(values, selectedCount, rerolls) {
  await js(`(() => {
    const r=window.HeavensDice.run;
    r.score=0; r.target=9999; r.phase='selecting'; r.rerolls=${rerolls}; r.maxRerolls=Math.max(r.maxRerolls,${rerolls});
    const vals=${JSON.stringify(values)};
    r.dice.forEach((d,i)=>{d.value=vals[i];d.scored=false;});
    r.selected=r.dice.slice(0,${selectedCount}).map(d=>d.uid);
    window.HeavensDice.app.busy=false;
    window.HeavensDice.render();
  })()`);
  await sleep(200);
}

const report = {};
await js(`window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));`);
await js(`document.querySelector('[data-action="start-run"]').click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(350);

// 璁″垎骞剁户缁? click three real 3D cubes, then only the remaining 3 reroll.
await setup([1,1,1,2,3,4], 0, 5);
await js(`[0,1,2].forEach(i => document.querySelectorAll('#dice-tray .die')[i].click())`);
report.clickSelected = await js(`window.HeavensDice.run.selected.length`);
await sleep(200);
await js(`document.querySelector('[data-action="score-continue"]').click()`); await sleep(900);
report.continueAwaiting = await state();
report.continueAutoEnabled = await js(`!document.querySelector('#auto-roll').disabled`);
await js(`document.querySelector('#auto-roll').click()`); await sleep(4000);
report.continue = await state();
report.continueCount = report.continue.scored.filter(Boolean).length;

// 璁″垎骞堕噸鎶? all six dice are returned and rerolled.
await setup([1,1,1,2,3,4], 3, 5);
await js(`document.querySelector('[data-action="score-reroll"]').click()`); await sleep(900);
report.rerollAwaiting = await state();
await js(`document.querySelector('#auto-roll').click()`); await sleep(4000);
report.rerollAll = await state();
report.rerollAllCount = report.rerollAll.scored.filter(Boolean).length;

// 0 tokens: bank settles the level.
await setup([1,1,1,2,3,4], 3, 0);
report.bankButton = await js(`!!document.querySelector('[data-action="score-bank"]')`);
await js(`document.querySelector('[data-action="score-bank"]').click()`); await sleep(1300);
report.bank = await state();

report.console = await js(`window.__errors`);
report.cdpErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || e.params.entry?.text || e.params.args?.map(a => a.value ?? a.description).join(' '));
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();

