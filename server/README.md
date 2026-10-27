# Heaven's Dice API

Node 22 + MySQL 8 service for accounts, run history and leaderboards.

## Install on the game server

```bash
install -d /opt/heavens-dice-api
tar -xzf hd-api.tar.gz -C /opt/heavens-dice-api
cd /opt/heavens-dice-api
npm install --omit=dev
```

`.env` (never commit this file):

```
PORT=8787
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=wanjie
DB_PASSWORD=...
DB_NAME=wanjie
SESSION_DAYS=30
```

The tables live in the existing `wanjie` database with the `hd_` prefix. Apply
`schema.sql` once:

```bash
mysql -uwanjie -p wanjie < schema.sql
```

systemd unit:

```ini
[Unit]
Description=Heaven's Dice API
After=network.target mysqld.service

[Service]
Type=simple
WorkingDirectory=/opt/heavens-dice-api
ExecStart=/usr/bin/node --env-file=/opt/heavens-dice-api/.env /opt/heavens-dice-api/index.mjs
Restart=always
RestartSec=3
User=root
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now heavens-dice-api
```

Nginx proxies `/heavens-dice/api/` to `127.0.0.1:8787` via
`deploy/nginx-api-location.conf`. Keep that location before the generic
`/heavens-dice/` static alias.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | DB ping |
| POST | `/account` | — | `{id,password}` login existing or create unique account |
| POST | `/register` | — | `{id,password}` create unique sync account |
| POST | `/login` | — | `{id,password}` issue token |
| GET | `/me` | Bearer | current account |
| POST | `/runs` | Bearer | upload one finished run |
| POST | `/runs/batch` | Bearer | upload up to 10 finished runs |
| GET | `/leaderboards?board=time\|luck` | — | speed / misfortune boards |
| GET | `/stats/entities?kind=die\|barrel\|item` | — | loadout strength aggregates |
| GET | `/stats/summary` | — | run/user totals |

Passwords use scrypt; bearer tokens are random and only their SHA-256 hashes
are stored. `client_run_id` is unique per user, so retried syncs are idempotent.

## Data recorded

Each `hd_runs` row stores the complete `payload` JSON plus summary fields.
`hd_run_levels` stores per-level loadout, target, score, timestamps and the full
throws array (dice values, selected dice, combo labels, action, points, bust).
`hd_shop_choices` stores every refresh/buy/sell/leave action. This is enough to
recompute die, barrel and item strength without replaying the game.
