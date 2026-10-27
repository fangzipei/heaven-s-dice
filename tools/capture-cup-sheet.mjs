/* Render every dice cup into a contact sheet so the redraws can be eyeballed. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir, readFile } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9342;
const OUT = `${ROOT}\\docs\\screenshots\\cup-preview`;
await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile9`, { recursive: true });

const kinds = ['oak', 'lead', 'serpent', 'astral', 'wolf-totem', 'raven-totem', 'pentagram', 'vortex'];
const names = { oak: '旧橡木桶', lead: '铅心桶', serpent: '蛇纹桶', astral: '星象桶', 'wolf-totem': '狼图腾桶', 'raven-totem': '鸦羽桶', pentagram: '五芒桶', vortex: '旋涡桶' };
const svgs = await Promise.all(kinds.map(async (k) => readFile(`${ROOT}\\assets\\cups\\${k}.svg`, 'utf8')));
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; background: radial-gradient(ellipse at 50% 30%, #2a1d12, #0a0705 70%); font-family: system-ui, sans-serif; }
  h2 { color:#c9a76a; font-weight:400; letter-spacing:.2em; font-size:13px; text-align:center; margin:18px 0 4px; }
  .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:6px; padding:14px 22px 10px; }
  figure { margin:0; display:flex; flex-direction:column; align-items:center; }
  figure img { width:82%; image-rendering:auto; }
  figcaption { color:#8d7a5c; font-size:10px; margin-top:2px; letter-spacing:.08em; }
  .strip { display:flex; justify-content:center; gap:22px; padding:10px 0 26px; }
  .strip img { width:70px; }
  .bigrow { display:flex; justify-content:center; gap:40px; padding:0 0 24px; }
  .bigrow figure { width:190px; }
  .bigrow img { width:100%; }
</style></head><body>
  <h2>DICE CUPS · RESTING POSE</h2>
  <div class="grid">${kinds.map((k) => `<figure><img src="../assets/cups/${k}.svg" alt=""><figcaption>${names[k]}</figcaption></figure>`).join('')}</div>
  <h2>DETAIL</h2>
  <div class="bigrow">${[0, 4, 7].map((i) => `<figure><img src="../assets/cups/${kinds[i]}.svg" alt=""><figcaption>${names[kinds[i]]}</figcaption></figure>`).join('')}</div>
  <h2>SHOP ICON SIZE (58px)</h2>
  <div class="strip">${kinds.map((k) => `<figure><img src="../assets/cups/${k}.svg" alt=""><figcaption>${names[k]}</figcaption></figure>`).join('')}</div>
</body></html>`;
await writeFile(`${ROOT}\\tools\\cup-sheet.html`, page, 'utf8');

const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile9`, '--window-size=1400,1200', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch {} await sleep(250); } throw new Error('No CDP'); }
const pageInfo = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(pageInfo.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: `file:///${ROOT.replace(/\\/g, '/')}/tools/cup-sheet.html` }); await sleep(900);
const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await writeFile(`${OUT}\\cup-sheet.png`, Buffer.from(r.data, 'base64'));
console.log('cup sheet written');
ws.close(); edge.kill();
