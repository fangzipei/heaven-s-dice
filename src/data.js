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
    motto: '群狼咬住同一个数字：3。',
    bonuses: [
      { pieces: 2, key: 'wolfThree', text: '每颗计分的 3 额外 +60 分。' },
      { pieces: 4, key: 'wolfTripleThree', text: '计分含三连 3 时额外 +600 分。' },
    ],
  },
  demon: {
    id: 'demon', name: '恶魔', icon: 'demon', color: '#c05a6a',
    motto: '它不掷点数，它借用别人的点数。',
    bonuses: [
      { pieces: 2, key: 'demonPact', text: '计分使用了恶魔赖子时，本次计分 ×1.08。' },
      { pieces: 4, key: 'demonLegion', text: '恶魔赖子参与计分时，本次计分 ×1.22（替代 2 件）。' },
    ],
  },
};
/*
 * Probability tables are literal face weights. They are normalised at roll
 * time. Every special die has a deliberate, readable tilt rather than an
 * invisible "luck" stat.
 */
export const DICE = [
  // ── 狼裔 · 5 枚：全部在把概率往 3 推 ─────────────────────────────────
  {
    id: 'wolf_whelp', name: '乳狼骰', setId: 'wolf', rarity: 'common',
    probs: [0.20, 0.14, 0.20, 0.12, 0.19, 0.15],
    flavor: '森林里第一颗掉落的乳牙，只认一个数字。',
    desc: '1、5 各约 20%，3 也抬到 20%，中间点数薄。', bonus: null,
  },
  {
    id: 'wolf_hunter', name: '猎手骰', setId: 'wolf', rarity: 'rare',
    probs: [0.20, 0.09, 0.31, 0.07, 0.21, 0.12],
    flavor: '狼群追猎时，猎手总会把三枚爪印留在雪里。',
    desc: '3 点概率 31%，1、5 各 20%。', bonus: null,
  },
  {
    id: 'wolf_bloodmoon', name: '血月骰', setId: 'wolf', rarity: 'rare',
    probs: [0.20, 0.07, 0.33, 0.06, 0.22, 0.12],
    flavor: '月全食那晚，整片森林都听见了骨头里的回声。',
    desc: '3 点概率 33%，1、5 各 20%。', bonus: null,
  },
  {
    id: 'wolf_alpha', name: '白狼王骰', setId: 'wolf', rarity: 'epic',
    probs: [0.16, 0.10, 0.30, 0.10, 0.18, 0.16],
    flavor: '它从不嚎叫。它只是看，群狼便知道该咬住哪一个数字。',
    desc: '3 点 30%；计分含至少一颗 3 时 +260。',
    bonus: { type: 'hasFace', face: 3, value: 260, label: '狼王：计分含至少一颗 3 时 +260' },
  },
  {
    id: 'wolf_ancestor', name: '狼祖骰', setId: 'wolf', rarity: 'legendary',
    probs: [0.16, 0.08, 0.34, 0.08, 0.16, 0.18],
    flavor: '第一头狼的牙床。三这个数字，是它先咬出来的。',
    desc: '3 点概率 34%；计分含至少一颗 3 时 +520。',
    bonus: { type: 'hasFace', face: 3, value: 520, label: '狼祖：计分含至少一颗 3 时 +520' },
  },

  // ── 恶魔 · 5 枚：掷出 1 就是赖子，不按 100 分算 ──────────────────────
  {
    id: 'demon_imp', name: '小恶魔骰', setId: 'demon', rarity: 'common',
    probs: [0.13, 0.17, 0.18, 0.17, 0.18, 0.17],
    flavor: '它在桌下轻轻碰你的膝盖，提醒你：一可以不是一。',
    desc: '恶魔赖子 13%，其余面均衡。', bonus: null,
  },
  {
    id: 'demon_taxman', name: '税吏骰', setId: 'demon', rarity: 'rare',
    probs: [0.14, 0.17, 0.17, 0.16, 0.18, 0.18],
    flavor: '税吏从不掷出运气，他只掷出应收的数目。',
    desc: '恶魔赖子 14%，5、6 略高。', bonus: null,
  },
  {
    id: 'demon_seal', name: '契约之印', setId: 'demon', rarity: 'rare',
    probs: [0.11, 0.17, 0.17, 0.17, 0.21, 0.17],
    flavor: '盖下去的那一刻，连点数都要补缴印花税。',
    desc: '恶魔赖子 11%，5 点偏高。', bonus: null,
  },
  {
    id: 'demon_queen', name: '无冠女王', setId: 'demon', rarity: 'epic',
    probs: [0.14, 0.18, 0.18, 0.16, 0.18, 0.16],
    flavor: '她输掉了王冠，于是开始赢走别人的名字。',
    desc: '恶魔赖子 14%；计分含此骰 ×1.18，场上但未选中 ×0.94。',
    bonus: { type: 'demon', included: 1.18, missing: 0.94, label: '恶魔契约：含此骰 ×1.18；不含则 ×0.94' },
  },
  {
    id: 'demon_devourer', name: '噬名者', setId: 'demon', rarity: 'legendary',
    probs: [0.20, 0.14, 0.15, 0.13, 0.18, 0.20],
    flavor: '它不吞骰子，它只把骰子的名字吃掉，留下一个空壳。',
    desc: '恶魔赖子 20%；此骰作为赖子计分时 +140。',
    bonus: { type: 'wildFlat', value: 140, label: '噬名：此骰作为恶魔赖子计分时 +140' },
  },

  // ── 无套组 · 10 枚：形状本身就是规则 ────────────────────────────────
  {
    id: 'odd_eye', name: '孤影骰', setId: null, rarity: 'rare',
    probs: [1 / 3, 0, 1 / 3, 0, 1 / 3, 0],
    flavor: '它只掷出奇数。影子总是一半。',
    desc: '只有 1、3、5 三种点数（各 1/3），永远不会掷出双数。', bonus: null,
  },
  {
    id: 'even_twin', name: '双生骰', setId: null, rarity: 'epic',
    probs: [0, 0.22, 0, 0.18, 0, 0.60],
    flavor: '它只掷出偶数。成双的东西从不独自计分。',
    desc: '只有 2、4、6（22% / 18% / 60%）；单颗不能计分，是纯组合骰，但三连极好凑。计分含任意三连时 +520。',
    bonus: { type: 'anyTriple', value: 520, label: '双生：计分含任意三连时 +520' },
  },
  {
    id: 'polar', name: '阴阳骰', setId: null, rarity: 'rare',
    probs: [0.30, 0, 0, 0, 0, 0.70],
    flavor: '不是一，就是六。它拒绝中间的那些妥协。',
    desc: '只有 1 和 6（30% / 70%）。', bonus: null,
  },
  {
    id: 'ladder', name: '拾级骰', setId: null, rarity: 'common',
    probs: [0.14, 0.12, 0.14, 0.16, 0.22, 0.22],
    flavor: '每一级都比上一级更重，像有人在楼梯上等你。',
    desc: '概率沿 1→6 缓缓递增，5、6 各 22%。', bonus: null,
  },
  {
    id: 'mirror', name: '照面骰', setId: null, rarity: 'rare',
    probs: [0.25, 0.20, 0.05, 0.05, 0.20, 0.25],
    flavor: '两面光亮，两面模糊，另外两面从没被人看清。',
    desc: '1、6 各 25%，2、5 各 20%，3、4 各 5%。', bonus: null,
  },
  {
    id: 'five_fold', name: '五福骰', setId: null, rarity: 'epic',
    probs: [0.14, 0.12, 0.12, 0.10, 0.36, 0.16],
    flavor: '五枚铜钱串在一起，掷出来的永远是五。',
    desc: '5 点概率 36%；此骰以 5 计分时 +50。',
    bonus: { type: 'faceFlat', face: 5, value: 50, label: '五福：此骰以 5 计分时 +50' },
  },
  {
    id: 'hex', name: '六合骰', setId: null, rarity: 'epic',
    probs: [0.10, 0.12, 0.10, 0.10, 0.28, 0.30],
    flavor: '六面里有两面刻得特别深，骰子自己也知道。',
    desc: '5、6 各 28% / 30%；计分同时含 5 与 6 时 +300。',
    bonus: { type: 'fiveAndSix', value: 300, label: '六合：计分同时含 5 与 6 时 +300' },
  },
  {
    id: 'echo', name: '回声骰', setId: null, rarity: 'epic',
    probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    flavor: '它把上一次落桌的声音也一起掷了出来。',
    desc: '六面均衡；计分含此骰时，本次计分 ×1.14。',
    bonus: { type: 'dieMultiplier', value: 1.14, label: '回声：计分含此骰时 ×1.14' },
  },
  {
    id: 'ace', name: '双煞骰', setId: null, rarity: 'legendary',
    probs: [0.30, 0.06, 0.06, 0.06, 0.30, 0.22],
    flavor: '只掷一和五。这两面，是赌桌上唯一能单独换钱的面。',
    desc: '1、5 各 30%；此骰以 1 计分时 +120。',
    bonus: { type: 'faceFlat', face: 1, value: 120, label: '双煞：此骰以 1 计分时 +120' },
  },
  {
    id: 'jack', name: '骰王', setId: null, rarity: 'legendary',
    probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    flavor: '它看起来毫无偏私。可它记得每一个三连。',
    desc: '六面完全均衡；计分含任意三连时 +340（靠组合吃饭，不靠点数偏好）。',
    bonus: { type: 'anyTriple', value: 340, label: '骰王：计分含任意三连时 +340' },
  },
];

