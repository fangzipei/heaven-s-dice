/* ============================================================
   Kingdom Come: Deliverance 2 / Farkle scoring (TS port)
   ------------------------------------------------------------
   Single 1 ................ 100
   Single 5 ................ 50
   Triple 1 ................ 1000
   Triple 2-6 .............. face x 100
   Four of a kind .......... triple x 2
   Five of a kind .......... triple x 4
   Six of a kind ........... triple x 8
   Straight 1-5 ............ 500
   Straight 2-6 ............ 750
   Full straight 1-6 ....... 1500

   Demon wilds (WILD_VALUE) are jokers: they may stand in for one missing face
   in a straight (at most one wild per straight) or join natural dice of the
   same face to build triples and larger. A wild never scores on its own: every
   group it joins must contain at least one natural die, and a wild cannot be
   used to pad single 1/5 scoring.
   ============================================================ */

export const WILD_VALUE = 7;

export const SCORING_ROWS = [
  { key: 'one', label: '单颗 1', detail: '每颗', points: '100' },
  { key: 'five', label: '单颗 5', detail: '每颗', points: '50' },
  { key: 'triple', label: '三连', detail: '1x1000，其余点数x100', points: '200-1000' },
  { key: 'four', label: '四连', detail: '三连 x2', points: '400-2000' },
  { key: 'fiveKind', label: '五连', detail: '三连 x4', points: '800-4000' },
  { key: 'sixKind', label: '六连', detail: '三连 x8', points: '1600-8000' },
  { key: 'straight15', label: '顺子 1-5', detail: '五颗连续', points: '500' },
  { key: 'straight26', label: '顺子 2-6', detail: '五颗连续', points: '750' },
  { key: 'straight16', label: '通天顺 1-6', detail: '六颗连续', points: '1500' },
  { key: 'demon', label: '恶魔赖子', detail: '补三连/顺子缺口，不能单独计分', points: '-' },
];

export type FaceCount = [number, number, number, number, number, number, number];

export interface SingleCombo { type: 'single'; face: number; count: number; points: number; label: string }
export interface NKindCombo { type: 'nkind'; face: number; count: number; points: number; label: string }
export interface StraightCombo { type: 'straight'; faces: number[]; points: number; label: string; wilds: number }
export type Combo = SingleCombo | NKindCombo | StraightCombo;

export interface ScoringAnalysis {
  valid: boolean;
  base: number;
  combos: Combo[];
  multi?: boolean;
  straight: boolean;
  counts: number[];
  values: number[];
  wilds?: number;
}

interface Scored { score: number; combos: Combo[] }
interface Best extends Scored { counts: FaceCount }

const N_KIND_MULTIPLIER: Record<number, number> = { 3: 1, 4: 2, 5: 4, 6: 8 };
const N_KIND_LABEL: Record<number, string> = { 3: '三连', 4: '四连', 5: '五连', 6: '六连' };
const SINGLE_POINTS: Record<number, number> = { 1: 100, 5: 50 };
const STRAIGHTS = [
  { faces: [1, 2, 3, 4, 5], label: '顺子 1-5', points: 500 },
  { faces: [2, 3, 4, 5, 6], label: '顺子 2-6', points: 750 },
  { faces: [1, 2, 3, 4, 5, 6], label: '通天顺 1-6', points: 1500 },
];

export function emptyCounts(): FaceCount {
  return [0, 0, 0, 0, 0, 0, 0]; // index 0 unused
}

export function countFaces(values: number[]): FaceCount {
  const counts = emptyCounts();
  for (const value of values) {
    if (Number.isInteger(value) && value >= 1 && value <= 6) counts[value as 1 | 2 | 3 | 4 | 5 | 6] += 1;
  }
  return counts;
}

function tripleBase(face: number): number {
  return face === 1 ? 1000 : face * 100;
}

function cloneCounts(counts: FaceCount): FaceCount {
  return [...counts] as FaceCount;
}

