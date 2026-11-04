from pathlib import Path

OUT = Path("docs/art-prompts-world.md")

STYLE = (
    "hand-drawn origami paper diorama, folded paper model with visible fibers and creases, "
    "slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment "
    "palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, "
    "no text, no letters, no logo, no watermark"
)
NEG = (
    "photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cartoon mascot, neon, "
    "oversaturated, blurry, low contrast, busy background, room, floor, frame, text, letters, "
    "numbers printed as text, logo, watermark, multiple objects, duplicate object, cropped, "
    "deformed geometry, melted paper, flat unlit"
)
OBJ_BG = "isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall"

TABLES = [
    ("wood", "黑松木长桌", "第一幕 · 腐烂的根系", "剥名",
     "a long black-pine table top, resin knots, mildew stains and old knife scars, a rat hole in one corner trailing paper roots underneath",
     "ink-green, moss, dark amber, damp brown"),
    ("stone", "灰岩审判桌", "第二幕 · 石头的证词", "定形",
     "a slab table ground from a single tombstone, chiselled edges, hairline cracks packed with unfinished verdict slips, cold dust",
     "cold grey-blue, limestone white, rust, verdict ink black"),
    ("iron", "熔铁赌桌", "第三幕 · 炉火不熄", "铸造",
     "a riveted iron forging table, hammer dents, slag seeping from the seams, one corner still warm and glowing faintly",
     "charcoal, molten orange, iron grey, spark yellow"),
    ("gold", "鎏金王庭桌", "第四幕 · 王冠的重量", "赝造",
     "a gilded court table, gold leaf lifting at the corners to reveal rotten wood, deep red velvet runner, coin grooves worn into the edge",
     "old gold, deep crimson, ivory, rotten brown"),
    ("diamond", "棱晶天穹桌", "终幕 · 天穹之上", "交付",
     "a legless crystal table floating over a paper starfield, faceted prism edges, faint reflections of seated silhouettes inside each facet",
     "ice white, cold blue, silver, pale violet"),
]

ROOMS = {
    "wood": "a cellar gambling hall of folded paper, low timber beams, sacks and barrels stacked in shadow, roots breaking through the brickwork, one hanging oil lamp",
    "stone": "a stone tribunal hall of folded paper, rows of empty witness benches, a tall cracked judgement slab behind the table, cold light from a high slit window",
    "iron": "a paper forge hall, massive bellows and an open furnace door, sparks frozen mid-air, chains and hooks hanging from the ceiling",
    "gold": "a fake palace salon of folded paper, gold-leaf columns with rotten seams, red velvet drapes, a chandelier of paper coins, one mirror covered with a cloth",
    "diamond": "a paper observatory above the clouds, suspended crystal platforms, star charts pinned to nothing, faceted prisms floating in a dark starfield",
}

DICE_MATERIAL = {
    "wolf": "bone-white parchment body with grey fur-fiber folds and faint claw scratches",
    "demon": "charred black paper body with crimson ink seams and small horn-like corner folds",
    "stargazer": "deep indigo paper body punched with tiny silver star holes",
    "caravan": "warm tan leather-paper body with brass corner caps and a stamped merchant seal",
    None: "aged parchment paper body with one distinctive fold",
}
RARITY = {
    "common": "plain paper, a single accent fold, no metal",
    "rare": "one metallic ink accent and one embossed mark",
    "epic": "layered folds, a small emblem and deeper shadows",
    "legendary": "gold-leaf inlay, ink-black core and a faint inner glow",
}