const DIE_PRICE_BY_RARITY = { common: 35, rare: 70, epic: 130, legendary: 210 };
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
    art: 'lead', price: 70, bias: [1.35, 1, 1, 1, 1.30, 1],
    desc: '桶底灌了铅，也灌了赌徒的贪心。1 与 5 的出现率提高。',
    short: '1、5 概率 +',
  },
  {
    id: 'serpent', name: '蛇纹桶', rarity: 'rare', type: 'probability',
    art: 'serpent', price: 70, bias: [0.70, 1.30, 1.25, 1.25, 1, 1],
    desc: '鳞片在掌心下滑动。2、3、4 的出现率提高，1 更少。',
    short: '2、3、4 概率 + / 1 概率 −',
  },
  {
    id: 'astral', name: '星象桶', rarity: 'epic', type: 'probability',
    art: 'astral', price: 105, bias: [1, 1, 1, 1, 1.20, 1.40],
    desc: '桶身刻着逆行的星图。6 与 5 的出现率显著提高。',
    short: '5、6 概率 +',
  },
  {
    id: 'wolf_totem', name: '狼图腾桶', rarity: 'rare', type: 'faceScore',
    art: 'wolf-totem', price: 90, face: 3, value: 50, tripleValue: 150,
    desc: '每颗参与本次计分的 3 额外 +50 分；本次计分含三连 3 再 +150 分。',
    short: '每颗计分的 3 +50 分 · 三连 3 再 +150',
  },
  {
    id: 'demon_pact', name: '恶魔契桶', rarity: 'epic', type: 'wildScore',
    art: 'demon-totem', price: 120, value: 60,
    desc: '每颗参与本次计分的恶魔赖子额外 +60 分。赖子不能单独计分，必须补进组合。',
    short: '每颗计分的恶魔赖子 +60 分',
  },
  {
    id: 'pentagram', name: '五芒桶', rarity: 'epic', type: 'gesture',
    art: 'pentagram', price: 125, gesture: 'pentagram',
    desc: '每关完成一次五芒星仪式，本掷所有计分 +20%。',
    short: '五芒星仪式：每关一次，本掷计分 +20%',
  },
  {
    id: 'vortex', name: '旋涡桶', rarity: 'legendary', type: 'gesture',
    art: 'vortex', price: 165, gesture: 'circle',
    desc: '顺时针画满一圈，本掷计分 +15%，并在此关获得 1 次额外重投（每关一次）。',
    short: '旋涡仪式：本掷 +15% 且每关 +1 重投',
  },
];

