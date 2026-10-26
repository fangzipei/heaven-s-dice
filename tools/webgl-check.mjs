/* Headless check for the WebGL dice path: console errors, canvas health,
   frame timing and a couple of screenshots. */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9341;
const OUT = `${ROOT}\\docs\\webgl`;
await mkdir(OUT, { recursive: true });
await mkdir(`${ROOT}\\tools\\edge-profile-wgl`, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = `${ROOT}\\tools\\edge-profile-wgl-${Date.now() % 100000}`;
const size = (process.env.WGL_SIZE || '1600,1000').split(',');
const edge = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${size[0]},${size[1]}`, 'about:blank'], { stdio: 'ignore' });

async function getJson(path) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('No CDP');
}

const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true });
  ws.addEventListener('error', rej, { once: true });
});
let seq = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    logs.push(`[${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')}`);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    logs.push(`[exception] ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  }
});
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:4173/?t=${Date.now()}` });
await sleep(1600);
// Clear any saved run so the start button is always present.
await send('Runtime.evaluate', { expression: 'try { localStorage.clear() } catch {}' });
await send('Page.navigate', { url: `http://127.0.0.1:4173/?t=${Date.now()}` });
await sleep(1600);

const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64'));
};
const clipShot = async (name, selector, pad = 16, scale = 1.6) => {
  const rect = await js(`(() => { const el = document.querySelector('${selector}'); if (!el) return null; const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; })()`);
  if (!rect) return;
  const r = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad),
      width: rect.w + pad * 2, height: rect.h + pad * 2, scale,
    },
  });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(r.data, 'base64'));
};

const tag = process.env.WGL_SIZE ? 'mobile' : 'desktop';
await shot(`00-home-${tag}`);
await js(`document.querySelector('[data-action="start-run"]').click()`);
await sleep(600);
// First-run modal: sit down straight away.
await js(`document.querySelector('[data-action="start-direct"]')?.click()`);
await sleep(900);
// Level-intro card: take a seat at the table.
await js(`document.querySelector('[data-action="close-intro"]')?.click()`);
await sleep(900);

const health = await js(`(() => {
  const canvas = document.querySelector('#dice-canvas');
  const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
  return {
    hasCanvas: Boolean(canvas),
    cssSize: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
    bufferSize: canvas ? [canvas.width, canvas.height] : null,
    webgl: Boolean(gl),
    diceTable: Boolean(window.HeavensDice?.diceTable?.()),
    tableEntries: window.HeavensDice?.diceTableEntries?.() ?? null,
  };
})()`);

// Deterministic hero state, same values the other capture scripts use.
await js(`(() => {
  const api = window.HeavensDice;
  const run = api.run;
  const vals = [5,1,1,6,3,2];
  run.dice.forEach((d, i) => { d.value = vals[i]; d.scored = false; });
  run.phase = 'selecting'; run.throwNumber = 1; run.stats.levelRolls = 1;
  run.score = 300; run.roundScore = 80;
  run.selected = [run.dice[0].uid, run.dice[1].uid, run.dice[2].uid];
  api.app.busy = false;
  api.render();
})()`);
await sleep(600);
await shot(`01-game-${tag}`);
await clipShot(`02-dice-closeup-${tag}`, '.dice-zone', 14, 1.8);
// Kill every tween, snap all meshes to rest, re-render — is the giant gone?
const snap = await js(`(() => {
  const t = HeavensDice.diceTable();
  window.gsap.globalTimeline.clear();
  t.entries.forEach((e) => {
    e.mesh.position.set(e.baseX, 0.5, 0);
    e.mesh.rotation.set(-0.19, 0, 0);
    e.mesh.scale.set(1, 1, 1);
  });
  t.render();
  return t.entries.map((e) => {
    const m = e.mesh.matrixWorld.elements;
    return {
      v: e.value, sel: Boolean(e.state?.selected),
      // basis vectors lengths (skew detection) + translation
      sx: +Math.hypot(m[0], m[1], m[2]).toFixed(3),
      sy: +Math.hypot(m[4], m[5], m[6]).toFixed(3),
      sz: +Math.hypot(m[8], m[9], m[10]).toFixed(3),
      tx: +m[12].toFixed(2), ty: +m[13].toFixed(2), tz: +m[14].toFixed(2),
      proj: (() => { const p = e.mesh.matrixWorld.elements; return [p[0], p[1], p[2], p[4], p[5], p[6]].map((v) => +v.toFixed(2)); })(),
    };
  });
})()`);
console.log('snap:', JSON.stringify(snap));
await clipShot(`02b-dice-snap-${tag}`, '.dice-zone', 14, 1.8);

// Selection state: unselected dice should read darker, selected one lifted.
await js(`(() => { window.HeavensDice.run.selected = []; window.HeavensDice.render(); })()`);
await sleep(500);
await clipShot(`03-dice-plain-${tag}`, '.dice-zone', 14, 1.8);

// Frame timing over ~2s while a roll animates.
const perf = await js(`(async () => {
  const api = window.HeavensDice;
  const run = api.run;
  run.phase = 'ready'; run.rerolls = Math.max(run.rerolls, 3);
  api.render();
  await new Promise((r) => setTimeout(r, 200));
  const stamps = [];
  let stop = false;
  const tick = (t) => { if (stop) return; stamps.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  api.roll({ free: true });
  await new Promise((r) => setTimeout(r, 2200));
  stop = true;
  const deltas = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
  const p95 = deltas[Math.floor(deltas.length * .95)] || 0;
  return {
    frames: stamps.length,
    fps: +(1000 / ((stamps.at(-1) - stamps[0]) / Math.max(1, stamps.length - 1))).toFixed(1),
    p95: +p95.toFixed(2),
    longFrames: deltas.filter((d) => d > 32).length,
  };
})()`);

await sleep(600);
await shot(`04-after-roll-${tag}`);

console.log(JSON.stringify({ health, perf, logs }, null, 2));
ws.close();
edge.kill();
