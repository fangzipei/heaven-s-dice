# 服务器发布记录

## 当前线上地址

- **游戏**：<http://221.228.10.210:9999/heavens-dice/>
- **健康检查**：<http://221.228.10.210:9999/heavens-dice/healthz>
- **服务器**：`221.228.10.210`（Rocky Linux 8.10）
- **Web 服务器**：Nginx，监听 `9999`
- **静态目录**：`/var/www/heavens-dice/current`
- **当前 release**：`/var/www/heavens-dice/releases/20261026-1155`

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

修改后验证并重载：

```bash
nginx -t
systemctl reload nginx
```

## 更新发布

本地打包：

```powershell
tar -czf .deploy/heavens-dice.tar.gz index.html assets css src
scp .deploy/heavens-dice.tar.gz root@221.228.10.210:/tmp/heavens-dice.tar.gz
```

服务器解包并切换 `current` 软链接：

```bash
release=/var/www/heavens-dice/releases/$(date +%Y%m%d-%H%M)
install -d -m 755 "$release"
tar -xzf /tmp/heavens-dice.tar.gz -C "$release"
chown -R root:root "$release"
find "$release" -type d -exec chmod 755 {} +
find "$release" -type f -exec chmod 644 {} +
ln -sfn "$release" /var/www/heavens-dice/current
rm -f /tmp/heavens-dice.tar.gz
nginx -t && systemctl reload nginx
```

> `index.html` 使用相对路径引用 `assets/`、`css/`、`src/`，因此可以安全地放在 `/heavens-dice/` 子路径下。