export const BARREL_BY_ID = Object.fromEntries(BARRELS.map((b) => [b.id, b]));

/*
 * Shop stock is weighted by level so early levels teach common/rare dice and
 * late levels actually surface epic/legendary picks. Weights are relative, not
 * percentages: 0 means the tier cannot appear in that band.
 */
export const SHOP_RARITY_WEIGHTS = [
  { untilLevel: 6, weights: { common: 62, rare: 32, epic: 6, legendary: 0 } },
  { untilLevel: 12, weights: { common: 34, rare: 46, epic: 18, legendary: 2 } },
  { untilLevel: 18, weights: { common: 18, rare: 44, epic: 30, legendary: 8 } },
  { untilLevel: 24, weights: { common: 9, rare: 34, epic: 37, legendary: 20 } },
  { untilLevel: 28, weights: { common: 4, rare: 26, epic: 40, legendary: 30 } },
];

export function rarityShopWeight(rarity, level = 1) {
  const band = SHOP_RARITY_WEIGHTS.find((entry) => level <= entry.untilLevel)
    || SHOP_RARITY_WEIGHTS[SHOP_RARITY_WEIGHTS.length - 1];
  return band.weights[rarity] ?? 0;
}

export const ITEMS = [
  // ── 主动物品 · 每关恢复一次 ────────────────────────────────────────────
  {
    id: 'lucky_coin', name: '幸运币', type: 'active', icon: 'coin',
    rarity: 'common', price: 35, charges: 1,
    desc: '立即获得 150 分。',
    flavor: '正面是国王，反面也是国王。这枚硬币从来不做选择。',
  },
  {
    id: 'hunter_mark', name: '猎人印记', type: 'active', icon: 'eye',
    rarity: 'rare', price: 75, charges: 1,
    desc: '本关下一次计分翻倍。',
    flavor: '狼群不追错猎物。你只需要让下一次落下足够重。',
  },
  {
    id: 'glove', name: '魔术手套', type: 'active', icon: 'glove',
    rarity: 'rare', price: 65, charges: 1,
    desc: '将当前选中的一颗骰子改为 1 点。',
    flavor: '完全合法。只要没有人看见袖口里的第二只手。',
  },
  {
    id: 'smoke', name: '烟雾弹', type: 'active', icon: 'smoke',
    rarity: 'epic', price: 95, charges: 1,
    desc: '免费重掷所有未计分骰子，不消耗重投次数。',
    flavor: '烟雾散去时，桌上少了一颗骰子，多了一个说法。',
  },
  {
    id: 'charm', name: '赌徒护符', type: 'active', icon: 'amulet',
    rarity: 'epic', price: 120, charges: 1,
    desc: '本关目标分数降低 20%。',
    flavor: '据说它能让庄家忘掉一条规则。副作用是庄家会记住你的脸。',
  },
  {
    id: 'hourglass', name: '时间沙漏', type: 'active', icon: 'hourglass',
    rarity: 'epic', price: 135, charges: 1,
    desc: '恢复 1 次重投，并立即获得 125 分。',
    flavor: '沙子倒着流。你多了一次机会，也少了一点耐心。',
  },
  {
    id: 'blood_contract', name: '血契', type: 'active', icon: 'dagger',
    rarity: 'legendary', price: 190, charges: 1,
    desc: '本关后续每次计分 +35%，但每次计分后失去 100 分。',
    flavor: '签名用的不是墨水。落款之后，骰子开始闻起来像铁。',
  },

  // ── 一次性消耗品 · 用掉就从行囊消失 ────────────────────────────────────
  {
    id: 'courage', name: '烈酒', type: 'active', icon: 'bottle',
    rarity: 'rare', price: 65, charges: 1, consumable: true,
    desc: '本关 +1 次重投。一次性消耗，喝完就没了。',
    flavor: '喝下去以后，桌子看起来更平了，骰子看起来更听话了。',
  },
  {
    id: 'wager', name: '加注契约', type: 'active', icon: 'scroll',
    rarity: 'rare', price: 85, charges: 1, consumable: true,
    desc: '本关 +1 次重投，且下一次计分 ×1.6。一次性消耗。',
    flavor: '空着的那一栏，是留给你自己签的。',
  },
  {
    id: 'powder', name: '幸运粉', type: 'active', icon: 'powder',
    rarity: 'rare', price: 70, charges: 1, consumable: true,
    desc: '免费重掷所有未计分骰子，并立即获得 80 分。一次性消耗。',
    flavor: '吹上去的时候像金粉，落在桌面上的时候像灰尘。',
  },
  {
    id: 'salt', name: '盐', type: 'active', icon: 'salt',
    rarity: 'epic', price: 105, charges: 1, consumable: true,
    desc: '本关下一次掷空不计：本轮未计入的分数照常转为已得。一次性消耗。',
    flavor: '洒在桌角，据说能挡住那些不该落下的骰子。',
  },
  {
    id: 'boss_ward', name: '静默赦令', type: 'active', icon: 'edict',
    rarity: 'legendary', price: 260, charges: 1, consumable: true,
    desc: '消除下一次遇到的庄家被动。在庄家关首掷前使用可当场消除；一次性消耗。',
    flavor: '羊皮纸上只写了一句话：今晚，庄家闭嘴。落款处盖着一枚被划掉的王冠。',
  },

  // ── 被动物品 · 永久生效 ────────────────────────────────────────────────
  {
    id: 'gold_cuff', name: '镀金袖扣', type: 'passive', icon: 'cuff',
    rarity: 'rare', price: 90, charges: 0,
    desc: '每关胜利额外获得 15 银币，商店刷新费用 -20%。',
    flavor: '真正的财富不在钱袋里，而在别人看见你袖口时的表情里。',
  },
  {
    id: 'shelf_barrel', name: '双孔桶架', type: 'passive', icon: 'shelf-barrel',
    rarity: 'rare', price: 110, charges: 0,
    desc: '商店骰桶货位 +1（默认 1 → 2）。',
    flavor: '行商嫌你挑得太慢，索性把第二个洞也凿开了。',
  },
  {
    id: 'dice_bag', name: '丰饶骰袋', type: 'passive', icon: 'pouch',
    rarity: 'epic', price: 150, charges: 0, unique: true,
    desc: '可使用的骰子 +1（永久，整局限获取一次）。',
    flavor: '袋口永远比看起来深。你甚至不确定里面有没有别的东西。',
  },
  {
    id: 'cracked_pouch', name: '裂痕骰袋', type: 'passive', icon: 'cracked-pouch',
    rarity: 'epic', price: 130, charges: 0, unique: true,
    desc: '可使用的骰子 -1，所有计分 +25%（永久，整局限获取一次）。',
    flavor: '少一颗骰子，少一条退路。裂缝里漏出来的不是骰子，是孤注一掷。',
  },
  {
    id: 'shelf_dice', name: '三层骰架', type: 'passive', icon: 'shelf-dice',
    rarity: 'epic', price: 140, charges: 0,
    desc: '商店骰子货位 +1（默认 2 → 3）。',
    flavor: '多一层，就多一种贪心的方式。',
  },
  {
    id: 'shelf_item', name: '暗格货架', type: 'passive', icon: 'shelf-item',
    rarity: 'epic', price: 130, charges: 0,
    desc: '商店物品货位 +1（默认 3 → 4）。',
    flavor: '最值钱的东西从来不在明面上。',
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

/* ── 关卡结构：先定庄家，再让一切从庄家推出来 ───────────────────────────
   每位庄家前面留 gap 个小兵关。gap 只增不减（2 / 2 / 3 / 3 / 3 / 4 / 4 / 4），
   所以庄家越往后越像里程碑，而不是隔关撞见的减速带。

   关卡总数、每位庄家的关卡号、他坐哪张桌子，全部从这张表推出来——加一位
   庄家只需要往 BOSS_DEFS 里加一条、在 MINION_GAPS 里补一个空档，关卡表、
   章节划分、赏金会自己重排。 */
export const MINION_GAPS = [2, 2, 3, 3, 3, 4, 4, 4];

const BOSS_LEVELS = (() => {
  let level = 0;
  return MINION_GAPS.map((gap) => (level += gap + 1));
})();

const LEVEL_TOTAL = BOSS_LEVELS[BOSS_LEVELS.length - 1];

// 五张桌子平分全部关卡（33 关 → 7 / 7 / 7 / 6 / 6），章节归属也从这里推。
const CHAPTER_BOUNDS = (() => {
  const chapters = TABLES.length;
  const base = Math.floor(LEVEL_TOTAL / chapters);
  const extra = LEVEL_TOTAL % chapters;
  const bounds = [];
  let sum = 0;
  for (let i = 0; i < chapters; i += 1) {
    sum += base + (i < extra ? 1 : 0);
    bounds.push(sum);
  }
  return bounds;
})();

export function chapterForLevel(level) {
  for (let i = 0; i < CHAPTER_BOUNDS.length; i += 1) {
    if (level <= CHAPTER_BOUNDS[i]) return i;
  }
  return CHAPTER_BOUNDS.length - 1;
}

const BOSS_DEFS = [
  {
    id: 'rotfang', art: 'boss-rat',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.65 },
    name: '腐牙伯爵', title: '鼠群之主', accent: '#c25b5b',
    effectName: '鼠群噬点', effectKey: 'blankNinth',
    effectDesc: '每投出 8 颗骰子，接下来 1 颗会被啃成白骰：没有点数，不能计分。',
    intro: '小赌徒，坐吧。我的孩子们已经饿了一整个冬天。',
    taunts: [
      '它们不挑食。点数、运气，连骰子的脸都啃。',
      '数到八了吗？第九颗归我的孩子们。',
      '白骰也是骰。只是它什么也说不出来。',
    ],
    win: '不可能……我的孩子们明明已经闻到血腥味了。',
  },
  {
    id: 'judge', art: 'boss-stone',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.50 },
    name: '石心审判官', title: '无言法庭', accent: '#9ab9c4',
    effectName: '三证成立', effectKey: 'minTripleScore',
    effectDesc: '只有使用 3 颗及以上骰子的组合才能计分；更小的组合仍可打出，但本次得 0 分。',
    intro: '骰子不会说谎。但你会。现在，让我们开始取证。',
    taunts: [
      '一颗、两颗，都只是零碎的证词。',
      '三颗以上，才配写进判决书。',
      '你可以继续。但这一页不会记分。',
    ],
    win: '……判决暂缓。石头的记忆比你想的长。',
  },
  {
    id: 'soulsmith', art: 'boss-iron',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.45 },
    name: '铁面铸魂师', title: '熔炉之主', accent: '#e07d4d',
    effectName: '六点回炉', effectKey: 'noSix',
    effectDesc: '所有 6 点骰子被熔毁：不能选择，也不能计分。',
    intro: '多骰的组合最容易被烧软。今天，六点先回炉。',
    taunts: [
      '六点太圆滑，熔炉不喜欢圆滑的东西。',
      '你的六点已经变成铁水了。换一颗。',
      '铁会记住锤子。骰子会记住你。',
    ],
    win: '……看来这一炉，淬过头了。',
  },
  {
    id: 'ashclerk', art: 'boss-ash',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.40 },
    name: '灰烬书记官', title: '熔炉的记录员', accent: '#d98a56',
    effectName: '不许复写', effectKey: 'noRepeatType',
    effectDesc: '本关不能连续使用同一种骰型；重复上一手的骰型本次得 0 分。',
    intro: '熔炉只认新的证词。上一页写过的牌型，这一页不许再写。',
    taunts: [
      '重复的供词，连灰都不如。',
      '换一种写法。否则这一页作废。',
      '我记录每一次掷骰；你最好每次都不一样。',
    ],
    win: '……这一页，我记下了。笔尖也该换新的了。',
  },
  {
    id: 'gildedking', art: 'boss-gold',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.35 },
    name: '金冠赌王', title: '无冕之王', accent: '#e8c569',
    effectName: '只开一桌', effectKey: 'singleTypeOnly',
    effectDesc: '本关第一次计分会锁定一种骰型；之后只能继续使用同一种骰型，其他骰型得 0 分。',
    intro: '你听说过我。那就省掉自我介绍，直接开始交税吧。',
    taunts: [
      '一桌只开一种局。换牌型？那是另一张桌子的事。',
      '你的金币在我这里听起来像雨声。',
      '王冠很重，但你的分数更轻。',
    ],
    win: '拿走吧。王座上的灰尘，正好需要一点新的故事。',
  },
  {
    id: 'startax', art: 'boss-tax',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.30 },
    name: '星辉税吏', title: '天穹的收税官', accent: '#8fcbd8',
    effectName: '少一次机会', effectKey: 'rerollMinus',
    effectDesc: '本关重投次数减少 1 次。',
    intro: '每一次重投都要在天穹上记一笔。今天，先扣掉一次。',
    taunts: [
      '机会也要纳税。',
      '少一次，也够你后悔。',
      '星星在数你的重投。',
    ],
    win: '税已收讫。天穹会记住这笔账。',
  },
  {
    id: 'suspensor', art: 'boss-scale',
    curve: { target: 1, reward: 1.50 },
    name: '悬秤人', title: '未落定之数', accent: '#c3b4e6',
    effectName: '浮筹未决', effectKey: 'floatingScore',
    effectDesc: '本关所有得分都是漂浮分：计分与重投都不会真正入账，只有离开这张桌子时才结算；一旦掷出无法计分的骰型，全部漂浮分立刻消散。',
    intro: '别急着把筹码放进兜里。在这张桌上，它们还没落地。',
    taunts: [
      '你看，它浮着。像所有还没被承认的运气。',
      '记下来了吗？记下来也没用，它还没落定。',
      '秤在等一个结果。要不要继续，随你。',
    ],
    win: '……落了。原来你的运气，是有重量的。',
  },
  {
    id: 'seraph', art: 'boss-diamond',
    // 赏金系数：这一关的银币 = 曲线 × 系数（曲线本身逐关上涨，系数随
    // 关卡缓慢收敛，否则后期赏金会指数爆炸）。
    curve: { target: 1, reward: 1.45 },
    name: '钻石天使', title: '最后的庄家', accent: '#a8e8f1',
    effectName: '四成归天', effectKey: 'scoreTaxReroll',
    effectDesc: '所有计分减少 40%；作为补偿，本关重投次数 +1。',
    intro: '你走到了这里。很好。现在证明你的运气不是别人借给你的。',
    taunts: [
      '太轻了，轻得像一句没有重量的祷告。',
      '棱镜只放大真实。你的真实，只有这么一点吗？',
      '最后一把。你连后悔的时间都没有。',
    ],
    win: '……原来命运也会掷出六。离开吧，在天亮之前。',
  },
];

