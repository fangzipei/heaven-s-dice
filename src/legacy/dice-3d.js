/*
 * WebGL dice table.
 *
 * Replaces the hand-written CSS 3D cubes with a real Three.js scene: one
 * shared renderer, six rounded-box meshes, procedurally painted face textures
 * and GSAP-driven motion. The DOM keeps only a transparent canvas plus a
 * hidden a11y layer, so tapping a die costs one raycast instead of a
 * full preserve-3d subtree rebuild.
 *
 * All face art still comes from dice-skins.js — nothing is hardcoded here.
 */
import * as THREE from '../vendor/three.module.js';
import { dieSkin, dieFamily, dieMotifBody } from './dice-skins.js';

const FACE_SIZE = 192;
const DIE_SIZE = 1;
const DIE_RADIUS = 0.16;
const REST_X = -11 * (Math.PI / 180); // matches the old CSS resting pose

/* BoxGeometry material-group order: +X, -X, +Y, -Y, +Z, -Z */
const GROUP_ORDER = ['right', 'left', 'top', 'bottom', 'front', 'back'];

const PIP_LAYOUT = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

/* ── colour helpers ──────────────────────────────────────────────────────
   The skins ship CSS gradients; pull the stops out so the same palette can
   drive a canvas gradient. */
function stopsFromCss(css) {
  const found = String(css || '').match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) || [];
  if (!found.length) return ['#d8c49a', '#8a6b3f'];
  return found;
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── procedural grain ────────────────────────────────────────────────────
   One noise pass per family, painted once per texture. Cheap enough at
   192px and it keeps every die reading as its own material. */
