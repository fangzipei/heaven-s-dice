// tools/gen-art.mjs — 手绘折纸风美术批量生成：骰子(完整/六面/缩略)、骰桶、物品、角色缩略图。
// 用法：node tools/gen-art.mjs  → 输出到 assets/art/
import fs from 'node:fs';
import path from 'node:path';
const R = process.cwd();
const rd = (p) => fs.readFileSync(path.join(R, p), 'utf8');
const out = (p, s) => { const f = path.join(R, 'assets/art', p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const j = (n = 2) => (rnd() - 0.5) * 2 * n;
const INK = '#2a2018';
const wob = (pts, n = 2.2) => 'M' + pts.map(([x, y]) => `${(x + j(n)).toFixed(1)} ${(y + j(n)).toFixed(1)}`).join('L') + 'Z';
const hatch = (x, y, w, h, c, n = 7) => Array.from({ length: n }, (_, i) => `<path d='M${x + (w / n) * i + j(1)} ${y + h} L${x + (w / n) * i + 10 + j(1)} ${y}' stroke='${c}' stroke-width='.9' opacity='.35'/>`).join('');
const shell = (w, h, vb, bg, body) => `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='${vb}'><rect width='100%' height='100%' fill='${bg}'/>${body}</svg>`;
/* 同一个图形再出一版去掉纸底色，供牌桌/商店这类贴图场景抠出来用。 */
const cut = (svg) => svg.replace(/<rect width='100%' height='100%' fill='[^']*'\/>/, '');
const RAR = { common: '#8a7d66', rare: '#5f8fa8', epic: '#8c6bb0', legendary: '#d49a3a' };
const manifest = { dice: [], barrels: [], items: [], portraits: [] };

/* ── 骰子：直接读 dice-skins.ts 的配色与纹章，和游戏数据保持一致 ── */
const sk = rd('src/render/dice-skins.ts');
const motifs = {};
for (const m of sk.matchAll(/^  (\w+): `([^`]*)`,/gm)) motifs[m[1]] = m[2];
const skins = {};
for (const m of sk.matchAll(/^  (\w+): S\(ramp\(([^)]*)\),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'(\w+)'/gm)) {
  const cols = [...m[2].matchAll(/#[0-9a-f]{6}/gi)].map((c) => c[0]);
  skins[m[1]] = { a: cols[0], mid: cols[1], b: cols[cols.length - 1], pip: m[3], accent: m[6], motif: m[7] };
}
const STOPS = [26, 50, 74];
const CELLS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]] };
let gid = 0;
function face(s, v, rar, favored) {
  const id = `g${gid++}`;
  const pips = CELLS[v].map(([r, c]) => `<circle cx='${STOPS[c] + j(1)}' cy='${STOPS[r] + j(1)}' r='${6.6 + j(.5)}' fill='${s.pip}'/><circle cx='${STOPS[c] - 2}' cy='${STOPS[r] - 2}' r='1.8' fill='#fff' opacity='.35'/>`).join('');
  const mot = `<g transform='translate(18 18) scale(.64)' color='${s.accent}' opacity='${favored ? .42 : .2}'>${motifs[s.motif] || ''}</g>`;
  const body = wob([[7, 9], [93, 6], [95, 92], [5, 94]], 2.4);
  return `<defs><linearGradient id='${id}' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${s.a}'/><stop offset='.5' stop-color='${s.mid}'/><stop offset='1' stop-color='${s.b}'/></linearGradient></defs>`
    + `<path d='${body}' transform='translate(4 5)' fill='${INK}' opacity='.35'/><path d='${body}' fill='url(#${id})' stroke='${INK}' stroke-width='3' stroke-linejoin='round'/>`
    + `<path d='${wob([[13, 15], [87, 12], [89, 86], [11, 88]], 1.6)}' fill='none' stroke='${RAR[rar] || RAR.common}' stroke-width='2' stroke-dasharray='6 3'/>`
    + hatch(10, 10, 80, 80, s.b, 9) + mot + pips + `<path d='M95 78 L82 92 L96 93Z' fill='${INK}' opacity='.28'/>`;
}
const ONLY_DICE = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const diceIds = [...fs.readdirSync(path.join(R, 'src/content/dice')).filter((f) => f !== 'index.ts').map((f) => f.slice(0, -3)), 'standard'];
for (const id of diceIds) {
  if (ONLY_DICE.length && !ONLY_DICE.includes(id)) continue;
  const s = skins[id]; if (!s) { console.warn('no skin', id); continue; }
  const savedSeed = seed;
  const src = rd(id === 'standard' ? 'src/content/standard_die.ts' : `src/content/dice/${id}.ts`);
  const rar = (src.match(/rarity:\s*'(\w+)'/) || [])[1] || 'common';
  let probs = [1, 1, 1, 1, 1, 1];
  try { probs = new Function('return ' + src.match(/probs:\s*(\[[^\]]*\])/)[1])(); } catch {}
  const peak = probs.indexOf(Math.max(...probs)) + 1;
  const fav = (v) => probs[v - 1] >= 0.2;
  const full = shell(512, 512, '0 0 100 100', '#cdb98f', face(s, peak, rar, true));
  out(`dice/${id}-full.svg`, full);
  out(`dice/${id}-full-cut.svg`, cut(full));
  out(`dice/${id}-thumb.svg`, shell(96, 96, '0 0 100 100', '#cdb98f', face(s, peak, rar, true)));
  const sheet = [1, 2, 3, 4, 5, 6].map((v, i) => `<g transform='translate(${(i % 3) * 104 + 4} ${Math.floor(i / 3) * 104 + 4})'>${face(s, v, rar, fav(v))}</g>`).join('');
  const faces = shell(624, 416, '0 0 316 212', '#cdb98f', sheet);
  out(`dice/${id}-faces.svg`, faces);
  out(`dice/${id}-faces-cut.svg`, cut(faces));
  manifest.dice.push({ id, rarity: rar, peak });
  /* 标准骰是后来补的，别让它挪动骰桶/道具/桌面的既有随机序列。 */
  if (id === 'standard') seed = savedSeed;
}

