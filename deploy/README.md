# 服务器发布记录

## 当前线上地址

- **游戏**：<http://221.228.10.210:9999/heavens-dice/>
- **健康检查**：<http://221.228.10.210:9999/heavens-dice/healthz>
- **服务器**：`221.228.10.210`（Rocky Linux 8.10）
- **Web 服务器**：Nginx，监听 `9999`
- **静态目录**：`/var/www/heavens-dice/current`
- **当前 release**：`/var/www/heavens-dice/releases/20261027-1000`

## 发布模型（Vite 构建）

架构重构后，线上不再直接部署仓库根目录。发布的是 **Vite 构建产物 `dist/`**：

- `npm run build` 输出 `dist/index.html` 和 `dist/assets/*`。
- `vite.config.js` 设置 `base: './'`，所有资源使用相对 URL，可挂在 `/heavens-dice/` 子路径。
- 根目录的 `assets/` 由 `copyRootAssets()` 复制进 `dist/assets/`，运行时 SVG 路径（`assets/...`）保持可用。
- `vendor/` 从 `public/vendor/` 注入 `dist/vendor/`，用于离线 GSAP。
- `dist/` 是构建产物，不提交到 Git。

**不要**再把根目录的 `index.html`、`src/`、`css/` 打进 release；它们只是开发源码。

## 为什么不是 80 端口

这台服务器的 80/443 在阿里云安全组未放行，且服务器现有运维记录明确保持 80/443 关闭。
现有 `9999` 端口已放行，并运行着另一个静态站点，因此本次发布：

- 保留 `http://221.228.10.210:9999/` 原有站点；
- 在 `9999` 上新增独立路径 `/heavens-dice/`；
- 不对根路径做任何改写。

80 端口的独立 Nginx 站点已经配置好（`/etc/nginx/conf.d/heavens-dice.conf`，`listen 80 default_server`），服务器本机访问 `http://127.0.0.1/` 也是 200。当前唯一的外网障碍是阿里云安全组：在 **ECS → 安全组 → 入方向** 放行 `TCP 80`（来源按需填 `0.0.0.0/0`）后，`http://221.228.10.210/` 即可直接访问，无需改代码。

## Nginx 配置

共享配置片段：

```text
/etc/nginx/heavens-dice-location.conf
```

它通过以下一行被挂到现有 9999 站点：

```nginx
include /etc/nginx/heavens-dice-location.conf;
```

当前规则对 `/heavens-dice/index.html` 使用 `no-store`，其余 `/heavens-dice/` 静态资源使用 1 小时缓存；Vite 生成的文件带 content hash，更新 `index.html` 即可切换新 bundle。

修改后验证并重载：

```bash
nginx -t
systemctl reload nginx
```

## 更新发布

### 1. 本地构建

```powershell
npm ci
npm test
npm run build
```

构建后检查：

```powershell
Get-Content dist/index.html | Select-Object -First 20
```

`index.html` 里的脚本、样式和 favicon 必须是 `./assets/...` 相对路径，不能是 `/assets/...`。

### 2. 只打包 dist 内容

```powershell
New-Item -ItemType Directory -Force .deploy | Out-Null
tar -czf .deploy/heavens-dice-web.tar.gz -C dist .
scp .deploy/heavens-dice-web.tar.gz root@221.228.10.210:/tmp/heavens-dice-web.tar.gz
```

### 3. 服务器解包并切换 current

```bash
release=/var/www/heavens-dice/releases/$(date +%Y%m%d-%H%M)
install -d -m 755 "$release"
tar -xzf /tmp/heavens-dice-web.tar.gz -C "$release"
chown -R root:root "$release"
find "$release" -type d -exec chmod 755 {} +
find "$release" -type f -exec chmod 644 {} +
ln -sfn "$release" /var/www/heavens-dice/current
rm -f /tmp/heavens-dice-web.tar.gz
nginx -t && systemctl reload nginx
```

### 4. 验活

```bash
curl -fsS http://127.0.0.1:9999/heavens-dice/healthz
readlink -f /var/www/heavens-dice/current
```

浏览器打开 `/heavens-dice/`，确认：

- 页面能加载 `assets/index-*.js` 与 `assets/index-*.css`；
- 刷新后不出现旧 bundle；
- `index.html` 响应头为 `Cache-Control: no-store`。
