// content/index.ts — 内容注册表的聚合出口。
// 每一项的本体在 content/<类别>/<id>.ts 里；这里只做三件事：
// 1) 按注册表顺序摊平成 DICE / BARRELS / ITEMS / TABLES / MINIONS / BOSSES；
// 2) 补上由别处推出来的字段（骰子售价由稀有度决定，庄家关卡号由空档表决定）；
// 3) 提供 by-id 查表和套组加成这类跨条目计算。
// core/engine.ts 只 import 这个文件，所以表现层与工具脚本也都走这里。
import type {
  DiceDef, PricedDie, ById, BarrelDef, ItemDef, TableDef, MinionDef,
} from '../core/types.ts';
import { DICE_SETS, DIE_PRICE_BY_RARITY } from './meta.ts';
import { STANDARD_DIE } from './standard_die.ts';
import { DICE_DEFS } from './dice/index.ts';
import { BARREL_DEFS } from './barrels/index.ts';
import { ITEM_DEFS } from './items/index.ts';
import { TABLE_DEFS } from './tables/index.ts';
import { MINION_DEFS } from './minions/index.ts';

export {
  RARITIES, rarityOf, DICE_SETS, SHOP_RARITY_WEIGHTS, rarityShopWeight,
  REROLL_BONUS_RATE, OVERSHOOT_RATIO, OVERSHOOT_BONUS_RATE, exceedsOvershoot,
} from './meta.ts';
export { STANDARD_DIE } from './standard_die.ts';
export { BOSSES } from './bosses/index.ts';
export {
  MINION_GAPS, LEVELS, LEVEL_COUNT, CHAPTERS, chapterForLevel, chapterLevelSpan,
  getLevelConfig, getOpponent, getTable, buildLevelTable, LEVEL_CURVE,
} from './levels/index.ts';

/* 商店卡池里永远是有价骰子，所以价格是聚合时盖上去的章，条目文件不写它。
   注意：这里生成的是新对象，dice/<id>.ts 导出的是未定价的定义本体。 */
export const DICE: PricedDie[] = DICE_DEFS.map((die) => ({
  ...die,
  price: DIE_PRICE_BY_RARITY[die.rarity] ?? 30,
}));

export const DICE_BY_ID: ById<PricedDie> = Object.fromEntries(DICE.map((d) => [d.id, d]));

export const BARRELS: BarrelDef[] = BARREL_DEFS;
export const BARREL_BY_ID: ById<BarrelDef> = Object.fromEntries(BARRELS.map((b) => [b.id, b]));

export const ITEMS: ItemDef[] = ITEM_DEFS;
export const ITEM_BY_ID: ById<ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const TABLES: TableDef[] = TABLE_DEFS;
export const MINIONS: MinionDef[] = MINION_DEFS;

export function setPieceCounts(equippedDice: { dieId: string }[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(Object.keys(DICE_SETS).map((id) => [id, 0]));
  for (const entry of equippedDice) {
    const die: DiceDef = DICE_BY_ID[entry.dieId] || STANDARD_DIE;
    if (die.setId) counts[die.setId] = (counts[die.setId] ?? 0) + 1;
  }
  return counts;
}

export interface ActiveSetBonus {
  count: number;
  tier: number;
  bonuses: { pieces: number; key: string; text: string }[];
}

export function activeSetBonuses(
  equippedDice: { dieId: string }[],
): Record<string, ActiveSetBonus> {
  const counts = setPieceCounts(equippedDice);
  const active: Record<string, ActiveSetBonus> = {};
  for (const [setId, count] of Object.entries(counts)) {
    const set = DICE_SETS[setId as keyof typeof DICE_SETS];
    active[setId] = { count, tier: 0, bonuses: [] };
    for (const bonus of set.bonuses) {
      if (count >= bonus.pieces) {
        active[setId].tier = bonus.pieces;
        active[setId].bonuses.push(bonus);
      }
    }
  }
  return active;
}