/* ── 骰桶：十三只，各有不同的轮廓色与徽记 ── */
const EM = {
  oak: (c) => `<path d='M26 48H74M25 66H75' stroke='${INK}' stroke-width='3'/><path d='M40 28V82M60 28V82' stroke='${INK}' stroke-width='1.2' opacity='.5'/>`,
  lead: (c) => `<circle cx='50' cy='56' r='13' fill='none' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='56' r='4' fill='${INK}'/><circle cx='32' cy='36' r='2.2' fill='${INK}'/><circle cx='68' cy='36' r='2.2' fill='${INK}'/>`,
  serpent: (c) => `<path d='M30 74Q40 40 50 60T70 40' fill='none' stroke='${INK}' stroke-width='4'/><circle cx='70' cy='40' r='3' fill='${INK}'/>`,
  astral: (c) => `<path d='M50 42l4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z' fill='#f2e2a0' stroke='${INK}' stroke-width='2'/><circle cx='32' cy='70' r='2' fill='#f2e2a0'/><circle cx='70' cy='36' r='2' fill='#f2e2a0'/>`,
  'wolf-totem': (c) => `<path d='M34 48L38 30 48 42H52L62 30 66 48 60 70H40Z' fill='#e8dcc0' stroke='${INK}' stroke-width='2.4'/><circle cx='44' cy='52' r='2.5' fill='${INK}'/><circle cx='56' cy='52' r='2.5' fill='${INK}'/>`,
  'demon-totem': (c) => `<path d='M32 46Q26 30 36 24Q34 38 44 44M68 46Q74 30 64 24Q66 38 56 44' fill='#2a1010' stroke='${INK}' stroke-width='2'/><path d='M40 58H60L50 78Z' fill='#ffb08a' stroke='${INK}' stroke-width='2'/>`,
  pentagram: (c) => `<path d='M50 36L58 66 34 48H66L42 66Z' fill='none' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='53' r='20' fill='none' stroke='${INK}' stroke-width='1.6'/>`,
  vortex: (c) => `<path d='M50 56m0 0q8-10 14 0t-14 14t-22-12t18-22t30 6' fill='none' stroke='${INK}' stroke-width='3.2'/>`,
  gilded: (c) => `<circle cx='42' cy='58' r='9' fill='#f3d27a' stroke='${INK}' stroke-width='2'/><circle cx='58' cy='54' r='9' fill='#f3d27a' stroke='${INK}' stroke-width='2'/><circle cx='50' cy='70' r='9' fill='#f3d27a' stroke='${INK}' stroke-width='2'/>`,
  marker: (c) => `<circle cx='50' cy='56' r='14' fill='#f0e4c8' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='56' r='4.5' fill='${INK}'/>`,
  guide: (c) => `<path d='M50 36L60 56 50 76 40 56Z' fill='#f0e4c8' stroke='${INK}' stroke-width='2.4'/><path d='M50 36V76M40 56H60' stroke='${INK}' stroke-width='1.4'/>`,
  brood: (c) => `<ellipse cx='40' cy='62' rx='7' ry='9' fill='#eee0c0' stroke='${INK}' stroke-width='2'/><ellipse cx='56' cy='58' rx='7' ry='9' fill='#eee0c0' stroke='${INK}' stroke-width='2'/><ellipse cx='50' cy='72' rx='7' ry='8' fill='#eee0c0' stroke='${INK}' stroke-width='2'/>`,
  singles: (c) => `<rect x='38' y='44' width='24' height='24' rx='3' fill='#f0e4c8' stroke='${INK}' stroke-width='2.6'/><circle cx='50' cy='56' r='4' fill='${INK}'/>`,
};
const BCOL = { oak: '#9a6a3a', lead: '#6a717a', serpent: '#5f8a5a', astral: '#4a4f86', 'wolf-totem': '#8a7458', 'demon-totem': '#8a2f2c', pentagram: '#6a3a70', vortex: '#4a8a96', gilded: '#c79a36', marker: '#b8503a', guide: '#3f7a6a', brood: '#a58a5a', singles: '#7a5a8a' };
for (const [art, col] of Object.entries(BCOL)) {
  const body = `<path d='${wob([[24, 84], [30, 24], [70, 24], [76, 84]], 2)}' transform='translate(4 4)' fill='${INK}' opacity='.35'/><path d='${wob([[24, 84], [30, 24], [70, 24], [76, 84]], 2)}' fill='${col}' stroke='${INK}' stroke-width='3' stroke-linejoin='round'/>`
    + hatch(28, 26, 44, 56, INK, 8) + `<ellipse cx='50' cy='24' rx='21' ry='6' fill='${INK}' opacity='.85'/>` + EM[art](col) + `<path d='M22 86H78' stroke='${INK}' stroke-width='3.4' stroke-linecap='round'/>`;
  const full = shell(512, 512, '0 0 100 100', '#cdb98f', body);
  out(`barrels/${art}-full.svg`, full);
  out(`barrels/${art}-cut.svg`, cut(full));
  out(`barrels/${art}-thumb.svg`, shell(96, 96, '0 0 100 100', '#cdb98f', body));
  /* 骰桶在牌桌上要当剪影用：裁到图形本身，留一点投影余量。 */
  out(`barrels/${art}-cup.svg`, `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='400' viewBox='18 16 64 74'>${body}</svg>`);
  manifest.barrels.push(art);
}

