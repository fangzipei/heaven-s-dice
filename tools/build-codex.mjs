/*
 * Builds docs/codex.html — a standalone catalogue of every die, dice cup and
 * item with the art the game actually uses.
 *
 *   node tools/build-codex.mjs
 *
 * Dice faces are rendered from the live skins in src/render/dice-skins.ts
 * (material ramp + carved motif + pips), cup/item art is inlined from assets/,
 * and every number comes straight from src/content/. Re-run after any content
 * change.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  DICE, STANDARD_DIE, DICE_SETS, BARRELS, ITEMS, LEVELS,
  RARITIES, SHOP_RARITY_WEIGHTS, REROLL_BONUS_RATE, OVERSHOOT_RATIO, OVERSHOOT_BONUS_RATE,
  BOSSES, LEVEL_CURVE, rarityShopWeight,
} from '../src/content/index.ts';
import { dieSkinStyle, dieMotifSvg } from '../src/render/dice-skins.ts';
import { pipPoints } from '../src/render/pip-layout.ts';
import { effectiveProbs } from '../src/core/engine.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'codex.html');

/* ── small helpers ────────────────────────────────────────────────────── */

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const pct = (p) => `${Math.round(p * 100)}%`;
const isDemon = (die) => die.setId === 'demon';

function readSvg(rel) {
  return readFileSync(join(ROOT, rel), 'utf8')
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

/* Inlined SVGs share one document — prefix their internal ids so gradients
   and masks can't collide between cards. */
function inlineSvg(rel, prefix) {
  const svg = readSvg(rel);
  const ids = [...new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))];
  let out = svg;
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(\\bid=")${safe}(")`, 'g'), `$1${prefix}-${id}$2`);
    out = out.replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${prefix}-${id})`);
    out = out.replace(new RegExp(`((?:xlink:)?href)="#${safe}"`, 'g'), `$1="#${prefix}-${id}"`);
  }
  return out;
}

const motifInner = (die) => (dieMotifSvg(die) || '')
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

/** One die face: material + carved watermark + pips (or the demon joker). */
function faceSvg(die, face, { big = false } = {}) {
  const wild = isDemon(die) && face === 1;
  const label = wild ? '恶魔赖子' : `${face} 点`;
  const pips = wild
    ? '<text class="wild-glyph" x="50" y="51" text-anchor="middle" dominant-baseline="central">魔</text>'
    : pipPoints(face).map(([x, y]) => `<circle class="pip" cx="${x}" cy="${y}" r="${big ? 10 : 9.5}"/>`).join('');
  return `<svg class="face-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(die.name)} ${label}">`
    + `<g class="die-motif"${big ? ' opacity=".38"' : ''}>${motifInner(die)}</g>${pips}</svg>`;
}

/* ── cards ────────────────────────────────────────────────────────────── */

function dieCard(spec, index) {
  const rarity = RARITIES[spec.rarity] || RARITIES.common;
  const set = DICE_SETS[spec.setId];
  const probs = spec.probs;
  const peak = probs.indexOf(Math.max(...probs)) + 1;
  const skin = dieSkinStyle(spec);
  const cls = ['art-die', `rarity-${spec.rarity}`, isDemon(spec) ? 'is-demon' : ''].filter(Boolean).join(' ');

  const faces = probs.map((p, i) => {
    const face = i + 1;
    return `<span class="mini${face === peak ? ' is-peak' : ''}" title="${isDemon(spec) && face === 1 ? '恶魔赖子' : face + ' 点'} · ${pct(p)}">`
      + `<span class="mini-face" style="${skin}">${faceSvg(spec, face)}</span>`
      + `<b>${isDemon(spec) && face === 1 ? '魔' : face}</b><em>${Math.round(p * 100)}</em></span>`;
  }).join('');

  const bonus = spec.bonus
    ? `<span class="effect"><b>${esc(spec.bonus.label.split('：')[0])}</b> · ${esc(spec.bonus.label.split('：').slice(1).join('：'))}</span>`
    : '<span class="effect none">无额外特性 · 只改变点数概率</span>';

  return `<article class="card die-card" data-die-id="${spec.id}" data-set="${spec.setId || 'none'}" data-rarity="${spec.rarity}" data-name="${esc(spec.name)}" data-order="${index}" style="--rarity:${rarity.color};--glow:${rarity.glow}">
    <div class="top"><span class="rarity">${rarity.name}</span><span class="price">${spec.price ? `${spec.price} 银币` : '初始骰'}</span></div>
    <div class="art-row">
      <div class="${cls}" style="${skin}" role="img" aria-label="${esc(spec.name)}，最高概率面 ${isDemon(spec) && peak === 1 ? '恶魔赖子' : peak + ' 点'}">
        ${faceSvg(spec, peak, { big: true })}
        <span class="die-sheen"></span>
      </div>
      <div class="faces" aria-label="六面概率">${faces}</div>
    </div>
    <h4>${esc(spec.name)}${set ? `<span class="set-chip" style="--set:${set.color}">${esc(set.name)}</span>` : '<span class="set-chip" style="--set:#8a7c66">无套组</span>'}</h4>
    <p class="desc">${esc(spec.desc)}${isDemon(spec) && !spec.desc.includes('赖子') ? ` <b class="wild-note">掷出 1 即为恶魔赖子 ${pct(probs[0])}。</b>` : ''}</p>
    <div class="probs" aria-label="六面概率">${probs.map((p, i) => `
      <div class="pb${i + 1 === peak ? ' is-peak' : ''}" title="${i + 1} 点 ${pct(p)}">
        <span class="pv">${Math.round(p * 100)}</span>
        <i style="height:${Math.max(3, Math.round(p * 92))}px"></i>
        <span class="pf">${isDemon(spec) && i === 0 ? '魔' : i + 1}</span>
      </div>`).join('')}</div>
    ${bonus}
  </article>`;
}

const BARREL_TYPE = {
  none: '初始骰桶', probability: '概率骰桶', faceScore: '点数加成桶',
  wildScore: '赖子加成桶', gesture: '仪式骰桶',
};

function biasRow(barrel) {
  if (!Array.isArray(barrel.bias)) return '';
  const cells = barrel.bias.map((w, i) => {
    const cls = w > 1.02 ? 'up' : w < 0.98 ? 'down' : '';
    return `<span class="w ${cls}"><b>×${w.toFixed(2)}</b>${i + 1}</span>`;
  }).join('');
  return `<div class="weights" aria-label="六面权重">${cells}</div>`;
}

function barrelExtra(barrel) {
  if (barrel.type === 'faceScore') {
    return `<div class="kv"><span>目标点数</span><b>${barrel.face} 点</b></div>`
      + `<div class="kv"><span>每颗计分</span><b>+${barrel.value} 分</b></div>`
      + `<div class="kv"><span>三条奖励</span><b>+${barrel.tripleValue} 分</b></div>`;
  }
  if (barrel.type === 'wildScore') {
    return `<div class="kv"><span>每颗赖子</span><b>+${barrel.value} 分</b></div>`
      + '<div class="kv"><span>触发条件</span><b>赖子须进入组合</b></div>';
  }
  if (barrel.type === 'gesture') {
    return `<div class="kv"><span>仪式</span><b>${barrel.gesture === 'pentagram' ? '五芒星' : '顺时针圆'}</b></div>`
      + '<div class="kv"><span>每关</span><b>限一次</b></div>';
  }
  return '<div class="kv"><span>六面权重</span><b>不改概率</b></div>';
}

function barrelCard(barrel) {
  const rarity = RARITIES[barrel.rarity] || RARITIES.common;
  return `<article class="card barrel-card" data-rarity="${barrel.rarity}" data-name="${esc(barrel.name)}" style="--rarity:${rarity.color};--glow:${rarity.glow}">
    <div class="top"><span class="rarity">${rarity.name}</span><span class="price">${barrel.price ? `${barrel.price} 银币` : '初始持有'}</span></div>
    <div class="art cup">${inlineSvg(`assets/art/barrels/${barrel.art}-full.svg`, barrel.id)}</div>
    <h4>${esc(barrel.name)}</h4>
    <p class="desc">${esc(barrel.desc)}</p>
    <div class="kv-list">${barrelExtra(barrel)}</div>
    ${biasRow(barrel)}
    <span class="effect"><b>${esc(BARREL_TYPE[barrel.type])}</b> · ${esc(barrel.short)}</span>
  </article>`;
}

