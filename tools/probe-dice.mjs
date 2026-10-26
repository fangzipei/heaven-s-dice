/* Dump dice-table mesh transforms for debugging framing issues. */
import { spawn } from 'node:child_process';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT = 'D:\\vs_workspace\\Heaven\'s Dice';
const PORT = 9345;
const edge = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--enable-unsafe-swiftshader',
  '--use-gl=angle', '--use-angle=swiftshader', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${ROOT}\\tools\\edge-profile-wgl`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path) {
  for (let i = 0; i < 60; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json(); } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('no cdp');
}
const page = (await getJson('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' }); await sleep(1600);
const js = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await js('document.querySelector(\'[data-action="start-run"]\').click()');
await sleep(600);
await js('document.querySelector(\'[data-action="start-direct"]\')?.click()');
await sleep(900);
await js('document.querySelector(\'[data-action="close-intro"]\')?.click()');
await sleep(1500);

const dump = await js(`(() => {
  const t = HeavensDice.diceTable();
  return {
    camera: { pos: t.camera.position.toArray().map(v=>+v.toFixed(2)), aspect: +t.camera.aspect.toFixed(3), fov: t.camera.fov },
    canvasRect: (() => { const r = t.canvas.getBoundingClientRect(); return [r.width, r.height]; })(),
    entries: t.entries.map((e) => ({
      uid: e.uid.slice(0, 6), baseX: +e.baseX.toFixed(2), value: e.value,
      pos: e.mesh.position.toArray().map(v=>+v.toFixed(2)),
      rot: [e.mesh.rotation.x, e.mesh.rotation.y, e.mesh.rotation.z].map(v=>+v.toFixed(2)),
      scale: e.mesh.scale.toArray().map(v=>+v.toFixed(2)),
      visible: e.mesh.visible,
    })),
  };
})()`);
console.log(JSON.stringify(dump, null, 2));

await js(`(() => {
  const run = HeavensDice.run;
  const vals = [5,1,1,6,3,2];
  run.dice.forEach((d, i) => { d.value = vals[i]; d.scored = false; });
  run.phase = 'selecting'; run.throwNumber = 1; run.stats.levelRolls = 1;
  run.selected = [run.dice[3].uid, run.dice[4].uid, run.dice[5].uid];
  HeavensDice.render();
})()`);
await sleep(1200);
const after = await js(`(() => {
  const t = HeavensDice.diceTable();
  return t.entries.map((e) => ({
    value: e.value, sel: e.state?.selected,
    pos: e.mesh.position.toArray().map(v => +v.toFixed(2)),
    scl: e.mesh.scale.toArray().map(v => +v.toFixed(2)),
  }));
})()`);
console.log(JSON.stringify(after));

const domCheck = await js(`(() => ({
  fallback: Boolean(document.querySelector('#dice-dom-fallback')),
  fallbackDice: document.querySelectorAll('#dice-dom-fallback .die').length,
  canvasVisible: (() => { const c = document.querySelector('#dice-canvas'); const r = c.getBoundingClientRect(); const s = getComputedStyle(c); return {w: r.width, h: r.height, z: s.zIndex, display: s.display, visibility: s.visibility}; })(),
  trayChildren: [...document.querySelector('#dice-tray').children].map(c => c.id || c.className),
}))()`);
console.log(JSON.stringify(domCheck, null, 2));

// Zoom into the tray for a close look.
const rect = await js(`(() => { const r = document.querySelector('#dice-tray').getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; })()`);
const zoom = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: rect.x - 10, y: rect.y - 30, width: rect.w + 20, height: rect.h + 60, scale: 1.6 },
});
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-tray.png`, Buffer.from(zoom.data, 'base64'));

