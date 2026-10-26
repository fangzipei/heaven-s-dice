/* Final visual/runtime pass: tooltip, compendium bars/tables, boss tax. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9338;
const OUT = `${ROOT}\\tools`;
await mkdir(`${ROOT}\\tools\\edge-profile6`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile6`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1200);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64')); };
const report = {};
await js(`window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));`);
await shot('26-start-final');
await js(`document.querySelector('[data-action="start-run"]').click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(400);

// Roll until scoring and select a legal combo.
for (let i = 0; i < 8; i += 1) {
  await js(`document.querySelector('[data-action="auto-roll"]')?.click()`); await sleep(900);
  if (await js(`window.HeavensDice.run.phase === 'selecting'`)) break;
}
const best = await js(`(async () => {
  const { bestSelection } = await import('/src/scoring.js');
  const run=window.HeavensDice.run;
  const b=bestSelection(window.HeavensDice.Engine.availableDice(run));
  if(!b) return null;
  for(const d of b.dice){ document.querySelector('[data-die-uid="'+d.uid+'"]')?.click(); }
  return {values:b.dice.map(d=>d.value),base:b.analysis.base};
})()`);
await sleep(300);
report.best = best;
// Hover the first selected die to show the probability tooltip.
const dieBox = await js(`(() => { const el=document.querySelector('.die.is-selected')||document.querySelector('.die'); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dieBox.x, y: dieBox.y, button: 'none', buttons: 0 });
await sleep(400);
report.tooltip = await js(`(() => { const t=document.querySelector('#tooltip'); return {hidden:t.hidden, text:t.textContent.slice(0,160)}; })()`);
await shot('27-tooltip-selected');

// Compendium tabs.
await js(`document.querySelector('[data-action="open-compendium"]').click()`); await sleep(400);
await shot('28-compendium-dice-final');
await js(`document.querySelector('[data-action="switch-compendium-tab"][data-tab="tables"]').click()`); await sleep(300);
await shot('29-compendium-tables');
report.tableCards = await js(`document.querySelectorAll('.table-comp-card').length`);
await js(`document.querySelector('[data-action="switch-compendium-tab"][data-tab="barrels"]').click()`); await sleep(250);
await shot('30-compendium-barrels');
await js(`document.querySelector('.modal-close').click()`); await sleep(300);

// Boss 12 continue tax.
report.bossTax = await js(`(async () => {
  window.HeavensDice.setLevel(12);
  const run=window.HeavensDice.run;
  run.target=99999;
  run.dice.forEach((d,i)=>{d.value=[1,1,1,5,2,3,4,6][i]||1; d.scored=false;});
  run.selected = run.dice.filter(d=>[1,1,1,5].includes(d.value)).slice(0,4).map(d=>d.uid);
  // ensure exact triple+single via uid layout
  run.selected = [run.dice[0].uid,run.dice[1].uid,run.dice[2].uid,run.dice[3].uid];
  window.HeavensDice.render();
  const p=window.HeavensDice.Engine.getScorePreview(run);
  return {valid:p.valid,cont:p.totalContinue,rer:p.totalReroll,boss:window.HeavensDice.Engine.getOpponentInfo(run).name,effect:window.HeavensDice.Engine.getOpponentInfo(run).effectName};
})()`);
await sleep(300);
await shot('31-boss12-tax');

// Iron table final.
await js(`window.HeavensDice.setLevel(7); window.HeavensDice.render();`); await sleep(400);
await shot('32-iron-final');
report.console = await js(`window.__errors`);
report.cdpErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || e.params.entry?.text || e.params.args?.map(a => a.value ?? a.description).join(' '));
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();
