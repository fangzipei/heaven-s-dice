// content/tables/gold.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'gold', name: '鎏金王庭桌', material: '黄金', art: 'hall-gold',
  accent: '#e4bd61', glow: 'rgba(235,187,88,.28)', group: 3,
  subtitle: '第四幕 · 金漆告示',
  desc: '往生坊最热闹的一层，金漆剥了一半。告示牌上写满了去向，字迹被改过很多次。',
} satisfies TableDef;
