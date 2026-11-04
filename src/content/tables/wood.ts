// content/tables/wood.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'wood', name: '黑松木长桌', material: '橡木', art: 'hall-wood',
  accent: '#c0824d', glow: 'rgba(197,123,63,.28)', group: 0,
  subtitle: '第一幕 · 门前的长队',
  desc: '往生坊的登记处，一张长桌排开去。桌角的鼠洞钻进去，通往这宅子的每一间房——每间房里都排着队。',
} satisfies TableDef;
