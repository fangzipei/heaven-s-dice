import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9346;
const OUT = 'D:\\vs_workspace\\Heaven\'s Dice\\tools';
const DOCS = 'D:\\vs_workspace\\Heaven\'s Dice\\docs\\screenshots';
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-spin`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
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
await js(`document.querySelector('[data-action="auto-roll"]').click()`);
await sleep(2800);
const afterRoll = await js(`({phase:window.HeavensDice.run.phase,values:window.HeavensDice.run.dice.map(d=>d.value),rolls:window.HeavensDice.run.stats.levelRolls})`);
await js(`(() => { const run=window.HeavensDice.run; [1,2,3,4,5,6].forEach((v,i)=>{ run.dice[i].value=v; run.dice[i].scored=false; }); run.selected=[run.dice[0].uid]; window.HeavensDice.render(); })()`);
await sleep(120);
const selected = await js(`window.HeavensDice.run.selected.length`);
await js(`document.querySelector('[data-action="score-reroll"]').click()`);
await sleep(900);
const choice = await js(`({phase:window.HeavensDice.run.phase,busy:window.HeavensDice.app.busy,autoEnabled:!document.querySelector('#auto-roll').disabled,cueButton:!!document.querySelector('[data-action="cue-cup"]')})`);
await shot('reroll-choice', '14-reroll-choice.png');
await js(`document.querySelector('[data-action="cue-cup"]').click()`);
const cue = await js(`({cue:document.querySelector('#cup').classList.contains('is-cue'),phase:window.HeavensDice.run.phase,throwNumber:window.HeavensDice.run.throwNumber})`);
await js(`document.querySelector('#auto-roll').click()`);
await sleep(650);
const spin = await js(`({phase:window.HeavensDice.run.phase,busy:window.HeavensDice.app.busy,anim:document.querySelectorAll('.die-roller').length, moving:[...document.querySelectorAll('.die-roller')].filter(el=>el.getAnimations().length).length, durations:[...document.querySelectorAll('.die-roller')].flatMap(el=>el.getAnimations().map(a=>a.effect.getTiming().duration))})`);
const pausedTimes = await js(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 80; i += 1) {
    const dice = [...document.querySelectorAll('.die-roller')].flatMap((el) => el.getAnimations());
    if (dice.length === 6 && dice.every((a) => a.playState === 'running' && a.currentTime > 120)) {
      document.getAnimations().forEach((a) => a.pause());
      return dice.map((a) => Math.round(a.currentTime));
    }
    await wait(25);
  }
  return null;
})()`);
await shot('spin-01', '11-reroll-spin.png');
await js(`document.getAnimations().forEach(a=>{ try { a.finish(); } catch {} })`);
await sleep(1500);
await shot('spin-02');
await sleep(2600);
const final = await js(`({phase:window.HeavensDice.run.phase,busy:window.HeavensDice.app.busy,throwNumber:window.HeavensDice.run.throwNumber,values:window.HeavensDice.run.dice.map(d=>d.value)})`);
console.log(JSON.stringify({ afterRoll, selected, choice, cue, spin, pausedTimes, final, consoleEvents: events }, null, 2));
ws.close(); edge.kill();