DICE = [
    ("wolf_whelp", "乳狼骰", "wolf", "common",
     "a single milk tooth set into the top panel, the other panels left blank and slightly worn"),
    ("wolf_bloodmoon", "血月骰", "wolf", "rare",
     "blood-moon red paper, a wolf-eye pupil folded into one corner, three panels inked darker with no numbers"),
    ("wolf_alpha", "白狼王骰", "wolf", "epic",
     "ivory white paper, an alpha wolf muzzle folded over one edge, a small crown of teeth ringing one blank panel"),
    ("wolf_ancestor", "狼祖骰", "wolf", "legendary",
     "grey ancestral pelt folds, a jawbone ridge along one edge, one blank panel worn smooth by generations"),
    ("demon_imp", "小恶魔骰", "demon", "rare",
     "a small horned imp silhouette folded into one corner, its tail curled around the body"),
    ("demon_taxman", "税吏骰", "demon", "epic",
     "a tax ledger clasp and a tiny coin scale, measured crimson seams, no ornament wasted"),
    ("demon_queen", "无冠女王", "demon", "legendary",
     "an uncrowned queen profile in crimson and black, an empty crown notch above her brow"),
    ("demon_devourer", "噬名者", "demon", "legendary",
     "a mouth-like fold eating a paper glyph, erased name marks scratched around the rim"),
    ("odd_eye", "孤影骰", "stargazer", "rare",
     "a single eye on one panel, the other panels half in shadow, no numbers"),
    ("even_twin", "双生骰", "stargazer", "epic",
     "two mirrored halves joined by a seam, twin shadows cast on the backdrop, no numbers"),
    ("polar", "阴阳骰", None, "rare",
     "split black-and-white paper, two opposite panels, no middle ground, no numbers"),
    ("ladder", "拾级骰", "stargazer", "common",
     "stepped folds climbing one edge like a staircase, each step heavier than the last"),
    ("mirror", "照面骰", "stargazer", "rare",
     "one polished paper mirror face reflecting a blurred second face, two faces worn blank"),
    ("five_fold", "五福骰", None, "epic",
     "five copper coins strung on red thread, one raised blank panel framed by the coins"),
    ("hex", "六合骰", None, "epic",
     "a hexagram crease pattern across the body, two opposite faces carved noticeably deeper"),
    ("echo", "回声骰", None, "epic",
     "concentric echo rings embossed around each panel, sound-wave folds along one edge"),
    ("ace", "双煞骰", None, "legendary",
     "two opposite panels edged in gold, a sharp double-edged silhouette, no numbers"),
    ("jack", "骰王", None, "legendary",
     "a crownless king of dice, three-of-a-kind tally marks stamped around every edge"),
    ("balance", "衡心骰", "caravan", "rare",
     "a tiny paper balance scale on the top panel, perfectly symmetrical folds"),
    ("cliff", "孤崖骰", None, "common",
     "a narrow cliff-edge fold splitting two faces, small fallen paper scraps below"),
    ("refrain", "重奏骰", None, "legendary",
     "repeating musical-bar creases, a second echo of the same pip pattern"),
    ("shifting", "浮面骰", None, "common",
     "unstable overlapping faces, one face half-peeled to reveal another underneath"),
    ("merchant", "商旅骰", "caravan", "epic",
     "a merchant seal and tiny abacus beads, tan leather-paper with brass corners"),
    ("gilded_trace", "金痕骰", "caravan", "common",
     "a thin gold seam trailing off the die as if it left a mark on the table"),
    ("last_road", "末路骰", "caravan", "common",
     "a dead-end road fold on one face, worn edges, no retreat visible"),
    ("shadow", "随影骰", None, "epic",
     "a paper shadow duplicate trailing behind the die, slightly offset"),
    ("neighbor", "邻行骰", None, "epic",
     "two panels leaning toward each other, linked by a single fold"),
    ("chain_note", "连记骰", None, "rare",
     "ledger chain links inked along one edge, tally marks stacked in rows"),
    ("scavenger", "拾荒骰", None, "common",
     "small coin scraps tucked into the creases, patched and re-glued paper"),
    ("aftershock", "余响骰", None, "epic",
     "fracture rings around a stopped die, a second tremor crease crossing the first"),
    ("bystander", "看客骰", None, "rare",
     "a quiet die with one edge slightly tapped, watching from the side"),
    ("pilgrim", "朝圣骰", None, "rare",
     "a dotted pilgrimage path winding across the panels toward one dark mark"),
    ("bias_one", "壹面骰", None, "rare",
     "one panel over-worn and burnished bright by thumbs, no numbers"),
    ("bias_two", "贰面骰", None, "common",
     "one panel inked deepest, a faint second panel showing through, no numbers"),
    ("bias_three", "叁面骰", None, "common",
     "one panel polished by constant touching, no numbers"),
    ("bias_four", "肆面骰", None, "common",
     "one panel with four raised corners, always landing first, no numbers"),
    ("bias_five", "伍面骰", None, "rare",
     "one panel carved deepest into the paper, no numbers"),
    ("bias_six", "陆面骰", None, "common",
     "all six panels stamped with the same tiny geometric mark, one panel pressed deepest"),
]

