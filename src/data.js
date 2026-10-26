/* ============================================================
   Heaven's Dice — static game content
   All flavour, balance data, dice tables and shop stock seeds.
   ============================================================ */

export const RARITIES = {
  common: {
    id: 'common', name: '普通', short: '普通',
    color: '#b9b2a4', glow: 'rgba(185,178,164,.35)', order: 0,
  },
  rare: {
    id: 'rare', name: '稀有', short: '稀有',
    color: '#61a9d8', glow: 'rgba(97,169,216,.4)', order: 1,
  },
  epic: {
    id: 'epic', name: '史诗', short: '史诗',
    color: '#b57bea', glow: 'rgba(181,123,234,.45)', order: 2,
  },
  legendary: {
    id: 'legendary', name: '传说', short: '传说',
    color: '#f0b95f', glow: 'rgba(240,185,95,.5)', order: 3,
  },
};

export const DICE_SETS = {
  wolf: {
    id: 'wolf', name: '狼裔', icon: 'wolf', color: '#d18a58',
    motto: '群狼不掷孤骰。',
    bonuses: [
      { pieces: 2, key: 'wolfSix', text: '每颗计分的 6 额外 +25 分。' },
      { pieces: 4, key: 'wolfPack', text: '含三连或顺子的计分额外 +100 分。' },
    ],
  },
  raven: {
    id: 'raven', name: '渡鸦', icon: 'raven', color: '#7fa6c9',
    motto: '羽毛落下之前，命运已经开口。',
    bonuses: [
      { pieces: 2, key: 'ravenReroll', text: '每关开始获得 1 次额外重投。' },
      { pieces: 4, key: 'ravenOne', text: '每颗计分的 1 额外 +50 分。' },
    ],
  },
  serpent: {
    id: 'serpent', name: '蝰蛇', icon: 'serpent', color: '#6fb28d',
    motto: '顺流而下，咬住整条河。',
    bonuses: [
      { pieces: 2, key: 'serpentStraight', text: '顺子额外 +250 分。' },
      { pieces: 4, key: 'serpentFive', text: '每颗计分的 5 额外 +50 分。' },
    ],
  },
  crown: {
    id: 'crown', name: '王冠', icon: 'crown', color: '#e3bd66',
    motto: '规矩由戴冠的人来写。',
    bonuses: [
      { pieces: 2, key: 'crownDiscount', text: '商店所有价格 -15%。' },
      { pieces: 4, key: 'crownTribute', text: '每关胜利额外获得 12 银币。' },
    ],
  },
  astral: {
    id: 'astral', name: '星穹', icon: 'astral', color: '#9c8be0',
    motto: '骰子落桌之前，星辰已经落座。',
    bonuses: [
      { pieces: 2, key: 'astralTarget', text: '每关目标分数 -10%。' },
      { pieces: 4, key: 'astralGlow', text: '所有计分 +15%。' },
    ],
  },
};

/*
 * Probability tables are literal face weights. They are normalised at roll
 * time. Every special die has a deliberate, readable tilt rather than an
 * invisible "luck" stat.
 */
