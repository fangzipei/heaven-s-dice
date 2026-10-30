// content/items/index.ts — 注册表。
// 顺序即数据：商店物品货位按索引抽取。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import lucky_coin from './lucky_coin.ts';
import barrel_reforger from './barrel_reforger.ts';
import hunter_mark from './hunter_mark.ts';
import glove from './glove.ts';
import smoke from './smoke.ts';
import devil_reset from './devil_reset.ts';
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
import active_shelf from './active_shelf.ts';
import triple_charm from './triple_charm.ts';
import straight_bell from './straight_bell.ts';
import quad_seal from './quad_seal.ts';
import quint_clasp from './quint_clasp.ts';
import sext_crown from './sext_crown.ts';
import heaven_plate from './heaven_plate.ts';
import pip_ward from './pip_ward.ts';
import epic_chest from './epic_chest.ts';
import rare_pair from './rare_pair.ts';
import rotfang_relic from './rotfang_relic.ts';
import judge_relic from './judge_relic.ts';
import twinsix_relic from './twinsix_relic.ts';
import toll_relic from './toll_relic.ts';
import soulsmith_relic from './soulsmith_relic.ts';
import ashclerk_relic from './ashclerk_relic.ts';
import gildedking_relic from './gildedking_relic.ts';
import suspensor_relic from './suspensor_relic.ts';
import mirror_relic from './mirror_relic.ts';
import startax_relic from './startax_relic.ts';
import seraph_relic from './seraph_relic.ts';
import lucifer_relic from './lucifer_relic.ts';
import pairbane_relic from './pairbane_relic.ts';
import type { ItemDef } from '../../core/types.ts';

export const ITEM_DEFS: ItemDef[] = [
  // ── 主动物品 · 每关恢复一次 ────────────────────────────────────────────
  lucky_coin,
  hunter_mark,
  glove,
  smoke,
  devil_reset,
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
  barrel_reforger,
  shelf_barrel,
  dice_bag,
  cracked_pouch,
  shelf_dice,
  shelf_item,
  active_shelf,
  triple_charm,
  straight_bell,
  quad_seal,
  quint_clasp,
  sext_crown,
  heaven_plate,
  pip_ward,
  rotfang_relic,
  judge_relic,
  twinsix_relic,
  toll_relic,
  soulsmith_relic,
  ashclerk_relic,
  gildedking_relic,
  suspensor_relic,
  mirror_relic,
  startax_relic,
  seraph_relic,
  lucifer_relic,
  pairbane_relic,
];


/** Boss id -> relic item id. Boss relics never enter the shop pool. */
export const BOSS_RELICS: Record<string, string> = {
  rotfang: 'rotfang_relic',
  judge: 'judge_relic',
  twinsix: 'twinsix_relic',
  toll: 'toll_relic',
  soulsmith: 'soulsmith_relic',
  ashclerk: 'ashclerk_relic',
  gildedking: 'gildedking_relic',
  suspensor: 'suspensor_relic',
  mirror: 'mirror_relic',
  startax: 'startax_relic',
  seraph: 'seraph_relic',
  lucifer: 'lucifer_relic',
  pairbane: 'pairbane_relic',
};
