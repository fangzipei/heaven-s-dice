import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9354;
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const OUT = `${ROOT}\\tools`;
await mkdir(`${OUT}\\edge-profile-mobile`, { recursive: true });
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}\\edge-profile-mobile`, '--window-size=430,932', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown' || m.method === 'Log.entryAdded') events.push(m); });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const targetUrl = process.env.BASE_URL || 'http://127.0.0.1:4173/';
await send('Page.navigate', { url: targetUrl }); await sleep(1400);
const js = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const shot = async (name, docsName = null) => { const r = await send('Page.captureScreenshot', { format: 'png' }); const b=Buffer.from(r.data,'base64'); await writeFile(`${OUT}\\${name}.png`, b); if(docsName) await writeFile(`${ROOT}\\docs\\screenshots\\${docsName}`, b); };
await js(`document.querySelector('[data-action="start-run"]').click(); document.querySelector('[data-action="start-direct"]')?.click()`); await sleep(400);
await js(`document.querySelector('[data-action="close-intro"]').click()`); await sleep(500);
await js(`(() => {
  const run = window.HeavensDice.run;
  const vals=[5,1,1,6,3,2];
  run.phase='selecting'; run.throwNumber=1; run.stats.levelRolls=1; run.rerolls=5;
  run.dice.forEach((d,i)=>{ d.value=vals[i]; d.scored=false; });
  run.selected=[run.dice[0].uid,run.dice[1].uid,run.dice[2].uid];
  const app=window.HeavensDice.app; app.busy=false; app.rolling=false; app.cupAnimating=false;
  window.HeavensDice.render();
})()`);
await sleep(500);
const report = await js(`(() => {
  const dock=document.querySelector('.action-dock'); const buttons=[...document.querySelectorAll('.action-dock [data-action]')];
  const d=dock?.getBoundingClientRect();
  return {
    innerWidth, innerHeight, visualHeight: visualViewport?.height, scrollY,
    dock: d?.toJSON(), dockDisplay: dock?getComputedStyle(dock).display:null,
    dockBottomGap: d?innerHeight-d.bottom:null,
    buttonCount: buttons.length,
    buttons: buttons.map(b=>({action:b.dataset.action,text:b.innerText.replace(/\\n/g,' | '),rect:b.getBoundingClientRect().toJSON(),display:getComputedStyle(b).display,visibility:getComputedStyle(b).visibility,opacity:getComputedStyle(b).opacity})),
    hit: d?document.elementFromPoint(d.left+d.width/2,d.top+d.height/2)?.className:null,
    scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    scene: document.querySelector('#scene')?.getBoundingClientRect().toJSON()
  };
})()`);
await shot('mobile-selecting', '18-mobile-actions.png');
await js(`document.querySelectorAll('#dice-tray .die')[0]?.click()`); await sleep(200);
const afterToggle = await js(`({selected:window.HeavensDice.run.selected.length,buttons:[...document.querySelectorAll('.action-dock [data-action]')].map(b=>b.dataset.action)})`);
console.log(JSON.stringify({ report, afterToggle, errors: events.map(e=>e.params.exceptionDetails?.exception?.description||e.params.entry?.text) }, null, 2));
ws.close(); edge.kill();