/* ── 物品：每个图标是不同的剪影；同图标的物品靠稀有度色带与色相区分 ── */
const I = {
  coin: (c) => `<circle cx='50' cy='50' r='26' fill='${c}' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='50' r='18' fill='none' stroke='${INK}' stroke-width='1.6'/><path d='M44 40l6 14 6-14M42 58h16' stroke='${INK}' stroke-width='2.4' fill='none'/>`,
  eye: (c) => `<path d='M12 50Q50 20 88 50Q50 80 12 50Z' fill='#efe3c4' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='50' r='13' fill='${c}' stroke='${INK}' stroke-width='2.4'/><circle cx='50' cy='50' r='5' fill='${INK}'/>`,
  glove: (c) => `<path d='M32 82V54L24 40l7-4 8 12V26l7-2 3 22V22h7l1 24 6-16 7 3-6 26 3 22Z' fill='${c}' stroke='${INK}' stroke-width='3' stroke-linejoin='round'/><path d='M32 70H72' stroke='${INK}' stroke-width='2'/>`,
  smoke: (c) => `<circle cx='38' cy='58' r='14' fill='${c}' stroke='${INK}' stroke-width='2.6'/><circle cx='58' cy='52' r='17' fill='${c}' stroke='${INK}' stroke-width='2.6'/><circle cx='50' cy='36' r='12' fill='${c}' stroke='${INK}' stroke-width='2.6'/><circle cx='50' cy='80' r='6' fill='${INK}'/>`,
  amulet: (c) => `<path d='M30 22Q50 8 70 22' fill='none' stroke='${INK}' stroke-width='2.4'/><path d='M50 30L70 54 50 84 30 54Z' fill='${c}' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='55' r='6' fill='#f4e8c8' stroke='${INK}' stroke-width='2'/>`,
  hourglass: (c) => `<path d='M30 20H70L54 50 70 80H30L46 50Z' fill='#efe3c4' stroke='${INK}' stroke-width='3'/><path d='M38 74H62L50 58Z' fill='${c}'/><path d='M26 20H74M26 80H74' stroke='${INK}' stroke-width='4'/>`,
  dagger: (c) => `<path d='M50 10L58 56H42Z' fill='#d6d8da' stroke='${INK}' stroke-width='3'/><path d='M30 58H70' stroke='${INK}' stroke-width='5'/><rect x='46' y='60' width='8' height='22' fill='${c}' stroke='${INK}' stroke-width='2.4'/><circle cx='50' cy='86' r='4' fill='${INK}'/>`,
  pouch: (c) => `<path d='M32 38Q20 60 30 80H70Q80 60 68 38Z' fill='${c}' stroke='${INK}' stroke-width='3'/><path d='M36 38L40 24H60L64 38' fill='${c}' stroke='${INK}' stroke-width='3'/><path d='M34 32H66' stroke='${INK}' stroke-width='3'/>`,
  cuff: (c) => `<rect x='22' y='34' width='56' height='32' rx='5' fill='${c}' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='50' r='9' fill='#f4e8c8' stroke='${INK}' stroke-width='2.4'/><path d='M22 42H78M22 58H78' stroke='${INK}' stroke-width='1.2' opacity='.5'/>`,
  'cracked-pouch': (c) => `<path d='M32 38Q20 60 30 80H70Q80 60 68 38Z' fill='${c}' stroke='${INK}' stroke-width='3'/><path d='M36 38L40 24H60L64 38' fill='${c}' stroke='${INK}' stroke-width='3'/><path d='M52 40L46 54 56 62 48 78' fill='none' stroke='${INK}' stroke-width='3'/>`,
  powder: (c) => `<path d='M34 40Q24 62 32 80H68Q76 62 66 40Z' fill='#e8dcc0' stroke='${INK}' stroke-width='3'/><path d='M38 40H62' stroke='${INK}' stroke-width='3'/><path d='M50 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM72 28l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z' fill='${c}' stroke='${INK}' stroke-width='1.4'/>`,
  salt: (c) => `<path d='M36 38H64L68 82H32Z' fill='#f4f0e6' stroke='${INK}' stroke-width='3'/><rect x='38' y='24' width='24' height='14' rx='4' fill='${c}' stroke='${INK}' stroke-width='3'/><circle cx='46' cy='30' r='1.4' fill='${INK}'/><circle cx='54' cy='30' r='1.4' fill='${INK}'/>`,
  scroll: (c) => `<rect x='28' y='24' width='44' height='52' fill='#efe3c4' stroke='${INK}' stroke-width='3'/><ellipse cx='28' cy='50' rx='5' ry='28' fill='${c}' stroke='${INK}' stroke-width='3'/><ellipse cx='72' cy='50' rx='5' ry='28' fill='${c}' stroke='${INK}' stroke-width='3'/><path d='M36 38H64M36 48H64M36 58H56' stroke='${INK}' stroke-width='1.8'/>`,
  edict: (c) => `<rect x='30' y='14' width='40' height='72' fill='#efe3c4' stroke='${INK}' stroke-width='3'/><circle cx='50' cy='62' r='11' fill='${c}' stroke='${INK}' stroke-width='2.6'/><path d='M38 28H62M38 38H62M38 46H56' stroke='${INK}' stroke-width='1.8'/>`,
  'shelf-barrel': (c) => `<path d='M18 76H82M18 44H82' stroke='${INK}' stroke-width='4'/><path d='M26 44V76M74 44V76' stroke='${INK}' stroke-width='3'/><rect x='30' y='48' width='16' height='26' rx='4' fill='${c}' stroke='${INK}' stroke-width='2.4'/><rect x='54' y='48' width='16' height='26' rx='4' fill='${c}' stroke='${INK}' stroke-width='2.4'/>`,
  'shelf-dice': (c) => `<path d='M18 82H82M18 56H82M18 30H82' stroke='${INK}' stroke-width='3.6'/><rect x='28' y='38' width='16' height='16' fill='${c}' stroke='${INK}' stroke-width='2.4'/><rect x='56' y='64' width='16' height='16' fill='${c}' stroke='${INK}' stroke-width='2.4'/><rect x='56' y='12' width='16' height='16' fill='${c}' stroke='${INK}' stroke-width='2.4'/>`,
  'shelf-item': (c) => `<rect x='20' y='22' width='60' height='60' fill='#efe3c4' stroke='${INK}' stroke-width='3'/><path d='M20 52H80M50 22V82' stroke='${INK}' stroke-width='2.4'/><circle cx='35' cy='37' r='3' fill='${c}'/><circle cx='65' cy='37' r='3' fill='${c}'/><circle cx='35' cy='67' r='3' fill='${c}'/><circle cx='65' cy='67' r='3' fill='${c}'/>`,
  bottle: (c) => `<path d='M42 14H58V34L68 52V82H32V52L42 34Z' fill='${c}' stroke='${INK}' stroke-width='3'/><rect x='42' y='8' width='16' height='8' fill='#b88a50' stroke='${INK}' stroke-width='2.4'/><path d='M36 62H64' stroke='#f4e8c8' stroke-width='3'/>`,
};
for (const f of fs.readdirSync(path.join(R, 'src/content/items'))) {
  if (f === 'index.ts') continue;
  const src = rd(`src/content/items/${f}`);
  const id = (src.match(/id:\s*'(\w+)'/) || [])[1]; const icon = (src.match(/icon:\s*'([\w-]+)'/) || [])[1];
  const rar = (src.match(/rarity:\s*'(\w+)'/) || [])[1] || 'common'; const type = (src.match(/type:\s*'(\w+)'/) || [])[1];
  if (!id || !I[icon]) { console.warn('skip item', f, icon); continue; }
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const c = `hsl(${h} 38% 58%)`;
  const plate = type === 'passive' ? wob([[8, 8], [92, 6], [94, 94], [6, 92]], 2) : null;
  const frame = plate ? `<path d='${plate}' fill='#d9c7a0' stroke='${RAR[rar]}' stroke-width='3'/>` : `<circle cx='50' cy='50' r='44' fill='#d9c7a0' stroke='${RAR[rar]}' stroke-width='3'/>`;
  const mark = Array.from({ length: (h % 5) + 1 }, (_, i) => `<circle cx='${50 - ((h % 5) * 5) + i * 10}' cy='92' r='2.4' fill='${RAR[rar]}'/>`).join('');
  const body = frame + `<g transform='translate(50 50) scale(.82) translate(-50 -50)'>${I[icon](c)}</g>` + mark;
  const full = shell(512, 512, '0 0 100 100', '#cdb98f', body);
  out(`items/${id}-full.svg`, full);
  out(`items/${id}-cut.svg`, cut(full));
  out(`items/${id}-thumb.svg`, shell(96, 96, '0 0 100 100', '#cdb98f', body));
  manifest.items.push({ id, icon, rarity: rar, type });
}

