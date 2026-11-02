// gen-paper.mjs — white crumpled paper sheets for the origami UI pass.
// The table illustrations keep the same paper grammar, but the scenery behind
// them turns from a bright picnic afternoon into a dark, ember-lit hall as the
// run climbs toward heaven.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/paper');
const W = 1600;
const H = 1000;

let seed = 0x9e3779b9;
function rnd() {
  seed ^= seed << 13; seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5; seed >>>= 0;
  return seed / 0xffffffff;
}
const j = (n) => (rnd() * 2 - 1) * n;
const f = (n) => n.toFixed(1);

function save(name, svg) {
  const path = join(OUT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, svg);
  console.log(`paper/${name} ${(svg.length / 1024).toFixed(1)}kb`);
}

const PAPER = '#f7f1e4';

/** Shared filters: paper fibres, soft folds and a gentle edge stain. */
function defs(id = 'p') {
  return `<defs>
    <filter id='${id}-grain' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' seed='11' stitchTiles='stitch' result='n'/>
      <feColorMatrix in='n' type='matrix' values='0 0 0 0 .34 0 0 0 0 .29 0 0 0 0 .22 0 0 0 .075 0'/>
    </filter>
    <filter id='${id}-soft' x='-20%' y='-20%' width='140%' height='140%'>
      <feGaussianBlur stdDeviation='18'/>
    </filter>
    <filter id='${id}-soft2' x='-20%' y='-20%' width='140%' height='140%'>
      <feGaussianBlur stdDeviation='7'/>
    </filter>
    <linearGradient id='${id}-edge' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#b9a98c' stop-opacity='.09'/>
      <stop offset='.18' stop-color='#fffdf6' stop-opacity='0'/>
      <stop offset='.84' stop-color='#c9b898' stop-opacity='0'/>
      <stop offset='1' stop-color='#a89474' stop-opacity='.13'/>
    </linearGradient>
    <radialGradient id='${id}-warm' cx='.48' cy='.4' r='.76'>
      <stop offset='0' stop-color='#fffdf8' stop-opacity='.9'/>
      <stop offset='.58' stop-color='#f8f1e2' stop-opacity='.45'/>
      <stop offset='1' stop-color='#d9cab0' stop-opacity='.16'/>
    </radialGradient>
  </defs>`;
}

/** Soft valleys and ridges: broad blurred strokes, then hairline creases. */
function creases(count, { opacity = 1, id = 'p' } = {}) {
  let g = '';
  for (let i = 0; i < 4; i += 1) {
    const x = 80 + rnd() * (W - 160);
    const y = 60 + rnd() * (H - 120);
    const rx = 180 + rnd() * 360;
    const ry = 90 + rnd() * 240;
    g += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='${f(rx)}' ry='${f(ry)}' fill='#b9a689' opacity='${(.055 + rnd() * .04).toFixed(3)}' filter='url(#${id}-soft)' transform='rotate(${f(-18 + rnd() * 36)} ${f(x)} ${f(y)})'/>`;
    g += `<ellipse cx='${f(x - rx * .2)}' cy='${f(y - ry * .3)}' rx='${f(rx * .55)}' ry='${f(ry * .5)}' fill='#fffdf8' opacity='${(.3 + rnd() * .18).toFixed(3)}' filter='url(#${id}-soft2)' transform='rotate(${f(-18 + rnd() * 36)} ${f(x)} ${f(y)})'/>`;
  }
  for (let i = 0; i < count; i += 1) {
    const x = 40 + rnd() * (W - 80);
    const y = 40 + rnd() * (H - 80);
    const len = 120 + rnd() * 380;
    const ang = -1.2 + rnd() * 2.4;
    const bend = j(26);
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const mx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * bend;
    const my = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * bend;
    const d = `M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}`;
    g += `<path d='${d}' fill='none' stroke='#8d7a5f' stroke-width='${f(.9 + rnd() * 1.5)}' opacity='${(.06 + rnd() * .07) * opacity}'/>`;
    g += `<path d='${d}' transform='translate(${f(1.5 + rnd() * 2.5)} ${f(-1.5 - rnd() * 2.5)})' fill='none' stroke='#fffdf8' stroke-width='${f(1.4 + rnd() * 1.4)}' opacity='${(.36 + rnd() * .2) * opacity}'/>`;
  }
  for (let i = 0; i < 8; i += 1) {
    const x = rnd() * W; const y = rnd() * H;
    const len = 60 + rnd() * 190; const ang = -0.9 + rnd() * 1.8;
    g += `<path d='M${f(x)} ${f(y)} l${f(Math.cos(ang) * len)} ${f(Math.sin(ang) * len)}' stroke='#8b765a' stroke-width='${f(.7 + rnd() * .9)}' opacity='${.02 + rnd() * .03}'/>`;
    g += `<path d='M${f(x + 1.5)} ${f(y - 1.5)} l${f(Math.cos(ang) * len)} ${f(Math.sin(ang) * len)}' stroke='#fffdf8' stroke-width='${f(1 + rnd() * .7)}' opacity='${.22 + rnd() * .14}'/>`;
  }
  return g;
}

/** Crumpled white sheet used behind the home page and every screen. */
function sheet({ withProps = false } = {}) {
  let g = `<rect width='${W}' height='${H}' fill='${PAPER}'/>`;
  g += `<rect width='${W}' height='${H}' fill='url(#p-warm)'/>`;
  g += creases(14);
  if (withProps) {
    // Faint coloured-pencil doodles in the margins: a coin, a die and a tiny gate.
    g += `<g stroke='#8d7b63' fill='none' opacity='.22' stroke-linecap='round'>
      <circle cx='1370' cy='196' r='46' stroke-width='2.2'/>
      <circle cx='1370' cy='196' r='38' stroke-width='1.1' opacity='.6'/>
      <path d='M1358 180l12 16 12-22 10 22 10-16' stroke-width='2'/>
      <path d='M236 812h84v78h-84z' stroke-width='2' transform='rotate(-4 278 851)'/>
      <path d='M254 812v-20a24 24 0 0148 0v20' stroke-width='2' transform='rotate(-4 278 851)'/>
      <path d='M196 206c42-34 92-34 134 0M196 206v92M330 206v92' stroke-width='2'/>
      <path d='M214 298v-52h98v52M236 246v52M290 246v52' stroke-width='1.4'/>
    </g>`;
  }
  g += `<rect width='${W}' height='${H}' fill='url(#p-edge)'/>`;
  g += `<rect width='${W}' height='${H}' filter='url(#p-grain)'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'>${defs()}${g}</svg>`;
}

