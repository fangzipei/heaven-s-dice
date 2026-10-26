/* Interaction audit: items, shop purchase/replacement, gesture drawing, tables. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9335;
const BASE = 'http://127.0.0.1:4173/';
const OUT = `${ROOT}\\tools`;

await mkdir(`${ROOT}\\tools\\edge-profile3`, { recursive: true });
const edge = spawn(EDGE, [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile3`, '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 60; i += 1) {
    try { const res = await fetch(`http://127.0.0.1:${PORT}${path}`); if (res.ok) return await res.json(); } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('CDP not available');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result); }
  else events.push(msg);
});
function send(method, params = {}) { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Page.navigate', { url: BASE }); await sleep(1300);
async function js(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function shot(name) { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${OUT}\\${name}.png`, Buffer.from(result.data, 'base64')); }
async function state() { return js(`(() => { const r=window.HeavensDice.run; return r ? {level:r.level,phase:r.phase,score:r.score,target:r.target,rerolls:r.rerolls,coins:r.coins,bag:r.bag.map(b=>b.dieId),barrel:r.barrelId,active:r.activeItems,passive:r.passiveItems,phaseFlags:{...r.flags},overlay:!!document.querySelector('.overlay'),shop:!!document.querySelector('.shop-screen'),bossBoons:r.bossBoons} : {} })()`); }

await js(`window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));`);
await js(`document.querySelector('[data-action="start-run"]').click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(400);
const report = {};

// Starting lucky coin.
report.itemBefore = await state();
await js(`document.querySelector('[data-action="use-item"][data-item-id="lucky_coin"]').click()`);
await sleep(500);
report.itemAfter = await state();
await shot('11-item-used');

// Force win, go to shop with money.
await js(`(() => { const r=window.HeavensDice.run; r.score=r.target; r.phase='won'; r.levelReward={base:45,bonuses:[],total:45}; r.coins=500; window.HeavensDice.victory(); })()`);
await sleep(400);
await js(`document.querySelector('[data-action="go-shop"]').click()`); await sleep(500);
report.shopBefore = await state();
await shot('12-shop-rich');

// Buy first available die, handle replacement modal if full.
const dieBought = await js(`(() => {
  const btn=document.querySelector('[data-action="buy-die"]:not([disabled])');
  if(!btn) return false; btn.click(); return true;
})()`);
await sleep(400);
report.replacementOpen = await js(`!!document.querySelector('.replace-grid')`);
if (report.replacementOpen) {
  await js(`document.querySelector('[data-action="confirm-replace"]').click()`);
  await sleep(500);
}
report.afterDieBuy = await state();
await shot('13-shop-after-buy');

// Buy first available item and barrel.
await js(`document.querySelector('[data-action="buy-item"]:not([disabled])')?.click()`); await sleep(300);
await js(`document.querySelector('[data-action="buy-barrel"]:not([disabled])')?.click()`); await sleep(400);
report.afterPurchases = await state();
report.shopCoins = await js(`document.querySelector('.shop-coin')?.textContent.trim()`);

await js(`document.querySelector('[data-action="leave-shop"]').click()`); await sleep(500);
report.nextLevelIntro = await state();
await shot('14-level2-intro');
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(400);
report.level2 = await state();
await shot('15-level2');

// Pentagram UI drawing.
await js(`(() => { const r=window.HeavensDice.run; r.barrelId='pentagram'; window.HeavensDice.setLevel(3); window.HeavensDice.render(); })()`);
await sleep(400);
await js(`document.querySelector('[data-action="open-gesture"]').click()`); await sleep(500);
const nodeRects = await js(`Array.from(document.querySelectorAll('.gesture-node')).map(n=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})`)
  .catch(() => []);
report.gestureNodes = nodeRects.length;
if (nodeRects.length === 5) {
  // geometric node index 0,2,4,1,3,0 = star path.
  const order = [0, 2, 4, 1, 3, 0];
  const first = nodeRects[order[0]];
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: first.x, y: first.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i < order.length; i += 1) {
    const to = nodeRects[order[i]];
    const from = nodeRects[order[i - 1]];
    for (let step = 1; step <= 12; step += 1) {
      const x = from.x + (to.x - from.x) * step / 12;
      const y = from.y + (to.y - from.y) * step / 12;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 1 });
      await sleep(8);
    }
  }
  const last = nodeRects[order[order.length - 1]];
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: last.x, y: last.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(1200);
}
report.afterGesture = await state();
report.gestureOverlay = await js(`!!document.querySelector('.gesture-modal')`);
await shot('16-after-gesture');

// Roll and capture star bonus.
await js(`document.querySelector('[data-action="auto-roll"]')?.click()`);
await sleep(950);
report.afterGestureRoll = await state();

// Table gallery.
for (const [level, name] of [[4, 'stone'], [7, 'iron'], [10, 'gold'], [13, 'diamond']]) {
  await js(`(() => { window.HeavensDice.setLevel(${level}); window.HeavensDice.render(); })()`);
  await sleep(350);
  await shot(`table-${name}`);
}

// Round-trip rules and compendium.
await js(`window.HeavensDice.openRules()`); await sleep(300);
report.rulesOpen = await js(`!!document.querySelector('.rules-modal')`);
await shot('17-rules');
await js(`document.querySelector('.modal-close')?.click()`); await sleep(300);
await js(`document.querySelector('[data-action="open-compendium"]')?.click()`); await sleep(400);
report.compendiumOpen = await js(`!!document.querySelector('.compendium-modal')`);
await shot('18-compendium');
await js(`document.querySelector('.modal-close')?.click()`); await sleep(300);

report.console = await js(`window.__errors`);
report.cdpErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => ({
  method: e.method,
  text: e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || e.params.entry?.text || e.params.args?.map(a => a.value ?? a.description).join(' '),
}));
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();
