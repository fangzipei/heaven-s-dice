// content/tables/index.ts — 注册表。
// 顺序即章节：第 1..5 张桌子对应第 1..5 章，关卡平分表读这里的长度。
// 新增一项 = 建一个 <id>.ts，再在下方数组里按想要的顺序插一行；
// tests/unit/content-registry.test.mjs 会抓住漏注册的文件。
import wood from './wood.ts';
import stone from './stone.ts';
import iron from './iron.ts';
import gold from './gold.ts';
import diamond from './diamond.ts';
import type { TableDef } from '../../core/types.ts';

export const TABLE_DEFS: TableDef[] = [
  wood,
  stone,
  iron,
  gold,
  diamond,
];