save('crumpled.svg', sheet());
save('home.svg', sheet({ withProps: true }));

/* ── five tables, five moods ─────────────────────────────────────────────
   Chapter 1 is a bright paper picnic, chapter 2 a golden afternoon, chapter 3
   dusk, chapter 4 night and chapter 5 a dark storm. The table itself stays a
   light paper cut-out so dice, labels and the cup always read clearly. */
const TABLES = {
  wood: {
    tint: '#f6ead0', deep: '#cfae7c', line: '#a9865a', accent: '#c18338',
    skyTop: '#a9dcf0', skyMid: '#e3f3e1', skyLow: '#fdf6d6',
    sun: '#ffd25e', sunLine: '#c98f2f', sunX: 1264, sunY: 164,
    hillFar: '#b4d98d', hillNear: '#8bc078', hillShadow: '#5d8c50',
    tree: '#6fa05f', treeDark: '#4d7c45', trunk: '#8a6741',
    cloth: '#f0b0a4', clothLine: '#bf7d72', clothPattern: true,
    flower: ['#e8788a', '#f3cf4f', '#f6f0e4', '#c58ad6'],
    flag: ['#e8786a', '#e9c351', '#78b6a2', '#8aa6d6', '#c99bd6'],
    mood: 'day', particle: 'petal', bunting: true, scenery: 'meadow',
  },
  stone: {
    tint: '#f7e7c4', deep: '#d9b17a', line: '#ab8250', accent: '#c07a33',
    skyTop: '#f6c98f', skyMid: '#fbe2b4', skyLow: '#fdf1d2',
    sun: '#ffc76e', sunLine: '#bb7c3a', sunX: 1188, sunY: 226,
    hillFar: '#e5bc85', hillNear: '#d29b60', hillShadow: '#a97846',
    tree: '#8d8a5f', treeDark: '#756646', trunk: '#8a6a45',
    cloth: '#e6c39c', clothLine: '#b18258', clothPattern: true,
    flower: [], flag: [],
    mood: 'golden', particle: 'dust', bunting: false, scenery: 'desert',
  },
  iron: {
    tint: '#e9e3d6', deep: '#bdb29e', line: '#847a68', accent: '#8a6a4a',
    skyTop: '#6f6584', skyMid: '#a4888c', skyLow: '#d99f6e',
    sun: '#e59a5c', sunLine: '#a4663f', sunX: 1160, sunY: 300,
    hillFar: '#7c6d5c', hillNear: '#5b4d3f', hillShadow: '#3e352c',
    tree: '#4a3f36', treeDark: '#332b25', trunk: '#3b332c',
    cloth: '#6f6259', clothLine: '#463c36', clothPattern: false,
    flower: [], flag: [],
    mood: 'dusk', particle: 'dust', bunting: false, scenery: 'waste',
  },
  gold: {
    tint: '#f8edcb', deep: '#dec37a', line: '#ae8a42', accent: '#b8862f',
    skyTop: '#262747', skyMid: '#3c3152', skyLow: '#60465a',
    sun: '#f0e3bb', sunLine: '#b9a67d', sunX: 1230, sunY: 180,
    hillFar: '#302e46', hillNear: '#222132', hillShadow: '#171623',
    tree: '#1b1a28', treeDark: '#11101a', trunk: '#18151a',
    cloth: '#5d2f3f', clothLine: '#3d1f2a', clothPattern: false,
    flower: [],
    flag: [],
    mood: 'night', particle: 'ember', bunting: false, scenery: 'waste',
  },
  diamond: {
    tint: '#e6f3f4', deep: '#bddcdf', line: '#7fa9af', accent: '#5d8e96',
    skyTop: '#101320', skyMid: '#1b1929', skyLow: '#2d1d29',
    sun: '#e7c9b1', sunLine: '#a96a5e', sunX: 1210, sunY: 176,
    hillFar: '#1e1e2c', hillNear: '#13131d', hillShadow: '#0b0b12',
    tree: '#11111a', treeDark: '#090910', trunk: '#0d0c11',
    cloth: '#2f2b38', clothLine: '#191822', clothPattern: false,
    flower: [],
    flag: [],
    mood: 'storm', particle: 'ash', bunting: false, scenery: 'waste',
  },
};

