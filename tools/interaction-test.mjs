/* Verifies manual cup shake, circle gesture, rail toggle and overflow. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9337;
const OUT = `${ROOT}\\tools`;
await mkdir(`${ROOT}\\tools\\edge-profile5`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile5`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1100);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64')); };
const state = () => js(`(() => {const r=window.HeavensDice.run;return {phase:r.phase,throwNumber:r.throwNumber,rerolls:r.rerolls,values:r.dice.map(d=>d.value),vortexUsed:r.flags.vortexUsed,starBonus:r.flags.starBonus,overlay:!!document.querySelector('.overlay')}})()`);

const report = {};
await js(`window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));`);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);

// Manual cup shake: horizontal drag only.
const cup = await js(`document.querySelector('#cup').getBoundingClientRect().toJSON()`);
const cx = cup.x + cup.width / 2;
const cy = cup.y + cup.height / 2;
report.cupHit = await js(`(() => {
  const el = document.elementFromPoint(${cx}, ${cy});
  window.__cupEvents = [];
  const cup = document.querySelector('#cup');
  ['pointerdown','pointermove','pointerup','mousedown','mouseup','gotpointercapture','lostpointercapture'].forEach(t => cup.addEventListener(t, e => window.__cupEvents.push(t + ':' + (e.pointerId ?? '-') + ':' + Math.round(e.clientX)), true));
  return { tag: el?.tagName, id: el?.id, cls: el?.className, rect: cup.getBoundingClientRect().toJSON() };
})()`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
for (let i = 0; i <= 24; i += 1) {
  const x = cx + Math.sin(i * 0.7) * 78;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: cy, button: 'none', buttons: 1 });
  await sleep(10);
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 40, y: cy, button: 'left', buttons: 0, clickCount: 1 });
await sleep(2600);
report.cupEvents = await js(`window.__cupEvents`);
report.afterCupShake = await state();
await shot('22-cup-shake');

// Circle gesture.
await js(`(() => { const r=window.HeavensDice.run; r.barrelId='vortex'; window.HeavensDice.setLevel(2); window.HeavensDice.render(); })()`);
await sleep(400);
await js(`document.querySelector('[data-action="open-gesture"]').click()`); await sleep(500);
const board = await js(`document.querySelector('#gesture-board').getBoundingClientRect().toJSON()`);
const bx = board.x + board.width / 2;
const by = board.y + board.height / 2;
const radius = board.width * .34;
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bx + radius, y: by, button: 'left', buttons: 1, clickCount: 1 });
for (let i = 1; i <= 72; i += 1) {
  const angle = (Math.PI * 2 * i) / 72;
  const x = bx + Math.cos(angle) * radius;
  const y = by + Math.sin(angle) * radius;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 1 });
  await sleep(8);
}
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bx + radius, y: by, button: 'left', buttons: 0, clickCount: 1 });
await sleep(1300);
report.afterCircle = await state();
report.circleOverlay = await js(`!!document.querySelector('.gesture-modal')`);
await shot('23-circle-result');

// Responsive rail toggle and horizontal overflow.
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 700, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(900);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(350);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(400);
const beforeToggle = await js(`(() => ({scrollWidth:document.documentElement.scrollWidth,innerWidth,transform:getComputedStyle(document.querySelector('.rail')).transform}))()`);
await js(`document.querySelector('[data-action="toggle-rail"]').click()`); await sleep(450);
const afterToggle = await js(`(() => ({scrollWidth:document.documentElement.scrollWidth,innerWidth,transform:getComputedStyle(document.querySelector('.rail')).transform,railVisible:document.querySelector('.rail').classList.contains('is-open')}))()`);
report.responsive = { beforeToggle, afterToggle };
await shot('24-tablet-rail');

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(900);
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(350);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(400);
const mobile = await js(`(() => { const tray=document.querySelector('.dice-tray').getBoundingClientRect(); const cup=document.querySelector('#cup').getBoundingClientRect(); return {innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,tray:tray.toJSON(),cup:cup.toJSON(),overlap:!(cup.right<tray.left||cup.left>tray.right||cup.bottom<tray.top||cup.top>tray.bottom)}; })()`);
report.mobile = mobile;
await shot('25-mobile-fixed');
report.console = await js(`window.__errors`);
report.cdpErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || e.params.entry?.text || e.params.args?.map(a => a.value ?? a.description).join(' '));
console.log(JSON.stringify(report, null, 2));
ws.close(); edge.kill();

