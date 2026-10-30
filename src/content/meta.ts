// content/meta.ts — 不属于某个条目、却决定全局平衡的元数据。
// 稀有度、套组、商店出货权重与过关奖金细则都在这里；条目文件只写自己。
import type {
  RarityTable, DiceSetDef, RarityId, ShopWeightBand,
} from '../core/types.ts';

export const RARITIES: RarityTable = {
  common: {
    id: 'common', name: '普通', short: '普通',
    color: '#b9b2a4', glow: 'rgba(185,178,164,.35)', order: 0,
  },
  rare: {
    id: 'rare', name: '稀有', short: '稀有',
    color: '#61a9d8', glow: 'rgba(97,169,216,.4)', order: 1,
  },
  epic: {
    id: 'epic', name: '史诗', short: '史诗',
    color: '#b57bea', glow: 'rgba(181,123,234,.45)', order: 2,
  },
  legendary: {
    id: 'legendary', name: '传说', short: '传说',
    color: '#f0b95f', glow: 'rgba(240,185,95,.5)', order: 3,
  },
};

/** Rarity lookup that tolerates an entry without one — every caller used to
    carry its own `|| RARITIES.common` fallback. */
export const rarityOf = (item: { rarity?: string } | null | undefined): RarityTable[RarityId] =>
  RARITIES[(item?.rarity as RarityId) || 'common'] || RARITIES.common;

export const DICE_SETS: Record<'wolf' | 'demon' | 'stargazer' | 'caravan', DiceSetDef> = {
  wolf: {
    id: 'wolf', name: '狼裔', icon: 'wolf', color: '#d18a58',
    motto: '群狼咬住同一个数字：3。',
    bonuses: [
      { pieces: 2, key: 'wolfThree', text: '每颗计分的 3 额外 +80 分。' },
      { pieces: 4, key: 'wolfTripleThree', text: '计分含三条 3 时额外 +800 分。' },
    ],
  },
  demon: {
    id: 'demon', name: '恶魔', icon: 'demon', color: '#c05a6a',
    motto: '它不掷点数，它借用别人的点数。',
    bonuses: [
      { pieces: 2, key: 'demonPact', text: '计分使用了恶魔赖子时，本次计分 ×1.18。' },
      { pieces: 4, key: 'demonLegion', text: '恶魔赖子参与计分时，本次计分 ×1.35（替代 2 件）。' },
    ],
  },
  stargazer: {
    id: 'stargazer', name: '星轨', icon: 'star', color: '#7fa9c9',
    motto: '不同的点数连成一条线，星盘才会转动。',
    bonuses: [
      { pieces: 2, key: 'starFaces', text: '计分含 2 种及以上不同点数时，本手 +350。' },
      { pieces: 4, key: 'starReroll', text: '每关第一次重投免费，且本次计分 ×1.10。' },
    ],
  },
  caravan: {
    id: 'caravan', name: '商旅', icon: 'coin', color: '#c9a45f',
    motto: '路费、货价、利息——每一项都能变成筹码。',
    bonuses: [
      { pieces: 2, key: 'caravanCoin', text: '每次成功计分额外获得 50 银币。' },
      { pieces: 4, key: 'caravanRetry', text: '每局第一次魔鬼重来免费。' },
    ],
  },
};

/** 商店里骰子的售价只由稀有度决定，所以价格不写进单颗骰子的文件。 */
export const DIE_PRICE_BY_RARITY: Record<RarityId, number> = {
  common: 35, rare: 70, epic: 130, legendary: 210,
};

/*
 * Shop stock is weighted by level so early levels teach common/rare dice and
 * late levels actually surface epic/legendary picks. Weights are aggregate
 * rarity percentages, not per-die weights: the engine divides each tier's
 * weight by the number of dice available in that tier so a shelf really does
 * show 80% common even though the pool holds more rare dice than common ones.
 * 0 means the tier cannot appear in that band.
 */
export const SHOP_RARITY_WEIGHTS: ShopWeightBand[] = [
  { untilLevel: 6, weights: { common: 65, rare: 27, epic: 7, legendary: 1 } },
  { untilLevel: 12, weights: { common: 46, rare: 34, epic: 16, legendary: 4 } },
  { untilLevel: 18, weights: { common: 28, rare: 34, epic: 29, legendary: 9 } },
  { untilLevel: 24, weights: { common: 15, rare: 32, epic: 43, legendary: 10 } },
];

/** A tier's share of the shelf in percent, comparable across level bands. */
export function rarityShopWeight(rarity: string, level = 1): number {
  const band = SHOP_RARITY_WEIGHTS.find((entry) => level <= entry.untilLevel)
    || SHOP_RARITY_WEIGHTS.at(-1);
  if (!band) return 0;
  const total = Object.values(band.weights).reduce((sum, weight) => sum + weight, 0);
  return total > 0 ? (band.weights[rarity as RarityId] ?? 0) / total * 100 : 0;
}

/* ── 过关奖金细则 ───────────────────────────────────────────────────────────
   基础赏金之外只有两笔浮动奖励：
   - 每次未使用的重投，奖励基础赏金的 20%；
   - 得分严格超过目标的 2 倍，额外奖励基础赏金的 50%。
   基础赏金本身不因得分高低膨胀。 */
export const REROLL_BONUS_RATE = 0.2;
export const OVERSHOOT_RATIO = 2;
export const OVERSHOOT_BONUS_RATE = 0.5;

export function exceedsOvershoot(score: number, target: number): boolean {
  return Boolean(target && target > 0 && score > target * OVERSHOOT_RATIO);
}