/* 庄家的关卡号与所属赌桌都由上面的空档表决定，条目里不再手写。 */
export const BOSSES = BOSS_DEFS.map((boss, index) => ({
  ...boss,
  level: BOSS_LEVELS[index],
  group: chapterForLevel(BOSS_LEVELS[index]),
}));

/* ── 关卡曲线：目标与赏金是算出来的，不是抄出来的 ──────────────────────
   一条指数曲线负责“越往后越贵”，庄家用 BOSS_DEFS[i].curve 里的系数把
   自己那一档抬起来。改难度只要动 curve、改曲线只要动 LEVEL_CURVE，
   不用再手改 33 行数字（改一行忘三行才是真正的 bug 来源）。 */
export const LEVEL_CURVE = {
  targetBase: 200,      // 第 1 关目标分
  targetGrowth: 1.05,   // 每关目标 ×1.05
  rewardBase: 55,       // 第 1 关基础赏金
  rewardGrowth: 1.055,  // 每关赏金 ×1.055
  targetStep: 10,       // 目标取整到 10
  rewardStep: 5,        // 赏金取整到 5
};

const roundTo = (value, step) => Math.max(step, Math.round(value / step) * step);

/**
 * 生成关卡表。庄家关的目标与赏金都会乘上该庄家的系数。
 * 每行额外带一份 curve（乘系数之前的曲线值），方便界面/结算展示
 * “这一关因为庄家多拿了多少”。
 */
