/* Full campaign through the real UI: victory → shop → next level → final.
   关卡数、庄家关卡、每个庄家的重投修正全部从 src/data.js 取，改关卡表不用改这里。 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { LEVELS, BOSSES } from '../src/content/index.ts';

const TOTAL = LEVELS.length;
const bossAt = new Map(BOSSES.map((boss) => [boss.level, boss]));
const BASE_REROLLS = 3;
/** 进入第 L 关时的重投数：基础 3 次 + 本关庄家的修正（徽记不再累积）。 */
function expectedRerolls(level) {
  const boss = bossAt.get(level);
  let rerolls = BASE_REROLLS;
  if (boss?.effectKey === 'rerollMinus') rerolls -= 1;
  if (boss?.effectKey === 'scoreTaxReroll') rerolls += 1;
  return Math.max(1, rerolls);
}

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9340;
const OUT = `${ROOT}\\tools`;
await mkdir(`${ROOT}\\tools\\edge-profile-campaign`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-campaign`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
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
async function state() { return js(`(() => {const r=window.HeavensDice.run;return r?{level:r.level,phase:r.phase,score:r.score,target:r.target,coins:r.coins,rerolls:r.rerolls,overlay:!!document.querySelector('.overlay'),shop:!!document.querySelector('.shop-screen'),result:document.querySelector('.result-modal h2')?.textContent||''}:{}})()`); }

const report = { levels: [], errors: [] };
await js(`window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));`);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(350);

for (let level = 1; level <= TOTAL; level += 1) {
  const before = await state();
  if (before.level !== level) throw new Error(`Expected level ${level}, got ${before.level}`);
  // Put the run one point away, score through the real UI, then leave the
  // level through the explicit next-level button.
  await js(`(() => {
    const r=window.HeavensDice.run;
    r.score=r.target-1; r.phase='selecting'; r.rerolls=5;
    r.dice.forEach((d,i)=>{ d.value=1; d.scored=false; });
    r.selected=[r.dice[0].uid,r.dice[1].uid,r.dice[2].uid];
    window.HeavensDice.render();
  })()`);
  await sleep(150);
  await js(`document.querySelector('[data-action="score-continue"]').click()`);
  await sleep(750);
  await js(`document.querySelector('[data-action="advance-level"]').click()`);
  await sleep(1100);
  const won = await state();
  const expectPhase = level === TOTAL ? 'run-won' : 'won';
  if (won.phase !== expectPhase) throw new Error(`Level ${level} expected ${expectPhase}, got ${won.phase}`);
  report.levels.push({ level, phase: won.phase, coins: won.coins, result: won.result });
  if (level === TOTAL) {
    await shot('33-campaign-final');
    break;
  }
  await js(`document.querySelector('[data-action="go-shop"]').click()`); await sleep(450);
  const shop = await state();
  if (!shop.shop) throw new Error(`Shop did not open after level ${level}`);
  await js(`document.querySelector('[data-action="leave-shop"]').click()`); await sleep(450);
  const intro = await state();
  if (intro.level !== level + 1) throw new Error(`Did not advance to level ${level + 1}`);
  if (!intro.overlay) throw new Error(`Level intro missing for level ${level + 1}`);
  const want = expectedRerolls(intro.level);
  if (intro.rerolls !== want) {
    report.errors.push(`Reroll count mismatch at level ${intro.level}: ${intro.rerolls} vs ${want}`);
  }
  await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(300);
}

const finalState = await state();
const finalButtons = await js(`Array.from(document.querySelectorAll('[data-action]')).map(el=>el.dataset.action)`);
report.final = { state: finalState, buttons: finalButtons };
report.console = await js(`window.__errors`);
report.cdpErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || e.params.entry?.text || e.params.args?.map(a => a.value ?? a.description).join(' '));
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();