export const DICE = [
  // ── Wolf 狼裔 (common 1 / rare 2 / epic 1) ──────────────────────────────
  {
    id: 'wolf_whelp', name: '乳狼骰', setId: 'wolf', rarity: 'common',
    probs: [0.20, 0.15, 0.15, 0.15, 0.15, 0.20],
    flavor: '森林里第一颗掉落的乳牙，偏爱两端。',
    desc: '1 与 6 略微更容易出现。', bonus: null,
  },
  {
    id: 'wolf_hunter', name: '猎手骰', setId: 'wolf', rarity: 'rare',
    probs: [0.15, 0.10, 0.10, 0.10, 0.25, 0.30],
    flavor: '狼群追猎时，猎手总会把五枚爪印留在雪里。',
    desc: '5、6 概率偏高。', bonus: { type: 'faceFlat', face: 5, value: 25, label: '猎印：计分含 5 时 +25' },
  },
  {
    id: 'wolf_bloodmoon', name: '血月骰', setId: 'wolf', rarity: 'rare',
    probs: [0.10, 0.10, 0.10, 0.10, 0.20, 0.40],
    flavor: '月全食那晚，整片森林都听见了骨头里的回声。',
    desc: '6 点概率极高（40%）。', bonus: { type: 'faceFlat', face: 6, value: 50, label: '血月：计分含 6 时 +50' },
  },
  {
    id: 'wolf_alpha', name: '白狼王骰', setId: 'wolf', rarity: 'epic',
    probs: [0.05, 0.20, 0.05, 0.10, 0.25, 0.35],
    flavor: '它从不嚎叫。它只是看，群狼便知道该咬哪里。',
    desc: '6 点概率 35%，2 点与 5 点也不低。',
    bonus: { type: 'twoSixes', value: 150, label: '狼王：计分含两颗 6 时 +150' },
  },

  // ── Raven 渡鸦 (common 1 / rare 2 / epic 1) ─────────────────────────────
  {
    id: 'raven_feather', name: '渡鸦羽', setId: 'raven', rarity: 'common',
    probs: [0.30, 0.14, 0.14, 0.14, 0.14, 0.14],
    flavor: '一根落在绞架上的羽毛，摸起来比雪还冷。',
    desc: '1 点概率显著偏高（30%）。', bonus: null,
  },
  {
    id: 'raven_nighteye', name: '夜瞳骰', setId: 'raven', rarity: 'rare',
    probs: [0.25, 0.10, 0.10, 0.10, 0.25, 0.20],
    flavor: '瞳孔里倒映的不是烛火，是尚未发生的死讯。',
    desc: '1 与 5 更常见。', bonus: { type: 'faceFlat', face: 1, value: 50, label: '夜瞳：计分含 1 时 +50' },
  },
  {
    id: 'raven_death', name: '告死骰', setId: 'raven', rarity: 'rare',
    probs: [0.20, 0.10, 0.10, 0.10, 0.10, 0.40],
    flavor: '当它掷出六，钟楼会替某人敲响。',
    desc: '6 点概率高达 40%。', bonus: { type: 'faceFlat', face: 6, value: 30, label: '丧钟：计分含 6 时 +30' },
  },
  {
    id: 'raven_thousand', name: '千目渡鸦', setId: 'raven', rarity: 'epic',
    probs: [0.40, 0.12, 0.12, 0.12, 0.12, 0.12],
    flavor: '它有三只眼，所以能同时看见你的骰子和你的谎。',
    desc: '1 点概率极高（40%）。',
    bonus: { type: 'hasOne', value: 75, label: '千目：计分含至少一颗 1 时 +75' },
  },

  // ── Serpent 蝰蛇 (rare 2 / epic 1 / legendary 1) ────────────────────────
  {
    id: 'serpent_scale', name: '蛇鳞骰', setId: 'serpent', rarity: 'rare',
    probs: [0.15, 0.20, 0.15, 0.15, 0.20, 0.15],
    flavor: '每一面鳞片的纹路都不同，就像每一笔赌债。',
    desc: '2 与 5 略微更常见。', bonus: null,
  },
  {
    id: 'serpent_fang', name: '毒牙骰', setId: 'serpent', rarity: 'rare',
    probs: [0.05, 0.10, 0.10, 0.15, 0.35, 0.25],
    flavor: '毒液干涸之后，牙反而更白。',
    desc: '5 点概率 35%。', bonus: { type: 'faceFlat', face: 5, value: 50, label: '毒牙：计分含 5 时 +50' },
  },
  {
    id: 'serpent_hydra', name: '九头蛇之牙', setId: 'serpent', rarity: 'epic',
    probs: [0.05, 0.20, 0.20, 0.20, 0.30, 0.05],
    flavor: '砍掉一个头，会有两个头记住你的脸。',
    desc: '2、3、4、5 组成顺子的概率更高。',
    bonus: { type: 'straightFlat', value: 200, label: '九头：计分含顺子时 +200' },
  },
  {
    id: 'serpent_devourer', name: '噬星之蛇', setId: 'serpent', rarity: 'legendary',
    probs: [0.05, 0.25, 0.25, 0.05, 0.25, 0.15],
    flavor: '它不吞月亮，它只把月亮当成一颗骰子。',
    desc: '2、3、5 各 25%。',
    bonus: { type: 'dieMultiplier', value: 1.15, label: '噬星：计分含此骰时，本次计分 ×1.15' },
  },

  // ── Crown 王冠 (rare 2 / epic 1 / legendary 1) ──────────────────────────
  {
    id: 'crown_court', name: '王庭骰', setId: 'crown', rarity: 'rare',
    probs: [0.15, 0.15, 0.15, 0.15, 0.20, 0.20],
    flavor: '宫廷里最公平的东西，是一张不记名的赌桌。',
    desc: '5、6 略微更常见。', bonus: null,
  },
  {
    id: 'crown_taxman', name: '税吏骰', setId: 'crown', rarity: 'rare',
    probs: [0.35, 0.10, 0.10, 0.10, 0.25, 0.10],
    flavor: '税吏从不掷出运气，他只掷出应收的数目。',
    desc: '1 点 35%，5 点 25%。', bonus: { type: 'faceFlat', face: 1, value: 25, label: '征税：计分含 1 时 +25' },
  },
  {
    id: 'crown_seal', name: '王之金玺', setId: 'crown', rarity: 'epic',
    probs: [0.10, 0.10, 0.10, 0.10, 0.30, 0.30],
    flavor: '盖下去的那一刻，连命运都要补缴印花税。',
    desc: '5、6 各 30%。',
    bonus: { type: 'fiveAndSix', value: 100, label: '金玺：计分同时含 5 与 6 时 +100' },
  },
  {
    id: 'crown_queen', name: '无冠女王', setId: 'crown', rarity: 'legendary', demon: true,
    probs: [0.30, 0.10, 0.10, 0.10, 0.30, 0.10],
    flavor: '她输掉了王冠，于是开始赢走别人的名字。',
    desc: '1、5 各 30%。恶魔骰：计分含此骰 ×1.25；不含此骰时本次计分 ×0.85。',
    bonus: { type: 'demon', included: 1.25, missing: 0.85, label: '恶魔契约：含此骰 ×1.25；不含则 ×0.85' },
  },

  // ── Astral 星穹 (rare 2 / epic 1 / legendary 1) ─────────────────────────
  {
    id: 'astral_dust', name: '星尘骰', setId: 'astral', rarity: 'rare',
    probs: [0.10, 0.15, 0.20, 0.20, 0.15, 0.20],
    flavor: '星尘落在袖口上，像一场没有人认领的雪。',
    desc: '3、4、6 略微更常见。', bonus: null,
  },
  {
    id: 'astral_comet', name: '彗尾骰', setId: 'astral', rarity: 'rare',
    probs: [0.05, 0.15, 0.25, 0.25, 0.15, 0.15],
    flavor: '它每七十年回来一次，专程提醒你还有一笔债。',
    desc: '3、4 更常见，容易凑出顺子。',
    bonus: { type: 'straightFlat', value: 75, label: '彗尾：计分含顺子时 +75' },
  },
  {
    id: 'astral_core', name: '星核骰', setId: 'astral', rarity: 'epic',
    probs: [0.10, 0.10, 0.20, 0.20, 0.10, 0.30],
    flavor: '把一颗星压进骰子，它仍然记得怎样发光。',
    desc: '6 点概率 30%。',
    bonus: { type: 'faceFlat', face: 6, value: 50, label: '星核：计分含 6 时 +50' },
  },
  {
    id: 'astral_eye', name: '命运之眼', setId: 'astral', rarity: 'legendary',
    probs: [0.25, 0.25, 0.20, 0.10, 0.10, 0.10],
    flavor: '它不预测命运。它只是提前把答案翻过来。',
    desc: '1、2 各 25%。计分含此骰时，每关第一次额外获得 1 次重投。',
    bonus: { type: 'bonusReroll', value: 1, label: '窥命：计分含此骰时，每关首次 +1 重投' },
  },
];

