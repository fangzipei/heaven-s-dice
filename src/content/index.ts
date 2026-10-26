// Phase 1 typed view over legacy content data (src/legacy/data.js).
// Exported objects keep the SAME identity as the legacy modules use, so the
// parity tests can prove the typed surface is behaviorally identical.
// One-file-per-item registries replace these bridges in Phase 3.
import * as legacy from '../legacy/data.js';
import type {
  RarityTable, DiceSetDef, DiceDef, PricedDie, ById, BarrelDef, ItemDef, TableDef,
  MinionDef, BossDef, LevelCurveDef, LevelRow, OvershootTierDef,
  ShopWeightBand, ChapterInfo,
} from '../core/types.ts';

const asT = <T>(value: unknown): T => value as T;

export const RARITIES = asT<RarityTable>(legacy.RARITIES);
export const DICE_SETS = asT<Record<string, DiceSetDef>>(legacy.DICE_SETS);

// `data.js` stamps a price onto every DICE entry at load; STANDARD_DIE is the
// only die that never enters the shop and so carries none.
export const DICE: PricedDie[] = asT(legacy.DICE);
export const DICE_BY_ID = asT<ById<PricedDie>>(legacy.DICE_BY_ID);
export const STANDARD_DIE: DiceDef = asT(legacy.STANDARD_DIE);

export const BARRELS: BarrelDef[] = asT(legacy.BARRELS);
export const BARREL_BY_ID = asT<ById<BarrelDef>>(legacy.BARREL_BY_ID);

export const ITEMS: ItemDef[] = asT(legacy.ITEMS);
export const ITEM_BY_ID = asT<ById<ItemDef>>(legacy.ITEM_BY_ID);

export const TABLES: TableDef[] = asT(legacy.TABLES);
export const MINIONS: MinionDef[] = asT(legacy.MINIONS);
export const BOSSES: BossDef[] = asT(legacy.BOSSES);

export const SHOP_RARITY_WEIGHTS: ShopWeightBand[] = asT(legacy.SHOP_RARITY_WEIGHTS);
export const rarityShopWeight: (rarity: string, level?: number) => number = asT(legacy.rarityShopWeight);

export const MINION_GAPS: number[] = asT(legacy.MINION_GAPS);
export const LEVEL_CURVE: LevelCurveDef = asT(legacy.LEVEL_CURVE);
export const buildLevelTable: (bosses?: BossDef[], curve?: LevelCurveDef) => LevelRow[] = asT(legacy.buildLevelTable);
export const LEVELS: LevelRow[] = asT(legacy.LEVELS);
export const LEVEL_COUNT: number = asT(legacy.LEVEL_COUNT);

export const REROLL_REFUND: number = asT(legacy.REROLL_REFUND);
export const OVERSHOOT_TIERS: OvershootTierDef[] = asT(legacy.OVERSHOOT_TIERS);
export const overshootTier: (score: number, target: number) => OvershootTierDef | null = asT(legacy.overshootTier);

export const CHAPTERS: ChapterInfo[] = asT(legacy.CHAPTERS);
export const chapterForLevel: (level: number) => number = asT(legacy.chapterForLevel);
export const chapterLevelSpan: (chapter: number) => [number, number] = asT(legacy.chapterLevelSpan);
export const getLevelConfig: (level: number) => LevelRow = asT(legacy.getLevelConfig);
export const getOpponent = asT<(level: number) => MinionDef | BossDef | null>(legacy.getOpponent);
export const getTable: (level: number) => TableDef = asT(legacy.getTable);
export const setPieceCounts = asT<(equippedDice: { dieId: string }[]) => Record<string, number>>(legacy.setPieceCounts);
export const activeSetBonuses = asT<(equippedDice: { dieId: string }[]) => Record<string, { count: number; tier: number; bonuses: { pieces: number; key: string; text: string }[] }>>(legacy.activeSetBonuses);