/* Table geometry: a paper tabletop low in the frame, so the chapter scenery
   keeps the top two thirds of the sheet instead of the board eating it. */
const TABLE = { cx: 800, cy: 884, rx: 520, ry: 226 };
const TABLE_TOP = TABLE.cy - TABLE.ry;

function tableDefs(p) {
  const extra = `
    <linearGradient id='t-sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='${p.skyTop}'/>
      <stop offset='.52' stop-color='${p.skyMid}'/>
      <stop offset='1' stop-color='${p.skyLow}'/>
    </linearGradient>
    <radialGradient id='t-sun-glow'>
      <stop offset='0' stop-color='${p.sun}' stop-opacity='.6'/>
      <stop offset='.5' stop-color='${p.sun}' stop-opacity='.18'/>
      <stop offset='1' stop-color='${p.sun}' stop-opacity='0'/>
    </radialGradient>
    <pattern id='t-gingham' width='52' height='52' patternUnits='userSpaceOnUse'>
      <rect width='52' height='52' fill='${p.cloth}'/>
      <rect width='26' height='52' fill='${p.clothLine}' opacity='.28'/>
      <rect width='52' height='26' fill='${p.clothLine}' opacity='.28'/>
      <rect width='26' height='26' fill='${p.clothLine}' opacity='.14'/>
    </pattern>
    <pattern id='t-hatch' width='9' height='9' patternUnits='userSpaceOnUse' patternTransform='rotate(36)'>
      <path d='M0 0v9' stroke='#4b3d2c' stroke-width='1' opacity='.22'/>
    </pattern>
    <clipPath id='t-table'><ellipse cx='${TABLE.cx}' cy='${TABLE.cy}' rx='${TABLE.rx}' ry='${TABLE.ry}'/></clipPath>
    <clipPath id='t-hill-far'><path d='${hillPath('far', p)}'/></clipPath>
    <clipPath id='t-hill-near'><path d='${hillPath('near', p)}'/></clipPath>
  `;
  return defs('t').replace('</defs>', `${extra}</defs>`);
}

function hillPath(which, p) {
  if (which === 'far') {
    return `M0 500 Q 190 420 410 478 T 820 468 T 1210 482 T 1600 436 L1600 1000 L0 1000 Z`;
  }
  return `M0 588 Q 250 510 520 566 T 980 552 T 1600 510 L1600 1000 L0 1000 Z`;
}

function cloud(cx, cy, scale, fill, opacity = 1) {
  return `<g transform='translate(${f(cx)} ${f(cy)}) scale(${scale})' opacity='${opacity}'>
    <ellipse cx='7' cy='10' rx='74' ry='25' fill='#7e6c54' opacity='.12'/>
    <ellipse cx='0' cy='0' rx='72' ry='27' fill='${fill}'/>
    <circle cx='-34' cy='-12' r='30' fill='${fill}'/>
    <circle cx='8' cy='-26' r='41' fill='${fill}'/>
    <circle cx='48' cy='-8' r='26' fill='${fill}'/>
    <path d='M-96 8 Q-80 26 -48 22' fill='none' stroke='#fffdf8' stroke-width='4' opacity='.4'/>
  </g>`;
}