BARRELS = [
    ("oak", "旧橡木桶", "common",
     "a plain old oak dice cup, polished by countless hands, no ornament, just honest wear"),
    ("lead", "铅心桶", "rare",
     "a dice cup with a heavy lead-weighted base, dull grey metal showing under worn wood"),
    ("serpent", "蛇纹桶", "rare",
     "a dice cup wrapped in folded snake scales, one scale lifting at the rim"),
    ("astral", "星象桶", "epic",
     "a dice cup engraved with a retrograde star chart, tiny constellation holes punched through"),
    ("wolf_totem", "狼图腾桶", "rare",
     "a dice cup carved with a wolf totem, a tooth charm tied to the rim"),
    ("demon_pact", "恶魔契桶", "epic",
     "a dice cup sealed with a demon contract, wax sigil and a torn signature strip"),
    ("pentagram", "五芒桶", "epic",
     "a ritual cup with a pentagram scratched into the base, chalk dust in the grooves"),
    ("vortex", "旋涡桶", "legendary",
     "a ritual cup spiralling inward, its rim folded like a whirlpool, faint gold inlay"),
    ("gilded", "鎏金桶", "rare",
     "a gilded dice cup, gold leaf flaking at the rim to reveal dark wood"),
    ("marker", "定一桶", "rare",
     "a dice cup with a single brass pin fixed inside, one notch in the rim"),
    ("guide", "顺遂桶", "legendary",
     "a dice cup whose inner folds form a smooth guiding ramp, subtle silver line"),
    ("brood", "增殖桶", "epic",
     "a dice cup with a small secondary pocket, one extra fold bulging at the side"),
    ("singles", "独注桶", "rare",
     "a narrow dice cup made for a single die, one deep groove down the middle"),
    ("pawn", "当铺桶", "epic",
     "a pawnshop dice cup with a brass ticket slot and a chalked price on the base"),
    ("nightwatch", "守夜桶", "epic",
     "a dice cup with a small watchman's lantern hook and a half-burnt candle stub"),
    ("fuse", "引信桶", "rare",
     "a dice cup with a paper fuse braided into the rim, scorched at one end"),
    ("rotation", "轮转桶", "rare",
     "a dice cup with a rotating inner ring, gear teeth folded from paper"),
    ("twoface", "双面桶", "legendary",
     "a dice cup split into two mirrored halves, two rim openings facing opposite ways"),
    ("loan", "借运桶", "epic",
     "a dice cup with a moneylender's tally stick tied to it, debts notched into the wood"),
]

