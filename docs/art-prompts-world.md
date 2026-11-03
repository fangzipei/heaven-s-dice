# 《天国骰局》美术重制提示词 · 世界观版

> 骰子落下之前，命运只是一句空话。

这份文档把 `docs/worldbuilding.md` 的设定翻成可执行的出图指令：五幕场景、五张赌桌、38 枚秘骰、19 只骰桶、43 件物品，以及纸张与特效。

## 0. 统一规则（先读）

### 0.1 世界观怎么落到画面上

| 设定 | 画面语言 |
|---|---|
| 骰子 = 未被掷出的灵魂 | 每颗骰子都要有「一个被压进纸里的东西」：牙、眼、骨、印章、缝线 |
| 地狱 = 铸造厂 | 五张桌子是五道工序，材质必须能看出「被加工过」：裂纹、铆钉、金箔翘边、熔渣 |
| 天堂 = 账房 | 终幕不是圣洁，是冷、空、过度整齐；棱镜里要有失败者的倒影 |
| 银币 = 名字的碎片 | 金属只出现在「计价」的位置：边缘、铆钉、印章、秤砣 |
| 秘骰 = 还没揭晓 | 骰子不要画成成品玩具，要像「封着的信」：接缝明显、有一面还没被翻开 |

### 0.2 画风母式

