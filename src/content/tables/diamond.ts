// content/tables/diamond.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'diamond', name: '棱晶天穹桌', material: '钻石', art: 'diamond',
  accent: '#9ad8e7', glow: 'rgba(118,213,232,.3)', group: 4,
  subtitle: '终幕 · 天穹之上',
  desc: '桌子没有腿，悬浮在星海之上。每一面棱镜里都坐着一个正在输钱的你。',
} satisfies TableDef;