function sunAndSky(p) {
  const dark = p.mood === 'night' || p.mood === 'storm';
  let g = `<rect width='${W}' height='${H}' fill='url(#t-sky)'/>`;
  g += `<circle cx='${p.sunX}' cy='${p.sunY}' r='205' fill='url(#t-sun-glow)'/>`;
  if (!dark) {
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + .1;
      g += `<path d='M${f(p.sunX + Math.cos(a) * 94)} ${f(p.sunY + Math.sin(a) * 94)} L${f(p.sunX + Math.cos(a) * 136)} ${f(p.sunY + Math.sin(a) * 136)}' stroke='${p.sunLine}' stroke-width='3' opacity='.22' stroke-linecap='round'/>`;
    }
  }
  g += `<circle cx='${p.sunX + 5}' cy='${p.sunY + 9}' r='72' fill='#5a4426' opacity='.12'/>`;
  g += `<circle cx='${p.sunX}' cy='${p.sunY}' r='72' fill='${p.sun}' stroke='${p.sunLine}' stroke-width='2' opacity='.96'/>`;
  g += `<circle cx='${p.sunX - 20}' cy='${p.sunY - 18}' r='24' fill='#fff8dc' opacity='${dark ? .18 : .38}'/>`;
  if (dark) {
    for (let i = 0; i < 8; i += 1) {
      const a = rnd() * Math.PI * 2;
      const r = 16 + rnd() * 52;
      g += `<circle cx='${f(p.sunX + Math.cos(a) * r)}' cy='${f(p.sunY + Math.sin(a) * r)}' r='${f(3 + rnd() * 9)}' fill='#8a7561' opacity='.22'/>`;
    }
  }
  // Paper clouds by day, a few low wisps at dusk.
  const cloudCount = p.mood === 'day' ? 5 : p.mood === 'golden' ? 3 : p.mood === 'dusk' ? 3 : 0;
  const cloudInk = p.mood === 'day' ? '#fffdf6' : p.mood === 'golden' ? '#fff1d6' : '#cbb6b0';
  for (let i = 0; i < cloudCount; i += 1) {
    const cx = 90 + rnd() * 1420;
    const cy = 90 + rnd() * 270;
    cloud(cx, cy, .6 + rnd() * .9, cloudInk, .55 + rnd() * .35);
  }
  if (p.mood === 'night') {
    for (let i = 0; i < 46; i += 1) {
      const x = rnd() * W; const y = 20 + rnd() * 430;
      const s = .6 + rnd() * 1.5;
      g += `<path d='M${f(x)} ${f(y - 5 * s)}l${f(1.4 * s)} ${f(3.2 * s)} ${f(5 * s)} ${f(1.4 * s)}-${f(3.2 * s)} ${f(3.4 * s)}-${f(1.4 * s)} ${f(5 * s)}-${f(1.4 * s)}-${f(5 * s)}-${f(3.2 * s)}-${f(3.4 * s)} ${f(5 * s)}-${f(1.4 * s)}z' fill='#f7ebc8' opacity='${(.25 + rnd() * .5).toFixed(2)}'/>`;
    }
  }
  if (p.mood === 'storm') {
    g += `<path d='M330 130 L400 120 L360 210 L430 190 L350 300' fill='none' stroke='#c25b5b' stroke-width='3' opacity='.4'/>`;
    for (let i = 0; i < 34; i += 1) {
      g += `<circle cx='${f(rnd() * W)}' cy='${f(20 + rnd() * 430)}' r='${f(rnd() * 2.2)}' fill='#f0c9b0' opacity='${(.2 + rnd() * .4).toFixed(2)}'/>`;
    }
  }
  return g;
}

function birds(p) {
  let g = '';
  const dark = p.mood === 'night' || p.mood === 'storm';
  for (let i = 0; i < (dark ? 4 : 6); i += 1) {
    const x = 160 + rnd() * 1220;
    const y = 180 + rnd() * 240;
    const s = .6 + rnd() * .8;
    if (p.mood === 'day' || p.mood === 'golden') {
      g += `<path d='M${f(x - 16 * s)} ${f(y)} Q${f(x - 8 * s)} ${f(y - 12 * s)} ${f(x)} ${f(y)} Q${f(x + 8 * s)} ${f(y - 12 * s)} ${f(x + 16 * s)} ${f(y)}' fill='none' stroke='${p.treeDark}' stroke-width='${f(2.2 * s)}' opacity='.4' stroke-linecap='round'/>`;
    } else {
      const s2 = .7 + rnd() * .7;
      g += `<path d='M${f(x - 18 * s2)} ${f(y)} Q${f(x - 6 * s2)} ${f(y - 14 * s2)} ${f(x)} ${f(y - 2 * s2)} Q${f(x + 6 * s2)} ${f(y - 14 * s2)} ${f(x + 18 * s2)} ${f(y)}' fill='#18131a' opacity='.6'/>`;
    }
  }
  return g;
}