/* ── 角色：完整图沿用 paper 立绘，补缩略图 ── */
const pdir = path.join(R, 'assets/portraits/paper');
for (const f of fs.readdirSync(pdir).filter((x) => x.endsWith('.svg'))) {
  const art = f.slice(0, -4); const svg = fs.readFileSync(path.join(pdir, f), 'utf8');
  out(`portraits/${art}-full.svg`, svg);
  out(`portraits/${art}-thumb.svg`, svg.replace('<svg ', '<svg width="96" height="128" '));
  manifest.portraits.push(art);
}
/* ── 赌桌：整幕手绘桌面，首页、牌桌与图鉴共用同一张 ── */
const TAB = {
  wood: { wall: '#1d150e', wall2: '#0b0705', base: '#7c5735', deep: '#553922', light: '#c29866', ink: '#291b11', accent: '#e7bf86', kind: 'wood' },
  stone: { wall: '#171e1e', wall2: '#070a0a', base: '#61665c', deep: '#43473f', light: '#9ba195', ink: '#1f231e', accent: '#cbd3c6', kind: 'stone' },
  iron: { wall: '#1a1511', wall2: '#070504', base: '#525959', deep: '#373d3d', light: '#828c8a', ink: '#161a1a', accent: '#e6a66b', kind: 'iron' },
  gold: { wall: '#21190c', wall2: '#090603', base: '#8a692f', deep: '#61461c', light: '#d4ac61', ink: '#32240d', accent: '#ffe3a4', kind: 'gold' },
  diamond: { wall: '#0d1b20', wall2: '#04090b', base: '#406a70', deep: '#29484d', light: '#8fc7cb', ink: '#12272b', accent: '#d3f9fd', kind: 'diamond' },
};
const W = 1600;
const H = 1000;
const TOP = 232;
function tableGrain(p) {
  let g = '';
  if (p.kind === 'wood') {
    for (let x = 150; x < 1520; x += 165) {
      g += `<path d='M${x + j(7)} ${TOP + 34} Q${x + 10 + j(9)} 620 ${x - 6 + j(9)} ${H - 20}' fill='none' stroke='${p.deep}' stroke-width='${5 + j(1.5)}' opacity='.55'/>`;
      g += `<path d='M${x + 16} ${TOP + 48} Q${x + 24} 640 ${x + 8} ${H - 34}' fill='none' stroke='${p.light}' stroke-width='1.4' opacity='.2'/>`;
    }
    for (let y = TOP + 56; y < H; y += 31) {
      g += `<path d='M${20 + j(20)} ${y + j(3)} Q${420 + j(90)} ${y - 14 + j(8)} ${800 + j(90)} ${y + j(6)} T${1580 - j(20)} ${y - 8 + j(6)}' fill='none' stroke='${rnd() > .5 ? p.ink : p.light}' stroke-width='1' opacity='${(rnd() * .14 + .05).toFixed(2)}'/>`;
    }
    for (let i = 0; i < 4; i += 1) {
      const kx = 240 + rnd() * 1120;
      const ky = 430 + rnd() * 470;
      g += `<ellipse cx='${kx}' cy='${ky}' rx='${16 + rnd() * 12}' ry='${8 + rnd() * 6}' fill='none' stroke='${p.ink}' stroke-width='2.4' opacity='.4'/>`;
      g += `<ellipse cx='${kx}' cy='${ky}' rx='${7 + rnd() * 4}' ry='${4 + rnd() * 3}' fill='${p.ink}' opacity='.28'/>`;
    }
  }
  if (p.kind === 'stone') {
    for (let i = 0; i < 5; i += 1) {
      let x = 120 + rnd() * 1360; let y = TOP + 10;
      const pts = [[x, y]];
      while (y < H) { x += j(46); y += 52 + rnd() * 40; pts.push([Math.max(30, Math.min(1570, x)), y]); }
      g += `<path d='M${pts.map(([px, py]) => `${px.toFixed(0)} ${py.toFixed(0)}`).join('L')}' fill='none' stroke='${p.ink}' stroke-width='${1.4 + rnd() * 1.6}' opacity='.42'/>`;
    }
    for (let i = 0; i < 12; i += 1) {
      g += `<ellipse cx='${80 + rnd() * 1440}' cy='${TOP + 40 + rnd() * (H - TOP - 80)}' rx='${40 + rnd() * 90}' ry='${18 + rnd() * 40}' fill='${rnd() > .5 ? p.light : p.deep}' opacity='.07'/>`;
    }
  }
  if (p.kind === 'iron') {
    for (let y = TOP + 30; y < H; y += 13) {
      g += `<path d='M${16 + j(10)} ${y + j(3)} L${1584 + j(10)} ${y + j(3)}' stroke='${rnd() > .6 ? p.light : p.deep}' stroke-width='1' opacity='${(rnd() * .1 + .04).toFixed(2)}'/>`;
    }
    for (let x = 70; x < 1560; x += 118) {
      g += `<circle cx='${x + j(4)}' cy='${TOP + 26 + j(3)}' r='${5 + j(1)}' fill='${p.deep}' stroke='${p.ink}' stroke-width='1.2'/><circle cx='${x - 2}' cy='${TOP + 24}' r='1.4' fill='${p.light}' opacity='.6'/>`;
    }
    for (let i = 0; i < 5; i += 1) {
      g += `<ellipse cx='${160 + rnd() * 1280}' cy='${TOP + 90 + rnd() * 620}' rx='${30 + rnd() * 60}' ry='${12 + rnd() * 24}' fill='${p.accent}' opacity='.05'/>`;
    }
  }
  if (p.kind === 'gold') {
    for (let i = 0; i < 7; i += 1) {
      const cx = 200 + i * 200; const cy = 420 + (i % 2) * 70;
      g += `<path d='M${cx - 120} ${cy + 90} Q${cx} ${cy - 90} ${cx + 120} ${cy + 90}' fill='none' stroke='${p.accent}' stroke-width='2' opacity='.22'/>`;
      g += `<path d='M${cx} ${cy - 52} L${cx + 58} ${cy} L${cx} ${cy + 52} L${cx - 58} ${cy} Z' fill='none' stroke='${p.light}' stroke-width='1.6' opacity='.28'/>`;
    }
    for (let i = 0; i < 9; i += 1) {
      const sx = 130 + rnd() * 1340; const sy = 380 + rnd() * 560;
      g += `<path d='M${sx} ${sy - 9}l2.6 6.4L${sx + 9} ${sy}l-6.4 2.6L${sx} ${sy + 9}l-2.6-6.4L${sx - 9} ${sy}l6.4-2.6z' fill='${p.accent}' opacity='.3'/>`;
    }
  }
  if (p.kind === 'diamond') {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + .3;
      g += `<path d='M800 620 L${800 + Math.cos(a) * 760} ${620 + Math.sin(a) * 560}' stroke='${p.light}' stroke-width='1.6' opacity='.16'/>`;
    }
    for (let i = 0; i < 6; i += 1) {
      const cx = 160 + rnd() * 1280; const cy = TOP + 60 + rnd() * 640;
      g += `<path d='M${cx - 70} ${cy + 40} L${cx} ${cy - 46} L${cx + 74} ${cy + 30} Z' fill='${p.light}' opacity='${(rnd() * .07 + .03).toFixed(2)}'/>`;
      g += `<path d='M${cx - 70} ${cy + 40} L${cx} ${cy - 46} L${cx + 74} ${cy + 30}' fill='none' stroke='${p.ink}' stroke-width='1.2' opacity='.25'/>`;
    }
  }
  return g;
}
function tableScene(p) {
  let g = `<rect width='${W}' height='${H}' fill='${p.wall}'/>`;
  for (let i = 0; i < 9; i += 1) {
    const x = 30 + i * 190 + j(9);
    g += `<rect x='${x}' y='-10' width='${168 + j(10)}' height='${TOP + 40}' fill='${i % 2 ? p.wall2 : p.wall}' opacity='.7'/>`;
    g += `<path d='M${x + 8} -10 L${x + 12 + j(8)} ${TOP + 26}' stroke='${p.wall2}' stroke-width='${4 + j(2)}' opacity='.5'/>`;
  }
  for (let i = 0; i < 5; i += 1) {
    g += `<path d='M40 ${40 + i * 46} Q${760 + j(70)} ${24 + i * 46 + j(10)} ${1560} ${50 + i * 46}' fill='none' stroke='${p.wall2}' stroke-width='1.3' opacity='.55'/>`;
  }
  g += `<ellipse cx='800' cy='120' rx='560' ry='280' fill='${p.accent}' opacity='.06'/>`;
  const board = `M18 ${TOP} C 280 ${TOP - 24} 1320 ${TOP - 30} 1582 ${TOP + 2} L${W} ${H} L0 ${H} Z`;
  g += `<path d='${board}' transform='translate(0 18)' fill='${p.wall2}' opacity='.9'/>`;
  g += `<path d='${board}' fill='${p.base}' stroke='${p.ink}' stroke-width='9' stroke-linejoin='round'/>`;
  g += tableGrain(p);
  g += `<path d='M40 ${TOP + 22} C 300 ${TOP + 2} 1300 ${TOP - 4} 1560 ${TOP + 26}' fill='none' stroke='${p.light}' stroke-width='3' opacity='.3'/>`;
  g += `<path d='M54 ${TOP + 52} C 320 ${TOP + 32} 1280 ${TOP + 26} 1548 ${TOP + 56}' fill='none' stroke='${p.ink}' stroke-width='1.4' opacity='.3'/>`;
  /* 桌心彩绘：虚线圈 + 中心菱形，和旧桌面的 inlay 呼应。 */
  g += `<ellipse cx='800' cy='640' rx='470' ry='244' fill='none' stroke='${p.accent}' stroke-width='3' stroke-dasharray='16 11' opacity='.42'/>`;
  g += `<ellipse cx='800' cy='640' rx='414' ry='208' fill='none' stroke='${p.light}' stroke-width='1.4' opacity='.22'/>`;
  g += `<path d='M800 596 L836 640 L800 684 L764 640 Z' fill='none' stroke='${p.accent}' stroke-width='2.4' opacity='.34'/>`;
  g += `<ellipse cx='800' cy='620' rx='620' ry='340' fill='${p.accent}' opacity='.05'/>`;
  for (let i = 0; i < 4; i += 1) {
    g += `<ellipse cx='${180 + rnd() * 1240}' cy='${360 + rnd() * 570}' rx='${60 + rnd() * 120}' ry='${22 + rnd() * 46}' fill='${p.deep}' opacity='.09'/>`;
  }
  /* 折角：桌面四角的纸片翘起。 */
  g += `<path d='M18 ${TOP} l128 8 -118 122 Z' fill='${p.deep}' opacity='.55'/><path d='M18 ${TOP} l128 8' stroke='${p.light}' stroke-width='2' opacity='.35'/>`;
  g += `<path d='M1582 ${TOP + 2} l-126 12 118 118 Z' fill='${p.deep}' opacity='.45'/><path d='M1582 ${TOP + 2} l-126 12' stroke='${p.light}' stroke-width='2' opacity='.3'/>`;
  g += `<path d='M0 ${H} l120 -10 -112 -108 Z' fill='${p.deep}' opacity='.4'/>`;
  g += `<path d='M${W} ${H} l-120 -10 112 -108 Z' fill='${p.deep}' opacity='.35'/>`;
  g += `<path d='M360 1000 L520 260' stroke='${p.light}' stroke-width='2' opacity='.07'/>`;
  g += `<path d='M1200 1000 L1080 260' stroke='${p.wall2}' stroke-width='4' opacity='.14'/>`;
  g += `<defs><radialGradient id='tv' cx='.5' cy='.54' r='.74'><stop offset='.5' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.55'/></radialGradient></defs><rect width='${W}' height='${H}' fill='url(#tv)'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'>${g}</svg>`;
}
for (const [kind, p] of Object.entries(TAB)) out(`tables/${kind}.svg`, tableScene(p));

out('manifest.json', JSON.stringify(manifest, null, 2));
console.log(`dice=${manifest.dice.length} barrels=${manifest.barrels.length} items=${manifest.items.length} portraits=${manifest.portraits.length}`);
