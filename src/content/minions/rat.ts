// content/minions/rat.ts — 一个小兵庄家。
import type { MinionDef } from '../../core/types.ts';

export default {
  id: 'rat', group: 0, art: 'minion-rat', name: '灰爪', title: '腐牙的鼠仆',
  accent: '#b76b58',
  intro: '吱……伯爵说，今天您会留下点比银币更香的东西。',
  taunts: ['桌子下面有东西在啃木头。别低头。', '吱吱——您的手在抖，是害怕还是老了？', '伯爵的牙，可比这把骰子利。'],
  win: '吱……！我会去告诉伯爵，您只是运气好。',
} satisfies MinionDef;
