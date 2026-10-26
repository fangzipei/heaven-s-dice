import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9359;
const ROOT = `D:\\vs_workspace\\Heaven's Dice`;
const OUT = `${ROOT}\\tools`;
const DOCS = `${ROOT}\\docs\\screenshots`;
await mkdir(`${OUT}\\edge-profile-trace`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-trace`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(3500);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
async function shot(name, docsName = null) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const b = Buffer.from(r.data, 'base64');
  await writeFile(`${OUT}\\${name}.png`, b);
  if (docsName) await writeFile(`${DOCS}\\${docsName}`, b);
}
function move(x, y, buttons = 1) {
  return send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: buttons ? 'left' : 'none', buttons });
}
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(700);
const startedDebug = await js(`({hasGame:!!window.HeavensDice,run:!!window.HeavensDice?.run,prompt:!!document.querySelector('.start-choice-modal'),intro:!!document.querySelector('.intro-modal')})`);
if (!startedDebug.run) {
  const pageErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
  throw new Error(`Start failed: ${JSON.stringify(startedDebug)} ${JSON.stringify(pageErrors)}`);
}
await js(`document.querySelector('[data-action="close-intro"]')?.click()`); await sleep(400);
await js(`(() => { const r=window.HeavensDice.run; r.barrelId='pentagram'; r.phase='ready'; window.HeavensDice.setLevel(2); window.HeavensDice.run.barrelId='pentagram'; window.HeavensDice.render(); })()`); await sleep(450);
const cup = await js(`document.querySelector('#cup').getBoundingClientRect().toJSON()`);
const cx = cup.x + cup.width / 2, cy = cup.y + cup.height / 2;
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 });
await move(cx, cy - 12); await sleep(180);
const traceInfo = await js(`(() => { const t=window.HeavensDice.app.cupTrace; return t?{gesture:t.gesture,countdown:document.querySelector('#cup-countdown')?.textContent,guide:t.guide}:null; })()`);
if (!traceInfo) throw new Error('Cup trace did not start');
const guide = traceInfo.guide;
await js(`(() => {
  const t=window.HeavensDice.app.cupTrace; const pid=window.HeavensDice.app.cupPointerId;
  const g=t.guide;
  for (let s=1;s<g.length;s+=1) {
    const a=g[s-1], b=g[s];
    for (let i=1;i<=20;i+=1) {
      const e=new PointerEvent('pointermove',{pointerId:pid,clientX:a.x+(b.x-a.x)*i/20,clientY:a.y+(b.y-a.y)*i/20,buttons:1,bubbles:true});
      window.dispatchEvent(e);
    }
  }
})()`);
await sleep(80);
await shot('cup-trace', '34-cup-trace.png');
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: guide[guide.length - 1].x, y: guide[guide.length - 1].y, button: 'left', buttons: 0, clickCount: 1 });
await sleep(1300);
const result = await js(`({starUsed:window.HeavensDice.run.flags.starUsed,starBonus:window.HeavensDice.run.flags.starBonus,phase:window.HeavensDice.run.phase,throwNumber:window.HeavensDice.run.throwNumber,trace:!!document.querySelector('#cup-trace'),countdown:!!document.querySelector('#cup-countdown'),traceDebug:window.HeavensDice.app.lastTraceResult,toast:document.querySelector('.toast')?.textContent})`);
// Circle variant: clockwise vortex trace.
await js(`(() => { const r=window.HeavensDice.run; window.HeavensDice.setLevel(2); window.HeavensDice.run.barrelId='vortex'; window.HeavensDice.render(); })()`); await sleep(450);
const cup2 = await js(`document.querySelector('#cup').getBoundingClientRect().toJSON()`);
const cx2 = cup2.x + cup2.width / 2, cy2 = cup2.y + cup2.height / 2;
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx2, y: cy2, button: 'left', buttons: 1, clickCount: 1 });
await move(cx2, cy2 - 12); await sleep(180);
const circleInfo = await js(`(() => { const t=window.HeavensDice.app.cupTrace; return t?{gesture:t.gesture,guide:t.guide}:null; })()`);
if (circleInfo) {
  await js(`(() => {
    const t=window.HeavensDice.app.cupTrace; const pid=window.HeavensDice.app.cupPointerId;
    for (const p of t.guide) window.dispatchEvent(new PointerEvent('pointermove',{pointerId:pid,clientX:p.x,clientY:p.y,buttons:1,bubbles:true}));
  })()`);
  await sleep(80);
  await shot('cup-circle', '35-cup-circle.png');
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: circleInfo.guide[circleInfo.guide.length - 1].x, y: circleInfo.guide[circleInfo.guide.length - 1].y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(1300);
}
const circle = await js(`({vortexUsed:window.HeavensDice.run.flags.vortexUsed,phase:window.HeavensDice.run.phase,throwNumber:window.HeavensDice.run.throwNumber,toast:document.querySelector('.toast')?.textContent})`);
const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map((e) => e.params.exceptionDetails?.exception?.description || e.params.entry?.text);
console.log(JSON.stringify({ traceInfo: { gesture: traceInfo.gesture, countdown: traceInfo.countdown, guide: guide.length }, result, circleInfo: circleInfo ? { gesture: circleInfo.gesture, guide: circleInfo.guide.length } : null, circle, errors }, null, 2));
ws.close(); edge.kill();
