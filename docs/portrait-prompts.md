# Boss / 小兵四态立绘提示词

适用目标：**折纸手绘风、透明背景、正面朝向镜头、同一角色四态一致**。

生成建议：先做 `idle` 作为角色基准图，再把基准图作为参考图生成 `attack / hit / critical`。不要每张独立重新设计角色。

---

## 1. 通用母提示词

每张图先放这一段，再追加角色和状态。

```text
full-body character concept art, one single character, hand-drawn origami paper puppet, folded paper sculpture, visible paper fibers and creases, layered folded-paper armor and clothing, slightly torn and frayed paper edges, colored-pencil and charcoal linework, muted parchment and ink palette, dramatic warm rim light, sharp silhouette, centered composition, facing the viewer directly, front view, eye level, head-to-toe full body visible, generous empty margin, isolated on a transparent background, PNG alpha, no scenery, no floor, no cast shadow, no border, no text, no logo, no watermark, high detail, crisp edges, 3:4 vertical composition
```

## 2. 通用负面提示词

```text
photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cute, cartoon mascot, soft plush, watercolor wash, blurred, low contrast, background scenery, room, table, floor, frame, text, letters, logo, watermark, multiple characters, duplicate body, extra limbs, extra fingers, cropped head, cropped feet, out of frame, deformed face, asymmetrical eyes, melted paper, flat unlit, oversaturated neon
```

## 3. 四态追加词

### 常态 / idle

```text
idle state, neutral standing pose, weight settled, shoulders relaxed but dominant, hands low and open, calm threatening expression, direct eye contact with viewer, paper folds clean and intact, restrained posture, full character visible
```

### 攻击 / attack

```text
attack state, sudden forward lunge toward the viewer, one arm or signature weapon thrust forward, paper cloak and shoulder folds flaring open, body stretched along the attack line, sharp edges catching the rim light, mouth open in a snarl, aggressive downward brow, dynamic but still readable silhouette, both feet grounded, full character visible
```

### 被攻击 / hit

```text
hit state, violent recoil away from the impact, torso bent and twisted, head snapped back, one arm raised to guard, paper surface crumpled and torn at the impact side, a few loose paper shards flying off, cracked fold lines, pained snarl, damaged but still recognizable, facing the viewer, full character visible
```

### 残血 / critical

```text
critical state, half-kneeling or one knee buckled, one hand braced on the ground, body badly torn and crumpled, exposed inner fold in dark red or charcoal, cracked mask or face plate, one eye still glowing with defiant rage, ragged breathing, loose paper fibers and small torn scraps around the body, desperate but still dangerous, facing the viewer, full character visible
```

### Boss 额外威压

```text
boss version, 1.35x taller and broader silhouette than the minion, heavier layered paper folds, high jagged collar, crown or horn-like folded crest, longer claws, sharper shoulder spikes, richer dark accent color, more ornate paper armor, low menacing brow, visual weight concentrated in the shoulders and hands, clearly the commander of the paired minion
```

### 小兵简化

```text
minion version, 0.7x height of the boss, simpler silhouette, fewer paper layers, rounder body mass, shorter limbs, one signature sharp detail only, muted accent color, subordinate stance, no crown, no elaborate weapon, clearly smaller and lower in hierarchy than the boss
```

## 4. 角色分组

游戏实际只有 5 个小兵，按牌桌章节归属；Boss 按主题复用对应小兵作为“同组配角”。

| 组 | 小兵 | Boss |
|---|---|---|
| 鼠群 | 灰爪 `minion-rat` | 腐牙伯爵、双六赌徒、成双之忌 |
| 石庭 | 石砾 `minion-gargoyle` | 石心审判官 |
| 熔炉 | 炭手 `minion-forge` | 铁面铸魂师、灰烬书记官 |
| 王庭 | 鎏金侍从 `minion-gilt` | 金冠赌王、星辉税吏、抽头鬼 |
| 天穹 | 棱翼执事 `minion-crystal` | 悬秤人、钻石天使、路西法、双倍镜、撒旦 |

## 5. 角色视觉卡

### Boss

| 角色 | 轮廓与标志物 | 锐利/威胁部位 | 主色 |
|---|---|---|---|
| 腐牙伯爵 `boss-rat` | 鼠王，破旧高领斗篷，纸鼠群从衣摆探出，牙齿王冠 | 长獠牙、钩爪、锯齿状鼠牙冠、尖锐尾骨 | 暗红 `#c25b5b` |
| 石心审判官 `boss-stone` | 石质法官，蒙眼石面，天平与法槌，方肩 | 石片棱角、法槌尖角、锁骨处的石刺 | 冷蓝灰 `#9ab9c4` |
| 铁面铸魂师 `boss-iron` | 铁面具，熔炉围裙，巨锤与铁钳，肩部铁砧 | 锤尖、钳口、面具裂缝里的熔光 | 熔橙 `#e07d4d` |
| 灰烬书记官 `boss-ash` | 烧焦书记官，灰烬账本，羽毛笔，纸页披风 | 笔尖、烧焦纸页边缘、锁骨处的炭刺 | 焦橙 `#d98a56` |
| 金冠赌王 `boss-gold` | 金冠，红丝绒长袍，纸牌扇，金币肩甲 | 冠齿、纸牌切边、金色指爪 | 旧金 |
| 星辉税吏 `boss-tax` | 星图面罩，算盘与税册，星辉披风 | 星形尖刺、算珠轨道、细长指爪 | 星蓝银 |
| 悬秤人 `boss-scale` | 悬浮天平，细长四肢，破碎秤盘 | 秤钩、尖锐秤梁、悬空纸片 | 灰紫 |
| 钻石天使 `boss-diamond` | 钻石棱面天使，四片晶翼，冷白长袍 | 晶翼尖端、棱面手指、胸口钻石裂口 | 冰白/冷蓝 |
| 路西法 `boss-seraph` | 晨星，破损光环，黑红羽翼，长矛 | 断光环尖、矛尖、翼骨钩刺 | 黑红 |
| 双六赌徒 `boss-rat` | 双头赌徒轮廓，骰子肩甲，两把短刃 | 骰子尖角、双刃、露齿笑 | 血红/骨白 |
| 抽头鬼 `boss-gold` | 收税鬼，金币眼，账簿，钩状手 | 钩手、金币边缘、尖帽 | 暗金 |
| 双倍镜 `boss-scale` | 镜面人，镜像残影，碎裂镜盾 | 镜片尖角、倒影中的第二张脸 | 银白/冷灰 |
| 成双之忌 `boss-scale` | 双身连体，双头，剪刀/双刃 | 两把交错的刀刃、成对獠牙 | 暗红/黑 |
| 撒旦 `boss-satan` | 最终魔王，巨大角冠，破损黑翼，王座碎片 | 角尖、翼爪、胸口裂开的熔岩折缝 | 黑/熔红 |

