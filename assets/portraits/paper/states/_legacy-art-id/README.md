# 旧 art id 目录（运行时已停用）

这里的图是早期按 **art id** 建目录时留下的：

- `boss-rat/` —— 腐牙伯爵 / 双六赌徒共用，最早只生成了 `idle`
- `minion-rat/` —— 灰爪，四态齐全

运行时不再引用它们：四态取图改为按**角色 id（slug）**解析，
见 `src/render/portrait-states.ts` 的 `portraitStateArt()`。
`boss-rat` / `minion-rat` 对应的现行目录是 `../rotfang/`、`../twinsix/`、`../rat/`。

文件保留备查，不要删除。
