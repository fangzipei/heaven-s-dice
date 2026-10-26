// content/tables/wood.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'wood', name: '黑松木长桌', material: '橡木', art: 'wood',
  accent: '#c0824d', glow: 'rgba(197,123,63,.28)', group: 0,
  subtitle: '第一幕 · 腐烂的根系',
  desc: '树脂、霉斑和旧刀痕。桌角的鼠洞通向这座宅邸的每一间客房。',
} satisfies TableDef;
