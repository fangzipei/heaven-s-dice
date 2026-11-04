// content/tables/stone.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'stone', name: '灰岩审判桌', material: '青石', art: 'hall-stone',
  accent: '#93a4ac', glow: 'rgba(119,165,181,.24)', group: 1,
  subtitle: '第二幕 · 核销的窗口',
  desc: '桌面是一整块旧碑磨的。裂缝里塞着没念完的判决——念到一半，游魂就被叫去下一个窗口了。',
} satisfies TableDef;
