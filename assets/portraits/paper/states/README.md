# 状态立绘目录

每个角色一个子目录，目录名使用该角色的**角色 id（slug）**，而不是 art id：

```text
assets/portraits/paper/states/<slug>/
  idle.png
  attack.png
  hit.png
  critical.png
  thumb-idle.png       # 可选，120×160
  thumb-attack.png
  thumb-hit.png
  thumb-critical.png
```

> 目录用 slug 而非 art id，是因为多个角色共用同一个 art id
> （`boss-rat` 同时是腐牙伯爵和双六赌徒），按 art id 分目录会互相覆盖。
> 取图路径见 `src/render/portrait-states.ts` 的 `portraitStateArt()`。

## 规格

- 详情图：**480×640**，透明背景，人物底部对齐
- 缩略图：**120×160**
- 推荐源图：1024×1024 或更高，导入后统一缩放
- 至少四态：常态、攻击、受击、残血
- 未提供状态图时，界面回退到 `assets/portraits/paper/<art>.svg`

## 命名示例

```text
assets/portraits/paper/states/rotfang/idle.png
assets/portraits/paper/states/rotfang/attack.png
assets/portraits/paper/states/rotfang/hit.png
assets/portraits/paper/states/rotfang/critical.png
```

Boss 和小兵共用这套目录规则。

## 已就位的角色目录（19 个）

Boss：`rotfang`、`twinsix`、`judge`、`soulsmith`、`ashclerk`、`gildedking`、`toll`、
`startax`、`suspensor`、`mirror`、`pairbane`、`seraph`、`lucifer`、`satan`

小兵：`gargoyle`、`forge`、`gilt`、`crystal`、`rat`

对应的美术母版、原始生成图与四态拼图见 `vibe_images/characters/<slug>/`。

## `_legacy-art-id/`

早期按 art id 建目录时留下的旧图，运行时**不再引用**（取图已改为按 slug）。
文件保留备查，不要删除。
