// content/minions/index.ts — 注册表。
// 索引即章节：MINION_DEFS[i] 是第 i+1 章的小兵。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import rat from './rat.ts';
import gargoyle from './gargoyle.ts';
import forge from './forge.ts';
import gilt from './gilt.ts';
import crystal from './crystal.ts';
import type { MinionDef } from '../../core/types.ts';

export const MINION_DEFS: MinionDef[] = [
  rat,
  gargoyle,
  forge,
  gilt,
  crystal,
];
