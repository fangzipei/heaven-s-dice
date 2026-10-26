import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9358;
const ROOT = `D:\\vs_workspace\\Heaven's Dice`;
const OUT = `${ROOT}\\tools`;
const DOCS = `${ROOT}\\docs\\screenshots`;
await mkdir(`${OUT}\\edge-profile-sell`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-sell`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
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
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(350);
const before = await js(`(() => {
  const r=window.HeavensDice.run;
  r.activeItems=['lucky_coin','glove']; r.passiveItems=['gold_cuff'];
  r.itemCharges={lucky_coin:1,glove:1};
  r.coins=40;
  window.HeavensDice.Engine.createShop(r);
  window.HeavensDice.shop();
  return {coins:r.coins,active:r.activeItems,passive:r.passiveItems};
})()`);
await sleep(500);
const shelf = await js(`({cards:document.querySelectorAll('.sell-card').length,labels:[...document.querySelectorAll('.sell-card')].map(c=>c.innerText.replace(/\\n/g,' | ')),price:document.querySelector('.sell-button')?.textContent.trim()})`);
await shot('shop-sell', '32-shop-sell.png');
const result = await js(`(() => {
  const r=window.HeavensDice.run;
  const button=document.querySelector('.sell-card .sell-button');
  const itemId=button?.dataset.itemId;
  const beforeCoins=r.coins;
  button?.click();
  return {itemId,beforeCoins,afterCoins:r.coins,active:r.activeItems,passive:r.passiveItems};
})()`);
await sleep(350);
const after = await js(`({cards:document.querySelectorAll('.sell-card').length,toast:document.querySelector('.toast')?.textContent,coins:window.HeavensDice.run.coins})`);
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ before, shelf, result, after, errors }, null, 2));
ws.close(); edge.kill();