export function buildLevelTable(bosses = BOSSES, curve = LEVEL_CURVE) {
  const at = new Map(bosses.map((boss) => [boss.level, boss]));
  const total = bosses.length ? Math.max(...bosses.map((boss) => boss.level)) : 0;
  const rows = [];
  for (let level = 1; level <= total; level += 1) {
    const baseTarget = curve.targetBase * curve.targetGrowth ** (level - 1);
    const baseReward = curve.rewardBase * curve.rewardGrowth ** (level - 1);
    const boss = at.get(level) || null;
    const scale = boss?.curve || { target: 1, reward: 1 };
    const row = {
      level,
      target: roundTo(baseTarget * (scale.target ?? 1), curve.targetStep),
      reward: roundTo(baseReward * (scale.reward ?? 1), curve.rewardStep),
      curve: {
        target: roundTo(baseTarget, curve.targetStep),
        reward: roundTo(baseReward, curve.rewardStep),
      },
    };
    if (boss) row.boss = true;
    rows.push(row);
  }
  return rows;
}

export const LEVELS = buildLevelTable();

export const LEVEL_COUNT = LEVELS.length;

/* ── 过关奖金细则 ───────────────────────────────────────────────────────────
   收手是一门技术：没用掉的重投次数可以折成银币带走，把目标分甩开一大截
   也有阶梯赏金。两者都由 engine 结算、app 实时预览，共用下面这套数据。 */