ITEMS = [
    ("lucky_coin", "幸运币", "active", "common",
     "a worn gold coin, king's head on both sides, no choice in it"),
    ("hunter_mark", "猎人印记", "active", "rare",
     "a hunter's paper mark with a wolf-claw stamp, red thread through one hole"),
    ("glove", "魔术手套", "active", "common",
     "a white magician's glove with a hidden second thumb folded inside the cuff"),
    ("smoke", "烟雾弹", "active", "epic",
     "a paper smoke bomb, clay cap, grey powder leaking from the seam"),
    ("devil_reset", "魔鬼的收据", "active", "epic",
     "a charred receipt with a devil's signature burned through the paper"),
    ("charm", "赌徒护符", "active", "epic",
     "a gambler's charm of bone and red cord, one eye scratched out"),
    ("hourglass", "时间沙漏", "active", "epic",
     "a paper hourglass with sand flowing upward, cracked glass folded from tracing paper"),
    ("blood_contract", "血契", "active", "legendary",
     "a blood-signed contract, iron-gall ink, a fingerprint pressed into the corner"),
    ("courage", "烈酒", "active", "common",
     "a squat liquor bottle with a blank paper label, liquid amber, cork half out"),
    ("wager", "加注契约", "active", "rare",
     "a betting slip with one blank line left unsigned"),
    ("powder", "幸运粉", "active", "common",
     "a small paper packet of gold dust, torn corner, dust spilling"),
    ("salt", "盐", "active", "epic",
     "a paper twist of coarse salt, one pinch scattered at the corner"),
    ("boss_ward", "静默赦令", "active", "legendary",
     "a parchment decree, its single sentence scratched through, a crossed-out crown seal"),
    ("epic_chest", "史诗骰匣", "active", "epic",
     "a small chest with a single breathing compartment, paper hinge"),
    ("rare_pair", "双择骰函", "active", "rare",
     "two sealed letters tied together, one die-shaped bulge in each"),
    ("gold_cuff", "镀金袖扣", "passive", "common",
     "a gilded cufflink, gold worn thin at the edge"),
    ("barrel_reforger", "重铸器", "passive", "rare",
     "a barrel reforging tool, two hoops driven into one stave"),
    ("shelf_barrel", "双孔桶架", "passive", "rare",
     "a two-hole barrel rack, fresh splinters around the second hole"),
    ("dice_bag", "丰饶骰袋", "passive", "epic",
     "a deep dice bag, mouth wider than the bag looks, faint extra bulge inside"),
    ("cracked_pouch", "裂痕骰袋", "passive", "epic",
     "a cracked dice pouch, one die missing, red thread stitching the tear"),
    ("shelf_dice", "三层骰架", "passive", "epic",
     "a three-tier dice shelf, empty slots waiting"),
    ("shelf_item", "暗格货架", "passive", "epic",
     "a shop shelf with a hidden compartment behind the back panel"),
    ("active_shelf", "夹层行囊", "passive", "epic",
     "a travel pack with a thin inner pocket sewn into the lining"),
    ("triple_charm", "三环坠", "passive", "rare",
     "three interlocked rings on a cord, the fourth link missing"),
    ("straight_bell", "顺风铃", "passive", "epic",
     "a small wind bell, clapper angled forward, never looking back"),
    ("quad_seal", "四方印", "passive", "epic",
     "a square paper seal stamped on all four corners"),
    ("quint_clasp", "五指扣", "passive", "epic",
     "a five-finger clasp gripping a table edge, knuckles folded from paper"),
    ("sext_crown", "六芒冠", "passive", "legendary",
     "a six-rayed paper crown, gold ink at every point"),
    ("heaven_plate", "天地盘", "passive", "legendary",
     "a divination plate carved with heaven and earth, a die-sized gap in the middle"),
    ("pip_ward", "点金符", "passive", "epic",
     "a paper talisman with one and five pips inked in gold"),
    ("rotfang_relic", "鼠牙王冠", "passive", "legendary",
     "a crown of rat teeth, one fang longer than the rest"),
    ("judge_relic", "停审令牌", "passive", "legendary",
     "a judge's token, verdict chisel stopped mid-stroke"),
    ("twinsix_relic", "双六骨", "passive", "legendary",
     "a pair of six-pips carved into a single bone, two and six linked"),
    ("toll_relic", "抽头账簿", "passive", "legendary",
     "a toll ledger with coins pressed into the spine"),
    ("soulsmith_relic", "熔炉余烬", "passive", "legendary",
     "a still-glowing ember held in paper tongs"),
    ("ashclerk_relic", "复写灰烬", "passive", "legendary",
     "a sheet of ash paper with a perfect duplicate impression"),
    ("gildedking_relic", "无冕金冠", "passive", "legendary",
     "a crownless gold circlet, the setting empty"),
    ("suspensor_relic", "悬秤砣", "passive", "legendary",
     "a hanging scale weight on a paper chain, never touching the ground"),
    ("mirror_relic", "双倍镜片", "passive", "legendary",
     "a shard of mirror glass in a paper frame, reflecting the same scene twice"),
    ("startax_relic", "三证铜印", "passive", "legendary",
     "a bronze seal with three witness marks"),
    ("seraph_relic", "天使羽", "passive", "legendary",
     "a single white paper feather, faint gold edge"),
    ("lucifer_relic", "晨星角", "passive", "legendary",
     "a black morning-star horn, one crack glowing faintly"),
    ("pairbane_relic", "连理骨", "passive", "legendary",
     "two bones fused at the joint, paired notches on both ends"),
]

def obj_block(title, meta, motif, size, extra=""):
    prompt = f"{STYLE}, {motif}{extra}, {OBJ_BG}, centered, full object visible, {size} composition"
    return f"### {title}\n\n{meta}\n\n```text\n{prompt}\n```\n\n**Negative:**\n```text\n{NEG}\n```\n"

lines = []
A = lines.append

A("# 《天国骰局》美术重制提示词 · 世界观版\n")
A("> 骰子落下之前，命运只是一句空话。\n")
A("这份文档把 `docs/worldbuilding.md` 的设定翻成可执行的出图指令：五幕场景、五张赌桌、38 枚秘骰、19 只骰桶、43 件物品，以及纸张与特效。\n")

