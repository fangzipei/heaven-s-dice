// content/items/index.ts — 注册表。
// 顺序即数据：商店物品货位按索引抽取。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import lucky_coin from './lucky_coin.ts';
import hunter_mark from './hunter_mark.ts';
import glove from './glove.ts';
import smoke from './smoke.ts';
import charm from './charm.ts';
import hourglass from './hourglass.ts';
import blood_contract from './blood_contract.ts';
import courage from './courage.ts';
import wager from './wager.ts';
import powder from './powder.ts';
import salt from './salt.ts';
import boss_ward from './boss_ward.ts';
import gold_cuff from './gold_cuff.ts';
import shelf_barrel from './shelf_barrel.ts';
import dice_bag from './dice_bag.ts';
import cracked_pouch from './cracked_pouch.ts';
import shelf_dice from './shelf_dice.ts';
import shelf_item from './shelf_item.ts';
import triple_charm from './triple_charm.ts';
import straight_bell from './straight_bell.ts';
import quad_seal from './quad_seal.ts';
import quint_clasp from './quint_clasp.ts';
import sext_crown from './sext_crown.ts';
import heaven_plate from './heaven_plate.ts';
import pip_ward from './pip_ward.ts';
import epic_chest from './epic_chest.ts';
import rare_pair from './rare_pair.ts';
import type { ItemDef } from '../../core/types.ts';

export const ITEM_DEFS: ItemDef[] = [
  // ── 主动物品 · 每关恢复一次 ────────────────────────────────────────────
  lucky_coin,
  hunter_mark,
  glove,
  smoke,
  charm,
  hourglass,
  blood_contract,
  // ── 一次性消耗品 · 用掉就从行囊消失 ────────────────────────────────────
  courage,
  wager,
  powder,
  salt,
  boss_ward,
  epic_chest,
  rare_pair,
  // ── 被动物品 · 永久生效 ────────────────────────────────────────────────
  gold_cuff,
  shelf_barrel,
  dice_bag,
  cracked_pouch,
  shelf_dice,
  shelf_item,
  triple_charm,
  straight_bell,
  quad_seal,
  quint_clasp,
  sext_crown,
  heaven_plate,
  pip_ward,
];
