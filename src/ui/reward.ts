// ui/reward.ts — 「现在收手能带走多少」的预告，目标栏与结算/商店面板共用。
//
// 只是显示用的预估，实际结算仍由 core/engine.ts 的 awardLevel 决定。
// baseReward 里的 gold_cuff +15 必须和引擎那条保持一致。
import { REROLL_REFUND, getLevelConfig } from '../content/index.ts';
import { cashOutValue } from '../core/engine.ts';
import { app } from './state.ts';

/** Base level payout, before reroll cash-out and overshoot tiers. */
export function baseReward(): number {
  if (!app.run) return 0;
  let reward = getLevelConfig(app.run.level).reward;
  // Must match awardLevel in the engine (gold_cuff pays 15).
  if (app.run.passiveItems.includes('gold_cuff')) reward += 15;
  return reward;
}

export function projectedReward(): number {
  if (!app.run) return 0;
  // Live preview: what banking at this exact moment would pay.
  return baseReward() + cashOutValue(app.run).total;
}

/** Itemised preview shown in the HUD tooltip so the cash-out rules stay visible. */
export function cashOutHint(): string {
  const run = app.run!;
  const cash = cashOutValue(run);
  const parts = [`基础 ${getLevelConfig(run.level).reward}`];
  if (run.passiveItems.includes('gold_cuff')) parts.push('镀金袖扣 +15');
  parts.push(`剩余重投 ${cash.spare} × ${REROLL_REFUND} = ${cash.refund}`);
  parts.push(cash.tier ? `${cash.tier.label} +${cash.tierValue}` : '超额赏金 未达成（1.5 倍 +25 / 2 倍 +60 / 3 倍 +140）');
  return parts.join('\n');
}