const DIE_PRICE_BY_RARITY = { common: 12, rare: 24, epic: 45, legendary: 70 };
for (const die of DICE) die.price = DIE_PRICE_BY_RARITY[die.rarity] || 30;

export const DICE_BY_ID = Object.fromEntries(DICE.map((d) => [d.id, d]));

export const STANDARD_DIE = {
  id: 'standard', name: '标准骰', setId: null, rarity: 'common',
  probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
  flavor: '客栈里最普通、也最诚实的骨头骰。',
  desc: '每个点数概率相同。', bonus: null, isStandard: true,
};

export const BARRELS = [
  {
    id: 'oak', name: '旧橡木桶', rarity: 'common', type: 'none',
    art: 'oak', price: 0, bias: [1, 1, 1, 1, 1, 1],
    desc: '被无数双手磨得发亮的老桶。不偏不倚，只负责让骰子落桌。',
    short: '没有额外效果',
  },
  {
    id: 'lead', name: '铅心桶', rarity: 'rare', type: 'probability',
    art: 'lead', price: 35, bias: [1.35, 1, 1, 1, 1.30, 1],
    desc: '桶底灌了铅，也灌了赌徒的贪心。1 与 5 的出现率提高。',
    short: '1、5 概率 +',
  },
  {
    id: 'serpent', name: '蛇纹桶', rarity: 'rare', type: 'probability',
    art: 'serpent', price: 35, bias: [0.70, 1.30, 1.25, 1.25, 1, 1],
    desc: '鳞片在掌心下滑动。2、3、4 的出现率提高，1 更少。',
    short: '2、3、4 概率 + / 1 概率 −',
  },
  {
    id: 'astral', name: '星象桶', rarity: 'epic', type: 'probability',
    art: 'astral', price: 50, bias: [1, 1, 1, 1, 1.20, 1.40],
    desc: '桶身刻着逆行的星图。6 与 5 的出现率显著提高。',
    short: '5、6 概率 +',
  },
  {
    id: 'pentagram', name: '五芒桶', rarity: 'epic', type: 'gesture',
    art: 'pentagram', price: 60, gesture: 'pentagram',
    desc: '摇骰前完成一次五芒星仪式，本掷所有计分 +25%。',
    short: '五芒星仪式：本掷计分 +25%',
  },
  {
    id: 'vortex', name: '旋涡桶', rarity: 'legendary', type: 'gesture',
    art: 'vortex', price: 80, gesture: 'circle',
    desc: '顺时针画满一圈，本掷计分 +10%，并在此关获得 1 次额外重投（每关一次）。',
    short: '旋涡仪式：本掷 +10% 且每关 +1 重投',
  },
];

