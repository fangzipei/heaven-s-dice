// content/levels/curve.ts — 目标分与赏金的来源：一条指数曲线 × 庄家系数。
import { BOSSES } from '../bosses/index.ts';
import type { BossDef, LevelCurveDef, LevelRow } from '../../core/types.ts';

/* ── 关卡曲线：目标与赏金是算出来的，不是抄出来的 ──────────────────────
   一条指数曲线负责“越往后越贵”，庄家用 bosses/<id>.ts 里的 curve 系数把
   自己那一档抬起来。改难度只要动 curve、改曲线只要动 LEVEL_CURVE，
   不用再手改每一关的数字（改一行忘三行才是真正的 bug 来源）。 */
const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/** No-boss targets: 500, then 1000; 2-7 +15%; 8 adds 500 and 8-15 +20%;
 *  16 adds 1000 and 16-24 +25%. Values are kept unrounded so the next step
 *  compounds on the exact target. */
function buildNoBossTargets(): number[] {
  const targets = [500, 1000];
  let value = 1000;
  for (let level = 3; level <= 24; level += 1) {
    if (level === 8) value += 500;
    else if (level === 16) value += 1000;
    else if (level <= 7) value *= 1.15;
    else if (level <= 15) value *= 1.20;
    else value *= 1.25;
    targets.push(value);
  }
  return targets;
}

export const LEVEL_CURVE: LevelCurveDef = {
  targetBase: 500,
  targetGrowth: 1.06,
  targetAfterFirst: 1,
  rewardBase: 55,
  rewardGrowth: 1.06,
  targetStep: 10,
  rewardStep: 5,
  nonBossTargets: buildNoBossTargets(),
};

/**
 * 生成关卡表。庄家关的目标与赏金都会乘上该庄家的系数。
 * 每行额外带一份 curve（乘系数之前的曲线值），方便界面/结算展示
 * “这一关因为庄家多拿了多少”。
 */
export function buildLevelTable(bosses: BossDef[] = BOSSES, curve: LevelCurveDef = LEVEL_CURVE): LevelRow[] {
  const at = new Map(bosses.map((boss) => [boss.level, boss]));
  const total = bosses.length ? Math.max(...bosses.map((boss) => boss.level)) : 0;
  const rows: LevelRow[] = [];
  let curveTarget = curve.targetBase;
  for (let level = 1; level <= total; level += 1) {
    curveTarget = curve.nonBossTargets?.[level - 1] ?? curveTarget;
    const baseTarget = curveTarget;
    const baseReward = curve.rewardBase * curve.rewardGrowth ** (level - 1);
    const boss = at.get(level) || null;
    const scale = boss?.curve || { target: 1, reward: 1 };
    const roundedCurveTarget = roundTo(baseTarget, curve.targetStep);
    const scaledTarget = roundTo(baseTarget * (scale.target ?? 1), curve.targetStep);
    const row: LevelRow = {
      level,
      target: scaledTarget,
      reward: roundTo(baseReward * (scale.reward ?? 1), curve.rewardStep),
      curve: {
        target: roundedCurveTarget,
        reward: roundTo(baseReward, curve.rewardStep),
      },
    };
    if (boss) row.boss = true;
    rows.push(row);
  }
  return rows;
}