function hills(p) {
  let g = '';
  g += `<path d='${hillPath('far', p)}' transform='translate(0 14)' fill='${p.hillShadow}' opacity='.28'/>`;
  g += `<path d='${hillPath('far', p)}' fill='${p.hillFar}'/>`;
  g += `<g clip-path='url(#t-hill-far)'><rect y='380' width='${W}' height='320' fill='url(#t-hatch)' opacity='.35'/></g>`;
  g += `<path d='${hillPath('near', p)}' transform='translate(0 18)' fill='${p.hillShadow}' opacity='.32'/>`;
  g += `<path d='${hillPath('near', p)}' fill='${p.hillNear}'/>`;
  g += `<g clip-path='url(#t-hill-near)'><rect y='480' width='${W}' height='340' fill='url(#t-hatch)' opacity='.28'/></g>`;
  return g;
}

function tree(x, y, scale, p) {
  const dark = p.mood === 'night' || p.mood === 'storm' || p.mood === 'dusk';
  if (dark) {
    return `<g transform='translate(${f(x)} ${f(y)}) scale(${scale})' stroke='${p.treeDark}' fill='none' stroke-linecap='round'>
      <path d='M0 0 L0 -96 M0 -58 L-34 -94 M0 -72 L34 -114 M0 -40 L-42 -62 M0 -30 L40 -72' stroke-width='7'/>
      <path d='M0 -58 L-22 -78 M0 -40 L20 -60' stroke-width='4' opacity='.7'/>
    </g>`;
  }
  return `<g transform='translate(${f(x)} ${f(y)}) scale(${scale})'>
    <ellipse cx='6' cy='8' rx='52' ry='16' fill='${p.hillShadow}' opacity='.24'/>
    <path d='M-7 0 L-4 -70 L6 -70 L8 0 Z' fill='${p.trunk}'/>
    <circle cx='-26' cy='-76' r='34' fill='${p.tree}'/>
    <circle cx='12' cy='-96' r='42' fill='${p.tree}'/>
    <circle cx='40' cy='-70' r='30' fill='${p.treeDark}'/>
    <circle cx='-44' cy='-54' r='22' fill='${p.treeDark}'/>
    <circle cx='-16' cy='-108' r='20' fill='#fffdf2' opacity='.16'/>
  </g>`;
}

function flowers(x, y, p) {
  let g = `<g transform='translate(${f(x)} ${f(y)})'>`;
  for (let i = 0; i < 6; i += 1) {
    const fx = j(36); const fy = -rnd() * 26; const s = .7 + rnd() * .6;
    const color = p.flower[i % p.flower.length];
    g += `<path d='M${f(fx)} 0 Q${f(fx - 2)} ${f(fy / 2)} ${f(fx)} ${f(fy)}' stroke='${p.treeDark}' stroke-width='2' fill='none'/>`;
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2;
      g += `<circle cx='${f(fx + Math.cos(a) * 5 * s)}' cy='${f(fy + Math.sin(a) * 5 * s)}' r='${f(4 * s)}' fill='${color}'/>`;
    }
    g += `<circle cx='${f(fx)}' cy='${f(fy)}' r='${f(2.4 * s)}' fill='#f4c84f'/>`;
  }
  return `${g}</g>`;
}

function bunting(p) {
  if (!p.bunting) return '';
  let g = `<path d='M40 82 Q420 130 800 96 T1560 78' fill='none' stroke='${p.treeDark}' stroke-width='2.2' opacity='.45'/>`;
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const x = 50 + t * 1500;
    const y = 82 + Math.sin(t * Math.PI * 2.4) * 18 + 8;
    const color = p.flag[i % p.flag.length];
    g += `<path d='M${f(x - 19)} ${f(y)} L${f(x + 19)} ${f(y + 2)} L${f(x)} ${f(y + 42)} Z' fill='${color}' stroke='${p.clothLine}' stroke-width='1' opacity='.9'/>`;
  }
  return g;
}

