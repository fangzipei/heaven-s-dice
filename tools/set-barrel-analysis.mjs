// tools/set-barrel-analysis.mjs — Monte Carlo comparison of set + barrel builds.
// Run with: node --experimental-strip-types tools/set-barrel-analysis.mjs [trials]
import { writeFileSync } from 'node:fs';
import {
  BARRELS, DICE, DICE_BY_ID, DICE_SETS, LEVELS,
} from '../src/content/index.ts';
import {
  BASE_REROLLS, buildScore, createRun, initLevel, rollDice, syncBag,
} from '../src/core/engine.ts';
import { bestSelection } from '../src/core/scoring.ts';

const trials = Number(process.argv[2] || 6000);
const setBuilds = {
  wolf: { name: '狼裔', dice: [...DICE.filter((d) => d.setId === 'wolf').map((d) => d.id), 'wolf_ancestor', 'wolf_ancestor'] },
  demon: { name: '恶魔', dice: [...DICE.filter((d) => d.setId === 'demon').map((d) => d.id), 'demon_queen', 'demon_queen'] },
  stargazer: { name: '星轨', dice: [...DICE.filter((d) => d.setId === 'stargazer').map((d) => d.id), 'even_twin', 'even_twin'] },
  caravan: { name: '商旅', dice: [...DICE.filter((d) => d.setId === 'caravan').map((d) => d.id), 'merchant', 'merchant'] },
  free: { name: '无套组', dice: Array(6).fill('standard') },
};

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rows = [];
for (const [setId, build] of Object.entries(setBuilds)) {
  for (const barrel of BARRELS) {
    const rng = mulberry32(0x9e3779b9 ^ (trials + barrel.id.length));
    const state = createRun({ rng });
    state.bag = build.dice.map((dieId, index) => ({ uid: `b${index}`, dieId }));
    state.barrelId = barrel.id;
    initLevel(state);
    const baseDice = state.dice.map((die) => ({ ...die }));
    let hot = 0;
    let score = 0;
    let legal = 0;
    for (let i = 0; i < trials; i += 1) {
      state.dice = baseDice.map((die) => ({ ...die, value: null, blank: false, wild: false, gilded: false, scored: false }));
      state.phase = 'ready';
      state.score = 0;
      state.roundScore = 0;
      state.selected = [];
      state.rerolls = BASE_REROLLS;
      state.throwNumber = 0;
      state.flags = { ...state.flags, hotDice: false, rerollAll: false, floatingBustPending: false, smokeReroll: false };
      rollDice(state, { free: true, rng });
      const all = state.dice.filter((die) => die.value != null);
      if (all.length) {
        state.selected = all.map((die) => die.uid);
        if (buildScore(state, 'continue').valid) hot += 1;
      }
      const best = bestSelection(state.dice.filter((die) => !die.blank && die.value != null), {});
      if (best) {
        state.selected = best.dice.map((die) => die.uid);
        const result = buildScore(state, 'continue');
        if (result.valid) {
          legal += 1;
          score += result.total;
        }
      }
    }
    rows.push({
      setId, setName: build.name, barrelId: barrel.id, barrelName: barrel.name,
      hotRate: hot / trials, expectedScore: legal ? score / trials : 0,
      legalRate: legal / trials,
    });
  }
}
rows.sort((a, b) => b.expectedScore - a.expectedScore);
const md = [
  '# 套组 × 骰桶 后期模拟',
  '',
  `每次组合 ${trials.toLocaleString()} 次单次投掷；固定六骰（套组 4 枚 + 2 枚同套重复），无庄家、无物品、无重投。`,
  '"全骰率" = 一次投掷能把桌面所有骰子都纳入合法计分的概率；"期望分" = 每次投掷最佳合法选择的平均分。',
  '',
  '| 套组 | 骰桶 | 全骰率 | 期望分 | 合法率 |',
  '|---|---|---:|---:|---:|',
  ...rows.map((r) => `| ${r.setName} | ${r.barrelName} | ${(r.hotRate * 100).toFixed(1)}% | ${Math.round(r.expectedScore).toLocaleString()} | ${(r.legalRate * 100).toFixed(1)}% |`),
  '',
];
writeFileSync('docs/set-barrel-analysis.md', md.join('\n'), 'utf8');
writeFileSync('docs/set-barrel-analysis.json', JSON.stringify(rows, null, 2), 'utf8');
for (const setId of Object.keys(setBuilds)) {
  const subset = rows.filter((r) => r.setId === setId);
  const avg = subset.reduce((sum, r) => sum + r.expectedScore, 0) / subset.length;
  const hot = subset.reduce((sum, r) => sum + r.hotRate, 0) / subset.length;
  console.log(`${setBuilds[setId].name}: avg EV ${Math.round(avg)}, avg hot ${(hot * 100).toFixed(1)}%`);
}
console.log(`wrote docs/set-barrel-analysis.md (${rows.length} combos, ${trials} trials each)`);
for (const r of rows.slice(0, 12)) {
  console.log(`${r.setName} × ${r.barrelName}: hot ${(r.hotRate * 100).toFixed(1)}%, EV ${Math.round(r.expectedScore)}`);
}