function paintGrain(ctx, size, family, tintHex, rand) {
  const tint = hexToRgb(tintHex);
  ctx.save();
  if (family === 'bone' || family === 'hair') {
    const lines = family === 'hair' ? 150 : 90;
    ctx.lineWidth = family === 'hair' ? 1 : 1.6;
    for (let i = 0; i < lines; i += 1) {
      const y = rand() * size;
      ctx.strokeStyle = `rgba(${tint.r},${tint.g},${tint.b},${0.03 + rand() * 0.06})`;
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 6, size * 0.7, y + (rand() - 0.5) * 6, size + 4, y + (rand() - 0.5) * 3);
      ctx.stroke();
    }
  } else if (family === 'scale') {
    const step = size / 7;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const x = col * step + (row % 2 ? step / 2 : 0);
        const y = row * step;
        ctx.beginPath();
        ctx.arc(x, y, step * 0.62, Math.PI, 0);
        ctx.strokeStyle = `rgba(${tint.r},${tint.g},${tint.b},${0.05 + rand() * 0.07})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  } else if (family === 'metal') {
    for (let i = 0; i < 60; i += 1) {
      const x = rand() * size;
      ctx.strokeStyle = `rgba(255,246,214,${0.02 + rand() * 0.05})`;
      ctx.lineWidth = 0.8 + rand();
      ctx.beginPath();
      ctx.moveTo(x, -4);
      ctx.lineTo(x + (rand() - 0.5) * 30, size + 4);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = `rgba(${tint.r},${tint.g},${tint.b},${0.03 + rand() * 0.05})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 3, 1);
    }
  } else if (family === 'night') {
    for (let i = 0; i < 90; i += 1) {
      const r = rand() * 1.6;
      ctx.fillStyle = `rgba(226,238,255,${0.05 + rand() * 0.22})`;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = ctx.createRadialGradient(size * 0.76, size * 0.2, 2, size * 0.76, size * 0.2, size * 0.7);
    glow.addColorStop(0, 'rgba(206,224,255,.12)');
    glow.addColorStop(1, 'rgba(206,224,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  } else if (family === 'ember') {
    for (let i = 0; i < 70; i += 1) {
      const y = size - rand() * size * 0.55;
      ctx.fillStyle = `rgba(255,${120 + rand() * 90 | 0},60,${0.03 + rand() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(rand() * size, y, 3 + rand() * 10, 1 + rand() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const heat = ctx.createRadialGradient(size * 0.5, size, 4, size * 0.5, size, size * 0.8);
    heat.addColorStop(0, 'rgba(255,116,52,.26)');
    heat.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

/* ── face painting ───────────────────────────────────────────────────────
   One 192px canvas per (skin, value, emphasis). Everything the CSS version
   did — base ramp, material grain, motif watermark, engraved pips — lands
   here, plus a real carved look: dark rim under each pip, light catch on
   the opposite side. */
const motifCache = new Map();

function motifImage(body, color) {
  const key = `${body}|${color}`;
  const hit = motifCache.get(key);
  if (hit) return hit;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + `<g fill="${color}" stroke="${color}">${body.replace(/currentColor/g, color)}</g></svg>`;
  const image = new Image();
  const record = { image, ready: false };
  image.onload = () => { record.ready = true; };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  motifCache.set(key, record);
  return record;
}

function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function paintFace(value, skin, family, emphasis) {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext('2d');
  const s = FACE_SIZE;
  const rand = seededRandom(hashCode(`${skin.motif}:${value}:${family}`) + 7);

  const stops = stopsFromCss(skin.face);
  const base = ctx.createLinearGradient(s * 0.15, 0, s * 0.85, s);
  stops.forEach((hex, index) => base.addColorStop(stops.length === 1 ? 0 : index / (stops.length - 1), hex));

  // rounded-square body with a slight inset so the cube edge stays visible
  const r = s * 0.14;
  ctx.beginPath();
  ctx.moveTo(r, 2); ctx.lineTo(s - r, 2); ctx.quadraticCurveTo(s - 2, 2, s - 2, r);
  ctx.lineTo(s - 2, s - r); ctx.quadraticCurveTo(s - 2, s - 2, s - r, s - 2);
  ctx.lineTo(r, s - 2); ctx.quadraticCurveTo(2, s - 2, 2, s - r);
  ctx.lineTo(2, r); ctx.quadraticCurveTo(2, 2, r, 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  paintGrain(ctx, s, family, stops[stops.length - 1], rand);

  // worn edges: darker at the bottom, light catch at the top
  const wear = ctx.createLinearGradient(0, 0, 0, s);
  wear.addColorStop(0, 'rgba(255,248,228,.16)');
  wear.addColorStop(0.22, 'rgba(255,248,228,0)');
  wear.addColorStop(0.78, 'rgba(0,0,0,0)');
  wear.addColorStop(1, 'rgba(30,16,4,.34)');
  ctx.fillStyle = wear;
  ctx.fillRect(0, 0, s, s);

  // motif watermark
  const motifAlpha = emphasis === 'peak' ? 0.72 : emphasis === 'favored' ? 0.46 : 0.15;
  const motif = motifImage(dieMotifBody(skin.motif), skin.accent);
  if (motif.ready && motif.image.width) {
    ctx.globalAlpha = motifAlpha;
    ctx.drawImage(motif.image, s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    ctx.globalAlpha = 1;
  }

  // weighted faces get a warm bloom so the tilt stays readable
  if (emphasis !== 'none') {
    const bloom = ctx.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s * 0.62);
    bloom.addColorStop(0, rgba('#ffd08a', emphasis === 'peak' ? 0.3 : 0.16));
    bloom.addColorStop(1, 'rgba(255,208,138,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, s, s);
  }

  // engraved pips
  if (value >= 1 && value <= 6) {
    const pad = s * 0.26;
    const cell = (s - pad * 2) / 2;
    const radius = s * 0.085;
    (PIP_LAYOUT[value] || []).forEach(([row, col]) => {
      const cx = pad + col * cell;
      const cy = pad + row * cell;
      ctx.beginPath();
      ctx.arc(cx, cy + radius * 0.22, radius * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#ffffff', family === 'metal' ? 0.3 : 0.22);
      ctx.fill();
      const pit = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
      pit.addColorStop(0, shade(skin.pip, 0.28));
      pit.addColorStop(0.72, skin.pip);
      pit.addColorStop(1, shade(skin.pip, -0.35));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = pit;
      ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.strokeStyle = skin.pipRim;
      ctx.stroke();
    });
  }

  // blank / blocked / concealed markers
  if (value === 0) {
    ctx.fillStyle = 'rgba(120,108,90,.55)';
    ctx.font = `600 ${s * 0.42}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('白', s / 2, s / 2);
  }
  ctx.restore();

  // bevelled rim
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = rgba('#f6e6c0', 0.34);
  ctx.stroke();
  return canvas;
}

function hashCode(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/* ── geometry ────────────────────────────────────────────────────────────
   Rounded box by pushing a subdivided cube's vertices onto a sphere away
   from an inner core. Keeps BoxGeometry's six UV groups, so per-face
   materials still work. */
function roundedBoxGeometry(size, radius, segments = 5) {
  const geometry = new THREE.BoxGeometry(size, size, size, segments, segments, segments);
  const position = geometry.attributes.position;
  const inner = size / 2 - radius;
  const v = new THREE.Vector3();
  const core = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    core.set(
      Math.max(-inner, Math.min(inner, v.x)),
      Math.max(-inner, Math.min(inner, v.y)),
      Math.max(-inner, Math.min(inner, v.z)),
    );
    v.sub(core);
    if (v.lengthSq() > 1e-8) v.normalize().multiplyScalar(radius);
    position.setXYZ(i, core.x + v.x, core.y + v.y, core.z + v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/* ── table & environment ───────────────────────────────────────────────── */
function tableTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = seededRandom(20261026);
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#2a1c12');
  base.addColorStop(0.5, '#1d130c');
  base.addColorStop(1, '#120c07');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 220; i += 1) {
    const y = rand() * size;
    ctx.strokeStyle = `rgba(${90 + rand() * 60 | 0},${60 + rand() * 40 | 0},${34 + rand() * 24 | 0},${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 2.4;
    ctx.beginPath();
    ctx.moveTo(-6, y);
    ctx.bezierCurveTo(size * 0.3, y + (rand() - 0.5) * 26, size * 0.7, y + (rand() - 0.5) * 26, size + 6, y + (rand() - 0.5) * 14);
    ctx.stroke();
  }
  const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.72);
  vignette.addColorStop(0, 'rgba(255,196,110,.14)');
  vignette.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/* A tiny equirect gradient gives metals something to reflect. Far cheaper
   than shipping an HDR and it removes the flat "plastic" look. */
function environmentTexture(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, '#4a3826');
  sky.addColorStop(0.42, '#241811');
  sky.addColorStop(0.58, '#140d08');
  sky.addColorStop(1, '#070503');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(255,186,96,.55)';
  ctx.beginPath(); ctx.ellipse(64, 40, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(120,150,220,.24)';
  ctx.beginPath(); ctx.ellipse(196, 52, 40, 26, 0, 0, Math.PI * 2); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  texture.dispose();
  return envMap;
}

const FAMILY_SURFACE = {
  bone: { roughness: 0.74, metalness: 0.03 },
  hair: { roughness: 0.85, metalness: 0.02 },
  scale: { roughness: 0.52, metalness: 0.12 },
  metal: { roughness: 0.3, metalness: 0.82 },
  night: { roughness: 0.48, metalness: 0.28 },
  ember: { roughness: 0.44, metalness: 0.38 },
};

/* ── the table ────────────────────────────────────────────────────────── */
export class DiceTable {
  // Shared selection-ring assets; the material is cloned per die so opacity
  // can be tweened independently.
  static ringGeometry = new THREE.RingGeometry(0.6, 0.74, 40);
  static ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc46a, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });

  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onPick = options.onPick || (() => {});
    this.onHover = options.onHover || (() => {});
    this.entries = [];
    this.textures = new Map();
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    const compact = window.matchMedia('(max-width: 760px)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // ACES compresses hard; lift the midtones so bone stays bone instead of
    // sliding into walnut brown under the candle light.
    this.renderer.toneMappingExposure = 1.32;
    this.renderer.shadowMap.enabled = !compact;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.environment = environmentTexture(this.renderer);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 3.15, 6.4);
    this.camera.lookAt(0, 0.15, 0);

    // lights: one warm key from the candle side, cool rim from the window
    this.scene.add(new THREE.HemisphereLight(0x8a7150, 0x14100a, 1.0));
    const key = new THREE.DirectionalLight(0xffe0b0, 1.7);
    key.position.set(3.4, 6.2, 4.2);
    if (!compact) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -6; key.shadow.camera.right = 6;
      key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
      key.shadow.camera.far = 24;
      key.shadow.bias = -0.0016;
      key.shadow.radius = 3;
    }
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fa0e0, 0.5);
    rim.position.set(-4.2, 3.4, -3.6);
    this.scene.add(rim);
    const ember = new THREE.PointLight(0xff7a30, 12, 16, 2);
    ember.position.set(-3.4, 2.2, 3.2);
    this.scene.add(ember);
    this.emberLight = ember;

    const felt = tableTexture();
    felt.repeat.set(2, 2);
    this.table = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 46),
      new THREE.MeshStandardMaterial({ map: felt, roughness: 0.92, metalness: 0.04 }),
    );
    this.table.rotation.x = -Math.PI / 2;
    this.table.receiveShadow = !compact;
    this.scene.add(this.table);

    // soft contact pool under the dice row
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6),
      new THREE.MeshBasicMaterial({
        map: this.poolTexture(), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.85,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.004;
    this.scene.add(pool);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.geometry = roundedBoxGeometry(DIE_SIZE, DIE_RADIUS, 5);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.resize();
  }

  poolTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size / 2;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 4, 4, size / 2, size / 4, size / 2);
    g.addColorStop(0, 'rgba(255,198,110,.34)');
    g.addColorStop(0.55, 'rgba(255,150,60,.1)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Solve the distance that fits the whole dice row across the canvas
    // width, then park the camera above the table looking down ~24°. The tray
    // is a wide letterbox, so the row — not the height — sets the framing.
    const halfWidthNeeded = 4.35;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHorizontal = Math.atan(Math.tan(halfFov) * this.camera.aspect);
    const distance = halfWidthNeeded / Math.max(0.08, Math.tan(halfHorizontal));
    const z = THREE.MathUtils.clamp(distance, 2.6, 16);
    // Sit the horizon low in frame so a lifted (selected) die still fits.
    this.camera.position.set(0, Math.min(z * 0.44 + 0.18, 3.6), z);
    this.camera.lookAt(0, 0.05, 0);
    this.camera.updateProjectionMatrix();
  }

  faceValues(value) {
    const pairs = [[1, 6], [2, 5], [3, 4]];
    const frontPair = pairs.find((pair) => pair.includes(value)) || pairs[0];
    const others = pairs.filter((pair) => pair !== frontPair);
    return {
      front: value,
      back: frontPair[0] + frontPair[1] - value,
      top: others[0][0],
      bottom: others[0][1],
      right: others[1][0],
      left: others[1][1],
    };
  }

  faceTexture(value, skin, family, emphasis) {
    const key = `${skin.motif}|${family}|${value}|${emphasis}`;
    const hit = this.textures.get(key);
    if (hit) return hit;
    // Long runs would keep every face ever rolled alive; drop the oldest
    // half once the cache gets fat. Re-painting one face is ~1ms.
    if (this.textures.size > 96) {
      const doomed = Array.from(this.textures.keys()).slice(0, 48);
      doomed.forEach((oldKey) => {
        this.textures.get(oldKey)?.dispose();
        this.textures.delete(oldKey);
      });
    }
    const texture = new THREE.CanvasTexture(paintFace(value, skin, family, emphasis));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.set(key, texture);
    return texture;
  }

  /* Build (or rebuild) the dice row. `dice` carries everything the old DOM
     version rendered: uid, value, spec plus the state flags. */
  setDice(dice) {
    const keep = new Map(this.entries.map((entry) => [entry.uid, entry]));
    this.entries = [];
    const total = dice.length || 1;
    const spacing = Math.min(1.42, Math.max(0.86, 7.2 / Math.max(total, 1)));
    dice.forEach((die, index) => {
      let entry = keep.get(die.uid);
      const values = die.blank || die.hidden
        ? { front: die.hidden ? 0 : 0, back: 0, top: 0, bottom: 0, right: 0, left: 0 }
        : this.faceValues(die.value || 1);
      const skin = dieSkin(die.spec);
      const family = dieFamily(die.spec);
      const favored = favoredFaces(die.spec);
      const peak = peakFace(die.spec);
      const materials = GROUP_ORDER.map((faceKey) => {
        const faceValue = values[faceKey];
        const emphasis = peak && faceValue === peak ? 'peak'
          : favored.includes(faceValue) ? 'favored' : 'none';
        const surface = FAMILY_SURFACE[family] || FAMILY_SURFACE.bone;
        return new THREE.MeshStandardMaterial({
          map: this.faceTexture(faceValue, skin, family, emphasis),
          roughness: surface.roughness,
          metalness: surface.metalness,
          envMapIntensity: family === 'metal' ? 1.15 : 0.6,
          emissive: new THREE.Color(0x000000),
        });
      });
      if (!entry) {
        const mesh = new THREE.Mesh(this.geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        // Selection marker: a warm ring hugging the die's base on the felt.
        const ring = new THREE.Mesh(
          DiceTable.ringGeometry,
          DiceTable.ringMaterial.clone(),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.46;
        ring.renderOrder = 2;
        mesh.add(ring);
        this.group.add(mesh);
        entry = { uid: die.uid, mesh, ring, state: '', baseX: 0 };
      } else {
        // Materials own no textures — face art is shared through the cache —
        // so only the material wrapper is dropped here.
        entry.mesh.material.forEach((material) => material.dispose());
        entry.mesh.material = materials;
      }
      entry.spec = die.spec;
      entry.value = die.value;
      entry.baseX = (index - (total - 1) / 2) * spacing;
      entry.mesh.userData.uid = die.uid;
      entry.mesh.visible = true;
      this.entries.push(entry);
    });
    Array.from(keep.values()).forEach((entry) => {
      if (!this.entries.includes(entry)) {
        this.group.remove(entry.mesh);
        entry.mesh.material.forEach((material) => material.dispose());
        entry.ring?.material.dispose();
      }
    });
    this.entries.forEach((entry) => {
      if (!entry.placed) {
        entry.mesh.position.set(entry.baseX, DIE_SIZE / 2, 0);
        entry.mesh.rotation.set(REST_X, 0, 0);
        entry.placed = true;
      }
    });
  }

  /* Snap every die to its resting slot. Used on first paint and whenever the
     game needs an instant, un-animated layout. */
  placeAll() {
    this.entries.forEach((entry) => {
      entry.mesh.position.set(entry.baseX, DIE_SIZE / 2, 0);
      entry.mesh.rotation.set(REST_X, 0, 0);
      entry.mesh.scale.set(1, 1, 1);
    });
  }

  /* Rest pose for a die: value on the camera-facing +Z face, slight -X tilt
     so the top face catches light and the cube reads as a solid object. */
  restRotation() {
    return { x: REST_X, y: 0, z: 0 };
  }

  restYFor(state = {}) {
    // A modest lift — enough to read, small enough to stay in frame.
    return DIE_SIZE / 2 + (state.selected ? 0.2 : state.scored ? 0.08 : 0);
  }

  /* Highlight states: selected / scored / blank / blocked / hidden.
     Dimming rides on material colour, not opacity — flipping `transparent`
     would force a shader recompile on every tap. */
  applyStates(states) {
    this.entries.forEach((entry) => {
      const state = states.get(entry.uid) || {};
      const dim = state.scored || state.blank || state.blocked;
      const tint = dim ? 0.55 : 1;
      entry.mesh.material.forEach((material) => {
        material.color.setScalar(tint);
      });
      if (entry.ring) entry.ring.material.opacity = state.selected ? 0.9 : 0;
      entry.restY = this.restYFor(state);
      entry.state = state;
    });
  }

  meshFor(uid) {
    return this.entries.find((entry) => entry.uid === uid)?.mesh || null;
  }

  /* Screen point → a point on the horizontal plane at `planeY`. Used to make
     the dice fly out of the real cup rim instead of a guessed offset. */
  screenToPlane(clientX, clientY, planeY = 1.1) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const point = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, point);
    return hit ? point : new THREE.Vector3(0, planeY, 0.8);
  }

  /* Pointer → die. Returns the uid under the pointer, or null. */
  pickAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.entries.map((e) => e.mesh), false);
    return hits.length ? hits[0].object.userData.uid : null;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
    this.geometry.dispose();
    this.renderer.dispose();
  }
}

function favoredFaces(spec) {
  if (Array.isArray(spec?.favored)) return spec.favored;
  const probs = spec?.probs || [];
  if (!probs.length || spec?.id === 'standard') return [];
  return probs.map((weight, index) => (weight >= 0.2 ? index + 1 : 0)).filter(Boolean);
}

function peakFace(spec) {
  const probs = spec?.probs || [];
  if (!probs.length || spec?.id === 'standard') return 0;
  return probs.indexOf(Math.max(...probs)) + 1;
}
