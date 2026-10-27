/*
 * Bakes a real texture atlas for every die in the game.
 *
 * The old path painted each face into a <canvas> at runtime; this moves that
 * work offline. tools/dice-texture-sheet.html renders the faces (art straight
 * from src/dice-skins.js), headless Edge screenshots each sheet, and we write
 * assets/textures/dice/<die-id>.png + a manifest describing the grid.
 *
 *   node tools/generate-dice-textures.mjs            # bake everything
 *   node tools/generate-dice-textures.mjs wolf_alpha # bake just one
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { DICE, STANDARD_DIE } from '../src/content/index.ts';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const BASE = 'http://127.0.0.1:4173';
const PORT = 9361;
const OUT_DIR = `${ROOT}\\assets\\textures\\dice`;
const CELL = 256;
const COLS = 3;
const ROWS = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wanted = process.argv.slice(2).filter(Boolean);
const ids = wanted.length ? wanted : [STANDARD_DIE.id, ...DICE.map((die) => die.id)];

await mkdir(OUT_DIR, { recursive: true });
const profile = `${ROOT}\\tools\\edge-profile-tex-${Date.now() % 100000}`;
const edge = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run',
  '--disable-extensions', '--mute-audio', '--force-device-scale-factor=1',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=900,700', 'about:blank'], { stdio: 'ignore' });

async function getJson(path) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('No CDP endpoint');
}

const target = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
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
    if (m.error) p.reject(new Error(m.error.message));
    else p.resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    console.error('PAGE EXCEPTION:', m.params.exceptionDetails.exception?.description
      || m.params.exceptionDetails.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    console.error('PAGE ERROR:', m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});

const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

const js = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  }
  return r.result.value;
};

await send('Runtime.enable');
await send('Page.enable');

const manifest = { cell: CELL, cols: COLS, rows: ROWS, order: 'value-1..6', skins: {} };
let failed = 0;

for (const id of ids) {
  const url = `${BASE}/tools/dice-texture-sheet.html?skins=${encodeURIComponent(id)}`;
  await send('Page.navigate', { url });
  // Wait for the module to run and paint.
  let ready = false;
  for (let i = 0; i < 80 && !ready; i += 1) {
    await sleep(120);
    ready = await js('window.__ready === true');
  }
  if (!ready) { console.error(`  !! ${id}: page never became ready`); failed += 1; continue; }

  const info = await js(`(() => {
    const s = document.querySelector('.sheet');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { skin: s.dataset.skin, x: r.x, y: r.y, w: r.width, h: r.height,
             faces: s.children.length };
  })()`);
  if (!info || info.faces !== 6) {
    console.error(`  !! ${id}: expected 6 faces, got ${info ? info.faces : 'nothing'}`);
    failed += 1;
    continue;
  }

  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: info.x, y: info.y, width: info.w, height: info.h, scale: 1,
    },
    captureBeyondViewport: true,
    optimizeForSpeed: false,
  });
  const buffer = Buffer.from(shot.data, 'base64');
  await writeFile(`${OUT_DIR}\\${id}.png`, buffer);
  manifest.skins[id] = { file: `${id}.png`, width: info.w, height: info.h };
  console.log(`  ok ${id.padEnd(16)} ${Math.round(buffer.length / 1024)} KB`);
}

await writeFile(`${OUT_DIR}\\manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

ws.close();
edge.kill();
await sleep(400);
await rm(profile, { recursive: true, force: true }).catch(() => {});

console.log(`\nbaked ${ids.length - failed}/${ids.length} atlases -> assets/textures/dice/`);
if (failed) process.exitCode = 1;
