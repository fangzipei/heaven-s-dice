import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9363;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools');
const DOCS = join(ROOT, 'docs', 'screenshots');
await mkdir(join(OUT, 'edge-profile-tooltip'), { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, 'edge-profile-tooltip')}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(3500);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) { const r = await send('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(r.data, 'base64'); await writeFile(join(OUT, `${name}.png`), b); if (docsName) await writeFile(join(DOCS, docsName), b); }
async function hover(selector) {
  const found = await js(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const r=el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,pointerId:1})); return {tag:el.tagName,cls:el.className,attr:el.getAttribute('data-die-tip')||el.getAttribute('data-item-tip')||el.getAttribute('data-barrel-tip')}; })()`);
  await sleep(100);
  const tip = await js(`({visible:!document.querySelector('#tooltip').hidden,title:document.querySelector('#tooltip h5')?.textContent||'',sub:document.querySelector('#tooltip .tip-sub')?.textContent||''})`);
  return { found, ...tip };
}
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(600);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(450);
const report = {};
report.die = await hover('[data-die-tip]');
report.item = await hover('.item-slot[data-item-tip]');
report.cup = await hover('#cup[data-barrel-tip]');
report.barrelThumb = await hover('#barrel-thumb[data-barrel-tip]');
await shot('tooltip-die', '38-tooltip-details.png');

await js(`(() => { const r=window.HeavensDice.run; r.phase='shop'; r.shop=window.HeavensDice.Engine.createShop(r); window.HeavensDice.shop(); })()`); await sleep(450);
report.shopDie = await hover('.shop-card[data-die-tip]');
report.shopBarrel = await hover('.shop-card[data-barrel-tip]');
report.shopItem = await hover('.shop-card[data-item-tip]');
report.sellItem = await hover('.sell-card[data-item-tip]');
await js(`document.querySelector('.shop-screen')?.remove(); window.HeavensDice.app.shopOpen=false; window.HeavensDice.openCompendium('items')`); await sleep(350);
report.codexItem = await hover('.compendium-card[data-item-tip]');
await js(`window.HeavensDice.openCompendium('barrels')`); await sleep(250);
report.codexBarrel = await hover('.compendium-card[data-barrel-tip]');
await js(`(() => { const d=window.HeavensDice.app.discovered.dice; if(!d.includes('wolf_whelp')) d.push('wolf_whelp'); })()`);
await js(`window.HeavensDice.openCompendium('dice')`); await sleep(250);
report.codexDie = await hover('.compendium-card[data-die-tip]');
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
const checks = Object.fromEntries(Object.entries(report).map(([key, value]) => [key, Boolean(value.found && value.visible && value.title)]));
console.log(JSON.stringify({ checks, report, errors }, null, 2));
ws.close(); edge.kill();