A("## 0. 统一规则（先读）\n")
A("### 0.1 世界观怎么落到画面上\n")
A("| 设定 | 画面语言 |\n|---|---|")
A("| 骰子 = 未被掷出的灵魂 | 每颗骰子都要有「一个被压进纸里的东西」：牙、眼、骨、印章、缝线 |")
A("| 地狱 = 铸造厂 | 五张桌子是五道工序，材质必须能看出「被加工过」：裂纹、铆钉、金箔翘边、熔渣 |")
A("| 天堂 = 账房 | 终幕不是圣洁，是冷、空、过度整齐；棱镜里要有失败者的倒影 |")
A("| 银币 = 名字的碎片 | 金属只出现在「计价」的位置：边缘、铆钉、印章、秤砣 |")
A("| 秘骰 = 还没揭晓 | 骰子不要画成成品玩具，要像「封着的信」：接缝明显、有一面还没被翻开 |")
A("")

A("### 0.2 画风母式\n")
A("所有资产共用这一段，后面只替换主体描述：\n")
A("```text\n" + STYLE + "\n```\n")
A("**通用负向：**\n")
A("```text\n" + NEG + "\n```\n")

A("### 0.3 稀有度四档\n")
A("| 档位 | 处理 |\n|---|---|")
for k, v in RARITY.items():
    A(f"| {k} | {v} |")

A("\n### 0.4 五幕色板\n")
A("| 幕 | 主色 | 强调色 | 禁忌 |\n|---|---|---|---|")
A("| 第一幕 剥名 | 墨绿、苔褐、湿木 | 琥珀灯光 | 不要干净的白 |")
A("| 第二幕 定形 | 冷灰蓝、石灰白 | 铁锈、判决墨 | 不要暖黄 |")
A("| 第三幕 铸造 | 炭黑、铁灰 | 熔橙、火星黄 | 不要金 |")
A("| 第四幕 赝造 | 旧金、深红 | 象牙 | 不要崭新发亮 |")
A("| 终幕 交付 | 冰白、冷蓝 | 银、极淡紫 | 不要暖色 |")

A("\n### 0.5 尺寸与落盘\n")
A("| 资产 | 出图尺寸 | 落盘尺寸 | 路径 |\n|---|---:|---:|---|")
A("| 场景背景 | 1600×760 | 1600×760 | `assets/rooms/<art>.svg` |")
A("| 赌桌 | 1600×1000 | 1600×1000 | `assets/paper/tables/<art>.svg` |")
A("| 骰子立绘 | 1024×1024 | 512×512 | `assets/art/dice/<id>-full.svg` |")
A("| 骰桶杯身 | 768×896 | 340×400 | `assets/art/barrels/<art>-cup.svg` |")
A("| 物品图标 | 1024×1024 | 512×512 | `assets/art/items/<id>-cut.svg` |")
A("| 纸张纹理 | 2048×1280 | 1600×1000 | `assets/paper/*.svg` |")

A("\n## 1. 场景背景（5 张）\n")
A("构图：宽幅建立镜头、平视、**没有人物也没有骰子**，给中间留出桌面位置。\n")
for art, name, sub, step, _, palette in TABLES:
    motif = ROOMS[art]
    prompt = (f"{STYLE}, wide establishing shot of {motif}, paper theatre set, layered paper cut-out "
              f"depth, {palette} palette, empty scene, no characters, no dice, no text, "
              f"16:7.6 wide composition")
    A(f"### {sub} · 场景 `rooms/{art}`\n")
    A("```text\n" + prompt + "\n```\n")
A("**Negative:**\n```text\n" + NEG + ", people, characters, creatures, dice, close-up, table top\n```\n")

A("## 2. 赌桌（5 张）\n")
A("构图：**俯视偏 3/4** 的纸艺桌面，中间必须是干净可玩的区域，不要放骰子、筹码或文字。\n")
for art, name, sub, step, motif, palette in TABLES:
    prompt = (f"{STYLE}, top-down three-quarter view of {motif}, paper game table surface, "
              f"clear empty play area in the center, {palette} palette, {step} craft marks, "
              f"8:5 landscape composition, no dice, no characters, no text")
    A(f"### {name} · {sub} · 工序「{step}」 `tables/{art}`\n")
    A("```text\n" + prompt + "\n```\n")
A("**Negative:**\n```text\n" + NEG + ", dice, tokens, cards, people, text on the table\n```\n")

