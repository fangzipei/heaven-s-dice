# 状态立绘预留目录

每个角色一个子目录，目录名使用该角色的 `art` ID：

```text
assets/portraits/paper/states/<art>/
  idle.png
  attack.png
  hit.png
  critical.png
  thumb-idle.png       # 可选，120×160
  thumb-attack.png
  thumb-hit.png
  thumb-critical.png
```

## 规格

- 详情图：**480×640**，透明背景，人物底部对齐
- 缩略图：**120×160**
- 推荐源图：1024×1024 或更高，导入后统一缩放
- 至少四态：常态、攻击、受击、残血
- 未提供状态图时，界面回退到 `assets/portraits/paper/<art>.svg`

## 命名示例

```text
assets/portraits/paper/states/minion-rat/idle.png
assets/portraits/paper/states/minion-rat/attack.png
assets/portraits/paper/states/minion-rat/hit.png
assets/portraits/paper/states/minion-rat/critical.png
```

Boss 和小兵共用这套目录规则。

## 已预留的角色目录

- `boss-rat/`
- `boss-stone/`
- `boss-iron/`
- `boss-ash/`
- `boss-gold/`
- `boss-tax/`
- `boss-scale/`
- `boss-diamond/`
- `boss-seraph/`
- `boss-satan/`
- `minion-rat/`
- `minion-gargoyle/`
- `minion-forge/`
- `minion-gilt/`
- `minion-crystal/`
