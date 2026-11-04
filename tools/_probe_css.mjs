/* Probe which CSS rule actually wins for the room art on a given viewport.
 *
 *   node tools/_probe_css.mjs --width 390 --height 844 --mobile --level 8
 */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";
const PORT = 9349;

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const W = Number(argOf('width', '1600'));
const H = Number(argOf('height', '900'));
const MOBILE = args.includes('--mobile');
const LEVEL = Number(argOf('level', '0'));
const URL_BASE = argOf('url', 'http://localhost:5199/');

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-probe`,
  `--window-size=${W},${H}`, 'about:blank',
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
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
const js = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) return `ERR ${r.exceptionDetails.exception?.description}`; return r.result.value; };

await send('Page.navigate', { url: URL_BASE });
for (let i = 0; i < 40; i += 1) {
  await sleep(500);
  if (await js(`document.body ? document.title : ''`)) break;
}
await sleep(1500);
await js(`document.querySelector('[data-action="start-run"]')?.click()`);
await sleep(700);
await js(`document.querySelector('[data-action="start-direct"]')?.click()`);
await sleep(600);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(900);
if (LEVEL) { await js(`window.HeavensDice && window.HeavensDice.setLevel(${LEVEL})`); await sleep(1200); }

const measure = async (tag) => {
  const d = await js(`(() => {
  const scene = document.querySelector('#scene');
  const back = document.querySelector('.room-wall.back');
  const cs = getComputedStyle(back);
  return JSON.stringify({
    tag: ${JSON.stringify(tag)},
    size: cs.backgroundSize, pos: cs.backgroundPosition,
    art: scene ? scene.dataset.art : null,
    matchCount: document.querySelectorAll('.scene[data-art^="hall-"] .room-wall.back').length,
  });
})()`);
  console.log(d);
};

await measure('before-mock');
await js(`(() => {
  const s = document.createElement('style');
  s.id = 'mock-plate';
  s.textContent = '.room-wall.back{background-image:url("/assets/paper/tables/hall-stone.webp") !important;}';
  document.head.appendChild(s);
  return true;
})()`);
await sleep(400);
await measure('after-mock');

const out = await js(`(() => {
  const scene = document.querySelector('#scene');
  const back = document.querySelector('.room-wall.back');
  const res = {
    viewport: { w: innerWidth, h: innerHeight, mq760: matchMedia('(max-width: 760px)').matches, mq1050: matchMedia('(max-width: 1050px)').matches },
    sceneDataset: { ...scene.dataset },
    computed: (() => { const cs = getComputedStyle(back); return { size: cs.backgroundSize, pos: cs.backgroundPosition, image: cs.backgroundImage.slice(0, 90) }; })(),
    rect: (() => { const r = back.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
    matchCount: document.querySelectorAll('.scene[data-art^="hall-"] .room-wall.back').length,
    sheetCount: document.styleSheets.length,
    opp: (() => {
      const w = document.querySelector('.opponent-image-wrap');
      const i = document.querySelector('.opponent-image-wrap img');
      const o = document.querySelector('.opponent');
      const g = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height),
          cw: cs.width, ch: cs.height, pad: cs.padding, ar: cs.aspectRatio,
          of: cs.objectFit, op: cs.objectPosition, disp: cs.display, ov: cs.overflow,
          tr: cs.transform, zoom: cs.zoom, nat: el.naturalWidth + 'x' + el.naturalHeight }; };
      return { opponent: g(o), wrap: g(w), img: g(i) };
    })(),
    sheets: [],
  };
  for (const sheet of document.styleSheets) {
    const href = sheet.href || '(inline)';
    if (!/room-art/.test(String(href))) continue;
    let rules; try { rules = sheet.cssRules; } catch { res.sheets.push({ href, blocked: true }); continue; }
    for (const rule of rules) res.sheets.push({ href: String(href).split('/').pop(), rule: (rule.cssText || '').slice(0, 400) });
  }
  return JSON.stringify(res, null, 1);
})()`);
console.log(out);
ws.close(); edge.kill();