function itemCard(item) {
  const rarity = RARITIES[item.rarity] || RARITIES.common;
  const kind = item.type === 'active' ? '主动 · 每关恢复 1 次' : '被动 · 永久生效';
  const extra = [item.unique ? '整局限一次' : '', item.consumable ? '一次性消耗' : ''].filter(Boolean);
  return `<article class="card item-card" data-rarity="${item.rarity}" data-name="${esc(item.name)}" style="--rarity:${rarity.color};--glow:${rarity.glow}">
    <div class="top"><span class="rarity">${rarity.name}</span><span class="price">${item.price} 银币</span></div>
    <div class="art icon">${inlineSvg(`assets/art/items/${item.id}-full.svg`, item.id)}</div>
    <h4>${esc(item.name)}</h4>
    <p class="desc">${esc(item.desc)}</p>
    <p class="flavor">“${esc(item.flavor)}”</p>
    <span class="effect"><b>${esc(kind)}</b>${extra.length ? ` · ${esc(extra.join(' · '))}` : ''}</span>
  </article>`;
}

/* ── sections ─────────────────────────────────────────────────────────── */

const SET_IDS = Object.keys(DICE_SETS);
const diceList = [...DICE, STANDARD_DIE];
const diceBySet = Object.fromEntries(SET_IDS.map((id) => [id, diceList.filter((d) => d.setId === id)]));
diceBySet.none = diceList.filter((d) => d.id !== 'standard' && !d.setId);
const rarityCount = DICE.reduce((acc, d) => { acc[d.rarity] = (acc[d.rarity] || 0) + 1; return acc; }, {});
const activeItems = ITEMS.filter((i) => i.type === 'active');
const passiveItems = ITEMS.filter((i) => i.type === 'passive');

/* ── rarity-sorted overview table ─────────────────────────────────────── */
const RORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
const byRarity = (a, b) => (RORDER[a.rarity] ?? 9) - (RORDER[b.rarity] ?? 9)
  || a.name.localeCompare(b.name, 'zh-CN');
const pctText = (p) => p >= 1 ? `${p.toFixed(1)}%` : p >= 0.01 ? `${p.toFixed(2)}%` : '<0.01%';

function diceStrength(die) {
  const ev = die.probs.reduce((sum, p, i) => sum + p * (i + 1), 0);
  const peak = Math.max(...die.probs);
  const bonus = die.bonus ? 8 : 0;
  return Math.round(50 + (ev - 3.5) * 26 + (peak - 1 / 6) * 85 + (RORDER[die.rarity] * 6) + (die.price || 0) / 18 + bonus);
}
function barrelStrength(barrel) {
  const type = { gesture: 12, extraDie: 10, gild: 7, faceScore: 7, wildScore: 7, probability: 5, singlesBonus: 5 }[barrel.type] || 0;
  return Math.round(42 + (RORDER[barrel.rarity] * 7) + barrel.price / 9 + type);
}
function itemStrength(item) {
  const kind = item.type === 'active' ? 4 : 7;
  return Math.round(40 + (RORDER[item.rarity] * 7) + item.price / 9 + kind + (item.consumable ? -3 : 0) + (item.unique ? 5 : 0));
}
function bossStrength(boss) {
  return Math.round(45 + boss.level * 0.9 + boss.curve.reward * 18 + boss.curve.target * 12);
}
const bossRarity = (boss) => (boss.level <= 6 ? 'rare' : boss.level <= 14 ? 'epic' : 'legendary');

const dicePool = (rarity) => DICE.filter((d) => d.rarity === rarity).length;
const barrelPool = (rarity) => BARRELS.filter((b) => b.rarity === rarity).length;
const itemPool = (rarity) => ITEMS.filter((i) => i.rarity === rarity).length;

const ovRow = ({ name, rarity, price, effect, within, chance, strength, probabilities = '—' }) => `<tr>
  <td>${esc(name)}</td><td><span class="ov-r" style="--c:${RARITIES[rarity]?.color || '#aaa'}">${RARITIES[rarity]?.name || rarity}</span></td>
  <td>${esc(price)}</td><td class="ov-effect">${esc(effect)}</td><td>${esc(within)}</td><td>${esc(chance)}</td><td class="ov-prob">${esc(probabilities)}</td><td><b>${strength}</b></td></tr>`;

const ovDice = [...DICE].sort(byRarity).map((die) => {
  const pool = dicePool(die.rarity);
  const shopChance = (rarityShopWeight(die.rarity, 1) / 100) / Math.max(1, pool) * 100;
  return ovRow({
    name: die.name, rarity: die.rarity, price: `${die.price} 银币`,
    effect: die.bonus?.label || die.desc, within: `1 / ${pool}`,
    chance: `${pctText(shopChance)} / 格`,
    probabilities: die.probs.map((p, i) => `${i + 1}:${pctText(p * 100)}`).join(' · '),
    strength: diceStrength(die),
  });
}).join('');
const ovBarrels = [...BARRELS].sort(byRarity).map((barrel) => ovRow({
  name: barrel.name, rarity: barrel.rarity, price: `${barrel.price} 银币`,
  effect: `${barrel.short} · ${barrel.desc}`, within: `1 / ${barrelPool(barrel.rarity)}`,
  chance: `${pctText(100 / BARRELS.length)} / 格`, strength: barrelStrength(barrel),
})).join('');
const ovItems = [...ITEMS].sort(byRarity).map((item) => ovRow({
  name: item.name, rarity: item.rarity, price: `${item.price} 银币`,
  effect: item.desc, within: `1 / ${itemPool(item.rarity)}`,
  chance: `${pctText(100 / ITEMS.length)} / 格`, strength: itemStrength(item),
})).join('');
const ovBosses = [...BOSSES].sort((a, b) => a.level - b.level).map((boss) => {
  const r = bossRarity(boss);
  return ovRow({
    name: `${boss.name}（第 ${boss.level} 关）`, rarity: r,
    price: `${LEVELS[boss.level - 1]?.reward || 0} 基础银币`,
    effect: `${boss.effectName}：${boss.effectDesc}`, within: '固定关卡',
    chance: '非商店刷新', strength: bossStrength(boss),
  });
}).join('');

/* The live roller needs each die's six face drawings, its skin variables and
   the real post-barrel probabilities. Baking them in keeps the page a single
   offline file — no fetch, no build step in the browser. */
const labDice = [STANDARD_DIE, ...DICE];
const labData = labDice.map((die) => ({
  id: die.id,
  name: die.name,
  rarity: die.rarity || 'common',
  setId: die.setId || null,
  skin: `${dieSkinStyle(die)};--glow:${(RARITIES[die.rarity] || RARITIES.common).glow}`,
  faces: Object.fromEntries([1, 2, 3, 4, 5, 6].map((face) => [face, faceSvg(die, face)])),
  probs: Object.fromEntries(BARRELS.map((barrel) => [
    barrel.id,
    effectiveProbs(die.id, barrel.id).map((p) => Number(p.toFixed(5))),
  ])),
}));
const labJson = JSON.stringify(labData).replace(/</g, '\\u003c');
const labDieGroups = [
  ['标准骰', labDice.filter((die) => die.id === 'standard')],
  ...SET_IDS.map((id) => [DICE_SETS[id].name, labDice.filter((die) => die.setId === id)]),
  ['无套组', labDice.filter((die) => die.id !== 'standard' && !die.setId)],
];
const labDieOptions = labDieGroups.map(([label, list]) => (list.length
  ? `<optgroup label="${esc(label)}">${list.map((die) => `<option value="${die.id}">${esc(die.name)}</option>`).join('')}</optgroup>`
  : '')).join('');
const labBarrelOptions = BARRELS.map(
  (barrel) => `<option value="${barrel.id}">${esc(barrel.name)}</option>`,
).join('');

const setCards = SET_IDS.map((id) => {
  const set = DICE_SETS[id];
  return `<article class="set-card" style="--set:${set.color}">
    <h3>${esc(set.name)} <span class="set-count">${diceBySet[id].length} 枚</span></h3>
    <p class="motto">“${esc(set.motto)}”</p>
    <div class="tiers">${set.bonuses.map((b) => `
      <div class="tier"><b>${b.pieces} 件</b><span>${esc(b.text)}</span></div>`).join('')}
    </div>
    <div class="members">${diceBySet[id].map((d) => `<span class="m-chip" style="--set:${set.color}">${esc(d.name)}</span>`).join('')}</div>
  </article>`;
}).join('');

const diceGroups = SET_IDS.map((id) => {
  const set = DICE_SETS[id];
  return `<div class="set-group" style="--set-color:${set.color}">
    <h3>${esc(set.name)} <span>${esc(set.motto)}</span></h3>
    <div class="grid dice-grid">${[...diceBySet[id]].sort(byRarity).map(dieCard).join('')}</div>
  </div>`;
}).join('') + `<div class="set-group" style="--set-color:#8a7c66">
    <h3>无套组 <span>不参与 2 / 4 件加成，但随时能买能卖——走极端点数、顺序互动或商店成长。</span></h3>
    <div class="grid dice-grid">${[...diceBySet.none].sort(byRarity).map(dieCard).join('')}</div>
  </div>`;