### 小兵

| 角色 | 轮廓与标志物 | 锐利/威胁部位 | 主色 |
|---|---|---|---|
| 灰爪 `minion-rat` | 小老鼠仆，破围裙，蜡烛，纸鼠尾 | 小獠牙、爪尖、烛火剪影 | 暗红 |
| 石砾 `minion-gargoyle` | 小石像鬼，短翼，蒙眼石面 | 石翼尖、短角、石爪 | 冷蓝灰 |
| 炭手 `minion-forge` | 熔炉学徒，皮围裙，火钳，炭黑双手 | 火钳尖、炭手裂纹 | 熔橙 |
| 鎏金侍从 `minion-gilt` | 瘦长侍从，金托盘，礼帽，金币 | 托盘边缘、尖帽、金属指节 | 旧金 |
| 棱翼执事 `minion-crystal` | 小天使执事，棱晶短翼，抄录册 | 晶翼尖、羽毛笔尖 | 冰白/青 |

## 6. 拼装示例

### 腐牙伯爵 · 常态

```text
[通用母提示词] + [常态追加词] + [Boss 额外威压] + 腐牙伯爵：鼠王，破旧高领斗篷，纸鼠群从衣摆探出，锯齿鼠牙王冠，长獠牙，钩爪，暗红与骨白纸面，尖锐尾骨，正面全身，透明背景
```

### 腐牙伯爵 · 攻击

```text
[通用母提示词] + [攻击追加词] + [Boss 额外威压] + 腐牙伯爵：向前扑击，斗篷和鼠群纸片一起炸开，长獠牙外露，钩爪前伸，鼠牙王冠压低，暗红纸面被拉伸，正面全身，透明背景
```

### 腐牙伯爵 · 受击

```text
[通用母提示词] + [被攻击追加词] + [Boss 额外威压] + 腐牙伯爵：被击中后仰，斗篷一侧撕裂，鼠牙王冠崩掉一角，纸鼠四散，獠牙仍咬紧，正面全身，透明背景
```

### 腐牙伯爵 · 残血

```text
[通用母提示词] + [残血追加词] + [Boss 额外威压] + 腐牙伯爵：单膝跪地，鼠牙王冠断裂，斗篷烧焦，胸口露出暗红内折，一只眼仍发红光，纸鼠群护在脚边，正面全身，透明背景
```

### 灰爪 · 常态

```text
[通用母提示词] + [常态追加词] + [小兵简化] + 灰爪：小老鼠仆，破围裙，短蜡烛，纸鼠尾，小獠牙，暗红纸面，姿态恭敬但眼神阴冷，正面全身，透明背景
```

### 灰爪 · 攻击

```text
[通用母提示词] + [攻击追加词] + [小兵简化] + 灰爪：扑向镜头，爪子前伸，蜡烛火焰拉成长条，围裙纸片翻起，小獠牙全露，正面全身，透明背景
```

### 灰爪 · 受击

```text
[通用母提示词] + [被攻击追加词] + [小兵简化] + 灰爪：被踢翻，身体蜷缩，蜡烛脱手，纸尾折断，围裙撕裂，正面全身，透明背景
```

### 灰爪 · 残血

```text
[通用母提示词] + [残血追加词] + [小兵简化] + 灰爪：趴在地上，耳朵撕裂，蜡烛只剩火星，纸尾断成两截，仍抬头龇牙，正面全身，透明背景
```

## 7. 输出与验收

- 先出 `idle`，确认角色轮廓、配色、标志物
- 再用同一参考图生成另外三态
- 四态必须保持：头身比、肢体数量、服装层数、主色、标志物
- 透明背景必须检查 alpha，不要留桌面/墙面/阴影
- Boss 至少比自己的小兵高 **1.3 倍**、肩宽更宽
- Boss 的尖锐部位至少 3 处：冠/角、肩、爪/武器、尾/翼
- 小兵只保留 1 个尖锐特征，避免抢 Boss 的视觉层级
- 生成尺寸建议 **1024×1024 或 1536×1536**，后期统一裁成 **480×640**，再生成 **120×160** 缩略图
- 文件名使用：

```text
assets/portraits/paper/states/<art>/idle.png
assets/portraits/paper/states/<art>/attack.png
assets/portraits/paper/states/<art>/hit.png
assets/portraits/paper/states/<art>/critical.png
```