function particles(p) {
  let g = '';
  if (p.particle === 'petal') {
    for (let i = 0; i < 26; i += 1) {
      const x = rnd() * W; const y = 120 + rnd() * 440;
      const c = p.flower[i % p.flower.length];
      g += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='${f(4 + rnd() * 4)}' ry='${f(2 + rnd() * 2)}' fill='${c}' opacity='${(.35 + rnd() * .35).toFixed(2)}' transform='rotate(${f(rnd() * 180)} ${f(x)} ${f(y)})'/>`;
    }
  } else if (p.particle === 'pollen') {
    for (let i = 0; i < 30; i += 1) {
      const x = rnd() * W; const y = 140 + rnd() * 460;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(1.4 + rnd() * 2.2)}' fill='#f6df9a' opacity='${(.3 + rnd() * .4).toFixed(2)}'/>`;
    }
  } else if (p.particle === 'dust') {
    for (let i = 0; i < 30; i += 1) {
      const x = rnd() * W; const y = 150 + rnd() * 420;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(1 + rnd() * 1.7)}' fill='${rnd() > .5 ? '#f7dfb2' : '#e6c088'}' opacity='${(.24 + rnd() * .28).toFixed(2)}'/>`;
    }
  } else if (p.particle === 'firefly') {
    for (let i = 0; i < 18; i += 1) {
      const x = rnd() * W; const y = 260 + rnd() * 340;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(8 + rnd() * 8)}' fill='#f1d58a' opacity='.09'/>`;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(1.6 + rnd() * 1.6)}' fill='#ffe9a6' opacity='.65'/>`;
    }
  } else if (p.particle === 'ember') {
    for (let i = 0; i < 32; i += 1) {
      const x = rnd() * W; const y = 120 + rnd() * 500;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(1.2 + rnd() * 2.4)}' fill='${rnd() > .5 ? '#e0874f' : '#f0c47a'}' opacity='${(.3 + rnd() * .45).toFixed(2)}'/>`;
    }
  } else {
    for (let i = 0; i < 38; i += 1) {
      const x = rnd() * W; const y = 80 + rnd() * 560;
      g += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(.8 + rnd() * 2)}' fill='${rnd() > .4 ? '#8c8998' : '#c25b5b'}' opacity='${(.18 + rnd() * .4).toFixed(2)}'/>`;
    }
  }
  return g;
}

/** Wind-combed sand ripples: the gobi shelf behind chapter two. */
function dunes(p) {
  let g = '';
  for (let i = 0; i < 30; i += 1) {
    const x = 30 + rnd() * (W - 90);
    const y = 492 + rnd() * 148;
    const len = 46 + rnd() * 96;
    g += `<path d='M${f(x)} ${f(y)} Q${f(x + len / 2)} ${f(y - 10 - rnd() * 12)} ${f(x + len)} ${f(y)}' fill='none' stroke='${p.hillShadow}' stroke-width='${f(1.2 + rnd() * 1.3)}' opacity='${(.14 + rnd() * .16).toFixed(2)}' stroke-linecap='round'/>`;
  }
  return g;
}

/** Paper-cut boulders for the desert and the dark chapters. */
function rocks(p, count = 4) {
  let g = '';
  for (let i = 0; i < count; i += 1) {
    const x = 90 + rnd() * (W - 180);
    const y = 578 + rnd() * 60;
    const s = 18 + rnd() * 32;
    g += `<ellipse cx='${f(x + 4)}' cy='${f(y + 5)}' rx='${f(s * 1.05)}' ry='${f(s * .3)}' fill='${p.hillShadow}' opacity='.3'/>`;
    g += `<path d='M${f(x - s)} ${f(y)} L${f(x - s * .45)} ${f(y - s * .74)} L${f(x + s * .22)} ${f(y - s * .56)} L${f(x + s)} ${f(y)} Z' fill='${p.hillFar}' stroke='${p.line}' stroke-width='1.5'/>`;
    g += `<path d='M${f(x - s * .45)} ${f(y - s * .74)} L${f(x + s * .22)} ${f(y - s * .56)}' stroke='#fffdf4' stroke-width='1.3' opacity='.38'/>`;
  }
  return g;
}

/** A bare desert shrub: five pencil strokes and a shadow. */
function shrub(x, y, scale, p) {
  return `<g transform='translate(${f(x)} ${f(y)}) scale(${scale})' stroke='${p.treeDark}' fill='none' stroke-linecap='round'>
    <path d='M0 0 L0 -40 M0 -18 L-26 -38 M0 -26 L24 -50 M0 -10 L-18 -14 M0 -32 L18 -30' stroke-width='4'/>
    <path d='M-26 -38 L-34 -52 M24 -50 L30 -62 M18 -30 L26 -40' stroke-width='2.4'/>
  </g>`;
}

