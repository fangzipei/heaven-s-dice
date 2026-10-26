/* ============================================================
   Kingdom Come: Deliverance 2 / Farkle scoring
   ------------------------------------------------------------
   Single 1 ................ 100
   Single 5 ................ 50
   Triple 1 ................ 1000
   Triple 2–6 .............. face × 100
   Four of a kind .......... triple × 2
   Five of a kind .......... triple × 4
   Six of a kind ........... triple × 8
   Straight 1–5 ............ 500
   Straight 2–6 ............ 750
   Full straight 1–6 ....... 1500
   ============================================================ */

export const SCORING_ROWS = [
  { key: 'one', label: '单颗 1', detail: '每颗', points: '100' },
  { key: 'five', label: '单颗 5', detail: '每颗', points: '50' },
  { key: 'triple', label: '三连', detail: '1×1000，其余点数×100', points: '200–1000' },
  { key: 'four', label: '四连', detail: '三连 ×2', points: '400–2000' },
  { key: 'fiveKind', label: '五连', detail: '三连 ×4', points: '800–4000' },
  { key: 'sixKind', label: '六连', detail: '三连 ×8', points: '1600–8000' },
  { key: 'straight15', label: '顺子 1–5', detail: '五颗连续', points: '500' },
  { key: 'straight26', label: '顺子 2–6', detail: '五颗连续', points: '750' },
  { key: 'straight16', label: '通天顺 1–6', detail: '六颗连续', points: '1500' },
];

const N_KIND_MULTIPLIER = { 3: 1, 4: 2, 5: 4, 6: 8 };
const N_KIND_LABEL = { 3: '三连', 4: '四连', 5: '五连', 6: '六连' };
const SINGLE_POINTS = { 1: 100, 5: 50 };

export function emptyCounts() {
  return [0, 0, 0, 0, 0, 0, 0]; // index 0 unused
}

export function countFaces(values) {
  const counts = emptyCounts();
  for (const value of values) {
    if (Number.isInteger(value) && value >= 1 && value <= 6) counts[value] += 1;
  }
  return counts;
}

function tripleBase(face) {
  return face === 1 ? 1000 : face * 100;
}

function cloneCounts(counts) {
  return counts.slice();
}

function nKindCombo(face, count) {
  return {
    type: 'nkind',
    face,
    count,
    points: tripleBase(face) * N_KIND_MULTIPLIER[count],
    label: `${N_KIND_LABEL[count]} ${face}`,
  };
}

const memo = new Map();

/**
 * Scores an exact multiset of dice (counts index 1..6). Every die must be
 * consumed by a scoring combination; otherwise the result is invalid.
 * Returns the maximum-scoring legal partition, or null.
 */
function scoreCounts(counts) {
  const key = counts.slice(1).join(',');
  if (memo.has(key)) return memo.get(key);

  let face = 1;
  while (face <= 6 && counts[face] === 0) face += 1;

  if (face === 7) {
    const empty = { score: 0, combos: [] };
    memo.set(key, empty);
    return empty;
  }

  const count = counts[face];
  const options = [];

  if (face === 1 || face === 5) {
    // Any number of singles is legal.
    for (let take = 1; take <= count; take += 1) {
      const next = cloneCounts(counts);
      next[face] -= take;
      const rest = scoreCounts(next);
      if (rest) {
        const combo = {
          type: 'single',
          face,
          count: take,
          points: take * SINGLE_POINTS[face],
          label: take === 1 ? `单 ${face}` : `单 ${face} ×${take}`,
        };
        options.push({
          score: combo.points + rest.score,
          combos: [combo, ...rest.combos],
        });
      }
    }
  }

  if (count >= 3) {
    for (let take = 3; take <= count; take += 1) {
      const next = cloneCounts(counts);
      next[face] -= take;
      const rest = scoreCounts(next);
      if (rest) {
        const combo = nKindCombo(face, take);
        options.push({
          score: combo.points + rest.score,
          combos: [combo, ...rest.combos],
        });
      }
    }
  }

  if (!options.length) {
    memo.set(key, null);
    return null;
  }

  options.sort((a, b) => b.score - a.score || a.combos.length - b.combos.length);
  memo.set(key, options[0]);
  return options[0];
}

function scoreWithoutStraight(counts) {
  return scoreCounts(cloneCounts(counts));
}

function straightCandidate(counts, faces, label, points) {
  const remainder = cloneCounts(counts);
  for (const face of faces) {
    if (remainder[face] < 1) return null;
    remainder[face] -= 1;
  }
  const rest = scoreCounts(remainder);
  if (!rest) return null;
  return {
    score: points + rest.score,
    combos: [
      { type: 'straight', faces: [...faces], points, label },
      ...rest.combos,
    ],
  };
}

/**
 * @param {number[]} values dice faces (1..6) selected by the player
 * @returns {{valid:boolean, base:number, combos:Array, multi:boolean,
 *            straight:boolean, counts:number[], values:number[]}}
 */
export function analyzeSelection(values) {
  const clean = values.filter((v) => Number.isInteger(v) && v >= 1 && v <= 6);
  const counts = countFaces(clean);
  if (!clean.length) {
    return { valid: false, base: 0, combos: [], multi: false, straight: false, counts, values: [] };
  }

  const candidates = [];
  const noStraight = scoreWithoutStraight(counts);
  if (noStraight) candidates.push(noStraight);

  const straight15 = straightCandidate(counts, [1, 2, 3, 4, 5], '顺子 1–5', 500);
  if (straight15) candidates.push(straight15);
  const straight26 = straightCandidate(counts, [2, 3, 4, 5, 6], '顺子 2–6', 750);
  if (straight26) candidates.push(straight26);
  const straight16 = straightCandidate(counts, [1, 2, 3, 4, 5, 6], '通天顺 1–6', 1500);
  if (straight16) candidates.push(straight16);

  if (!candidates.length) {
    return { valid: false, base: 0, combos: [], multi: false, straight: false, counts, values: clean };
  }

  candidates.sort((a, b) => b.score - a.score || a.combos.length - b.combos.length);
  const best = candidates[0];
  const multi = best.combos.some((c) => c.type === 'straight' || (c.type === 'nkind' && c.count >= 3));
  const straight = best.combos.some((c) => c.type === 'straight');

  return {
    valid: true,
    base: best.score,
    combos: best.combos,
    multi,
    straight,
    counts,
    values: clean,
  };
}

/**
 * Enumerates every non-empty selection of available dice and returns the best
 * legal one. At most 7 dice are in play, so exhaustive search is tiny.
 * @param {{uid:string,value:number}[]} dice
 */
export function bestSelection(dice) {
  const playable = dice.filter((d) => d.value >= 1 && d.value <= 6);
  if (!playable.length) return null;
  let best = null;
  const total = 1 << playable.length;
  for (let mask = 1; mask < total; mask += 1) {
    const chosen = [];
    for (let i = 0; i < playable.length; i += 1) {
      if (mask & (1 << i)) chosen.push(playable[i]);
    }
    const analysis = analyzeSelection(chosen.map((d) => d.value));
    if (!analysis.valid) continue;
    if (!best || analysis.base > best.analysis.base ||
        (analysis.base === best.analysis.base && chosen.length > best.dice.length)) {
      best = { dice: chosen, analysis };
    }
  }
  return best;
}

export function hasScoringSelection(dice) {
  return bestSelection(dice) !== null;
}

export function describeCombo(combo) {
  return `${combo.label} +${combo.points}`;
}

export function selectionValues(dice) {
  return dice.map((d) => d.value);
}
