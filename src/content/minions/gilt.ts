// content/minions/gilt.ts — 一个小兵庄家。
import type { MinionDef } from '../../core/types.ts';

export default {
  id: 'gilt', group: 3, art: 'minion-gilt', name: '鎏金侍从', title: '赌王的掌礼官',
  accent: '#e1bd69',
  intro: '欢迎光临王庭赌局。请把帽子、武器和尊严交给门房。',
  taunts: ['您的下注，配不上您的野心。', '王冠之下，人人都是筹码。', '需要我替您数一数还剩多少体面吗？'],
  win: '失礼了。我会通知厨房，今晚多备一副餐具。',
} satisfies MinionDef;