function tableGrain(kind, p) {
  let g = '';
  if (kind === 'wood') {
    for (let x = TABLE.cx - TABLE.rx + 70; x < TABLE.cx + TABLE.rx - 40; x += 138) {
      g += `<path d='M${f(x + j(9))} ${f(TABLE_TOP + 30)} Q${f(x + 12 + j(12))} ${f(TABLE_TOP + 190)} ${f(x - 5 + j(10))} ${H}' fill='none' stroke='${p.deep}' stroke-width='${f(3.4 + rnd() * 1.8)}' opacity='.4'/>`;
      g += `<path d='M${f(x + 13)} ${f(TABLE_TOP + 44)} Q${f(x + 20)} ${f(TABLE_TOP + 204)} ${f(x + 6)} ${H - 12}' fill='none' stroke='#fff9ec' stroke-width='1.6' opacity='.36'/>`;
    }
    for (let y = TABLE_TOP + 58; y < H; y += 46) {
      g += `<path d='M${TABLE.cx - TABLE.rx + 30} ${f(y + j(4))} Q${TABLE.cx - 320} ${f(y - 12 + j(8))} ${TABLE.cx} ${f(y + j(6))} T${TABLE.cx + TABLE.rx - 20} ${f(y - 8 + j(6))}' fill='none' stroke='${p.line}' stroke-width='1' opacity='${(.06 + rnd() * .08).toFixed(2)}'/>`;
    }
    for (let i = 0; i < 3; i += 1) {
      const kx = TABLE.cx - 280 + rnd() * 560; const ky = TABLE_TOP + 110 + rnd() * 160;
      g += `<ellipse cx='${f(kx)}' cy='${f(ky)}' rx='${f(14 + rnd() * 9)}' ry='${f(6 + rnd() * 5)}' fill='none' stroke='${p.line}' stroke-width='2' opacity='.4'/>`;
    }
  } else if (kind === 'stone') {
    for (let i = 0; i < 6; i += 1) {
      let x = TABLE.cx - TABLE.rx + 60 + rnd() * (TABLE.rx * 2 - 120); let y = TABLE_TOP + 12;
      const pts = [[x, y]];
      while (y < H) { x += j(42); y += 50 + rnd() * 40; pts.push([Math.max(TABLE.cx - TABLE.rx + 30, Math.min(TABLE.cx + TABLE.rx - 30, x)), y]); }
      g += `<path d='M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}' fill='none' stroke='${p.line}' stroke-width='${f(1.5 + rnd() * 1.4)}' opacity='.36'/>`;
    }
    for (let i = 0; i < 7; i += 1) {
      g += `<ellipse cx='${f(TABLE.cx - TABLE.rx + 90 + rnd() * (TABLE.rx * 2 - 180))}' cy='${f(TABLE_TOP + 50 + rnd() * 210)}' rx='${f(30 + rnd() * 60)}' ry='${f(12 + rnd() * 22)}' fill='${p.deep}' opacity='.07'/>`;
    }
  } else if (kind === 'iron') {
    for (let y = TABLE_TOP + 20; y < H; y += 28) {
      g += `<path d='M${TABLE.cx - TABLE.rx + 40} ${f(y + j(2))} L${TABLE.cx + TABLE.rx - 40} ${f(y + j(2))}' stroke='${rnd() > .6 ? '#fff9ec' : p.deep}' stroke-width='1' opacity='${(.05 + rnd() * .07).toFixed(2)}'/>`;
    }
    for (let x = TABLE.cx - TABLE.rx + 80; x < TABLE.cx + TABLE.rx - 60; x += 118) {
      g += `<circle cx='${f(x + j(4))}' cy='${f(TABLE_TOP + 26)}' r='${f(4.5 + rnd())}' fill='${p.deep}' stroke='${p.line}' stroke-width='1.1'/>`;
    }
  } else if (kind === 'gold') {
    for (let i = 0; i < 4; i += 1) {
      const cx = TABLE.cx - 300 + i * 200; const cy = TABLE_TOP + 150 + (i % 2) * 46;
      g += `<path d='M${cx - 96} ${cy + 62} Q${cx} ${cy - 64} ${cx + 96} ${cy + 62}' fill='none' stroke='${p.accent}' stroke-width='2' opacity='.26'/>`;
      g += `<path d='M${cx} ${cy - 38} L${cx + 44} ${cy} L${cx} ${cy + 38} L${cx - 44} ${cy} Z' fill='none' stroke='${p.deep}' stroke-width='1.4' opacity='.3'/>`;
    }
  } else {
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2 + .25;
      g += `<path d='M${TABLE.cx} ${TABLE_TOP + 150} L${f(TABLE.cx + Math.cos(a) * (TABLE.rx + 30))} ${f(TABLE_TOP + 150 + Math.sin(a) * (TABLE.ry + 20))}' stroke='${p.line}' stroke-width='1.4' opacity='.18'/>`;
    }
  }
  return g;
}

