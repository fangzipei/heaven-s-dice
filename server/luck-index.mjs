/* Luck index scoring for hd_runs.
 * The index is intentionally progress-first: raw points are not a proxy for
 * luck when a run dies early or farms one-die scores.
 */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function levelFacts(run) {
  const levels = Array.isArray(run?.levels) ? run.levels : [];
  let cleared = 0;
  let targetRatio = 0;
  let throws = 0;
  let busts = 0;
  let scoredActions = 0;
  let multiActions = 0;

  for (const level of levels) {
    const target = Math.max(1, Number(level?.target) || 1);
    const score = Math.max(0, Number(level?.score) || 0);
    const ended = Boolean(level?.endedAt);
    if (ended && score >= target) cleared += 1;
    targetRatio += clamp(score / target, 0, 1.5);
    const levelThrows = Array.isArray(level?.throws) ? level.throws : [];
    for (const entry of levelThrows) {
      throws += 1;
      if ((Number(entry?.bust) || 0) > 0) busts += 1;
      if (entry?.action) {
        scoredActions += 1;
        const selectedCount = Array.isArray(entry?.selectedDice) ? entry.selectedDice.length : 0;
        const combos = Array.isArray(entry?.combos) ? entry.combos : [];
        const comboText = combos.join(' ');
        if (selectedCount >= 3 || /三条|四条|五条|六条|顺子|天地顺|triple|straight/i.test(comboText)) {
          multiActions += 1;
        }
      }
    }
  }

  const levelCount = levels.length;
  return {
    levelCount,
    cleared,
    targetRatio: levelCount ? targetRatio / levelCount : 0,
    bustRate: throws ? busts / throws : 0,
    multiRate: scoredActions ? multiActions / scoredActions : 0,
  };
}

/**
 * Returns 0..100; higher means the run was luckier.
 * `summary` is retained as a fallback for old/minimal clients, while detailed
 * level/throw data wins whenever it is present.
 */
export function calculateLuckIndex(run) {
  const summary = run?.summary && typeof run.summary === 'object' ? run.summary : {};
  const facts = levelFacts(run);
  const levelReached = clamp((Number(run?.levelReached) || 1) / 25);
  const levelsSeen = Math.max(1, facts.levelCount || Number(run?.levelReached) || 1);
  const clearRate = clamp(facts.cleared / levelsSeen);
  const targetRatio = facts.levelCount ? clamp(facts.targetRatio / 1.15) : 0;
  const bustRate = facts.levelCount
    ? facts.bustRate
    : clamp((Number(summary.busts) || 0) / Math.max(1, Number(summary.throws) || 1));
  const multiRate = facts.levelCount
    ? facts.multiRate
    : clamp(Number(summary.multiScoreRate) || 0);
  const resultBonus = run?.result === 'win' ? 1 : 0;

  // Progress is the gate. A high score in the first two/three levels cannot
  // dominate the index before the run has demonstrated survival.
  const progress = clamp((levelReached - 1 / 25) / (24 / 25));
  const scoreGate = clamp((Number(run?.levelReached) || 1) / 6);
  const raw = 100 * (
    progress * 0.48
    + clearRate * 0.22
    + targetRatio * 0.12 * scoreGate
    + multiRate * 0.10
    + (1 - bustRate) * 0.06
    + resultBonus * 0.02
  );
  const singleOnlyPenalty = multiRate < 0.2 ? (0.2 - multiRate) * 35 : 0;
  const earlyDeathCap = run?.result !== 'win' && (Number(run?.levelReached) || 1) <= 3 ? 24 : 100;
  return Math.round(Math.min(100, earlyDeathCap, Math.max(0, raw - singleOnlyPenalty)) * 100) / 100;
}

export { levelFacts };
