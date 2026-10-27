/*
 * One-off visual check: renders the tray loaded with special dice (weighted /
 * epic / legendary / demon) and captures it plus the compendium dice gallery.
 * Not part of npm test.
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9341;
const OUT = `${ROOT}\\docs\\screenshots\\dice-preview`;
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile8`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile8`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
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
const shotClip = async (name, sel, pad = 16, scale = 1.8) => {
  const r = await js(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; })()`);
  if (!r) throw new Error(`missing ${sel}`);
  const c = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2, scale } });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(c.data, 'base64'));
};

await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(450);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(450);

// One die of every interesting tier, resting on favoured faces.
await js(`(() => {
  const H = window.HeavensDice; const run = H.run;
  const ids = ['wolf_bloodmoon', 'jack', 'demon_devourer', 'hex', 'demon_queen', 'wolf_hunter'];
  const vals = [6, 6, 2, 1, 5, 5];
  run.dice.forEach((d, i) => { d.dieId = ids[i]; d.value = vals[i]; d.scored = false; });
  run.phase = 'selecting'; run.throwNumber = 1; run.selected = [];
  H.app.busy = false; H.render();
})()`);
await sleep(550);
await shotClip('tray-specials', '.dice-zone', 18, 1.9);
for (const [name, index] of [['zoom-epic', 1], ['zoom-legendary', 2], ['zoom-demon', 4]]) {
  await shotClip(name, `.dice-tray .die:nth-child(${index + 1})`, 10, 3.4);
}

// Turn one cube around to confirm the carving exists on every face.
await js(`document.querySelectorAll('.die-cube')[2].style.transform = 'rotateX(-16deg) rotateY(198deg)';`); await sleep(500);
await shotClip('tray-back-face', '.dice-zone', 18, 1.9);
await js(`document.querySelectorAll('.die-cube')[2].style.transform = '';`);

// Compendium gallery shows every die's flat icon with the new materials.
// Unlock all 20 entries first so the whole skin sheet is visible.
await js(`(() => {
  const H = window.HeavensDice;
  H.app.discovered.dice = ['wolf_whelp','wolf_hunter','wolf_bloodmoon','wolf_alpha','wolf_ancestor','demon_imp','demon_taxman','demon_seal','demon_queen','demon_devourer','odd_eye','even_twin','polar','ladder','mirror','five_fold','hex','echo','ace','jack'];
})()`);
await sleep(200);
await js(`window.HeavensDice.openCompendium()`); await sleep(450);
await js(`document.querySelector('[data-action="switch-compendium-tab"][data-tab="dice"]')?.click()`); await sleep(450);
await shot('compendium-dice');
await shotClip('compendium-legendary-row', '.compendium-grid', 14, 1.5);
await js(`document.querySelector('[data-action="close-overlay"]')?.click()`); await sleep(350);

// Force a shop stock of premium dice to inspect the flat card icons.
await js(`(() => {
  const H = window.HeavensDice; const run = H.run;
  run.score = run.target; run.phase = 'won';
  run.levelReward = { base: 45, bonuses: [], total: 45 }; run.coins = 180;
  H.victory();
})()`); await sleep(400);
await js(`document.querySelector('[data-action="go-shop"]').click()`); await sleep(600);
await js(`(() => {
  const H = window.HeavensDice; const run = H.run;
  run.shop.dice = [
    { id: 'serpent_devourer', price: 70, sold: false },
    { id: 'crown_queen', price: 70, sold: false },
  ];
  run.shop.barrel = [{ id: 'vortex', price: 60, sold: false }];
  H.shop();
})()`); await sleep(700);
await shot('shop-premium');

console.log('dice-preview captures written');
ws.close(); edge.kill();