const shopTable = SHOP_RARITY_WEIGHTS.map((band, i) => {
  const from = i === 0 ? 1 : SHOP_RARITY_WEIGHTS[i - 1].untilLevel + 1;
  const total = Object.values(band.weights).reduce((a, b) => a + b, 0);
  const cells = Object.entries(band.weights)
    .map(([r, w]) => {
      const share = (w / total) * 100;
      const label = share >= 1 ? `${Math.round(share)}%` : `${share.toFixed(2)}%`;
      return `<td>${RARITIES[r].name} ${label}</td>`;
    }).join('');
  return `<tr><td>${from} – ${band.untilLevel}</td>${cells}</tr>`;
}).join('');

const bossAtLevel = Object.fromEntries(BOSSES.map((boss) => [boss.level, boss]));
const levelTable = LEVELS.map((l) => {
  const boss = bossAtLevel[l.level];
  const kind = boss ? `${esc(boss.name)} ×${boss.curve.reward.toFixed(2)}` : '小兵关';
  return `<tr${boss ? ' class="is-boss"' : ''}><td>${l.level}</td><td>${l.target}</td><td>${l.reward}</td><td>${kind}</td></tr>`;
}).join('');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

/* ── page ─────────────────────────────────────────────────────────────── */

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>天国骰局 · 全图鉴（骰子 / 骰桶 / 物品 / 庄家）</title>
<style>
:root{
  --ink:#eadfc8; --ink-dim:#b8aa91; --muted:#81745f; --gold:#d9b46a; --gold-bright:#ffe5a2;
  --black:#070605; --panel:#100c08; --line:rgba(217,180,106,.18); --line-strong:rgba(217,180,106,.4);
  --serif:"Palatino Linotype","Book Antiqua",Georgia,"Noto Serif SC","Songti SC","SimSun",serif;
  --sans:"Microsoft YaHei","PingFang SC","Noto Sans SC","Segoe UI",sans-serif;
}
*{box-sizing:border-box}
html{color-scheme:dark;scroll-behavior:smooth}
body{
  margin:0; color:var(--ink); font-family:var(--sans); font-size:14px; line-height:1.6;
  background:
    radial-gradient(1100px 620px at 50% -240px, rgba(128,86,38,.3), transparent 66%),
    radial-gradient(760px 760px at 100% 6%, rgba(86,58,124,.12), transparent 62%),
    radial-gradient(700px 700px at 0% 42%, rgba(74,48,20,.14), transparent 60%),
    var(--black);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
h1,h2,h3,h4,p{margin:0}
a{color:inherit}
img{display:block;max-width:100%}
.wrap{max-width:1500px;margin:0 auto;padding:0 44px 90px}

/* ── hero ─────────────────────────────────────────────────────────── */
.hero{padding:58px 0 26px;border-bottom:1px solid var(--line);position:relative}
.kicker{font-size:9px;letter-spacing:.36em;color:#a9854a}
h1{font-family:var(--serif);font-weight:400;font-size:46px;line-height:1.15;letter-spacing:.09em;color:#f4e6c8;margin:12px 0 8px;text-shadow:0 12px 40px rgba(0,0,0,.6)}
.lede{color:#9c8b73;font-size:12.5px;max-width:900px;line-height:1.9}
.lede code{color:#c0a878;font-family:Consolas,monospace;font-size:11.5px}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.legend span{display:inline-flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.1em;color:#a2917a;border:1px solid rgba(255,255,255,.07);padding:4px 9px;background:rgba(255,255,255,.015)}
.legend i{width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
nav a{padding:7px 15px;border:1px solid var(--line);color:#c7b28c;font-size:10.5px;letter-spacing:.14em;text-decoration:none;transition:.2s;background:rgba(20,15,10,.5)}
nav a:hover{color:var(--gold-bright);border-color:var(--line-strong);background:rgba(217,180,106,.08)}
nav a b{color:var(--gold);font-weight:400}

/* ── sections ─────────────────────────────────────────────────────── */
section{padding-top:56px;scroll-margin-top:20px}
.sec-head{display:flex;align-items:baseline;gap:14px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:18px}
.sec-no{font-family:var(--serif);font-size:12px;letter-spacing:.12em;color:#8a6d3d}
h2{font-family:var(--serif);font-weight:400;font-size:28px;letter-spacing:.07em;color:#eeddbd}
.sec-head .count{margin-left:auto;color:#847459;font-size:11px;letter-spacing:.08em}
.sec-intro{color:#9a8970;font-size:12.5px;line-height:1.9;max-width:1040px;margin:0 0 22px}
.sec-intro b{color:#cdb387;font-weight:400}
.ov-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px}
.ov-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:18px}
.ov-wrap .ov-table{min-width:1040px;margin-bottom:0}
.ov-prob{white-space:normal!important;min-width:210px;font-size:10px;color:#9d8b70!important}
@media (max-width:760px){
  .ov-wrap .ov-table{min-width:900px;font-size:10px}
  .ov-effect{max-width:240px}
  .ov-prob{min-width:170px}
}
.ov-table th{position:sticky;top:0;background:#0b0805;z-index:1;text-align:left;padding:7px 8px;color:#8f7b5e;font-weight:400;font-size:9.5px;letter-spacing:.08em;border-bottom:1px solid var(--line-strong)}
.ov-table td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.055);vertical-align:top;color:#b7a58a}
.ov-table tr:hover td{background:rgba(217,180,106,.035)}
.ov-table td:first-child{color:#e0cba8;white-space:nowrap}
.ov-table td:nth-child(3){white-space:nowrap;color:#c7aa75}
.ov-table td:nth-child(5),.ov-table td:nth-child(6),.ov-table td:nth-child(7){white-space:nowrap;font-variant-numeric:tabular-nums}
.ov-table td:nth-child(7) b{color:#ffe0a0;font-weight:400}
.ov-effect{max-width:520px;line-height:1.55}
.ov-r{display:inline-block;padding:1px 6px;border:1px solid color-mix(in srgb,var(--c) 50%,transparent);color:var(--c);font-size:9px;letter-spacing:.08em}
.ov-sub{display:flex;align-items:baseline;gap:10px;margin:24px 0 8px;font-family:var(--serif);font-size:17px;color:#dfc89f}
.ov-sub span{font-family:var(--sans);font-size:10px;color:#7f705b}

/* ── sets ─────────────────────────────────────────────────────────── */
.sets{display:grid;grid-template-columns:repeat(${SET_IDS.length},minmax(0,1fr));gap:14px}
.set-card{position:relative;padding:17px 17px 15px;border:1px solid rgba(255,255,255,.06);border-top:2px solid var(--set);background:linear-gradient(168deg,rgba(34,26,18,.8),rgba(9,7,5,.9))}
.set-card h3{font-family:var(--serif);font-weight:400;font-size:20px;letter-spacing:.12em;color:var(--set)}
.set-count{font-family:var(--sans);font-size:10px;letter-spacing:.08em;color:#7d6d57;margin-left:7px}
.set-card .motto{color:#7e6e58;font-size:11px;line-height:1.75;margin:4px 0 12px;font-style:italic}
.tiers{display:flex;flex-direction:column;gap:9px}
.tier{display:grid;grid-template-columns:34px 1fr;gap:8px;padding-top:8px;border-top:1px solid rgba(217,180,106,.1);font-size:11px;line-height:1.7;color:#a5947b}
.tier b{color:var(--set);font-weight:400;font-size:10px;letter-spacing:.06em}
.members{display:flex;flex-wrap:wrap;gap:5px;margin-top:13px;padding-top:11px;border-top:1px solid rgba(255,255,255,.06)}
.m-chip{font-size:10px;padding:2px 7px;color:var(--set);border:1px solid color-mix(in srgb,var(--set) 45%,transparent);background:color-mix(in srgb,var(--set) 8%,transparent)}

/* ── set groups / sub heads ───────────────────────────────────────── */
.set-group{margin-top:26px}
.set-group h3{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;font-family:var(--serif);font-weight:400;font-size:18px;letter-spacing:.1em;color:#e2cda7;margin:0 0 11px;padding-left:11px;border-left:3px solid var(--set-color,#8a6d3d)}
.set-group h3 span{font-family:var(--sans);font-size:10.5px;letter-spacing:.06em;color:#7d6d57;font-style:italic}
.sub-head{font-family:var(--serif);font-weight:400;font-size:15px;letter-spacing:.12em;color:#cdb387;margin:6px 0 12px}
.sub-head+.grid+.sub-head{margin-top:28px}

/* ── cards ────────────────────────────────────────────────────────── */
.grid{display:grid;gap:12px}
.dice-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.barrel-grid,.item-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
.card{position:relative;display:flex;flex-direction:column;padding:13px 14px 12px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(165deg,rgba(31,24,16,.84),rgba(9,7,5,.92));box-shadow:0 16px 36px rgba(0,0,0,.32);overflow:hidden}
.card::before{content:"";position:absolute;inset:0;border:1px solid var(--rarity,rgba(255,255,255,.12));opacity:.18;pointer-events:none}
.card::after{content:"";position:absolute;left:0;top:0;width:100%;height:1px;background:linear-gradient(90deg,var(--rarity,transparent),transparent 72%);opacity:.65}
.top{display:flex;align-items:center;justify-content:space-between;gap:8px;position:relative;z-index:2}
.rarity{font-size:9px;letter-spacing:.18em;color:var(--rarity)}
.price{font-size:9.5px;letter-spacing:.06em;color:#8b7a5e}
.art{position:relative;display:grid;place-items:center;height:100px;margin:4px 0 2px}
.art::before{content:"";position:absolute;width:112px;height:112px;border-radius:50%;background:radial-gradient(circle,var(--glow,rgba(217,180,106,.14)),transparent 68%)}
.art svg{position:relative;z-index:1;max-height:104px;width:auto;filter:drop-shadow(0 14px 16px rgba(0,0,0,.5))}
.art.icon svg{max-height:84px}
.card h4{position:relative;z-index:2;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-family:var(--serif);font-weight:400;font-size:16px;letter-spacing:.06em;color:#ead9ba;line-height:1.35}
.set-chip{font-family:var(--sans);font-size:9.5px;letter-spacing:.06em;color:var(--set);border:1px solid color-mix(in srgb,var(--set) 45%,transparent);padding:1px 6px}
.desc{position:relative;z-index:2;color:#a4937a;font-size:11px;line-height:1.75;margin-top:5px}
.desc .wild-note{color:#e59a86;font-weight:400}
.effect{position:relative;z-index:2;display:block;color:#b5a07f;font-size:10.5px;line-height:1.7;border-top:1px solid rgba(217,180,106,.11);padding-top:7px;margin-top:auto}
.effect b{color:#dcc08a;font-weight:400}
.effect .none,.effect.none{color:#7a6a55}
.flavor{position:relative;z-index:2;color:#7d6e59;font-size:10px;line-height:1.7;font-style:italic;margin-top:7px}
.kv-list{display:grid;gap:4px;margin-top:8px}
.kv{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#8d7e66;border-bottom:1px dotted rgba(217,180,106,.1);padding-bottom:3px}
.kv b{color:#cdb387;font-weight:400}

/* dice art */
.art-row{display:flex;gap:15px;align-items:flex-start;margin:8px 0 6px}
.die-card .art-row>.art-die{position:relative;z-index:1;flex:0 0 116px;width:116px;height:116px;transform:rotate(-6deg)}
.art-die{
  --die-face-bg:linear-gradient(150deg,#e6d5ae,#d2ba8c 48%,#b3945f 76%,#8a6b3f 100%);
  --die-pip:#191209; --die-pip-rim:#6d5636; --die-edge:rgba(238,222,184,.55);
  --die-glyph-color:rgba(224,193,121,.5);
  --die-material:repeating-linear-gradient(96deg,rgba(255,255,255,.03) 0 1px,rgba(90,60,26,.04) 1px 3px,rgba(255,255,255,0) 3px 10px);
  position:relative;border:1px solid var(--die-edge);border-radius:18%;
  background:var(--die-material),radial-gradient(circle at 20% 14%,rgba(255,246,220,.16),transparent 38%),var(--die-face-bg);
  box-shadow:inset 1px 1px 0 rgba(255,246,220,.26),inset -3px -3px 6px rgba(56,32,10,.28),0 2px 0 rgba(70,46,22,.9),0 13px 20px rgba(0,0,0,.45),0 0 22px var(--glow);
  overflow:hidden;
}
.art-die::after{content:"";position:absolute;inset:1px;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.15),transparent 34% 70%,rgba(49,28,10,.1));pointer-events:none;z-index:3}
.art-die.is-demon{box-shadow:inset 1px 1px 0 rgba(255,214,196,.3),inset -3px -3px 6px rgba(90,20,14,.4),0 2px 0 rgba(80,26,20,.9),0 13px 20px rgba(0,0,0,.45),0 0 24px rgba(200,70,50,.24)}
.face-svg{position:absolute;inset:0;width:100%;height:100%;z-index:2}
.die-motif{color:var(--die-glyph-color);opacity:.30}
.face-svg .pip{fill:var(--die-pip);stroke:var(--die-pip-rim);stroke-width:1.5}
.wild-glyph{fill:#ff6a52;font-family:var(--serif);font-size:46px;paint-order:stroke;stroke:rgba(255,190,170,.55);stroke-width:2.2;filter:drop-shadow(0 0 9px rgba(255,90,60,.75))}
.die-sheen{display:none;position:absolute;inset:-35%;z-index:4;pointer-events:none}
.art-die.rarity-legendary .die-sheen,.art-die.rarity-epic .die-sheen{display:block}
.art-die.rarity-legendary .die-sheen{background:linear-gradient(104deg,rgba(255,255,255,0) 36%,rgba(255,248,214,.28) 46%,rgba(255,255,255,.5) 50%,rgba(255,240,190,.22) 55%,rgba(255,255,255,0) 66%);background-size:240% 240%;background-repeat:no-repeat;animation:die-sheen-sweep 5.2s ease-in-out infinite}
.art-die.rarity-epic .die-sheen{background:linear-gradient(104deg,rgba(255,255,255,0) 38%,rgba(238,220,255,.22) 46%,rgba(255,255,255,.36) 50%,rgba(226,200,255,.18) 55%,rgba(255,255,255,0) 65%);background-size:240% 240%;background-repeat:no-repeat;animation:die-sheen-sweep 6.6s ease-in-out infinite}
@keyframes die-sheen-sweep{0%{background-position:155% -55%;opacity:0}16%{opacity:1}48%{background-position:-65% 145%;opacity:1}62%,100%{background-position:-65% 145%;opacity:0}}

.faces{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-content:start}
.mini{display:flex;flex-direction:column;align-items:center;gap:2px}
.mini-face{position:relative;display:block;width:100%;aspect-ratio:1;border-radius:14%;overflow:hidden;border:1px solid var(--die-edge);
  background:var(--die-material),var(--die-face-bg);
  box-shadow:inset -2px -2px 4px rgba(0,0,0,.3),0 4px 8px rgba(0,0,0,.35)}
.mini.is-peak .mini-face{box-shadow:inset -2px -2px 4px rgba(0,0,0,.3),0 0 0 2px var(--gold),0 4px 9px rgba(0,0,0,.4)}
.mini-face .face-svg{z-index:1}
.mini-face .die-motif{opacity:.26}
.mini b{font-size:10px;font-weight:400;color:#9b8c74}
.mini em{font-size:9px;font-style:normal;color:#6f6352;font-variant-numeric:tabular-nums}
.mini.is-peak b{color:var(--gold-bright)}
.mini.is-peak em{color:var(--gold)}

/* probability bars */
.probs{position:relative;display:flex;align-items:flex-end;gap:5px;height:62px;margin:6px 0 2px;padding-bottom:12px}
.probs::before{content:"";position:absolute;left:0;right:0;bottom:26px;border-top:1px dashed rgba(217,180,106,.16)}
.pb{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:1px}
.pb .pv{font-size:8px;color:#8d7f68;font-variant-numeric:tabular-nums}
.pb i{display:block;width:100%;border-radius:1px 1px 0 0;background:linear-gradient(180deg,var(--rarity),rgba(217,180,106,.14));min-height:2px}
.pb.is-peak i{background:linear-gradient(180deg,var(--gold-bright),rgba(217,180,106,.32));box-shadow:0 0 10px rgba(255,229,162,.25)}
.pb .pf{font-size:9px;color:#6b5f4d}
.pb.is-peak .pf,.pb.is-peak .pv{color:var(--gold-bright)}

/* barrels */
.weights{display:grid;grid-template-columns:repeat(6,1fr);gap:3px;margin-top:9px}
.w{display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 0;border:1px solid rgba(255,255,255,.04);font-size:8px;color:#6f6352;background:rgba(255,255,255,.015)}
.w b{font-size:9px;font-weight:400;color:#bca57e}
.w.up b{color:#e8c37e}
.w.down b{color:#cf8f75}

/* standard die */
.standard{margin-top:16px;display:flex;align-items:center;gap:18px;padding:14px 18px;border:1px dashed rgba(217,180,106,.2);background:rgba(217,180,106,.025)}
.standard .art{height:78px;margin:0;flex:0 0 84px}
.standard .art::before{width:76px;height:76px}
.standard .art-die{width:58px;height:58px;transform:rotate(-6deg)}
.standard h4{font-family:var(--serif);font-weight:400;font-size:15px;color:#dcc9a7}
.standard p{color:#93836b;font-size:10.5px;line-height:1.8;margin-top:2px}

/* filter bar */
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 16px}
.toolbar input{padding:7px 12px;background:rgba(10,8,6,.9);border:1px solid var(--line);color:var(--ink);font-family:var(--sans);font-size:12px;min-width:190px}
.toolbar input:focus{outline:none;border-color:var(--gold)}
.btn{padding:6px 12px;border:1px solid var(--line);background:rgba(20,15,10,.6);color:#a4937a;font-size:11px;letter-spacing:.06em;cursor:pointer;font-family:var(--sans)}
.btn:hover{color:var(--gold-bright);border-color:var(--line-strong)}
.btn.on{background:rgba(217,180,106,.16);border-color:var(--gold);color:var(--gold-bright)}
.count-note{margin-left:auto;color:#847459;font-size:11px;letter-spacing:.06em}

/* live roller */
.lab{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px 22px;padding:20px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(160deg,rgba(31,24,16,.78),rgba(9,7,5,.9));box-shadow:0 18px 40px rgba(0,0,0,.3)}
.lab-controls{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end}
.lab-field{display:flex;flex-direction:column;gap:5px;font-size:10px;letter-spacing:.08em;color:#847459}
.lab-field select{min-width:172px;padding:7px 10px;background:rgba(10,8,6,.92);border:1px solid var(--line);color:var(--ink);font-family:var(--sans);font-size:12px}
.lab-field select:focus{outline:none;border-color:var(--gold)}
.lab-actions{display:flex;gap:8px;margin-left:auto}
.btn.primary{background:rgba(217,180,106,.18);border-color:rgba(217,180,106,.6);color:var(--gold-bright)}
.btn:disabled{opacity:.45;cursor:wait}
.lab-stage{display:flex;align-items:center;gap:24px;min-height:176px;justify-content:center;padding:8px 4px}
.lab-die{flex:0 0 128px;width:128px;height:128px;transform:rotate(-4deg)}
.lab-die.is-rolling{animation:lab-tumble .46s cubic-bezier(.3,.7,.35,1)}
@keyframes lab-tumble{0%{transform:rotate(-4deg) scale(1)}22%{transform:rotate(16deg) scale(.92)}52%{transform:rotate(-22deg) scale(1.06)}78%{transform:rotate(9deg) scale(.98)}100%{transform:rotate(-4deg) scale(1)}}
.lab-readout{display:flex;flex-direction:column;gap:6px;min-width:180px}
.lab-readout b{font-family:var(--serif);font-weight:400;font-size:19px;color:var(--gold-bright);letter-spacing:.05em}
.lab-readout span{font-size:10.5px;color:#93836b;line-height:1.7}
.lab-probs{grid-column:1/-1;display:flex;align-items:flex-end;gap:6px;height:108px;padding:6px 2px 0}
.lab-pb{flex:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}
.lab-pb i{width:100%;border-radius:2px 2px 0 0;background:linear-gradient(180deg,rgba(217,180,106,.8),rgba(217,180,106,.18));box-shadow:0 0 10px rgba(217,180,106,.15);transition:height .35s ease}
.lab-pb.is-peak i{background:linear-gradient(180deg,#f0d296,rgba(240,210,150,.22));box-shadow:0 0 14px rgba(240,210,150,.3)}
.lab-pb .lab-pct{font-size:9px;color:#8d7f68;font-variant-numeric:tabular-nums}
.lab-pb .lab-face{font-size:10px;color:#a4937a}
.lab-six{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;min-height:76px}
.lab-mini{display:flex;flex-direction:column;align-items:center;gap:3px;animation:lab-pop .32s cubic-bezier(.2,.9,.3,1.3) both;animation-delay:calc(var(--i) * 45ms)}
.lab-mini .mini-face{width:52px;border-radius:14%}
.lab-mini b{font-size:11px;font-weight:400;color:var(--gold-bright)}
.lab-mini em{font-size:8.5px;font-style:normal;color:#6f6352}
@keyframes lab-pop{from{opacity:0;transform:translateY(10px) scale(.7) rotate(-8deg)}to{opacity:1;transform:none}}
.card{transition:transform .22s ease,border-color .22s ease}
.card:hover{transform:translateY(-3px);border-color:rgba(217,180,106,.28)}
.die-card{cursor:pointer}

/* market / tables */
.market{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
.market-card{padding:16px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(168deg,rgba(31,24,16,.7),rgba(9,7,5,.86))}
.market-card h4{font-family:var(--serif);font-weight:400;font-size:16px;color:#e3cfa9;margin-bottom:8px}
.m-line{display:flex;justify-content:space-between;gap:10px;font-size:10.5px;color:#94836b;padding:5px 0;border-bottom:1px solid rgba(217,180,106,.08)}
.m-line b{color:#cdb387;font-weight:400}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{text-align:left;padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.07)}
th{color:#847459;font-weight:400;font-size:9.5px;letter-spacing:.08em}
td{color:#a4937a}
tr.is-boss td{color:var(--gold-bright)}
.notes{list-style:none;padding:0;margin:8px 0 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 26px}
.notes li{position:relative;padding-left:14px;color:#93836b;font-size:11px;line-height:1.8}
.notes li::before{content:"◆";position:absolute;left:0;top:0;font-size:6px;color:#8a6d3d}
.notes b{color:#c9b08a;font-weight:400}

footer{margin-top:64px;padding-top:18px;border-top:1px solid var(--line);color:#635847;font-size:10px;letter-spacing:.05em;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
footer code{color:#93836b;font-family:Consolas,monospace;font-size:9.5px}

@media (max-width:1340px){
  .barrel-grid,.item-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:1180px){
  .wrap{padding:0 30px 70px}
  h1{font-size:38px}
  .dice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:860px){
  .dice-grid,.barrel-grid,.item-grid,.sets{grid-template-columns:repeat(2,minmax(0,1fr))}
  .market{grid-template-columns:1fr}
  .notes{grid-template-columns:1fr}
  .lab{grid-template-columns:1fr}
  .lab-stage{justify-content:flex-start;flex-wrap:wrap;gap:18px}
  .lab-actions{margin-left:0}
  h1{font-size:31px}
}
@media (max-width:560px){
  .wrap{padding:0 18px 50px}
  .dice-grid,.barrel-grid,.item-grid,.sets{grid-template-columns:1fr}
  .sec-head{flex-wrap:wrap}
  .sec-head .count{margin-left:0}
}
@media (prefers-reduced-motion:reduce){
  .die-sheen,.lab-die.is-rolling,.lab-mini{animation:none!important}
  .lab-pb i,.card{transition:none!important}
}
</style>
</head>
<body>
<div class="wrap">

<header class="hero">
  <p class="kicker">HEAVEN'S DICE · THE GAMBLER'S ARCHIVE</p>
  <h1>天国骰局 · 内容总览</h1>
  <p class="lede">骰子 ${diceList.length} 枚（${SET_IDS.map((id) => `${DICE_SETS[id].name} ${diceBySet[id].length}`).join(' / ')} / 无套组 ${diceBySet.none.length} / 标准 1）、骰桶 ${BARRELS.length} 只、物品 ${ITEMS.length} 件（含一次性 ${ITEMS.filter((i) => i.consumable).length} 件）、庄家 ${BOSSES.length} 位。骰面立绘取自游戏真实皮肤（材质渐变 + 刻纹 + 点数），骰桶与物品为仓库 <code>assets/</code> 内的原始矢量图；所有数值由 <code>src/content/</code> 与 <code>src/core/engine.ts</code> 直接生成，不会与游戏脱节。</p>
  <div class="legend">
    ${Object.values(RARITIES).map((r) => `<span style="--c:${r.color}"><i></i>${r.name}</span>`).join('')}
    <span style="--c:#8a6d3d"><i></i>普通 ${rarityCount.common || 0} · 稀有 ${rarityCount.rare || 0} · 史诗 ${rarityCount.epic || 0} · 传说 ${rarityCount.legendary || 0}</span>
    <span style="--c:#ff6a52"><i></i>恶魔赖子</span>
  </div>
  <nav>
    <a href="#overview"><b>00</b> 强度总览</a>
    <a href="#sets"><b>01</b> 骰组</a>
    <a href="#dice"><b>02</b> 骰子 ${diceList.length}</a>
    <a href="#lab"><b>▶</b> 试掷台</a>
    <a href="#barrels"><b>03</b> 骰桶 ${BARRELS.length}</a>
    <a href="#items"><b>04</b> 物品 ${ITEMS.length}</a>
    <a href="#market"><b>05</b> 数值速查</a>
  </nav>
</header>

<section id="overview">
  <div class="sec-head"><span class="sec-no">00</span><h2>全内容强度总览</h2><span class="count">骰子 ${DICE.length} · 骰桶 ${BARRELS.length} · 物品 ${ITEMS.length} · 庄家 ${BOSSES.length}</span></div>
  <p class="sec-intro">所有内容按稀有度升序排列。价格/收入、效果、档内数量、刷新概率和强度值都来自当前内容表。<b>强度值</b>是用于横向比较的启发式评分：骰子看期望点数、最高面概率、稀有度、价格和附加特性；骰桶/物品看稀有度、价格、类型与消耗/唯一性；庄家看关卡、目标系数和赏金系数。它不是胜率。</p>

  <h3 class="ov-sub">骰子 <span>稀有度升序 · 刷新概率按 1 级商店、每格单枚骰子计算</span></h3>
  <div class="ov-wrap"><table class="ov-table"><thead><tr><th>名称</th><th>稀有度</th><th>价格</th><th>效果</th><th>档内</th><th>刷新概率</th><th>点数概率</th><th>强度</th></tr></thead><tbody>${ovDice}</tbody></table></div>

  <h3 class="ov-sub">骰桶 <span>稀有度升序 · 骰桶区目前为均匀抽取</span></h3>
  <div class="ov-wrap"><table class="ov-table"><thead><tr><th>名称</th><th>稀有度</th><th>价格</th><th>效果</th><th>档内</th><th>刷新概率</th><th>点数概率</th><th>强度</th></tr></thead><tbody>${ovBarrels}</tbody></table></div>

  <h3 class="ov-sub">物品 <span>稀有度升序 · 物品区目前为均匀抽取</span></h3>
  <div class="ov-wrap"><table class="ov-table"><thead><tr><th>名称</th><th>稀有度</th><th>价格</th><th>效果</th><th>档内</th><th>刷新概率</th><th>点数概率</th><th>强度</th></tr></thead><tbody>${ovItems}</tbody></table></div>

  <h3 class="ov-sub">庄家 <span>按关卡 / 稀有度升序 · 固定关卡，不参与商店刷新</span></h3>
  <div class="ov-wrap"><table class="ov-table"><thead><tr><th>名称</th><th>稀有度</th><th>基础赏金</th><th>效果</th><th>出现</th><th>刷新概率</th><th>点数概率</th><th>强度</th></tr></thead><tbody>${ovBosses}</tbody></table></div>
</section>

<section id="sets">
  <div class="sec-head"><span class="sec-no">01</span><h2>骰子套组</h2><span class="count">2 件 / 4 件触发</span></div>
  <p class="sec-intro">两套的机制完全不同，互不叠加：<b>狼裔</b>围绕点数 3（概率倾斜 + 围绕 3 的计分加成），<b>恶魔</b>把掷出的 1 变成赖子去借用别人的点数。同名套组装备 <b>2 枚</b>与 <b>4 枚</b>各触发一档，4 件时两档同时生效。两套各只有 <b>5 枚</b>，另外 <b>${diceBySet.none.length} 枚无套组</b>——它们不参与套装，走极端点数、顺序互动或商店成长，普通骰也可能带一条明确的计分规则。</p>
  <div class="sets">${setCards}</div>
  <ul class="notes" style="margin-top:14px">
    <li><b>恶魔赖子规则</b>：掷出 1 时不算 100 分，而是变成赖子「魔」。</li>
    <li>赖子<b>可补三条</b>：该点数必须已有至少一颗自然骰。</li>
    <li>赖子<b>可补顺子缺口</b>：每个顺子最多替 1 颗。</li>
    <li>赖子<b>不能单独计分</b>，也不能当作单颗 1/5 凑分；没用上的赖子会让整手不成立。</li>
  </ul>
</section>

<section id="dice">
  <div class="sec-head"><span class="sec-no">02</span><h2>骰子 · ${diceList.length} 枚</h2><span class="count">真实六面权重 · 售价 ${['common', 'rare', 'epic', 'legendary'].map((r) => DICE.find((d) => d.rarity === r)?.price).join(' / ')}</span></div>
  <p class="sec-intro">大图是该骰<b>最易掷出的那一面</b>（金色描边），右侧六格为全部六面与各自概率；骰面上的暗纹是该骰独有的刻纹。柱状图虚线为公平骰的 16.7%。恶魔骰的 1 面显示为红色「魔」。<b>额外加分只挂在史诗与传说骰上</b>，普通与稀有骰只改点数分布，靠概率本身说话。</p>
  <div class="toolbar">
    <input id="q" type="search" placeholder="搜索名称 / 特性…" aria-label="搜索骰子">
    <button class="btn on" data-filter="set" data-value="all">全部套组</button>
    ${SET_IDS.map((id) => `<button class="btn" data-filter="set" data-value="${id}">${DICE_SETS[id].name}</button>`).join('')}
    <button class="btn" data-filter="set" data-value="none">无套组</button>
    <button class="btn on" data-filter="rarity" data-value="all">全部稀有度</button>
    ${Object.values(RARITIES).map((r) => `<button class="btn" data-filter="rarity" data-value="${r.id}">${r.name}</button>`).join('')}
    <span class="count-note" id="diceCount"></span>
  </div>
  ${diceGroups}
  <div class="standard">
    <div class="art"><div class="art-die rarity-common" style="${dieSkinStyle(STANDARD_DIE)}">${faceSvg(STANDARD_DIE, 1, { big: true })}</div></div>
    <div>
      <h4>标准骰（初始 6 颗）</h4>
      <p>每个点数概率相同（16.7%），没有额外特性，也不属于任何套组。开局骰袋由 6 枚标准骰组成，之后可在市集替换为秘骰。</p>
    </div>
  </div>
</section>

<section id="lab">
  <div class="sec-head"><span class="sec-no">LIVE</span><h2>试掷台</h2><span class="count">真实权重 × 骰桶修正 · 只在浏览器里跑</span></div>
  <p class="sec-intro">选一枚骰子和一只骰桶，用游戏里的真实概率掷一次。概率条会随骰桶的偏向实时改写；也可以一次掷六颗看落点。<b>点击任意骰子卡片</b>会直接把它装进试掷台。这里不会读写存档。</p>
  <div class="lab">
    <div class="lab-controls">
      <label class="lab-field"><span>骰子</span><select id="lab-die">${labDieOptions}</select></label>
      <label class="lab-field"><span>骰桶</span><select id="lab-barrel">${labBarrelOptions}</select></label>
      <div class="lab-actions">
        <button class="btn primary" id="lab-roll" type="button">掷一颗</button>
        <button class="btn" id="lab-roll-six" type="button">掷六颗</button>
      </div>
    </div>
    <div class="lab-stage">
      <div class="lab-die art-die" id="lab-die-face" aria-live="polite"></div>
      <div class="lab-readout">
        <b id="lab-result">等待投掷</b>
        <span id="lab-detail">按「掷一颗」或「掷六颗」</span>
      </div>
    </div>
    <div class="lab-probs" id="lab-probs" aria-label="当前组合的六面概率"></div>
    <div class="lab-six" id="lab-six"></div>
  </div>
</section>

<section id="barrels">
  <div class="sec-head"><span class="sec-no">03</span><h2>骰桶 · ${BARRELS.length} 只</h2><span class="count">初始 1 + 概率 3 + 点数加成 1 + 赖子加成 1 + 仪式 2</span></div>
  <p class="sec-intro">概率桶改写六面权重（×1.35 表示该面权重提高 35%）；<b>点数加成桶</b>只在 3 真正计入本次计分时付款，<b>赖子加成桶</b>只在使用了恶魔赖子时付款；仪式桶需要先在桌上画出图案，画阵失败可重画，不消耗资源。</p>
  <div class="toolbar">
    <input id="q-barrels" type="search" placeholder="搜索骰桶 / 特性…" aria-label="搜索骰桶">
    <button class="btn on" data-filter="barrelRarity" data-value="all">全部稀有度</button>
    ${Object.values(RARITIES).map((r) => `<button class="btn" data-filter="barrelRarity" data-value="${r.id}">${r.name}</button>`).join('')}
    <span class="count-note" id="barrelCount"></span>
  </div>
  <div class="grid barrel-grid">${[...BARRELS].sort(byRarity).map(barrelCard).join('')}</div>
</section>

<section id="items">
  <div class="sec-head"><span class="sec-no">04</span><h2>物品 · ${ITEMS.length} 件</h2><span class="count">主动 ${activeItems.length} + 被动 ${passiveItems.length}</span></div>
  <p class="sec-intro">主动物品每关恢复 1 次，随身不限件数，不占骰袋；被动物品买入即永久生效。<b>一次性消耗品</b>用完即消失，但同价位下效果更直接——幸运币、猎人印记、烈酒、加注契约、幸运粉、盐、静默赦令。<b>三层骰架 / 双孔桶架 / 暗格货架</b>分别给市集某一区 +1 货位。<b>丰饶骰袋</b>与<b>裂痕骰袋</b>改变可用骰子数量，整局各只能获取一次。</p>
  <div class="toolbar">
    <input id="q-items" type="search" placeholder="搜索物品 / 效果…" aria-label="搜索物品">
    <button class="btn on" data-filter="itemRarity" data-value="all">全部稀有度</button>
    ${Object.values(RARITIES).map((r) => `<button class="btn" data-filter="itemRarity" data-value="${r.id}">${r.name}</button>`).join('')}
    <span class="count-note" id="itemCount"></span>
  </div>
  <h3 class="sub-head">主动物品 · 每关 1 次</h3>
  <div class="grid item-grid">${[...activeItems].sort(byRarity).map(itemCard).join('')}</div>
  <h3 class="sub-head">被动物品 · 永久生效</h3>
  <div class="grid item-grid">${[...passiveItems].sort(byRarity).map(itemCard).join('')}</div>
</section>

<section id="market">
  <div class="sec-head"><span class="sec-no">05</span><h2>数值速查</h2><span class="count">市集 · 计分 · 关卡</span></div>
  <div class="market">
    <div class="market-card">
      <h4>骰子区 · 按等级出货</h4>
      <div class="m-line"><span>默认货位</span><b>2 枚 · 三层骰架 +1</b></div>
      <div class="m-line"><span>刷新费用</span><b>10 银币</b></div>
      <div class="m-line"><span>价格</span><b>${['common', 'rare', 'epic', 'legendary'].map((r) => DICE.find((d) => d.rarity === r)?.price).join(' / ')}</b></div>
      <table style="margin-top:10px"><thead><tr><th>等级</th><th>普通</th><th>稀有</th><th>史诗</th><th>传说</th></tr></thead><tbody>${shopTable}</tbody></table>
      <p style="color:#8d7e66;font-size:10px;line-height:1.7;margin-top:8px">百分比是每枚骰子出货时按稀有度聚合的实际占比（骰池里各档数量不同，引擎会按档内数量均分权重）。已拥有该套组的骰子额外 ×1.5 权重，方便凑 2 / 4 件。</p>
    </div>
    <div class="market-card">
      <h4>市集价格与计分</h4>
      <div class="m-line"><span>骰桶货位</span><b>1 只 · 双孔桶架 +1 · 刷新 14</b></div>
      <div class="m-line"><span>骰桶价格</span><b>35 – 80 银币</b></div>
      <div class="m-line"><span>物品货位</span><b>3 件 · 暗格货架 +1 · 刷新 12</b></div>
      <div class="m-line"><span>物品价格</span><b>35 – 260 银币</b></div>
      <div class="m-line"><span>一次性消耗品</span><b>${ITEMS.filter((i) => i.consumable).length} 件</b></div>
      <table style="margin-top:10px">
        <tbody>
          <tr><td>单颗 1 / 5</td><td>100 / 50 分</td></tr>
          <tr><td>三条 1</td><td>1000 分</td></tr>
          <tr><td>三条 2–6</td><td>点数 ×100</td></tr>
          <tr><td>四 / 五 / 六条</td><td>三条 ×2 / ×4 / ×8</td></tr>
          <tr><td>顺子 1–5 / 2–6</td><td>500 / 750 分</td></tr>
          <tr><td>天地顺 1–6</td><td>1500 分</td></tr>
          <tr><td>恶魔赖子</td><td>补三条 / 顺子缺口，不能单独计分</td></tr>
        </tbody>
      </table>
    </div>
    <div class="market-card">
      <h4>过关奖金 · 收手换钱</h4>
      <div class="m-line"><span>基础奖励</span><b>${Math.min(...LEVELS.map((l) => l.reward))} – ${Math.max(...LEVELS.map((l) => l.reward))} 银币</b></div>
      <div class="m-line"><span>剩余重投</span><b>每次折基础奖励 ${pct(REROLL_BONUS_RATE)}</b></div>
      <div class="m-line"><span>得分 &gt; 目标 ${OVERSHOOT_RATIO} 倍</span><b>+基础奖励 ${pct(OVERSHOOT_BONUS_RATE)}</b></div>
      <div class="m-line"><span>镀金袖扣</span><b>+15 银币</b></div>
      <p style="color:#8d7e66;font-size:10px;line-height:1.7;margin-top:8px">超额赏金与剩余重投按基础奖励折算，可同时拿到。左上角「胜利奖励」实时等于此刻收手的总收入。</p>
    </div>
    <div class="market-card">
      <h4>关卡目标与基础奖励（★ 庄家关）</h4>
      <p style="color:#8d7e66;font-size:10px;line-height:1.7;margin:0 0 8px">数值不是手写的：目标 = ${LEVEL_CURVE.targetBase} × ${LEVEL_CURVE.targetGrowth}<sup>关-1</sup>，赏金 = ${LEVEL_CURVE.rewardBase} × ${LEVEL_CURVE.rewardGrowth}<sup>关-1</sup>，庄家的桌子再乘上他自己的系数。</p>
      <table><thead><tr><th>关</th><th>目标</th><th>基础</th><th>庄家 / 类型</th></tr></thead><tbody>${levelTable}</tbody></table>
      <div class="m-line" style="margin-top:10px"><span>庄家</span><b>${BOSSES.length} 位</b></div>
      <div class="m-line"><span>悬赏系数</span><b>×${Math.min(...BOSSES.map((b) => b.curve.reward)).toFixed(2)} – ×${Math.max(...BOSSES.map((b) => b.curve.reward)).toFixed(2)}</b></div>
    </div>
  </div>
  <ul class="notes">
    <li>骰袋满 6 枚（丰饶骰袋后 7 枚）时购入新骰，会弹出替换选择。</li>
    <li>物品不重复出售，随身主动物品不限件数；一次性消耗品用掉后会重新出现在市集。</li>
    <li>三种「货架」被动各自只影响对应分区的上架数量，可叠加使用。</li>
    <li><b>镀金袖扣</b>让刷新费用 −20%，并让每关胜利 +15 银币。</li>
    <li>失败后「卷土重来」保留骰袋、骰桶与物品，失去一半银币。</li>
    <li>每关基础 <b>3 次重投</b>，击败庄家不再累积上限；烈酒 / 时间沙漏 / 加注契约 / 旋涡桶仪式可以临时 +1。</li>
    <li><b>悬秤人</b>（第 ${BOSSES.find((b) => b.effectKey === 'floatingScore')?.level} 关）把整桌分数变成漂浮分：计分与重投都不会真正入账，掷出无法计分的骰型就整桌清零；只有落秤（过关）时分数与赏金才一起兑现。</li>
    <li>骰子期望分数可用 <b>npm run dice:ev</b> 重新评估。</li>
  </ul>
</section>

<footer>
  <span>数据：src/content/ · 皮肤：src/render/dice-skins.ts · 插画：assets/art · 本页由 tools/build-codex.mjs 生成 · ${stamp}</span>
  <span>天国骰局 · 骰子落下之前，命运只是一句空话。</span>
</footer>

</div>
<script>
(function(){
  var cards = [].slice.call(document.querySelectorAll('.die-card'));
  var countEl = document.getElementById('diceCount');
  var q = document.getElementById('q');
  var state = { q:'', set:'all', rarity:'all' };
  var order = { common:0, rare:1, epic:2, legendary:3 };

  function apply(){
    var shown = 0;
    cards.forEach(function(card){
      var hay = (card.dataset.name + ' ' + card.textContent).toLowerCase();
      var ok = (!state.q || hay.indexOf(state.q) >= 0)
        && (state.set === 'all' || card.dataset.set === state.set)
        && (state.rarity === 'all' || card.dataset.rarity === state.rarity);
      card.style.display = ok ? '' : 'none';
      if (ok) shown += 1;
    });
    // hide a set group when every card inside is filtered out
    [].forEach.call(document.querySelectorAll('.set-group'), function(group){
      var visible = [].some.call(group.querySelectorAll('.die-card'), function(c){ return c.style.display !== 'none'; });
      group.style.display = visible ? '' : 'none';
    });
    if (countEl) countEl.textContent = '显示 ' + shown + ' / ' + cards.length + ' 枚';
  }

  if (q) q.addEventListener('input', function(){ state.q = q.value.trim().toLowerCase(); apply(); });
  [].forEach.call(document.querySelectorAll('[data-filter]'), function(btn){
    btn.addEventListener('click', function(){
      var f = btn.dataset.filter;
      [].forEach.call(document.querySelectorAll('[data-filter="' + f + '"]'), function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      state[f] = btn.dataset.value;
      apply();
    });
  });
  apply();
})();

/* Barrels and items share one search + rarity filter. */
(function(){
  function setup(sectionId, qId, countId, key, unit){
    var section = document.getElementById(sectionId);
    if (!section) return;
    var cards = [].slice.call(section.querySelectorAll('.card'));
    var q = document.getElementById(qId);
    var count = document.getElementById(countId);
    var rarity = 'all';

    function apply(){
      var needle = q ? q.value.trim().toLowerCase() : '';
      var shown = 0;
      cards.forEach(function(card){
        var hay = ((card.dataset.name || '') + ' ' + card.textContent).toLowerCase();
        var ok = (!needle || hay.indexOf(needle) >= 0)
          && (rarity === 'all' || card.dataset.rarity === rarity);
        card.style.display = ok ? '' : 'none';
        if (ok) shown += 1;
      });
      if (count) count.textContent = '显示 ' + shown + ' / ' + cards.length + ' ' + unit;
    }

    if (q) q.addEventListener('input', apply);
    [].forEach.call(section.querySelectorAll('[data-filter="' + key + '"]'), function(btn){
      btn.addEventListener('click', function(){
        [].forEach.call(section.querySelectorAll('[data-filter="' + key + '"]'), function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        rarity = btn.dataset.value;
        apply();
      });
    });
    apply();
  }
  setup('barrels', 'q-barrels', 'barrelCount', 'barrelRarity', '只');
  setup('items', 'q-items', 'itemCount', 'itemRarity', '件');
})();

/* Live roller: weighted by the same effective probabilities the game uses. */
(function(){
  var LAB = ${labJson};
  var BY_ID = {};
  LAB.forEach(function(die){ BY_ID[die.id] = die; });

  var ONE = document.getElementById('lab-die');
  var CUP = document.getElementById('lab-barrel');
  var STAGE = document.getElementById('lab-die-face');
  var RESULT = document.getElementById('lab-result');
  var DETAIL = document.getElementById('lab-detail');
  var PROBS = document.getElementById('lab-probs');
  var SIX = document.getElementById('lab-six');
  var ROLL = document.getElementById('lab-roll');
  var ROLL_SIX = document.getElementById('lab-roll-six');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rolling = false;

  function die(){ return BY_ID[ONE.value] || LAB[0]; }
  function probs(){
    var table = die().probs;
    return table[CUP.value] || table[Object.keys(table)[0]];
  }
  function isWild(d, face){ return d.setId === 'demon' && face === 1; }
  function faceText(d, face){ return isWild(d, face) ? '恶魔赖子' : face + ' 点'; }
  function faceLabel(d, face){ return isWild(d, face) ? '魔' : String(face); }
  function peakOf(ps){
    var best = 0;
    for (var i = 1; i < 6; i += 1) if (ps[i] > ps[best]) best = i;
    return best + 1;
  }
  function weighted(ps){
    var r = Math.random();
    for (var i = 0; i < 6; i += 1) { r -= ps[i]; if (r <= 0) return i + 1; }
    return 6;
  }

  function drawFace(face){
    var d = die();
    var cls = 'lab-die art-die rarity-' + d.rarity + (d.setId === 'demon' ? ' is-demon' : '');
    if (STAGE.classList.contains('is-rolling')) cls += ' is-rolling';
    STAGE.className = cls;
    STAGE.style.cssText = d.skin;
    STAGE.innerHTML = d.faces[face];
    STAGE.setAttribute('aria-label', d.name + ' · ' + faceText(d, face));
  }

  function drawProbs(){
    var d = die();
    var ps = probs();
    var max = Math.max.apply(null, ps) || 1;
    var cupName = CUP.options[CUP.selectedIndex].text;
    PROBS.innerHTML = ps.map(function(p, i){
      var face = i + 1;
      var h = Math.max(6, Math.round(p / max * 80));
      var cls = 'lab-pb' + (face === peakOf(ps) ? ' is-peak' : '');
      return '<div class="' + cls + '">'
        + '<span class="lab-pct">' + (Math.round(p * 1000) / 10) + '%</span>'
        + '<i style="height:' + h + 'px"></i>'
        + '<span class="lab-face">' + faceLabel(d, face) + '</span>'
        + '</div>';
    }).join('');
    DETAIL.textContent = d.name + ' × ' + cupName + ' · 六面修正后的真实权重';
  }

  function settle(){
    rolling = false;
    ROLL.disabled = false;
    ROLL_SIX.disabled = false;
    STAGE.classList.remove('is-rolling');
  }

  function beginRoll(){
    rolling = true;
    ROLL.disabled = true;
    ROLL_SIX.disabled = true;
    SIX.innerHTML = '';
    STAGE.classList.remove('is-rolling');
    void STAGE.offsetWidth;
    STAGE.classList.add('is-rolling');
    drawFace(peakOf(probs()));
  }

  function rollOne(){
    if (rolling) return;
    var d = die();
    var ps = probs();
    var face = weighted(ps);
    beginRoll();
    RESULT.textContent = '掷出 ' + faceText(d, face);
    DETAIL.textContent = d.name + ' · 该面概率 ' + (Math.round(ps[face - 1] * 1000) / 10) + '%';
    setTimeout(function(){ drawFace(face); settle(); }, reduced ? 0 : 430);
  }

  function rollSix(){
    if (rolling) return;
    var d = die();
    var ps = probs();
    var faces = [];
    for (var i = 0; i < 6; i += 1) faces.push(weighted(ps));
    var wilds = faces.filter(function(face){ return isWild(d, face); }).length;
    var total = faces.reduce(function(sum, face){ return sum + face; }, 0);
    beginRoll();
    RESULT.textContent = '六颗合计 ' + total + ' 点' + (wilds ? ' · ' + wilds + ' 颗赖子' : '');
    DETAIL.textContent = d.name + ' · 六颗独立按同一组权重掷出';
    SIX.innerHTML = faces.map(function(face, i){
      return '<div class="lab-mini" style="--i:' + i + '">'
        + '<span class="mini-face" style="' + d.skin + '">' + d.faces[face] + '</span>'
        + '<b>' + faceLabel(d, face) + '</b><em>' + faceText(d, face) + '</em></div>';
    }).join('');
    setTimeout(function(){ drawFace(peakOf(ps)); settle(); }, reduced ? 0 : 470);
  }

  function reset(){
    drawFace(peakOf(probs()));
    drawProbs();
    RESULT.textContent = '等待投掷';
    SIX.innerHTML = '';
  }

  ONE.addEventListener('change', reset);
  CUP.addEventListener('change', reset);
  ROLL.addEventListener('click', rollOne);
  ROLL_SIX.addEventListener('click', rollSix);

  [].forEach.call(document.querySelectorAll('.die-card[data-die-id]'), function(card){
    card.addEventListener('click', function(){
      ONE.value = card.dataset.dieId;
      drawFace(peakOf(probs()));
      drawProbs();
      document.getElementById('lab').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      rollOne();
    });
    card.addEventListener('keydown', function(event){
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
    });
  });

  reset();
})();
</script>
</body>
</html>
`;

writeFileSync(OUT, html, 'utf8');

/* ── asset sanity check ───────────────────────────────────────────────── */
const used = new Set([
  ...BARRELS.map((b) => `cups/${b.art}.svg`),
  ...ITEMS.map((i) => `items/${i.icon}.svg`),
]);
const orphans = [];
for (const dir of ['cups', 'items']) {
  for (const file of readdirSync(join(ROOT, 'assets', dir))) {
    if (!used.has(`${dir}/${file}`)) orphans.push(`${dir}/${file}`);
  }
}

console.log(`codex written: docs/codex.html (${(html.length / 1024).toFixed(1)} kB)`);
console.log(`  sets: ${SET_IDS.map((id) => `${DICE_SETS[id].name} ${diceBySet[id].length}`).join(' / ')}`);
console.log(`  dice ${diceList.length} · barrels ${BARRELS.length} · items ${ITEMS.length} · levels ${LEVELS.length}`);
if (orphans.length) console.log(`  未被引用资源：${orphans.join(', ')}`);
