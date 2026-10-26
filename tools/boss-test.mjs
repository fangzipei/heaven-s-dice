import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9357;
const ROOT = `D:\\vs_workspace\\Heaven's Dice`;
const OUT = `${ROOT}\\tools`;
const DOCS = `${ROOT}\\docs\\screenshots`;
await mkdir(`${OUT}\\edge-profile-boss`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-boss`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(1600);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const b = Buffer.from(r.data, 'base64');
  await writeFile(`${OUT}\\${name}.png`, b);
  if (docsName) await writeFile(`${DOCS}\\${docsName}`, b);
}
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(500);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(400);
const reports = {};

await js(`window.HeavensDice.setLevel(3); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.bossDiceRolled=8; r.dice.forEach((d,i)=>{d.value=[1,2,3,4,5,6][i];d.blank=false;d.scored=false}); r.dice[0].blank=true; r.dice[0].value=0; r.selected=[]; window.HeavensDice.render(); })()`); await sleep(250);
reports.blank = await js(`({boss:document.querySelector('#opponent-name')?.textContent,effect:document.querySelector('#boss-effect-desc')?.textContent,blankDice:document.querySelectorAll('.die.is-blank').length,disabled:document.querySelectorAll('.die.is-blank[disabled]').length})`);
await shot('boss-blank', '27-boss-blank.png');

await js(`window.HeavensDice.setLevel(7); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.dice.forEach((d,i)=>{d.value=[6,6,1,2,3,4][i];d.blank=false;d.scored=false}); r.selected=[]; window.HeavensDice.render(); })()`); await sleep(250);
reports.noSix = await js(`({boss:document.querySelector('#opponent-name')?.textContent,blocked:document.querySelectorAll('.die.is-boss-blocked').length,disabled:document.querySelectorAll('.die.is-boss-blocked[disabled]').length})`);
await shot('boss-nosix', '28-boss-nosix.png');

await js(`window.HeavensDice.setLevel(5); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.dice.forEach((d,i)=>{d.value=[5,2,3,4,6,6][i];d.blank=false;d.scored=false}); r.selected=[r.dice[0].uid]; window.HeavensDice.render(); })()`); await sleep(250);
reports.minTriple = await js(`({boss:document.querySelector('#opponent-name')?.textContent,preview:document.querySelector('#combo-preview')?.innerText,buttons:[...document.querySelectorAll('#action-dock [data-action]')].map(b=>({action:b.dataset.action,disabled:b.disabled,text:b.innerText.replace(/\\n/g,' ')})),total:window.HeavensDice.Engine.getScorePreview(window.HeavensDice.run).total})`);
await shot('boss-min-triple', '29-boss-min-triple.png');

await js(`window.HeavensDice.setLevel(9); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.flags.bossLastType='triple'; r.dice.forEach((d,i)=>{d.value=[3,3,3,2,4,6][i];d.blank=false;d.scored=false}); r.selected=r.dice.slice(0,3).map(d=>d.uid); window.HeavensDice.render(); })()`); await sleep(250);
reports.noRepeat = await js(`({boss:document.querySelector('#opponent-name')?.textContent,preview:document.querySelector('#combo-preview')?.innerText,total:window.HeavensDice.Engine.getScorePreview(window.HeavensDice.run).total,status:document.querySelector('#boss-effect-desc')?.textContent})`);
await shot('boss-ash', '30-boss-ash.png');

await js(`window.HeavensDice.setLevel(11); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.flags.bossLockedType='triple'; r.dice.forEach((d,i)=>{d.value=[1,2,3,4,5,6][i];d.blank=false;d.scored=false}); r.selected=r.dice.slice(0,5).map(d=>d.uid); window.HeavensDice.render(); })()`); await sleep(250);
reports.singleType = await js(`({boss:document.querySelector('#opponent-name')?.textContent,preview:document.querySelector('#combo-preview')?.innerText,total:window.HeavensDice.Engine.getScorePreview(window.HeavensDice.run).total})`);

await js(`window.HeavensDice.setLevel(13); window.HeavensDice.render()`); await sleep(350);
reports.taxCollector = await js(`({boss:document.querySelector('#opponent-name')?.textContent,effect:document.querySelector('#boss-effect-desc')?.textContent,rerolls:window.HeavensDice.run.rerolls,portrait:document.querySelector('#opponent-image')?.getAttribute('src')})`);
await shot('boss-tax', '31-boss-tax.png');

await js(`window.HeavensDice.setLevel(15); window.HeavensDice.render()`); await sleep(350);
await js(`(() => { const r=window.HeavensDice.run; r.phase='selecting'; r.dice.forEach((d,i)=>{d.value=[3,3,3,2,4,6][i];d.blank=false;d.scored=false}); r.selected=r.dice.slice(0,3).map(d=>d.uid); window.HeavensDice.render(); })()`); await sleep(250);
reports.seraph = await js(`({boss:document.querySelector('#opponent-name')?.textContent,preview:document.querySelector('#combo-preview')?.innerText,total:window.HeavensDice.Engine.getScorePreview(window.HeavensDice.run).total,rerolls:window.HeavensDice.run.rerolls})`);

reports.errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify(reports, null, 2));
ws.close(); edge.kill();
