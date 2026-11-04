/* Act 1 background mockups: plate / +UI / +enemy / +dice.
 *
 * Drives the real game through the window.HeavensDice debug bridge so the
 * mockups use the shipped paper theme instead of a hand-rolled mock UI.
 *
 *   node tools/_shoot_bg.mjs --plate /vibe_images/act1/act1_plate.png
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = "D:\\vs_workspace\\Heaven's Dice";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
// A fresh debugging port per run keeps a leftover headless Edge from stealing
// the session: two launches sharing a profile hand off to the same browser.
const PORT = Number(argOf('port', '9345'));
const URL_BASE = argOf('url', 'http://localhost:5199/');
const PLATE = argOf('plate', '/vibe_images/act1/act1_plate.png');
const OUT = path.resolve(ROOT, argOf('out', 'vibe_images/act1'));
const PREFIX = argOf('prefix', 'act1');
const DICE_SHIFT = Number(argOf('dice-shift', '0'));
// Mobile shows the room art with `cover`, which exposes the whole plate and
// drops the table edge far below the dealer. A band crop puts the edge right
// under the dealer's name tag instead.
const MOBILE_BG = argOf('mobile-bg', '');
// Extra CSS injected into the page (used to try layout variants).
const EXTRA_CSS = argOf('extra-css', '');
// Which level to park the table on (1-25; five levels per table).
const LEVEL = Number(argOf('level', '1'));

const W = Number(argOf('width', '1600'));
const H = Number(argOf('height', '900'));
const MOBILE = args.includes('--mobile');

await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile-bg`, { recursive: true });

const edge = spawn(EDGE, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${ROOT}\\tools\\edge-profile-bg`,
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
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  }
});
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE, screenWidth: W, screenHeight: H });
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
  console.log(`shot ${name}`);
};

await send('Page.navigate', { url: URL_BASE });
await sleep(2600);
// Start from a clean slate: a saved checkpoint would show the resume screen
// instead of the new-run button and the mockups would not match.
await js(`try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* ignore */ }`);
await send('Page.reload');
await sleep(2600);

// Boot the app: wait for the debug bridge and the new-run button, then start a
// run and wait until it actually exists. The app boots its modules lazily, so
// clicking too early silently does nothing.
const hasRun = async () => js(`!!(window.HeavensDice && window.HeavensDice.run)`);
const startRun = async () => {
  for (let i = 0; i < 60; i += 1) {
    await sleep(400);
    if (await js(`!!(window.HeavensDice && document.querySelector('[data-action="start-run"]'))`)) break;
  }
  await js(`document.querySelector('[data-action="start-run"]')?.click()`);
  await sleep(1200);
  await js(`document.querySelector('[data-action="start-direct"]')?.click()`);
  for (let i = 0; i < 40; i += 1) {
    await sleep(400);
    if (await hasRun()) return true;
  }
  return false;
};

if (!await startRun()) {
  // Second attempt: the first click can land before the button is wired up.
  await sleep(1500);
  if (!await startRun()) throw new Error('the run never started');
}
await sleep(700);
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(900);

if (LEVEL !== 1) {
  await js(`window.HeavensDice.setLevel(${LEVEL}); window.HeavensDice.render();`);
  await sleep(900);
  await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
  await sleep(700);
}

// Swap in the mock plate.
await js(`(() => {
  const s = document.createElement('style');
  s.id = 'mock-plate';
  s.textContent = '.room-wall.back{background-image:url("${PLATE}") !important;}';
  document.head.appendChild(s);
  return getComputedStyle(document.getElementById('room-back')).backgroundImage;
})()`);
await sleep(400);

const roomInfo = await js(`(() => {
  const el = document.getElementById('room-back');
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const scene = document.querySelector('#scene');
  return JSON.stringify({
    size: cs.backgroundSize, pos: cs.backgroundPosition,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    art: scene ? scene.dataset.art : null,
    mq760: matchMedia('(max-width: 760px)').matches,
    inner: { w: innerWidth, h: innerHeight },
    sheets: [...document.styleSheets].map((s) => String(s.href || '').split('/').pop()).filter((n) => /room-art|readability/.test(n)),
  });
})()`);
console.log('room-back  :', roomInfo);

if (MOBILE_BG) {
  await js(`(() => {
    const s = document.createElement('style');
    s.id = 'mock-mobile-bg';
    s.textContent = '.room-wall.back{background-size:${MOBILE_BG} !important;background-position:50% 97% !important;}';
    document.head.appendChild(s);
    return getComputedStyle(document.getElementById('room-back')).backgroundSize;
  })()`);
  await sleep(400);
}

if (EXTRA_CSS) {
  await js(`(() => {
    const s = document.createElement('style');
    s.id = 'mock-extra';
    s.textContent = ${JSON.stringify(EXTRA_CSS)};
    document.head.appendChild(s);
    return true;
  })()`);
  await sleep(400);
}

const CSS = {
  chrome: '',
  noEnemy: '.opponent{display:none !important}',
  noDice: '.dice-zone{display:none !important}.cup-zone{display:none !important}',
  noRail: '.rail{display:none !important}',
  noTop: '.topbar{visibility:hidden !important}',
  noPanel: '.score-panel{display:none !important}',
  noDock: '.action-dock{display:none !important}',
  noChapter: '.chapter-tag{display:none !important}',
};

const apply = async (rules) => {
  await js(`(() => {
    let s = document.getElementById('mock-hide');
    if (!s) { s = document.createElement('style'); s.id = 'mock-hide'; document.head.appendChild(s); }
    s.textContent = ${JSON.stringify(rules.join('\n'))};
    return true;
  })()`);
  await sleep(320);
};

// Deterministic dice so the tray reads the same every run.
await js(`(() => {
  const run = window.HeavensDice.run;
  const vals = [5,1,1,6,3,2];
  run.dice.forEach((d,i)=>{ d.value=vals[i]; d.scored=false; });
  run.phase='selecting'; run.throwNumber=1; run.stats.levelRolls=1;
  run.score=300; run.roundScore=80;
  run.selected=[run.dice[0].uid,run.dice[1].uid,run.dice[2].uid];
  window.HeavensDice.app.busy=false;
  window.HeavensDice.render();
  return true;
})()`);
await sleep(600);

if (DICE_SHIFT) {
  await js(`(() => {
    const s = document.createElement('style');
    s.id = 'mock-dice-shift';
    s.textContent = '.dice-tray{transform: translateY(${DICE_SHIFT}px) !important;}';
    document.head.appendChild(s);
    return true;
  })()`);
  await sleep(300);
}

// 2 — UI chrome only, no portrait, no dice.
await apply([CSS.noEnemy, CSS.noDice]);
await shot(`${PREFIX}_2_ui`);

// 3 — UI + enemy.
await apply([CSS.noDice]);
await shot(`${PREFIX}_3_enemy`);

// 4 — UI + enemy + dice (cumulative).
await apply([]);
await shot(`${PREFIX}_4_dice`);

// 3b — enemy on the bare plate, no UI at all.
await apply([CSS.noTop, CSS.noPanel, CSS.noRail, CSS.noDock, CSS.noDice, CSS.noChapter]);
await shot(`${PREFIX}_3b_enemy_only`);

// 4b — dice on the bare plate, no UI at all.
await apply([CSS.noTop, CSS.noPanel, CSS.noRail, CSS.noDock, CSS.noEnemy, CSS.noChapter]);
await shot(`${PREFIX}_4b_dice_only`);

// 5 — full screen with the intel rail expanded.
await apply([]);
await js(`(() => {
  const btn = document.querySelector('.rail-paper-ball') || document.querySelector('[data-action="toggle-rail"]');
  btn?.click();
  return document.body.className;
})()`);
await sleep(700);
await shot(`${PREFIX}_5_full`);

// 0 — the untouched plate, for side-by-side comparison.
await apply([CSS.noTop, CSS.noPanel, CSS.noRail, CSS.noDock, CSS.noEnemy, CSS.noDice, CSS.noChapter]);
await shot(`${PREFIX}_0_plate`);

console.log(`done -> ${OUT}`);
ws.close();
edge.kill();
