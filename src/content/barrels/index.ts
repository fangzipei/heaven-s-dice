// content/barrels/index.ts — 注册表。
// 顺序即数据：商店骰桶货位按索引抽取。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import oak from './oak.ts';
import cracked from './cracked.ts';
import twin_six from './twin_six.ts';
import lead from './lead.ts';
import serpent from './serpent.ts';
import ember from './ember.ts';
import gale from './gale.ts';
import astral from './astral.ts';
import wolf_totem from './wolf_totem.ts';
import demon_pact from './demon_pact.ts';
import pentagram from './pentagram.ts';
import vortex from './vortex.ts';
import gilded from './gilded.ts';
import marker from './marker.ts';
import guide from './guide.ts';
import brood from './brood.ts';
import singles from './singles.ts';
import pawn from './pawn.ts';
import nightwatch from './nightwatch.ts';
import fuse from './fuse.ts';
import rotation from './rotation.ts';
import twoface from './twoface.ts';
import loan from './loan.ts';
import type { BarrelDef } from '../../core/types.ts';

export const BARREL_DEFS: BarrelDef[] = [
  oak,
  cracked,
  twin_six,
  lead,
  serpent,
  ember,
  gale,
  astral,
  wolf_totem,
  demon_pact,
  pentagram,
  vortex,
  gilded,
  marker,
  guide,
  brood,
  singles,
  pawn,
  nightwatch,
  fuse,
  rotation,
  twoface,
  loan,
];
