// content/tables/diamond.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'diamond', name: '棱晶天穹桌', material: '钻石', art: 'hall-diamond',
  accent: '#9ad8e7', glow: 'rgba(118,213,232,.3)', group: 4,
  subtitle: '终幕 · 归处公示',
  desc: '往生坊的公示厅，整间屋子都是折出来的冰棱。每一片棱面上都映着一个正在等结果的你。',
} satisfies TableDef;
