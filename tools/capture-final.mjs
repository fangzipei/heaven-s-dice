/* Capture the curated screenshots used by the README / handoff. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9339;
const OUT = `${ROOT}\\docs\\screenshots`;
await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile7`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile7`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1300);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64')); };

await shot('01-start');
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(450);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(450);
// Deterministic hero state: 5 / 1 / 1 / 6 / 3 / 2 with a 250-point single combo selected.
await js(`(() => {
  const run = window.HeavensDice.run;
  const vals = [5,1,1,6,3,2];
  run.dice.forEach((d,i)=>{ d.value=vals[i]; d.scored=false; });
  run.phase='selecting'; run.throwNumber=1; run.stats.levelRolls=1;
  run.score=300; run.roundScore=80;
  run.selected=[run.dice[0].uid,run.dice[1].uid,run.dice[2].uid];
  window.HeavensDice.app.busy=false;
  window.HeavensDice.render();
})()`);
await sleep(400);
await shot('02-game');
const scoreRect = await js(`(() => { const r=document.querySelector('#score-panel').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
const scoreClip = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: Math.max(0, scoreRect.x - 8), y: Math.max(0, scoreRect.y - 8), width: scoreRect.w + 16, height: scoreRect.h + 16, scale: 2.2 },
});
await writeFile(`${OUT}\\13-score-split.png`, Buffer.from(scoreClip.data, 'base64'));
await js(`window.HeavensDice.run.selected=[]; window.HeavensDice.render();`); await sleep(260);
const trayRect = await js(`(() => { const r=document.querySelector('.dice-zone').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
const closeup = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: Math.max(0, trayRect.x - 16), y: Math.max(0, trayRect.y - 16), width: trayRect.w + 32, height: trayRect.h + 32, scale: 1.65 },
});
await writeFile(`${OUT}\\09-dice-3d.png`, Buffer.from(closeup.data, 'base64'));

// Victory → shop, with enough money to make cards active.
await js(`(() => {
  const run=window.HeavensDice.run;
  run.score=run.target; run.phase='won'; run.levelReward={base:45,bonuses:[],total:45}; run.coins=180;
  window.HeavensDice.victory();
})()`);
await sleep(400);
await js(`document.querySelector('[data-action="go-shop"]').click()`); await sleep(600);
await shot('03-shop');
await js(`document.querySelector('.shop-screen')?.remove(); window.HeavensDice.app.shopOpen=false;`);

// Gesture board.
await js(`(() => { const r=window.HeavensDice.run; r.barrelId='pentagram'; window.HeavensDice.setLevel(3); window.HeavensDice.render(); })()`);
await sleep(400);
await js(`document.querySelector('[data-action="open-gesture"]').click()`); await sleep(500);
await shot('04-gesture');
await js(`document.querySelector('[data-action="close-overlay"]')?.click()`); await sleep(400);

// Other 3D table materials for the gallery.
for (const [level, name] of [[4, 'stone'], [7, 'iron'], [10, 'gold']]) {
  await js(`window.HeavensDice.setLevel(${level}); window.HeavensDice.render();`); await sleep(500);
  await shot(`05b-table-${name}`);
}

// Final table + boss intro. A real final run has six dealer sigils.
await js(`(() => { window.HeavensDice.run.bossBoons = 6; window.HeavensDice.setLevel(15); window.HeavensDice.render(); })()`); await sleep(600);
await shot('05-diamond-table');
await js(`window.HeavensDice.intro()`); await sleep(450);
await shot('06-boss-intro');
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(350);

// Compendium tables.
await js(`document.querySelector('[data-action="open-compendium"]')?.click()`); await sleep(350);
await js(`document.querySelector('[data-action="switch-compendium-tab"][data-tab="tables"]')?.click()`); await sleep(350);
await shot('07-compendium-tables');
await js(`document.querySelector('[data-action="switch-compendium-tab"][data-tab="dice"]')?.click()`); await sleep(300);
await shot('08-compendium-dice');
console.log('screenshots written to docs/screenshots');
ws.close(); edge.kill();
