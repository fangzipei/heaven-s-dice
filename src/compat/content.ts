// Single import surface for the game UI during Phase 1-2: re-exports the new
// core/content modules with the exact names the legacy app.js already uses, so
// rewiring the app is a one-line path change per import.
export {
  BASE_REROLLS, STARTING_COINS, ACTIVE_ITEM_SLOTS, DEBUG,
  makeRng, getDiceCapacity, syncBag, getDieSpec, getBarrel, effectiveProbs,
  availableDice, selectedDice, setCounts, hasSetTier, targetForLevel,
  activeBoss, bossEffectKey, isFloatingScore, isBossDieBlocked,
  handTypeOf, handTypeName, bossTypeStatus, bossStatusText,
  initLevel, createRun, getRng, pushLog, toggleDie, clearSelection,
  getComboAnalysis, buildScore, getScorePreview, cashOutValue, advanceLevel,
  activeCharges, finalizeStuck, rollDice, applyScore, applyGesture,
  canUseItem, useItem, rerollDeadThrow, forfeit, retryLevel,
  shopPrice, refreshCost, getOwnedItemIds, getAcquiredItemIds,
  hasItemEverBeenTaken, shopSlots, createShop, openShop, shopEntry,
  shopEntryPrice, refreshSection, sectionLabel, buyDie, buyBarrel, buyItem,
  itemSellPrice, canSellItem, sellItem, leaveShop, runSummary, explainTarget,
  getOpponentInfo, tableInfo, chapterInfo,
} from '../core/engine.ts';
export {
  WILD_VALUE, SCORING_ROWS, emptyCounts, countFaces, analyzeSelection,
  bestSelection, hasScoringSelection, describeCombo, selectionValues,
} from '../core/scoring.ts';
export {
  BARRELS, BARREL_BY_ID, BOSSES, DICE, DICE_BY_ID, DICE_SETS, ITEMS,
  ITEM_BY_ID, LEVELS, LEVEL_COUNT, MINIONS, RARITIES, TABLES, STANDARD_DIE,
  SHOP_RARITY_WEIGHTS, rarityShopWeight, REROLL_REFUND, OVERSHOOT_TIERS,
  MINION_GAPS, LEVEL_CURVE,
  activeSetBonuses, chapterForLevel, chapterLevelSpan, getLevelConfig,
  getOpponent, getTable, setPieceCounts, buildLevelTable, overshootTier,
  CHAPTERS,
} from '../content/index.ts';