A("## 3. 骰子（38 枚）\n")
A("### 3.1 骰子母式\n")
A("每颗骰子都应该是「一颗被封住的灵魂」，不是普通玩具骰。共同要求：\n")
A("- 单颗、悬浮、3/4 视角，一个面朝向镜头")
A("- 接缝明显，至少一面像「还没翻开」")
A("- 材质贴合所属套组，不能混用")
A("- **不要生成点数**：点数由程序绘制，保证概率与可读性")
A("\n材质对照：\n")
for k, v in DICE_MATERIAL.items():
    A(f"- `{k or '中立'}`：{v}")
A("")
for did, name, set_id, rarity, motif in DICE:
    prompt = (f"{STYLE}, one single six-sided die, {DICE_MATERIAL[set_id]}, {RARITY[rarity]}, "
              f"{motif}, floating three-quarter view, blank faces with no pips drawn, "
              f"strong silhouette, {OBJ_BG}, 1:1 composition")
    A(f"### {name} `{did}` · {rarity} · {set_id or '无套组'}\n")
    A("```text\n" + prompt + "\n```\n")
A("> 点数母版：由 `tools/gen-art.mjs` 或代码绘制，不要用 AI 生成骰面，否则点数会错、概率会不可读。\n")

A("## 4. 骰桶（19 只）\n")
A("构图：一个开口朝上的骰桶，杯口略朝镜头，能看到内部阴影；不要画骰子。\n")
for bid, name, rarity, motif in BARRELS:
    prompt = (f"{STYLE}, one single dice cup, {motif}, {RARITY[rarity]}, open rim facing the camera, "
              f"visible inner shadow, empty cup with no dice, {OBJ_BG}, 17:20 portrait composition")
    A(f"### {name} `{bid}` · {rarity}\n")
    A("```text\n" + prompt + "\n```\n")

A("## 5. 物品（43 件）\n")
A("构图：单件物品居中，略高于视线，能看清材质与磨损；主动物品可以有「正在被使用」的一瞬，被动物品保持静态。\n")
for iid, name, typ, rarity, motif in ITEMS:
    prompt = (f"{STYLE}, one single tabletop object, {motif}, {RARITY[rarity]}, "
              f"product-shot angle, strong readable silhouette, {OBJ_BG}, 1:1 composition")
    A(f"### {name} `{iid}` · {typ} · {rarity}\n")
    A("```text\n" + prompt + "\n```\n")

A("## 6. 纸张、特效与纹理\n")
A("### 6.1 纸张底纹（`assets/paper/*.svg`）\n")
A("```text\n" + STYLE + ", a single sheet of aged parchment paper, subtle fiber grain, one soft fold "
  "and a slightly torn corner, no writing, flat even lighting, 8:5 landscape composition, no objects\n```\n")
A("### 6.2 炉火序列帧（`assets/art/fx/fire-*.svg`，4 帧）\n")
A("```text\n" + STYLE + ", a small paper-cut flame, 4-frame sprite sheet strip, same flame growing and "
  "flickering across the frames, warm orange and ember yellow, transparent-friendly plain background, "
  "evenly spaced frames, no text\n```\n")
A("### 6.3 骰面纹理（`assets/textures/dice/standard.png`）\n")
A("```text\n" + STYLE + ", a flat unfolded cube net of paper dice faces, six blank square faces with "
  "paper fiber texture, no pips, no numbers, orthographic top view, 3:2 landscape, seamless paper tone\n```\n")

A("## 7. 不要用 AI 生成的部分\n")
A("- 骰面点数、概率、任何数字与文字")
A("- UI 图标、按钮、标签、结算公式")
A("- 已经上线的角色立绘（另有 `docs/enemy-prompts.md`）")
A("- 桌面中央的可玩区域：AI 容易画出误导性的划痕或图案，建议后期用矢量补")

A("## 8. 接入清单\n")
A("| 步骤 | 操作 |\n|---|---|")
A("| 1 | 按上表尺寸出图，物体类用浅灰底，脚本抠透明 |")
A("| 2 | 骰子只保留 body，点数由程序绘制 |")
A("| 3 | 落盘到对应 `assets/...` 路径，文件名沿用现有 id |")
A("| 4 | `npm run typecheck && npm test && npm run build` |")
A("| 5 | 本地起服务逐幕核对：第一幕到终幕的色板是否连续 |")

OUT.write_text("\n".join(lines), encoding="utf-8")
print("wrote", OUT, len(lines), "lines")