export const BARREL_BY_ID = Object.fromEntries(BARRELS.map((b) => [b.id, b]));

export const ITEMS = [
  {
    id: 'lucky_coin', name: '幸运币', type: 'active', icon: 'coin',
    rarity: 'common', price: 20, charges: 1,
    desc: '立即获得 150 分。',
    flavor: '正面是国王，反面也是国王。这枚硬币从来不做选择。',
  },
  {
    id: 'courage', name: '烈酒', type: 'active', icon: 'bottle',
    rarity: 'rare', price: 24, charges: 1,
    desc: '本关立刻获得 2 次重投。',
    flavor: '喝下去以后，桌子看起来更平了，骰子看起来更听话了。',
  },
  {
    id: 'hunter_mark', name: '猎人印记', type: 'active', icon: 'eye',
    rarity: 'rare', price: 28, charges: 1,
    desc: '本关下一次计分翻倍。',
    flavor: '狼群不追错猎物。你只需要让下一次落下足够重。',
  },
  {
    id: 'glove', name: '魔术手套', type: 'active', icon: 'glove',
    rarity: 'rare', price: 22, charges: 1,
    desc: '将当前选中的一颗骰子改为 6 点。',
    flavor: '完全合法。只要没有人看见袖口里的第二只手。',
  },
  {
    id: 'smoke', name: '烟雾弹', type: 'active', icon: 'smoke',
    rarity: 'epic', price: 34, charges: 1,
    desc: '免费重掷所有未计分骰子，不消耗重投次数。',
    flavor: '烟雾散去时，桌上少了一颗骰子，多了一个说法。',
  },
  {
    id: 'charm', name: '赌徒护符', type: 'active', icon: 'amulet',
    rarity: 'epic', price: 36, charges: 1,
    desc: '本关目标分数降低 20%。',
    flavor: '据说它能让庄家忘掉一条规则。副作用是庄家会记住你的脸。',
  },
  {
    id: 'hourglass', name: '时间沙漏', type: 'active', icon: 'hourglass',
    rarity: 'rare', price: 28, charges: 1,
    desc: '恢复 1 次重投，并立即获得 100 分。',
    flavor: '沙子倒着流。你多了一次机会，也少了一点耐心。',
  },
  {
    id: 'blood_contract', name: '血契', type: 'active', icon: 'dagger',
    rarity: 'legendary', price: 50, charges: 1,
    desc: '本关后续每次计分 +30%，但每次计分后失去 30 分。',
    flavor: '签名用的不是墨水。落款之后，骰子开始闻起来像铁。',
  },
  {
    id: 'dice_bag', name: '丰饶骰袋', type: 'passive', icon: 'pouch',
    rarity: 'epic', price: 55, charges: 0,
    desc: '可使用的骰子 +1（永久）。',
    flavor: '袋口永远比看起来深。你甚至不确定里面有没有别的东西。',
  },
  {
    id: 'gold_cuff', name: '镀金袖扣', type: 'passive', icon: 'cuff',
    rarity: 'rare', price: 38, charges: 0,
    desc: '每关胜利额外获得 12 银币，商店刷新费用 -20%。',
    flavor: '真正的财富不在钱袋里，而在别人看见你袖口时的表情里。',
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const TABLES = [
  {
    id: 'wood', name: '黑松木长桌', material: '橡木', art: 'wood',
    accent: '#c0824d', glow: 'rgba(197,123,63,.28)', group: 0,
    subtitle: '第一幕 · 腐烂的根系',
    desc: '树脂、霉斑和旧刀痕。桌角的鼠洞通向这座宅邸的每一间客房。',
  },
  {
    id: 'stone', name: '灰岩审判桌', material: '青石', art: 'stone',
    accent: '#93a4ac', glow: 'rgba(119,165,181,.24)', group: 1,
    subtitle: '第二幕 · 石头的证词',
    desc: '桌面由一整块墓碑磨成。每一道裂纹里都嵌着没有念完的判决。',
  },
  {
    id: 'iron', name: '熔铁赌桌', material: '黑铁', art: 'iron',
    accent: '#d27146', glow: 'rgba(224,96,45,.28)', group: 2,
    subtitle: '第三幕 · 炉火不熄',
    desc: '铆钉还带着锻锤的温度，桌缝里渗出炉渣。输家的筹码会被直接熔掉。',
  },
  {
    id: 'gold', name: '鎏金王庭桌', material: '黄金', art: 'gold',
    accent: '#e4bd61', glow: 'rgba(235,187,88,.28)', group: 3,
    subtitle: '第四幕 · 王冠的重量',
    desc: '金箔下的木头早已朽空，但没有人敢掀开桌布去确认。',
  },
  {
    id: 'diamond', name: '棱晶天穹桌', material: '钻石', art: 'diamond',
    accent: '#9ad8e7', glow: 'rgba(118,213,232,.3)', group: 4,
    subtitle: '终幕 · 天穹之上',
    desc: '桌子没有腿，悬浮在星海之上。每一面棱镜里都坐着一个正在输钱的你。',
  },
];

export const MINIONS = [
  {
    id: 'rat', group: 0, art: 'minion-rat', name: '灰爪', title: '腐牙的鼠仆',
    accent: '#b76b58',
    intro: '吱……伯爵说，今天您会留下点比银币更香的东西。',
    taunts: ['桌子下面有东西在啃木头。别低头。', '吱吱——您的手在抖，是害怕还是老了？', '伯爵的牙，可比这把骰子利。'],
    win: '吱……！我会去告诉伯爵，您只是运气好。',
  },
  {
    id: 'gargoyle', group: 1, art: 'minion-gargoyle', name: '石砾', title: '审判官的影子',
    accent: '#89a7b2',
    intro: '坐下。审判官在看着。石头从不眨眼，所以你也别眨。',
    taunts: ['你的分数正在风化。', '每一道裂缝，都是一次失败的供词。', '我听见你筹码碎裂的声音。'],
    win: '喀……这些裂纹会作证。审判官不会喜欢这个结果。',
  },
  {
    id: 'forge', group: 2, art: 'minion-forge', name: '炭手', title: '熔炉学徒',
    accent: '#d47b4f',
    intro: '师父说，输掉的骰子要回炉。我看你这一袋，都挺适合。',
    taunts: ['炉温够了。你的运气还差得远。', '这一把要是输了，我帮你把骨头也锻一锻。', '别看我的面具，看骰子。'],
    win: '啧。炉子今天不饿。带着你的分滚吧。',
  },
  {
    id: 'gilt', group: 3, art: 'minion-gilt', name: '鎏金侍从', title: '赌王的掌礼官',
    accent: '#e1bd69',
    intro: '欢迎光临王庭赌局。请把帽子、武器和尊严交给门房。',
    taunts: ['您的下注，配不上您的野心。', '王冠之下，人人都是筹码。', '需要我替您数一数还剩多少体面吗？'],
    win: '失礼了。我会通知厨房，今晚多备一副餐具。',
  },
  {
    id: 'crystal', group: 4, art: 'minion-crystal', name: '棱翼执事', title: '天使的抄录者',
    accent: '#a8e3ec',
    intro: '你的名字已经写在天平上。现在，请用骰子补充理由。',
    taunts: ['我看见了你所有可能的结局。它们都不太乐观。', '光穿过你，什么也没有留下。', '再掷一次吧。记录需要完整。'],
    win: '记录已修正。但天平不会忘记你刚才的重量。',
  },
];

export const BOSSES = [
  {
    id: 'rotfang', group: 0, level: 3, art: 'boss-rat',
    name: '腐牙伯爵', title: '鼠群之主', accent: '#c25b5b',
    effectName: '鼠群分食', effectKey: 'steal',
    effectDesc: '每次计分，腐牙会偷走 10% 的分数。',
    intro: '小赌徒，坐吧。我的孩子们已经饿了一整个冬天。',
    taunts: [
      '这些银币很快就会变成我的牙垢。',
      '你听见桌下的声音了吗？那是它们在分你的份。',
      '再掷大一点。我喜欢看猎物把最后一枚硬币推过来。',
    ],
    win: '不可能……我的孩子们明明已经闻到血腥味了。',
  },
  {
    id: 'judge', group: 1, level: 6, art: 'boss-stone',
    name: '石心审判官', title: '无言法庭', accent: '#9ab9c4',
    effectName: '石化凝视', effectKey: 'rerollMinus',
    effectDesc: '本关你的重投次数减少 1 次。',
    intro: '骰子不会说谎。但你会。现在，让我们开始取证。',
    taunts: [
      '你的每一句话都在石头上留下裂纹。',
      '举证不足。再掷。',
      '审判不需要陪审团，只需要更好的手气。',
    ],
    win: '……判决暂缓。石头的记忆比你想的长。',
  },
  {
    id: 'soulsmith', group: 2, level: 9, art: 'boss-iron',
    name: '铁面铸魂师', title: '熔炉之主', accent: '#e07d4d',
    effectName: '熔炉淬火', effectKey: 'comboTax',
    effectDesc: '三连及以上的组合与顺子，本次计分减少 30%。',
    intro: '多骰的组合最容易被烧软。我建议你只掷单骰，当然，随你。',
    taunts: [
      '组合越大，裂缝越深。',
      '你的运气正在退火。',
      '铁会记住锤子。骰子会记住你。',
    ],
    win: '……看来这一炉，淬过头了。',
  },
  {
    id: 'gildedking', group: 3, level: 12, art: 'boss-gold',
    name: '金冠赌王', title: '无冕之王', accent: '#e8c569',
    effectName: '庄家抽成', effectKey: 'continueTax',
    effectDesc: '使用「计分并继续」时，本次计分减少 20%。',
    intro: '你听说过我。那就省掉自我介绍，直接开始交税吧。',
    taunts: [
      '继续？继续就要抽成。这是规矩，也是乐趣。',
      '你的金币在我这里听起来像雨声。',
      '王冠很重，但你的分数更轻。',
    ],
    win: '拿走吧。王座上的灰尘，正好需要一点新的故事。',
  },
  {
    id: 'seraph', group: 4, level: 15, art: 'boss-diamond',
    name: '钻石天使', title: '最后的庄家', accent: '#a8e8f1',
    effectName: '棱镜裁决', effectKey: 'lowScoreHalf',
    effectDesc: '低于 250 分的计分会被棱镜折半。',
    intro: '你走到了这里。很好。现在证明你的运气不是别人借给你的。',
    taunts: [
      '太轻了，轻得像一句没有重量的祷告。',
      '棱镜只放大真实。你的真实，只有这么一点吗？',
      '最后一把。你连后悔的时间都没有。',
    ],
    win: '……原来命运也会掷出六。离开吧，在天亮之前。',
  },
];

// 15 duels: 5 chapters of (minion, minion, boss).
export const LEVELS = [
  { level: 1, target: 450, reward: 45 },
  { level: 2, target: 600, reward: 50 },
  { level: 3, target: 800, reward: 80, boss: true },
  { level: 4, target: 950, reward: 55 },
  { level: 5, target: 1100, reward: 60 },
  { level: 6, target: 1250, reward: 100, boss: true },
  { level: 7, target: 1400, reward: 70 },
  { level: 8, target: 1550, reward: 75 },
  { level: 9, target: 1700, reward: 120, boss: true },
  { level: 10, target: 1900, reward: 80 },
  { level: 11, target: 2100, reward: 85 },
  { level: 12, target: 2350, reward: 140, boss: true },
  { level: 13, target: 2600, reward: 95 },
  { level: 14, target: 2900, reward: 110 },
  { level: 15, target: 3400, reward: 180, boss: true },
];

export const LEVEL_COUNT = LEVELS.length;

export const CHAPTERS = [0, 1, 2, 3, 4].map((group) => ({
  group,
  table: TABLES[group],
  minion: MINIONS[group],
  boss: BOSSES.find((b) => b.group === group),
  levels: LEVELS.filter((l) => Math.floor((l.level - 1) / 3) === group),
}));

export function chapterForLevel(level) {
  return Math.min(4, Math.floor((level - 1) / 3));
}

export function getLevelConfig(level) {
  return LEVELS[Math.min(level, LEVEL_COUNT) - 1];
}

export function getOpponent(level) {
  const group = chapterForLevel(level);
  const cfg = getLevelConfig(level);
  return cfg.boss ? BOSSES[group] : MINIONS[group];
}

export function getTable(level) {
  return TABLES[chapterForLevel(level)];
}

export function setPieceCounts(equippedDice) {
  const counts = { wolf: 0, raven: 0, serpent: 0, crown: 0, astral: 0 };
  for (const entry of equippedDice) {
    const die = DICE_BY_ID[entry.dieId] || STANDARD_DIE;
    if (die.setId) counts[die.setId] += 1;
  }
  return counts;
}

export function activeSetBonuses(equippedDice) {
  const counts = setPieceCounts(equippedDice);
  const active = {};
  for (const [setId, count] of Object.entries(counts)) {
    const set = DICE_SETS[setId];
    active[setId] = { count, tier: 0, bonuses: [] };
    for (const bonus of set.bonuses) {
      if (count >= bonus.pieces) {
        active[setId].tier = bonus.pieces;
        active[setId].bonuses.push(bonus);
      }
    }
  }
  return active;
}
