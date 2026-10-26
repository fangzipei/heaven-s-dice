import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9352;
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const OUT = `${ROOT}\\tools`;
const DOCS = `${ROOT}\\docs\\screenshots`;
await mkdir(`${OUT}\\edge-profile-next`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-next`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1200);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(r.data, 'base64');
  await writeFile(`${OUT}\\${name}.png`, buffer);
  if (docsName) await writeFile(`${DOCS}\\${docsName}`, buffer);
}
await js(`document.querySelector('[data-action="start-run"]').click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);
await js(`(() => {
  const run = window.HeavensDice.run;
  run.target = 10; run.score = 9; run.phase = 'selecting'; run.rerolls = 5;
  run.dice.forEach((d) => { d.value = 1; d.scored = false; });
  run.selected = [run.dice[0].uid];
  window.HeavensDice.app.busy = false;
  window.HeavensDice.render();
})()`);
await sleep(120);
const before = await js(`({nextHidden:document.querySelector('#next-level').hidden,phase:window.HeavensDice.run.phase,score:window.HeavensDice.run.score})`);
await js(`document.querySelector('[data-action="score-continue"]').click()`); await sleep(900);
const reached = await js(`({nextHidden:document.querySelector('#next-level').hidden,nextText:document.querySelector('#next-level').textContent.trim(),phase:window.HeavensDice.run.phase,score:window.HeavensDice.run.score,targetReached:window.HeavensDice.run.targetReached,overlay:!!document.querySelector('.result-modal')})`);
await shot('next-level-available', '16-next-level.png');
// Score again after target; the level must not advance by itself.
await js(`(() => {
  const run = window.HeavensDice.run;
  run.phase = 'selecting'; run.dice.forEach((d) => { d.value = 1; d.scored = false; }); run.selected = [run.dice[0].uid];
  window.HeavensDice.app.busy = false; window.HeavensDice.render();
})()`);
await js(`document.querySelector('[data-action="score-continue"]').click()`); await sleep(900);
const over = await js(`({phase:window.HeavensDice.run.phase,score:window.HeavensDice.run.score,nextHidden:document.querySelector('#next-level').hidden,overlay:!!document.querySelector('.result-modal')})`);
await js(`document.querySelector('#next-level').click()`); await sleep(1100);
const advanced = await js(`({phase:window.HeavensDice.run.phase,overlay:!!document.querySelector('.result-modal'),levelReward:window.HeavensDice.run.levelReward,nextHidden:document.querySelector('#next-level').hidden})`);
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ before, reached, over, advanced, errors }, null, 2));
ws.close(); edge.kill();