// Isolation test: hide the canvas — if the giant dice remain, they are DOM.
await js(`document.querySelector('#dice-canvas').style.visibility = 'hidden'`);
await sleep(300);
const zoomHidden = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: rect.x - 10, y: rect.y - 30, width: rect.w + 20, height: rect.h + 60, scale: 1.6 },
});
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-tray-hidden.png`, Buffer.from(zoomHidden.data, 'base64'));
// Isolation A: selected dice stay at rest height (no lift), emissive kept.
const frozen = await js(`(() => {
  document.querySelector('#dice-canvas').style.visibility = 'visible';
  const t = HeavensDice.diceTable();
  t.entries.forEach((e) => { e.mesh.visible = true; });
  HeavensDice.motion.gsap && HeavensDice.motion.gsap.killTweensOf('*');
  t.entries.forEach((e) => { e.mesh.position.set(e.baseX, 0.5, 0); e.mesh.rotation.set(-0.19, 0, 0); });
  t.render();
  return t.entries.map((e) => {
    const p = new (e.mesh.position.constructor)();
    e.mesh.getWorldPosition(p);
    const ndc = p.clone().project(t.camera);
    return {
      value: e.value, sel: Boolean(e.state?.selected), spec: e.spec?.id,
      local: e.mesh.position.toArray().map(v => +v.toFixed(2)),
      world: p.toArray().map(v => +v.toFixed(2)),
      ndc: ndc.toArray().map(v => +v.toFixed(3)),
      scaleW: e.mesh.scale.toArray().map(v => +v.toFixed(2)),
      parentScale: e.mesh.parent.scale.toArray().map(v => +v.toFixed(2)),
      geoSize: (() => { e.mesh.geometry.computeBoundingBox(); const b = e.mesh.geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map(v => +v.toFixed(2)); })(),
      materialCount: e.mesh.material.length,
      mapLoaded: e.mesh.material.map((m) => Boolean(m.map)),
      rendererInfo: { programs: t.renderer.info.programs?.length, render: t.renderer.info.render },
      size: t.renderer.getSize(new (p.constructor)()).toArray().map(v => +v.toFixed(1)),
      pixelRatio: t.renderer.getPixelRatio(),
    };
  });
})()`);
console.log(JSON.stringify(frozen, null, 1));
await sleep(300);
const zoomFrozen = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: rect.x - 10, y: rect.y - 30, width: rect.w + 20, height: rect.h + 60, scale: 1.6 },
});
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-tray-frozen.png`, Buffer.from(zoomFrozen.data, 'base64'));

// Also hide the three selected meshes.
await js(`(() => {
  const t = HeavensDice.diceTable();
  t.entries.filter(e => e.state?.selected).forEach(e => { e.mesh.visible = false; });
  t.render();
})()`);
await sleep(300);
const zoomNoMesh = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: rect.x - 10, y: rect.y - 30, width: rect.w + 20, height: rect.h + 60, scale: 1.6 },
});
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-tray-nomesh.png`, Buffer.from(zoomNoMesh.data, 'base64'));
// Isolation C: same frame, three depths — z=0 / z=-1.2 / z=-2.4.
const moved = await js(`(() => {
  const t = HeavensDice.diceTable();
  const sel = t.entries.filter((e) => e.state?.selected);
  const depths = [0, 0, 0];
  sel.forEach((e, i) => {
    e.mesh.visible = true;
    e.mesh.position.set(e.baseX, 0.5, depths[i]);
    // Keep transforms identical; only the emissive differs per run.
    e.mesh.material.forEach((m) => {
      m.emissive.set(0xffbe6a);
      m.emissiveIntensity = i === 0 ? 0.2 : i === 1 ? 0.6 : 0;
      m.color.setScalar(1);
    });
  });
  t.render();
  return sel.map((e) => e.mesh.position.z);
})()`);
console.log('depths:', JSON.stringify(moved));
await sleep(400);
const zoomMoved = await send('Page.captureScreenshot', {
  format: 'png',
  clip: { x: rect.x - 10, y: rect.y - 30, width: rect.w + 20, height: rect.h + 60, scale: 1.6 },
});
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-tray-moved.png`, Buffer.from(zoomMoved.data, 'base64'));
const r = await send('Page.captureScreenshot', { format: 'png' });
await (await import('node:fs/promises')).writeFile(`${ROOT}\\docs\\webgl\\probe-full.png`, Buffer.from(r.data, 'base64'));
ws.close(); edge.kill();
