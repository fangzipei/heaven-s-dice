/* Phase 3a gate: the content registry is the single source of truth.
   Two things can silently break when data moves out of one big module:
   an entry file that nobody registered (it disappears from the shop pools),
   and an order change (shop pools index into these arrays and boss levels are
   assigned by position). So the whole surface is compared against a frozen
   snapshot of the pre-refactor tables, and every file on disk has to show up
   in its registry. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import * as Content from '../../src/content/index.ts';
import { DICE_DEFS } from '../../src/content/dice/index.ts';
import { BOSS_DEFS } from '../../src/content/bosses/index.ts';
import { rarityShopWeight } from '../../src/content/meta.ts';

const CONTENT_DIR = new URL('../../src/content/', import.meta.url);
const SNAPSHOT = JSON.parse(
  readFileSync(new URL('../fixtures/content-snapshot.json', import.meta.url), 'utf8'),
);

/** The tables that used to live in src/legacy/data.js, in their frozen form. */
const FROZEN_KEYS = [
  'RARITIES', 'DICE_SETS', 'DICE', 'STANDARD_DIE', 'BARRELS', 'ITEMS', 'TABLES',
  'MINIONS', 'BOSSES', 'MINION_GAPS', 'SHOP_RARITY_WEIGHTS', 'LEVEL_CURVE',
  'LEVELS', 'LEVEL_COUNT', 'REROLL_REFUND', 'OVERSHOOT_TIERS',
];

describe('content registry equals the frozen pre-refactor tables', () => {
  for (const key of FROZEN_KEYS) {
    test(key, () => {
      expect(Content[key], key).toEqual(SNAPSHOT[key]);
    });
  }

  test('CHAPTERS is the same view over the frozen tables', () => {
    // Not frozen as data: CHAPTERS is a view, so the expectation is rebuilt here
    // from the snapshot's own inputs and only the wiring can be wrong.
    const expected = SNAPSHOT.TABLES.map((table, group) => ({
      group,
      table: table.id,
      minion: SNAPSHOT.MINIONS[group].id,
      boss: SNAPSHOT.BOSSES.find((b) => b.group === group)?.id ?? null,
      bosses: SNAPSHOT.BOSSES.filter((b) => b.group === group).map((b) => b.id),
      levels: SNAPSHOT.LEVELS
        .filter((row) => Content.chapterForLevel(row.level) === group)
        .map((row) => row.level),
    }));
    const actual = Content.CHAPTERS.map((chapter) => ({
      group: chapter.group,
      table: chapter.table.id,
      minion: chapter.minion.id,
      boss: chapter.boss?.id ?? null,
      bosses: chapter.bosses.map((boss) => boss.id),
      levels: chapter.levels.map((row) => row.level),
    }));
    expect(actual).toEqual(expected);
  });

  test('rarity shop weights still resolve through the last band', () => {
    expect(rarityShopWeight('legendary', 99)).toBe(30);
    expect(rarityShopWeight('nonsense', 1)).toBe(0);
  });
});

describe('one file per entry, and every file registered', () => {
  const REGISTRIES = [
    ['dice', () => Content.DICE],
    ['barrels', () => Content.BARRELS],
    ['items', () => Content.ITEMS],
    ['tables', () => Content.TABLES],
    ['minions', () => Content.MINIONS],
    ['bosses', () => Content.BOSSES],
  ];

  for (const [dir, read] of REGISTRIES) {
    test(`${dir}: index.ts registers exactly the files in content/${dir}/`, () => {
      const files = readdirSync(new URL(`${dir}/`, CONTENT_DIR))
        .filter((name) => name.endsWith('.ts'))
        .map((name) => name.replace(/\.ts$/, ''))
        .filter((name) => name !== 'index')
        .sort();
      const registered = read().map((entry) => entry.id);
      expect(registered, `${dir}: duplicate ids in the registry`).toEqual([...new Set(registered)]);
      expect([...registered].sort(), `${dir}: registry ids vs files on disk`).toEqual(files);
    });
  }

  test('dice defs stay unpriced; only the aggregated DICE carries a price', () => {
    for (const def of DICE_DEFS) {
      expect(def.price, `${def.id} should not hard-code a shop price`).toBeUndefined();
    }
    const byRarity = { common: 35, rare: 70, epic: 130, legendary: 210 };
    for (const die of Content.DICE) {
      expect(die.price).toBe(byRarity[die.rarity]);
    }
    expect(Content.STANDARD_DIE.price).toBeUndefined();
  });

  test('boss level and chapter are derived, never authored', () => {
    for (const def of BOSS_DEFS) {
      expect(def, def.id).not.toHaveProperty('level');
      expect(def, def.id).not.toHaveProperty('group');
    }
    // A boss file that typed its own level would silently move every later dealer.
    for (const file of readdirSync(new URL('bosses/', CONTENT_DIR))) {
      if (file === 'index.ts') continue;
      const source = readFileSync(new URL(`bosses/${file}`, CONTENT_DIR), 'utf8');
      expect(source, `${file} must not hand-write level/group`).not.toMatch(/\b(level|group):/);
    }
    expect(Content.BOSSES.map((boss) => boss.level)).toEqual([3, 6, 10, 14, 18, 23, 28, 33]);
    expect(Content.BOSSES.map((boss) => boss.group))
      .toEqual(SNAPSHOT.BOSSES.map((boss) => boss.group));
    expect(readFileSync(new URL('bosses/index.ts', CONTENT_DIR), 'utf8'))
      .toContain('BOSS_LEVELS[index]');
  });
});