function table(p, kind) {
  const { cx, cy, rx, ry } = TABLE;
  let g = '';
  g += `<ellipse cx='${cx}' cy='${cy + 54}' rx='${rx + 16}' ry='${ry}' fill='#3a2c1f' opacity='.16' filter='url(#t-soft)'/>`;
  g += `<ellipse cx='${cx}' cy='${cy + 6}' rx='${rx + 34}' ry='${ry + 32}' fill='${p.clothPattern ? 'url(#t-gingham)' : p.cloth}' stroke='${p.clothLine}' stroke-width='3.5'/>`;
  g += `<ellipse cx='${cx}' cy='${cy + 2}' rx='${rx + 34}' ry='${ry + 32}' fill='none' stroke='#fffdf4' stroke-width='1.4' opacity='.28' stroke-dasharray='7 10'/>`;
  g += `<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' fill='${p.tint}' stroke='${p.line}' stroke-width='5.5'/>`;
  g += `<path d='M${cx - rx + 50} ${cy - ry + 48} Q${cx} ${cy - ry - 14} ${cx + rx - 56} ${cy - ry + 52}' fill='none' stroke='#fffdf4' stroke-width='4' opacity='.6'/>`;
  g += `<g clip-path='url(#t-table)'>
    <rect x='${cx - rx}' y='${cy - ry}' width='${rx * 2}' height='${ry * 2}' fill='url(#t-hatch)' opacity='.3'/>
    ${tableGrain(kind, p)}
  </g>`;
  g += `<ellipse cx='${cx}' cy='${cy - 34}' rx='${f(rx * .62)}' ry='${f(ry * .56)}' fill='none' stroke='${p.accent}' stroke-width='2.6' stroke-dasharray='17 12' opacity='.32'/>`;
  g += `<ellipse cx='${cx}' cy='${cy - 34}' rx='${f(rx * .53)}' ry='${f(ry * .45)}' fill='none' stroke='${p.line}' stroke-width='1.2' opacity='.2'/>`;
  g += `<path d='M${cx} ${cy - 58} L${cx + 22} ${cy - 34} L${cx} ${cy - 10} L${cx - 22} ${cy - 34} Z' fill='none' stroke='${p.accent}' stroke-width='2' opacity='.38'/>`;
  if (p.mood === 'day' || p.mood === 'golden') {
    g += `<ellipse cx='${cx}' cy='${cy - ry + 70}' rx='${f(rx * .9)}' ry='${f(ry * .55)}' fill='#fff8dc' opacity='.13'/>`;
  }
  return g;
}

/** A paper tabletop low in the frame, with chapter scenery above. */
function tableScene(kind, p) {
  let g = sunAndSky(p);
  g += birds(p);
  g += hills(p);
  if (p.scenery === 'desert') {
    g += dunes(p);
    for (let i = 0; i < 3; i += 1) g += shrub(190 + i * 470 + j(60), 604 + rnd() * 26, .9 + rnd() * .5, p);
    g += rocks(p, 4);
  } else {
    const treeCount = p.scenery === 'meadow' ? 5 : 3;
    for (let i = 0; i < treeCount; i += 1) {
      g += tree(70 + i * 330 + j(50), 548 + rnd() * 40, .7 + rnd() * .55, p);
    }
    if (p.flower.length) {
      for (let i = 0; i < 4; i += 1) g += flowers(140 + i * 360 + j(40), 592 + rnd() * 30, p);
    }
    if (p.scenery === 'waste') g += rocks(p, 4);
  }
  g += particles(p);
  g += bunting(p);
  g += table(p, kind);
  // Paper folds run across the whole sheet, including the table.
  g += `<g opacity='.62'>${creases(9, { id: 't' })}</g>`;
  // Lifted paper corners.
  g += `<path d='M0 0 l120 10 -110 108 Z' fill='#b7a383' opacity='.2'/><path d='M0 0 l120 10' stroke='#fffdf4' stroke-width='3' opacity='.35'/>`;
  g += `<path d='M${W} 0 l-120 10 110 108 Z' fill='#b7a383' opacity='.18'/>`;
  g += `<path d='M0 ${H} l128 -12 -118 -110 Z' fill='#cbb694' opacity='.18'/>`;
  g += `<path d='M${W} ${H} l-128 -12 118 -110 Z' fill='#cbb694' opacity='.16'/>`;
  // A little shade where the table meets the ground.
  g += `<rect y='${H - 150}' width='${W}' height='150' fill='#a89372' opacity='.04'/>`;
  g += `<rect width='${W}' height='${H}' fill='url(#t-edge)'/>`;
  g += `<rect width='${W}' height='${H}' filter='url(#t-grain)'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'>${tableDefs(p)}${g}</svg>`;
}

for (const [kind, p] of Object.entries(TABLES)) {
  save(`tables/${kind}.svg`, tableScene(kind, p));
}

// A narrow strip of torn masking tape, reused by the stylesheet.
save('tape.svg', `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='34' viewBox='0 0 120 34'>
  <path d='M3 5 L20 2 L38 6 L58 1 L78 5 L97 2 L117 6 L115 29 L98 32 L78 28 L58 33 L37 29 L19 32 L3 28 Z' fill='#e7d8b4' opacity='.86'/>
  <path d='M3 5 L20 2 L38 6 L58 1 L78 5 L97 2 L117 6 L115 29 L98 32 L78 28 L58 33 L37 29 L19 32 L3 28 Z' fill='none' stroke='#b8a37a' stroke-width='.8' opacity='.55'/>
  <path d='M14 9 L16 27 M34 8 L35 28 M54 7 L56 29 M74 8 L76 28 M94 7 L95 28' stroke='#c8b58d' stroke-width='.7' opacity='.5'/>
</svg>`);

console.log('paper sheets ready');
