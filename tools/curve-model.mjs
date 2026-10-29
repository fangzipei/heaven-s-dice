/*
 * Rough shop-upgrade model used to review the shop rarity bands.
 *
 *   node tools/curve-model.mjs
 *
 * It does not simulate a player. It compares the rarity mix of each shop band
 * with a relative value per rarity, then prints the resulting quality index.
 * The curve uses the rounded growth rates printed at the end.
 */
import { SHOP_RARITY_WEIGHTS, LEVEL_CURVE } from '../src/content/index.ts';

const VALUE = { common: 1, rare: 2.2, epic: 4.5, legendary: 9 };

const rows = SHOP_RARITY_WEIGHTS.map((band) => {
  const quality = Object.entries(band.weights)
    .reduce((sum, [rarity, weight]) => sum + (VALUE[rarity] ?? 0) * weight / 100, 0);
  return { untilLevel: band.untilLevel, weights: band.weights, quality };
});

console.log('阶段商店稀有度与期望价值');
for (const row of rows) {
  console.log(`≤${String(row.untilLevel).padStart(2)} 关  普通 ${row.weights.common}%  稀有 ${row.weights.rare}%  史诗 ${row.weights.epic}%  传说 ${row.weights.legendary}%  → 质量 ${row.quality.toFixed(2)}`);
}
console.log('\n无庄家目标：');
for (let level = 1; level <= (LEVEL_CURVE.nonBossTargets?.length ?? 0); level += 1) {
  console.log(`第 ${level} 关  ${Math.round(LEVEL_CURVE.nonBossTargets[level - 1])} 分`);
}
