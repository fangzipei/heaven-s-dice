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

export const DICE_SETS: Record<'wolf' | 'demon', DiceSetDef> = {
  wolf: {
    id: 'wolf', name: '狼裔', icon: 'wolf', color: '#d18a58',
    motto: '群狼咬住同一个数字：3。',
    bonuses: [
      { pieces: 2, key: 'wolfThree', text: '每颗计分的 3 额外 +60 分。' },
      { pieces: 4, key: 'wolfTripleThree', text: '计分含三连 3 时额外 +600 分。' },
    ],
  },
  demon: {
    id: 'demon', name: '恶魔', icon: 'demon', color: '#c05a6a',
    motto: '它不掷点数，它借用别人的点数。',
    bonuses: [
      { pieces: 2, key: 'demonPact', text: '计分使用了恶魔赖子时，本次计分 ×1.08。' },
      { pieces: 4, key: 'demonLegion', text: '恶魔赖子参与计分时，本次计分 ×1.22（替代 2 件）。' },
    ],
  },
};

/** 商店里骰子的售价只由稀有度决定，所以价格不写进单颗骰子的文件。 */
export const DIE_PRICE_BY_RARITY: Record<RarityId, number> = {
  common: 35, rare: 70, epic: 130, legendary: 210,
};

/*
 * Shop stock is weighted by level so early levels teach common/rare dice and
 * late levels actually surface epic/legendary picks. Weights are relative, not
 * percentages: 0 means the tier cannot appear in that band.
 */
export const SHOP_RARITY_WEIGHTS: ShopWeightBand[] = [
  { untilLevel: 6, weights: { common: 62, rare: 32, epic: 6, legendary: 0 } },
  { untilLevel: 12, weights: { common: 34, rare: 46, epic: 18, legendary: 2 } },
  { untilLevel: 18, weights: { common: 18, rare: 44, epic: 30, legendary: 8 } },
  { untilLevel: 24, weights: { common: 9, rare: 34, epic: 37, legendary: 20 } },
  { untilLevel: 28, weights: { common: 4, rare: 26, epic: 40, legendary: 30 } },
];

export function rarityShopWeight(rarity: string, level = 1): number {
  const band = SHOP_RARITY_WEIGHTS.find((entry) => level <= entry.untilLevel)
    || SHOP_RARITY_WEIGHTS.at(-1);
  return band?.weights[rarity as RarityId] ?? 0;
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
