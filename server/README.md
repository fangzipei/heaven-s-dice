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
DB_USER=heavens_dice
DB_PASSWORD=...
DB_NAME=heavens_dice
SESSION_DAYS=30
```

Heaven's Dice uses a dedicated `heavens_dice` database and `heavens_dice`
MySQL user; it has no privileges on the other application's `wanjie` database.
Apply `schema.sql` once:

```bash
mysql -uheavens_dice -p heavens_dice < schema.sql
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
| POST | `/check-username` | — | `{id}` → `{exists,hasPassword}` |
| POST | `/claim` | — | `{id}` create a passwordless local account and reserve the ID |
| POST | `/password` | Bearer | set the first password for a claimed account |
| POST | `/account` | — | `{id,password}` login existing or create unique account |
| POST | `/register` | — | `{id,password}` create unique sync account |
| POST | `/login` | — | `{id,password}` issue token |
| GET | `/me` | Bearer | current account |
| POST | `/runs` | Bearer | upload one finished run |
| POST | `/runs/batch` | Bearer | upload up to 10 finished runs |
| GET | `/history?limit=50` | Bearer | own finished runs with final loadout |
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