所有资产共用这一段，后面只替换主体描述：

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark
```

**通用负向：**

```text
photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cartoon mascot, neon, oversaturated, blurry, low contrast, busy background, room, floor, frame, text, letters, numbers printed as text, logo, watermark, multiple objects, duplicate object, cropped, deformed geometry, melted paper, flat unlit
```

### 0.3 稀有度四档

| 档位 | 处理 |
|---|---|
| common | plain paper, a single accent fold, no metal |
| rare | one metallic ink accent and one embossed mark |
| epic | layered folds, a small emblem and deeper shadows |
| legendary | gold-leaf inlay, ink-black core and a faint inner glow |

### 0.4 五幕色板

| 幕 | 主色 | 强调色 | 禁忌 |
|---|---|---|---|
| 第一幕 剥名 | 墨绿、苔褐、湿木 | 琥珀灯光 | 不要干净的白 |
| 第二幕 定形 | 冷灰蓝、石灰白 | 铁锈、判决墨 | 不要暖黄 |
| 第三幕 铸造 | 炭黑、铁灰 | 熔橙、火星黄 | 不要金 |
| 第四幕 赝造 | 旧金、深红 | 象牙 | 不要崭新发亮 |
| 终幕 交付 | 冰白、冷蓝 | 银、极淡紫 | 不要暖色 |

### 0.5 尺寸与落盘

| 资产 | 出图尺寸 | 落盘尺寸 | 路径 |
|---|---:|---:|---|
| 场景背景 | 1600×760 | 1600×760 | `assets/rooms/<art>.svg` |
| 赌桌 | 1600×1000 | 1600×1000 | `assets/paper/tables/<art>.svg` |
| 骰子立绘 | 1024×1024 | 512×512 | `assets/art/dice/<id>-full.svg` |
| 骰桶杯身 | 768×896 | 340×400 | `assets/art/barrels/<art>-cup.svg` |
| 物品图标 | 1024×1024 | 512×512 | `assets/art/items/<id>-cut.svg` |
| 纸张纹理 | 2048×1280 | 1600×1000 | `assets/paper/*.svg` |

## 1. 场景背景（5 张）

构图：宽幅建立镜头、平视、**没有人物也没有骰子**，给中间留出桌面位置。

### 第一幕 · 腐烂的根系 · 场景 `rooms/wood`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, wide establishing shot of a cellar gambling hall of folded paper, low timber beams, sacks and barrels stacked in shadow, roots breaking through the brickwork, one hanging oil lamp, paper theatre set, layered paper cut-out depth, ink-green, moss, dark amber, damp brown palette, empty scene, no characters, no dice, no text, 16:7.6 wide composition
```

### 第二幕 · 石头的证词 · 场景 `rooms/stone`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, wide establishing shot of a stone tribunal hall of folded paper, rows of empty witness benches, a tall cracked judgement slab behind the table, cold light from a high slit window, paper theatre set, layered paper cut-out depth, cold grey-blue, limestone white, rust, verdict ink black palette, empty scene, no characters, no dice, no text, 16:7.6 wide composition
```

### 第三幕 · 炉火不熄 · 场景 `rooms/iron`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, wide establishing shot of a paper forge hall, massive bellows and an open furnace door, sparks frozen mid-air, chains and hooks hanging from the ceiling, paper theatre set, layered paper cut-out depth, charcoal, molten orange, iron grey, spark yellow palette, empty scene, no characters, no dice, no text, 16:7.6 wide composition
```

### 第四幕 · 王冠的重量 · 场景 `rooms/gold`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, wide establishing shot of a fake palace salon of folded paper, gold-leaf columns with rotten seams, red velvet drapes, a chandelier of paper coins, one mirror covered with a cloth, paper theatre set, layered paper cut-out depth, old gold, deep crimson, ivory, rotten brown palette, empty scene, no characters, no dice, no text, 16:7.6 wide composition
```

### 终幕 · 天穹之上 · 场景 `rooms/diamond`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, wide establishing shot of a paper observatory above the clouds, suspended crystal platforms, star charts pinned to nothing, faceted prisms floating in a dark starfield, paper theatre set, layered paper cut-out depth, ice white, cold blue, silver, pale violet palette, empty scene, no characters, no dice, no text, 16:7.6 wide composition
```

**Negative:**
```text
photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cartoon mascot, neon, oversaturated, blurry, low contrast, busy background, room, floor, frame, text, letters, numbers printed as text, logo, watermark, multiple objects, duplicate object, cropped, deformed geometry, melted paper, flat unlit, people, characters, creatures, dice, close-up, table top
```

## 2. 赌桌（5 张）

构图：**俯视偏 3/4** 的纸艺桌面，中间必须是干净可玩的区域，不要放骰子、筹码或文字。

### 黑松木长桌 · 第一幕 · 腐烂的根系 · 工序「剥名」 `tables/wood`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, top-down three-quarter view of a long black-pine table top, resin knots, mildew stains and old knife scars, a rat hole in one corner trailing paper roots underneath, paper game table surface, clear empty play area in the center, ink-green, moss, dark amber, damp brown palette, 剥名 craft marks, 8:5 landscape composition, no dice, no characters, no text
```

### 灰岩审判桌 · 第二幕 · 石头的证词 · 工序「定形」 `tables/stone`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, top-down three-quarter view of a slab table ground from a single tombstone, chiselled edges, hairline cracks packed with unfinished verdict slips, cold dust, paper game table surface, clear empty play area in the center, cold grey-blue, limestone white, rust, verdict ink black palette, 定形 craft marks, 8:5 landscape composition, no dice, no characters, no text
```

### 熔铁赌桌 · 第三幕 · 炉火不熄 · 工序「铸造」 `tables/iron`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, top-down three-quarter view of a riveted iron forging table, hammer dents, slag seeping from the seams, one corner still warm and glowing faintly, paper game table surface, clear empty play area in the center, charcoal, molten orange, iron grey, spark yellow palette, 铸造 craft marks, 8:5 landscape composition, no dice, no characters, no text
```

### 鎏金王庭桌 · 第四幕 · 王冠的重量 · 工序「赝造」 `tables/gold`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, top-down three-quarter view of a gilded court table, gold leaf lifting at the corners to reveal rotten wood, deep red velvet runner, coin grooves worn into the edge, paper game table surface, clear empty play area in the center, old gold, deep crimson, ivory, rotten brown palette, 赝造 craft marks, 8:5 landscape composition, no dice, no characters, no text
```

### 棱晶天穹桌 · 终幕 · 天穹之上 · 工序「交付」 `tables/diamond`

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, top-down three-quarter view of a legless crystal table floating over a paper starfield, faceted prism edges, faint reflections of seated silhouettes inside each facet, paper game table surface, clear empty play area in the center, ice white, cold blue, silver, pale violet palette, 交付 craft marks, 8:5 landscape composition, no dice, no characters, no text
```

**Negative:**
```text
photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cartoon mascot, neon, oversaturated, blurry, low contrast, busy background, room, floor, frame, text, letters, numbers printed as text, logo, watermark, multiple objects, duplicate object, cropped, deformed geometry, melted paper, flat unlit, dice, tokens, cards, people, text on the table
```

## 3. 骰子（38 枚）

### 3.1 骰子母式

每颗骰子都应该是「一颗被封住的灵魂」，不是普通玩具骰。共同要求：

- 单颗、悬浮、3/4 视角，一个面朝向镜头
- 接缝明显，至少一面像「还没翻开」
- 材质贴合所属套组，不能混用
- **不要生成点数**：点数由程序绘制，保证概率与可读性

材质对照：

- `wolf`：bone-white parchment body with grey fur-fiber folds and faint claw scratches
- `demon`：charred black paper body with crimson ink seams and small horn-like corner folds
- `stargazer`：deep indigo paper body punched with tiny silver star holes
- `caravan`：warm tan leather-paper body with brass corner caps and a stamped merchant seal
- `中立`：aged parchment paper body with one distinctive fold

### 乳狼骰 `wolf_whelp` · common · wolf

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, bone-white parchment body with grey fur-fiber folds and faint claw scratches, plain paper, a single accent fold, no metal, a single milk tooth set into the top panel, the other panels left blank and slightly worn, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 血月骰 `wolf_bloodmoon` · rare · wolf

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, bone-white parchment body with grey fur-fiber folds and faint claw scratches, one metallic ink accent and one embossed mark, blood-moon red paper, a wolf-eye pupil folded into one corner, three panels inked darker with no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 白狼王骰 `wolf_alpha` · epic · wolf

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, bone-white parchment body with grey fur-fiber folds and faint claw scratches, layered folds, a small emblem and deeper shadows, ivory white paper, an alpha wolf muzzle folded over one edge, a small crown of teeth ringing one blank panel, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 狼祖骰 `wolf_ancestor` · legendary · wolf

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, bone-white parchment body with grey fur-fiber folds and faint claw scratches, gold-leaf inlay, ink-black core and a faint inner glow, grey ancestral pelt folds, a jawbone ridge along one edge, one blank panel worn smooth by generations, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 小恶魔骰 `demon_imp` · rare · demon

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, charred black paper body with crimson ink seams and small horn-like corner folds, one metallic ink accent and one embossed mark, a small horned imp silhouette folded into one corner, its tail curled around the body, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 税吏骰 `demon_taxman` · epic · demon

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, charred black paper body with crimson ink seams and small horn-like corner folds, layered folds, a small emblem and deeper shadows, a tax ledger clasp and a tiny coin scale, measured crimson seams, no ornament wasted, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 无冠女王 `demon_queen` · legendary · demon

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, charred black paper body with crimson ink seams and small horn-like corner folds, gold-leaf inlay, ink-black core and a faint inner glow, an uncrowned queen profile in crimson and black, an empty crown notch above her brow, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 噬名者 `demon_devourer` · legendary · demon

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, charred black paper body with crimson ink seams and small horn-like corner folds, gold-leaf inlay, ink-black core and a faint inner glow, a mouth-like fold eating a paper glyph, erased name marks scratched around the rim, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 孤影骰 `odd_eye` · rare · stargazer

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, deep indigo paper body punched with tiny silver star holes, one metallic ink accent and one embossed mark, a single eye on one panel, the other panels half in shadow, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双生骰 `even_twin` · epic · stargazer

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, deep indigo paper body punched with tiny silver star holes, layered folds, a small emblem and deeper shadows, two mirrored halves joined by a seam, twin shadows cast on the backdrop, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 阴阳骰 `polar` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, split black-and-white paper, two opposite panels, no middle ground, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 拾级骰 `ladder` · common · stargazer

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, deep indigo paper body punched with tiny silver star holes, plain paper, a single accent fold, no metal, stepped folds climbing one edge like a staircase, each step heavier than the last, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 照面骰 `mirror` · rare · stargazer

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, deep indigo paper body punched with tiny silver star holes, one metallic ink accent and one embossed mark, one polished paper mirror face reflecting a blurred second face, two faces worn blank, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 五福骰 `five_fold` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, five copper coins strung on red thread, one raised blank panel framed by the coins, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 六合骰 `hex` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, a hexagram crease pattern across the body, two opposite faces carved noticeably deeper, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 回声骰 `echo` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, concentric echo rings embossed around each panel, sound-wave folds along one edge, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双煞骰 `ace` · legendary · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, gold-leaf inlay, ink-black core and a faint inner glow, two opposite panels edged in gold, a sharp double-edged silhouette, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 骰王 `jack` · legendary · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, gold-leaf inlay, ink-black core and a faint inner glow, a crownless king of dice, three-of-a-kind tally marks stamped around every edge, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 衡心骰 `balance` · rare · caravan

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, warm tan leather-paper body with brass corner caps and a stamped merchant seal, one metallic ink accent and one embossed mark, a tiny paper balance scale on the top panel, perfectly symmetrical folds, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 孤崖骰 `cliff` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, a narrow cliff-edge fold splitting two faces, small fallen paper scraps below, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 重奏骰 `refrain` · legendary · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, gold-leaf inlay, ink-black core and a faint inner glow, repeating musical-bar creases, a second echo of the same pip pattern, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 浮面骰 `shifting` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, unstable overlapping faces, one face half-peeled to reveal another underneath, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 商旅骰 `merchant` · epic · caravan

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, warm tan leather-paper body with brass corner caps and a stamped merchant seal, layered folds, a small emblem and deeper shadows, a merchant seal and tiny abacus beads, tan leather-paper with brass corners, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 金痕骰 `gilded_trace` · common · caravan

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, warm tan leather-paper body with brass corner caps and a stamped merchant seal, plain paper, a single accent fold, no metal, a thin gold seam trailing off the die as if it left a mark on the table, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 末路骰 `last_road` · common · caravan

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, warm tan leather-paper body with brass corner caps and a stamped merchant seal, plain paper, a single accent fold, no metal, a dead-end road fold on one face, worn edges, no retreat visible, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 随影骰 `shadow` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, a paper shadow duplicate trailing behind the die, slightly offset, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 邻行骰 `neighbor` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, two panels leaning toward each other, linked by a single fold, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 连记骰 `chain_note` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, ledger chain links inked along one edge, tally marks stacked in rows, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 拾荒骰 `scavenger` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, small coin scraps tucked into the creases, patched and re-glued paper, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 余响骰 `aftershock` · epic · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, layered folds, a small emblem and deeper shadows, fracture rings around a stopped die, a second tremor crease crossing the first, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 看客骰 `bystander` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, a quiet die with one edge slightly tapped, watching from the side, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 朝圣骰 `pilgrim` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, a dotted pilgrimage path winding across the panels toward one dark mark, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 壹面骰 `bias_one` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, one panel over-worn and burnished bright by thumbs, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 贰面骰 `bias_two` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, one panel inked deepest, a faint second panel showing through, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 叁面骰 `bias_three` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, one panel polished by constant touching, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 肆面骰 `bias_four` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, one panel with four raised corners, always landing first, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 伍面骰 `bias_five` · rare · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, one metallic ink accent and one embossed mark, one panel carved deepest into the paper, no numbers, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 陆面骰 `bias_six` · common · 无套组

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single six-sided die, aged parchment paper body with one distinctive fold, plain paper, a single accent fold, no metal, all six panels stamped with the same tiny geometric mark, one panel pressed deepest, floating three-quarter view, blank faces with no pips drawn, strong silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

> 点数母版：由 `tools/gen-art.mjs` 或代码绘制，不要用 AI 生成骰面，否则点数会错、概率会不可读。

## 4. 骰桶（19 只）

构图：一个开口朝上的骰桶，杯口略朝镜头，能看到内部阴影；不要画骰子。

### 旧橡木桶 `oak` · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a plain old oak dice cup, polished by countless hands, no ornament, just honest wear, plain paper, a single accent fold, no metal, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 铅心桶 `lead` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a heavy lead-weighted base, dull grey metal showing under worn wood, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 蛇纹桶 `serpent` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup wrapped in folded snake scales, one scale lifting at the rim, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 星象桶 `astral` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup engraved with a retrograde star chart, tiny constellation holes punched through, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 狼图腾桶 `wolf_totem` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup carved with a wolf totem, a tooth charm tied to the rim, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 恶魔契桶 `demon_pact` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup sealed with a demon contract, wax sigil and a torn signature strip, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 五芒桶 `pentagram` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a ritual cup with a pentagram scratched into the base, chalk dust in the grooves, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 旋涡桶 `vortex` · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a ritual cup spiralling inward, its rim folded like a whirlpool, faint gold inlay, gold-leaf inlay, ink-black core and a faint inner glow, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 鎏金桶 `gilded` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a gilded dice cup, gold leaf flaking at the rim to reveal dark wood, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 定一桶 `marker` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a single brass pin fixed inside, one notch in the rim, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 顺遂桶 `guide` · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup whose inner folds form a smooth guiding ramp, subtle silver line, gold-leaf inlay, ink-black core and a faint inner glow, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 增殖桶 `brood` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a small secondary pocket, one extra fold bulging at the side, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 独注桶 `singles` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a narrow dice cup made for a single die, one deep groove down the middle, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 当铺桶 `pawn` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a pawnshop dice cup with a brass ticket slot and a chalked price on the base, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 守夜桶 `nightwatch` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a small watchman's lantern hook and a half-burnt candle stub, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 引信桶 `fuse` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a paper fuse braided into the rim, scorched at one end, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 轮转桶 `rotation` · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a rotating inner ring, gear teeth folded from paper, one metallic ink accent and one embossed mark, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 双面桶 `twoface` · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup split into two mirrored halves, two rim openings facing opposite ways, gold-leaf inlay, ink-black core and a faint inner glow, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

### 借运桶 `loan` · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single dice cup, a dice cup with a moneylender's tally stick tied to it, debts notched into the wood, layered folds, a small emblem and deeper shadows, open rim facing the camera, visible inner shadow, empty cup with no dice, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 17:20 portrait composition
```

## 5. 物品（43 件）

构图：单件物品居中，略高于视线，能看清材质与磨损；主动物品可以有「正在被使用」的一瞬，被动物品保持静态。

### 幸运币 `lucky_coin` · active · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a worn gold coin, king's head on both sides, no choice in it, plain paper, a single accent fold, no metal, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 猎人印记 `hunter_mark` · active · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a hunter's paper mark with a wolf-claw stamp, red thread through one hole, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 魔术手套 `glove` · active · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a white magician's glove with a hidden second thumb folded inside the cuff, plain paper, a single accent fold, no metal, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 烟雾弹 `smoke` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a paper smoke bomb, clay cap, grey powder leaking from the seam, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 魔鬼的收据 `devil_reset` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a charred receipt with a devil's signature burned through the paper, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 赌徒护符 `charm` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a gambler's charm of bone and red cord, one eye scratched out, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 时间沙漏 `hourglass` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a paper hourglass with sand flowing upward, cracked glass folded from tracing paper, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 血契 `blood_contract` · active · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a blood-signed contract, iron-gall ink, a fingerprint pressed into the corner, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 烈酒 `courage` · active · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a squat liquor bottle with a blank paper label, liquid amber, cork half out, plain paper, a single accent fold, no metal, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 加注契约 `wager` · active · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a betting slip with one blank line left unsigned, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 幸运粉 `powder` · active · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a small paper packet of gold dust, torn corner, dust spilling, plain paper, a single accent fold, no metal, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 盐 `salt` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a paper twist of coarse salt, one pinch scattered at the corner, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 静默赦令 `boss_ward` · active · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a parchment decree, its single sentence scratched through, a crossed-out crown seal, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 史诗骰匣 `epic_chest` · active · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a small chest with a single breathing compartment, paper hinge, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双择骰函 `rare_pair` · active · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, two sealed letters tied together, one die-shaped bulge in each, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 镀金袖扣 `gold_cuff` · passive · common

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a gilded cufflink, gold worn thin at the edge, plain paper, a single accent fold, no metal, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 重铸器 `barrel_reforger` · passive · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a barrel reforging tool, two hoops driven into one stave, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双孔桶架 `shelf_barrel` · passive · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a two-hole barrel rack, fresh splinters around the second hole, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 丰饶骰袋 `dice_bag` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a deep dice bag, mouth wider than the bag looks, faint extra bulge inside, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 裂痕骰袋 `cracked_pouch` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a cracked dice pouch, one die missing, red thread stitching the tear, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 三层骰架 `shelf_dice` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a three-tier dice shelf, empty slots waiting, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 暗格货架 `shelf_item` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a shop shelf with a hidden compartment behind the back panel, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 夹层行囊 `active_shelf` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a travel pack with a thin inner pocket sewn into the lining, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 三环坠 `triple_charm` · passive · rare

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, three interlocked rings on a cord, the fourth link missing, one metallic ink accent and one embossed mark, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 顺风铃 `straight_bell` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a small wind bell, clapper angled forward, never looking back, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 四方印 `quad_seal` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a square paper seal stamped on all four corners, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 五指扣 `quint_clasp` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a five-finger clasp gripping a table edge, knuckles folded from paper, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 六芒冠 `sext_crown` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a six-rayed paper crown, gold ink at every point, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 天地盘 `heaven_plate` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a divination plate carved with heaven and earth, a die-sized gap in the middle, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 点金符 `pip_ward` · passive · epic

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a paper talisman with one and five pips inked in gold, layered folds, a small emblem and deeper shadows, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 鼠牙王冠 `rotfang_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a crown of rat teeth, one fang longer than the rest, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 停审令牌 `judge_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a judge's token, verdict chisel stopped mid-stroke, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双六骨 `twinsix_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a pair of six-pips carved into a single bone, two and six linked, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 抽头账簿 `toll_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a toll ledger with coins pressed into the spine, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 熔炉余烬 `soulsmith_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a still-glowing ember held in paper tongs, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 复写灰烬 `ashclerk_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a sheet of ash paper with a perfect duplicate impression, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 无冕金冠 `gildedking_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a crownless gold circlet, the setting empty, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 悬秤砣 `suspensor_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a hanging scale weight on a paper chain, never touching the ground, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 双倍镜片 `mirror_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a shard of mirror glass in a paper frame, reflecting the same scene twice, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 三证铜印 `startax_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a bronze seal with three witness marks, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 天使羽 `seraph_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a single white paper feather, faint gold edge, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 晨星角 `lucifer_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, a black morning-star horn, one crack glowing faintly, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

### 连理骨 `pairbane_relic` · passive · legendary

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, one single tabletop object, two bones fused at the joint, paired notches on both ends, gold-leaf inlay, ink-black core and a faint inner glow, product-shot angle, strong readable silhouette, isolated on a plain flat light grey studio backdrop, evenly lit, no scenery, no shadow on the wall, 1:1 composition
```

## 6. 纸张、特效与纹理

### 6.1 纸张底纹（`assets/paper/*.svg`）

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, a single sheet of aged parchment paper, subtle fiber grain, one soft fold and a slightly torn corner, no writing, flat even lighting, 8:5 landscape composition, no objects
```

### 6.2 炉火序列帧（`assets/art/fx/fire-*.svg`，4 帧）

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, a small paper-cut flame, 4-frame sprite sheet strip, same flame growing and flickering across the frames, warm orange and ember yellow, transparent-friendly plain background, evenly spaced frames, no text
```

### 6.3 骰面纹理（`assets/textures/dice/standard.png`）

```text
hand-drawn origami paper diorama, folded paper model with visible fibers and creases, slightly torn and frayed edges, colored-pencil and charcoal linework, muted aged-parchment palette, warm directional rim light, soft contact shadow, crisp silhouette, high detail, no text, no letters, no logo, no watermark, a flat unfolded cube net of paper dice faces, six blank square faces with paper fiber texture, no pips, no numbers, orthographic top view, 3:2 landscape, seamless paper tone
```

## 7. 不要用 AI 生成的部分

- 骰面点数、概率、任何数字与文字
- UI 图标、按钮、标签、结算公式
- 已经上线的角色立绘（另有 `docs/enemy-prompts.md`）
- 桌面中央的可玩区域：AI 容易画出误导性的划痕或图案，建议后期用矢量补
## 8. 接入清单

| 步骤 | 操作 |
|---|---|
| 1 | 按上表尺寸出图，物体类用浅灰底，脚本抠透明 |
| 2 | 骰子只保留 body，点数由程序绘制 |
| 3 | 落盘到对应 `assets/...` 路径，文件名沿用现有 id |
| 4 | `npm run typecheck && npm test && npm run build` |
| 5 | 本地起服务逐幕核对：第一幕到终幕的色板是否连续 |