function addCounts(a: number[], b: number[]): FaceCount {
  const out = emptyCounts();
  for (let face = 1; face <= 6; face += 1) out[face] = (a[face] || 0) + (b[face] || 0);
  return out;
}

function nKindCombo(face: number, count: number): NKindCombo {
  return {
    type: 'nkind',
    face,
    count,
    points: tripleBase(face) * N_KIND_MULTIPLIER[count]!,
    label: `${N_KIND_LABEL[count]} ${face}`,
  };
}

const memo = new Map<string, Scored | null>();

/**
 * Scores an exact multiset of natural dice (counts index 1..6). Every die must
 * be consumed by a scoring combination; otherwise the result is invalid.
 * Returns the maximum-scoring legal partition, or null.
 */
function scoreCounts(counts: FaceCount): Scored | null {
  const key = counts.slice(1).join(',');
  if (memo.has(key)) return memo.get(key) ?? null;

  let face = 1;
  while (face <= 6 && counts[face] === 0) face += 1;

  if (face === 7) {
    const empty: Scored = { score: 0, combos: [] };
    memo.set(key, empty);
    return empty;
  }

  const count = counts[face]!;
  const options: Scored[] = [];

  if (face === 1 || face === 5) {
    for (let take = 1; take <= count; take += 1) {
      const next = cloneCounts(counts);
      next[face]! -= take;
      const rest = scoreCounts(next);
      if (rest) {
        const combo: SingleCombo = {
          type: 'single',
          face,
          count: take,
          points: take * SINGLE_POINTS[face]!,
          label: take === 1 ? `单 ${face}` : `单 ${face} x${take}`,
        };
        options.push({ score: combo.points + rest.score, combos: [combo, ...rest.combos] });
      }
    }
  }

  if (count >= 3) {
    for (let take = 3; take <= count; take += 1) {
      const next = cloneCounts(counts);
      next[face]! -= take;
      const rest = scoreCounts(next);
      if (rest) {
        const combo = nKindCombo(face, take);
        options.push({ score: combo.points + rest.score, combos: [combo, ...rest.combos] });
      }
    }
  }

  if (!options.length) {
    memo.set(key, null);
    return null;
  }

  options.sort((a, b) => b.score - a.score || a.combos.length - b.combos.length);
  memo.set(key, options[0]!);
  return options[0]!;
}

function better(a: Best | null, b: Best): Best {
  if (!a) return b;
  if (b.score !== a.score) return b.score > a.score ? b : a;
  return b.combos.length < a.combos.length ? b : a;
}

const wildMemo = new Map<string, Best | null>();

/**
 * Best legal partition of `counts` natural dice plus `wilds` jokers.
 * Every die - natural or wild - must be consumed.
 */
function analyzeCounts(counts: FaceCount, wilds: number): Best | null {
  const key = `${counts.slice(1).join(',')}|${wilds}`;
  if (wildMemo.has(key)) return wildMemo.get(key) ?? null;

  let best: Best | null = null;

  // Straights: a wild may fill exactly one missing face.
  for (const straight of STRAIGHTS) {
    const missing = straight.faces.filter((face) => counts[face] === 0);
    const wildUsed = missing.length;
    if (wildUsed > 1 || wildUsed > wilds) continue;
    const remainder = cloneCounts(counts);
    const straightCounts = emptyCounts();
    for (const face of straight.faces) {
      straightCounts[face]! += 1;
      if (remainder[face]! > 0) remainder[face]! -= 1;
    }
    const rest = analyzeCounts(remainder, wilds - wildUsed);
    if (!rest) continue;
    best = better(best, {
      score: straight.points + rest.score,
      combos: [
        { type: 'straight', faces: [...straight.faces], points: straight.points, label: straight.label, wilds: wildUsed },
        ...rest.combos,
      ],
      counts: addCounts(straightCounts, rest.counts),
    });
  }

  // No straight: wilds may only reinforce a face that already has a natural
  // die, and the resulting group must be a triple or larger.
  const distribute = (face: number, remaining: number, add: FaceCount) => {
    if (face === 7) {
      if (remaining !== 0) return;
      const finalCounts = addCounts(counts, add);
      const scored = scoreCounts(finalCounts);
      if (!scored) return;
      best = better(best, { score: scored.score, combos: scored.combos, counts: finalCounts });
      return;
    }
    distribute(face + 1, remaining, add);
    if (counts[face] === 0) return;
    const need = Math.max(1, 3 - counts[face]!);
    for (let take = need; take <= remaining; take += 1) {
      const nextAdd = cloneCounts(add);
      nextAdd[face]! += take;
      distribute(face + 1, remaining - take, nextAdd);
    }
  };
  distribute(1, wilds, emptyCounts());

  wildMemo.set(key, best);
  return best;
}