export const REROLL_REFUND = 8;
export const OVERSHOOT_TIERS = [
  { ratio: 3, value: 140, key: 'miracle', label: '天胡 · 3 倍目标' },
  { ratio: 2, value: 60, key: 'sweep', label: '通杀 · 2 倍目标' },
  { ratio: 1.5, value: 25, key: 'clean', label: '赢得漂亮 · 1.5 倍目标' },
];

/** Highest overshoot tier reached by a score, or null when it just scraped by. */
export function overshootTier(score, target) {
  if (!target || target <= 0) return null;
  const ratio = score / target;
  return OVERSHOOT_TIERS.find((tier) => ratio >= tier.ratio) || null;
}



export const CHAPTERS = [0, 1, 2, 3, 4].map((group) => ({
  group,
  table: TABLES[group],
  minion: MINIONS[group],
  boss: BOSSES.find((b) => b.group === group),
  bosses: BOSSES.filter((b) => b.group === group),
  levels: LEVELS.filter((l) => chapterForLevel(l.level) === group),
}));

export function chapterLevelSpan(chapter) {
  const levels = LEVELS.filter((entry) => chapterForLevel(entry.level) === chapter).map((entry) => entry.level);
  if (!levels.length) return [1, LEVELS.length];
  return [Math.min(...levels), Math.max(...levels)];
}

export function getLevelConfig(level) {
  return LEVELS[Math.min(level, LEVEL_COUNT) - 1];
}

export function getOpponent(level) {
  const group = chapterForLevel(level);
  const cfg = getLevelConfig(level);
  if (!cfg.boss) return MINIONS[group];
  return BOSSES.find((boss) => boss.level === level) || BOSSES[group];
}

export function getTable(level) {
  return TABLES[chapterForLevel(level)];
}

export function setPieceCounts(equippedDice) {
  const counts = Object.fromEntries(Object.keys(DICE_SETS).map((id) => [id, 0]));
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
