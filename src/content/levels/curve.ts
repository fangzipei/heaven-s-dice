// content/levels/curve.ts — 目标分与赏金的来源：一条指数曲线 × 庄家系数。
import { BOSSES } from '../bosses/index.ts';
import type { BossDef, LevelCurveDef, LevelRow } from '../../core/types.ts';

/* ── 关卡曲线：目标与赏金是算出来的，不是抄出来的 ──────────────────────
   一条指数曲线负责“越往后越贵”，庄家用 bosses/<id>.ts 里的 curve 系数把
   自己那一档抬起来。改难度只要动 curve、改曲线只要动 LEVEL_CURVE，
   不用再手改 33 行数字（改一行忘三行才是真正的 bug 来源）。 */
export const LEVEL_CURVE: LevelCurveDef = {
  targetBase: 500,      // 第 1 关目标分
  targetGrowth: 1.05,   // 每关目标 ×1.05
  rewardBase: 55,       // 第 1 关基础赏金
  rewardGrowth: 1.055,  // 每关赏金 ×1.055
  targetStep: 10,       // 目标取整到 10
  rewardStep: 5,        // 赏金取整到 5
};

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

/**
 * 生成关卡表。庄家关的目标与赏金都会乘上该庄家的系数。
 * 每行额外带一份 curve（乘系数之前的曲线值），方便界面/结算展示
 * “这一关因为庄家多拿了多少”。
 */
export function buildLevelTable(bosses: BossDef[] = BOSSES, curve: LevelCurveDef = LEVEL_CURVE): LevelRow[] {
  const at = new Map(bosses.map((boss) => [boss.level, boss]));
  const total = bosses.length ? Math.max(...bosses.map((boss) => boss.level)) : 0;
  const rows: LevelRow[] = [];
  for (let level = 1; level <= total; level += 1) {
    const baseTarget = curve.targetBase * curve.targetGrowth ** (level - 1);
    const baseReward = curve.rewardBase * curve.rewardGrowth ** (level - 1);
    const boss = at.get(level) || null;
    const scale = boss?.curve || { target: 1, reward: 1 };
    const row: LevelRow = {
      level,
      target: roundTo(baseTarget * (scale.target ?? 1), curve.targetStep),
      reward: roundTo(baseReward * (scale.reward ?? 1), curve.rewardStep),
      curve: {
        target: roundTo(baseTarget, curve.targetStep),
        reward: roundTo(baseReward, curve.rewardStep),
      },
    };
    if (boss) row.boss = true;
    rows.push(row);
  }
  return rows;
}
