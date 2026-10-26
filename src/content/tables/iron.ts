// content/tables/iron.ts — 一张赌桌（一章）。
import type { TableDef } from '../../core/types.ts';

export default {
  id: 'iron', name: '熔铁赌桌', material: '黑铁', art: 'iron',
  accent: '#d27146', glow: 'rgba(224,96,45,.28)', group: 2,
  subtitle: '第三幕 · 炉火不熄',
  desc: '铆钉还带着锻锤的温度，桌缝里渗出炉渣。输家的筹码会被直接熔掉。',
} satisfies TableDef;