/**
 * @param values dice faces (1..6, or WILD_VALUE for a demon joker)
 */
export function analyzeSelection(values: number[]): ScoringAnalysis {
  const clean = values.filter(
    (v) => Number.isInteger(v) && ((v >= 1 && v <= 6) || v === WILD_VALUE),
  );
  const natural = clean.filter((v) => v !== WILD_VALUE);
  const wilds = clean.length - natural.length;
  const naturalCounts = countFaces(natural);
  if (!clean.length) {
    return {
      valid: false, base: 0, combos: [], multi: false, straight: false,
      counts: naturalCounts, values: [], wilds: 0,
    };
  }

  const best = analyzeCounts(naturalCounts, wilds);
  if (!best) {
    return {
      valid: false, base: 0, combos: [], multi: false, straight: false,
      counts: naturalCounts, values: clean, wilds,
    };
  }

  const multi = best.combos.some(
    (c) => c.type === 'straight' || (c.type === 'nkind' && c.count >= 3),
  );
  const straight = best.combos.some((c) => c.type === 'straight');

  return {
    valid: true,
    base: best.score,
    combos: best.combos,
    multi,
    straight,
    counts: best.counts,
    values: clean,
    wilds,
  };
}

export interface PlayableDie {
  uid: string;
  value: number | null;
  wild?: boolean;
}

/** The face a die contributes to a selection: its own value, or the joker. */
function faceOf(die: PlayableDie): number {
  return die.wild ? WILD_VALUE : (die.value as number);
}

/**
 * Enumerates every non-empty selection of available dice and returns the best
 * legal one. At most 7 dice are in play, so exhaustive search is tiny.
 */
export function bestSelection(dice: PlayableDie[]): { dice: PlayableDie[]; analysis: ScoringAnalysis } | null {
  const playable = dice.filter(
    (d) => d.wild || d.value === WILD_VALUE || ((d.value ?? 0) >= 1 && (d.value ?? 0) <= 6),
  );
  if (!playable.length) return null;
  let best: { dice: PlayableDie[]; analysis: ScoringAnalysis } | null = null;
  const total = 1 << playable.length;
  for (let mask = 1; mask < total; mask += 1) {
    const chosen: PlayableDie[] = [];
    for (let i = 0; i < playable.length; i += 1) {
      if (mask & (1 << i)) chosen.push(playable[i]!);
    }
    const analysis = analyzeSelection(chosen.map(faceOf));
    if (!analysis.valid) continue;
    if (!best || analysis.base > best.analysis.base ||
        (analysis.base === best.analysis.base && chosen.length > best.dice.length)) {
      best = { dice: chosen, analysis };
    }
  }
  return best;
}

export function hasScoringSelection(dice: PlayableDie[]): boolean {
  return bestSelection(dice) !== null;
}

export function describeCombo(combo: Combo): string {
  return `${combo.label} +${combo.points}`;
}

export function selectionValues(dice: PlayableDie[]): number[] {
  return dice.map(faceOf);
}
