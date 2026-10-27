// content/tables/gold.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'gold', name: '鎏金王庭桌', material: '黄金', art: 'gold',
  accent: '#e4bd61', glow: 'rgba(235,187,88,.28)', group: 3,
  subtitle: '第四幕 · 王冠的重量',
  desc: '金箔下的木头早已朽空，但没有人敢掀开桌布去确认。',
} satisfies TableDef;
