/* Probe what the game looks like right after navigation, to debug the capture flow. */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";
const PORT = 9346;

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-bg2`,
  '--window-size=1600,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(p) {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${p}`); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('no CDP endpoint');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return `ERR: ${r.exceptionDetails.exception?.description}`; return r.result.value; };

await send('Page.navigate', { url: 'http://localhost:5199/' });
await sleep(4000);
console.log('url        :', await js('location.href'));
console.log('title      :', await js('document.title'));
console.log('bridge     :', await js('typeof window.HeavensDice'));
console.log('start screen:', await js('!!document.getElementById("start-screen")'));
console.log('start-run  :', await js('!!document.querySelector(\'[data-action="start-run"]\')'));
console.log('game hidden:', await js('document.getElementById("game-screen")?.hidden'));
console.log('room-back  :', await js('!!document.getElementById("room-back")'));
console.log('errors     :', await js('window.__errs ? window.__errs.join(" | ") : "none"'));
await js(`document.querySelector('[data-action="start-run"]')?.click()`);
await sleep(1500);
console.log('after click -> game hidden:', await js('document.getElementById("game-screen")?.hidden'));
console.log('overlay    :', await js('document.getElementById("overlay-root")?.innerHTML?.slice(0,120)'));
console.log('run        :', await js('window.HeavensDice?.run ? JSON.stringify({level:window.HeavensDice.run.level, phase:window.HeavensDice.run.phase}) : "null"'));
const room = await js(`(() => {
  const el = document.getElementById('room-back');
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return JSON.stringify({ size: cs.backgroundSize, pos: cs.backgroundPosition, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } });
})()`);
console.log('room-back  :', room);
console.log('rail hidden:', await js('getComputedStyle(document.querySelector(".rail")).display'));
console.log('body class :', await js('document.body.className'));
ws.close(); edge.kill();
