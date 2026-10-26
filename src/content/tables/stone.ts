// content/tables/stone.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'stone', name: '灰岩审判桌', material: '青石', art: 'stone',
  accent: '#93a4ac', glow: 'rgba(119,165,181,.24)', group: 1,
  subtitle: '第二幕 · 石头的证词',
  desc: '桌面由一整块墓碑磨成。每一道裂纹里都嵌着没有念完的判决。',
} satisfies TableDef;
