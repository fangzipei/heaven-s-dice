// Heaven's Dice API — tiny dependency-light HTTP service backed by MySQL.
// Deployed next to the static release, proxied by Nginx at /heavens-dice/api/.
import http from 'node:http';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { calculateLuckIndex } from './luck-index.mjs';

const PORT = Number(process.env.PORT || 8787);
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'wanjie';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'wanjie';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const MAX_BODY = 8 * 1024 * 1024;

const pool = mysql.createPool({
  host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', decimalNumbers: true,
});

const validId = (value) => typeof value === 'string'
  && value.trim().length >= 2 && value.trim().length <= 24
  && /^[\p{L}\p{N}_-]+$/u.test(value.trim());

const scrypt = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scrypt(password, salt)}`;
}
function verifyPassword(password, stored) {
  const [kind, salt, digest] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !digest) return false;
  const actual = Buffer.from(scrypt(password, salt), 'hex');
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(text),
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

function fail(res, status, error) { json(res, status, { error }); }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('请求体过大。'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch { reject(Object.assign(new Error('请求不是有效 JSON。'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function accountFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const [rows] = await pool.query(
    `SELECT u.id, u.public_id, u.password_hash, u.created_at
       FROM hd_sessions s JOIN hd_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`, [sha256(token)],
  );
  return rows[0] || null;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO hd_sessions (token_hash, user_id, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(3), INTERVAL ? DAY))`, [sha256(token), userId, SESSION_DAYS],
  );
  return token;
}

async function register(req, res) {
  const body = await readBody(req);
  const id = String(body.id || '').trim();
  const password = String(body.password || '');
  if (!validId(id)) return fail(res, 400, '玩家 ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。');
  if (password.length < 4 || password.length > 128) return fail(res, 400, '密码需要 4–128 位。');
  const [existing] = await pool.query('SELECT id FROM hd_users WHERE public_id = ? LIMIT 1', [id]);
  if (existing.length) return fail(res, 409, '这个 ID 已经被注册，请换一个名字或使用密码登录。');
  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO hd_users (public_id, password_hash) VALUES (?, ?)', [id, hashPassword(password)],
    );
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return fail(res, 409, '这个 ID 已经被注册，请换一个名字或使用密码登录。');
    throw error;
  }
  const token = await createSession(result.insertId);
  return json(res, 201, { token, user: { id, hasPassword: true, createdAt: new Date().toISOString() } });
}

async function login(req, res) {
  const body = await readBody(req);
  const id = String(body.id || '').trim();
  const password = String(body.password || '');
  if (!validId(id) || !password) return fail(res, 400, '请输入玩家 ID 和密码。');
  const [rows] = await pool.query(
    'SELECT id, public_id, password_hash, created_at FROM hd_users WHERE public_id = ? LIMIT 1', [id],
  );
  const user = rows[0];
  if (!user) return fail(res, 401, 'ID 或密码不正确。');
  if (!user.password_hash) return fail(res, 409, '这个 ID 还没有设置密码；请在本机头像中设置密码。');
  if (!verifyPassword(password, user.password_hash)) return fail(res, 401, 'ID 或密码不正确。');
  const token = await createSession(user.id);
  return json(res, 200, {
    token,
    user: { id: user.public_id, hasPassword: true, createdAt: user.created_at },
  });
}

async function checkUsername(req, res) {
  const body = await readBody(req);
  const id = String(body.id || '').trim();
  if (!validId(id)) return fail(res, 400, '玩家 ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。');
  const [rows] = await pool.query(
    'SELECT public_id, password_hash FROM hd_users WHERE public_id = ? LIMIT 1', [id],
  );
  return json(res, 200, {
    exists: rows.length > 0,
    hasPassword: Boolean(rows[0]?.password_hash),
  });
}

async function claim(req, res) {
  const body = await readBody(req);
  const id = String(body.id || '').trim();
  if (!validId(id)) return fail(res, 400, '玩家 ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。');
  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO hd_users (public_id, password_hash) VALUES (?, NULL)', [id],
    );
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return fail(res, 409, '这个 ID 已经被占用，请换一个名字。');
    throw error;
  }
  const token = await createSession(result.insertId);
  return json(res, 201, {
    token,
    user: { id, hasPassword: false, createdAt: new Date().toISOString() },
  });
}

async function setPassword(req, res) {
  const user = await accountFromRequest(req);
  if (!user) return fail(res, 401, '登录已过期，请重新登录。');
  if (user.password_hash) return fail(res, 409, '这个 ID 已经设置过密码。');
  const body = await readBody(req);
  const password = String(body.password || '');
  if (password.length < 4 || password.length > 128) return fail(res, 400, '密码需要 4–128 位。');
  await pool.query('UPDATE hd_users SET password_hash = ? WHERE id = ?', [hashPassword(password), user.id]);
  return json(res, 200, {
    token: null,
    user: { id: user.public_id, hasPassword: true, createdAt: user.created_at },
  });
}

async function access(req, res) {
  const body = await readBody(req);
  const id = String(body.id || '').trim();
  const password = String(body.password || '');
  if (!validId(id)) return fail(res, 400, '玩家 ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。');
  if (password.length < 4 || password.length > 128) return fail(res, 400, '密码需要 4–128 位。');
  const [rows] = await pool.query(
    'SELECT id, public_id, password_hash, created_at FROM hd_users WHERE public_id = ? LIMIT 1', [id],
  );
  if (rows.length) {
    const user = rows[0];
    if (!user.password_hash) return fail(res, 409, '这个 ID 还没有设置密码；请在本机头像中设置密码。');
    if (!verifyPassword(password, user.password_hash)) return fail(res, 401, 'ID 或密码不正确。');
    const token = await createSession(user.id);
    return json(res, 200, {
      token, created: false,
      user: { id: user.public_id, hasPassword: true, createdAt: user.created_at },
    });
  }
  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO hd_users (public_id, password_hash) VALUES (?, ?)', [id, hashPassword(password)],
    );
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return fail(res, 409, '这个 ID 已经被注册，请换一个名字或使用密码登录。');
    throw error;
  }
  const token = await createSession(result.insertId);
  return json(res, 201, {
    token, created: true,
    user: { id, hasPassword: true, createdAt: new Date().toISOString() },
  });
}

async function me(req, res) {
  const user = await accountFromRequest(req);
  if (!user) return fail(res, 401, '登录已过期，请重新登录。');
  return json(res, 200, {
    user: { id: user.public_id, hasPassword: Boolean(user.password_hash), createdAt: user.created_at },
  });
}

function asDate(value, fallback) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : fallback;
}

async function saveRun(conn, userId, run) {
  if (!run || typeof run !== 'object' || typeof run.clientRunId !== 'string') {
    throw Object.assign(new Error('局记录缺少 clientRunId。'), { status: 400 });
  }
  const clientRunId = run.clientRunId.slice(0, 64);
  const [existing] = await conn.query(
    'SELECT id FROM hd_runs WHERE user_id = ? AND client_run_id = ? LIMIT 1', [userId, clientRunId],
  );
  if (existing.length) return existing[0].id;
  const result = ['win', 'loss', 'forfeit', 'abandoned'].includes(run.result) ? run.result : 'abandoned';
  const ended = asDate(run.endedAt, new Date());
  const durationMs = Math.max(0, Math.min(Number(run.durationMs) || 0, 7 * 24 * 3600 * 1000));
  const started = asDate(run.startedAt, new Date(ended.getTime() - durationMs));
  const summary = run.summary && typeof run.summary === 'object' ? run.summary : {};
  const levelReached = Math.max(1, Math.min(Number(run.levelReached) || 1, 25));
  const luckIndex = calculateLuckIndex({ ...run, result, levelReached, summary });
  const [inserted] = await conn.query(
    `INSERT INTO hd_runs
      (user_id, client_run_id, started_at, ended_at, duration_ms, result, level_reached,
       final_score, coins, retry_count, devil_paid, luck_index, summary, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, clientRunId, started, ended, durationMs, result, levelReached,
      Math.max(0, Number(run.finalScore) || 0), Math.max(0, Number(run.coins) || 0),
      Math.max(0, Number(run.retryCount) || 0), Math.max(0, Number(run.devilPaid) || 0),
      luckIndex, JSON.stringify(summary), JSON.stringify(run)],
  );
  const runId = inserted.insertId;
  const levels = Array.isArray(run.levels) ? run.levels : [];
  for (const level of levels) {
    const levelNo = Math.max(1, Math.min(Number(level.level) || 1, 25));
    await conn.query(
      `INSERT INTO hd_run_levels
        (run_id, level, opponent, table_name, target, score, started_at, ended_at, loadout, throws)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), loadout = VALUES(loadout), throws = VALUES(throws)`,
      [runId, levelNo, String(level.opponent || '').slice(0, 64), String(level.table || '').slice(0, 64),
        Math.max(0, Number(level.target) || 0), Math.max(0, Number(level.score) || 0),
        asDate(level.startedAt, started), level.endedAt ? asDate(level.endedAt, ended) : null,
        JSON.stringify(level.loadout || {}), JSON.stringify(Array.isArray(level.throws) ? level.throws : [])],
    );
    for (const choice of Array.isArray(level.shop) ? level.shop : []) {
      await conn.query(
        `INSERT INTO hd_shop_choices
          (run_id, level, action, kind, item_id, item_name, price, coins_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [runId, levelNo, String(choice.action || '').slice(0, 24), String(choice.kind || '').slice(0, 16),
          String(choice.id || '').slice(0, 48), String(choice.name || '').slice(0, 64),
          choice.price == null ? null : Number(choice.price), Number(choice.coinsAfter) || 0],
      );
    }
  }
  return runId;
}

async function saveRunRequest(req, res, batch = false) {
  const user = await accountFromRequest(req);
  if (!user) return fail(res, 401, '登录已过期，请重新登录。');
  const body = await readBody(req);
  const runs = batch ? body.runs : [body.run];
  if (!Array.isArray(runs) || !runs.length) return fail(res, 400, '缺少局记录。');
  if (runs.length > 10) return fail(res, 413, '一次最多同步 10 局。');
  const ids = [];
  for (const run of runs) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      ids.push(await saveRun(conn, user.id, run));
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally { conn.release(); }
  }
  return json(res, 200, { ok: true, ids });
}

async function history(req, res, url) {
  const user = await accountFromRequest(req);
  if (!user) return fail(res, 401, '登录已过期，请重新登录。');
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 50, 100));
  const [rows] = await pool.query(
    `SELECT client_run_id AS clientRunId, started_at AS startedAt, ended_at AS endedAt,
            duration_ms AS durationMs, result, level_reached AS levelReached,
            final_score AS finalScore, coins, retry_count AS retryCount, devil_paid AS devilPaid, payload, summary
       FROM hd_runs WHERE user_id = ? ORDER BY ended_at DESC LIMIT ?`,
    [user.id, limit],
  );
  const runs = rows.map((row) => {
    const payload = parseJson(row.payload, {});
    const levels = Array.isArray(payload.levels) ? payload.levels : [];
    const last = levels[levels.length - 1] || {};
    return {
      clientRunId: row.clientRunId,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      durationMs: Number(row.durationMs) || 0,
      result: row.result,
      levelReached: Number(row.levelReached) || 1,
      finalScore: Number(row.finalScore) || 0,
      coins: Number(row.coins) || 0,
      retryCount: Number(row.retryCount) || 0,
      devilPaid: Number(row.devilPaid) || 0,
      loadout: last.loadout || { dice: [], barrel: 'oak', activeItems: [], passiveItems: [] },
      summary: parseJson(row.summary, {}),
    };
  });
  return json(res, 200, { runs });
}

async function leaderboards(req, res, url) {
  const board = url.searchParams.get('board') === 'luck' ? 'luck' : 'time';
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 20, 50));
  const order = board === 'luck'
    ? 'r.luck_index DESC, r.ended_at ASC'
    : 'r.duration_ms ASC, r.ended_at ASC';
  const where = board === 'time' ? "WHERE r.result = 'win'" : '';
  const [rows] = await pool.query(
    `SELECT u.public_id AS userId, r.duration_ms AS durationMs, r.level_reached AS levelReached,
            r.final_score AS finalScore, r.coins, r.luck_index AS luckIndex,
            r.result, r.ended_at AS endedAt
       FROM hd_runs r JOIN hd_users u ON u.id = r.user_id
       ${where} ORDER BY ${order} LIMIT ?`, [limit],
  );
  return json(res, 200, { board, rows: rows.map((row, index) => ({ ...row, rank: index + 1 })) });
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

async function entityStats(req, res, url) {
  const kind = ['die', 'barrel', 'item'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : 'die';
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 50, 100));
  const [rows] = await pool.query(
    `SELECT l.loadout, l.score, l.level, r.result
       FROM hd_run_levels l JOIN hd_runs r ON r.id = l.run_id`,
  );
  const stats = new Map();
  for (const row of rows) {
    const loadout = parseJson(row.loadout, {});
    const add = (id) => {
      if (!id) return;
      const current = stats.get(id) || { id, uses: 0, levels: 0, wins: 0, score: 0 };
      current.uses += 1;
      current.levels += 1;
      current.score += Number(row.score) || 0;
      if (row.result === 'win') current.wins += 1;
      stats.set(id, current);
    };
    if (kind === 'die') {
      for (const id of Array.isArray(loadout.dice) ? loadout.dice : []) add(id);
    } else if (kind === 'barrel') {
      add(loadout.barrel);
    } else {
      [...(Array.isArray(loadout.activeItems) ? loadout.activeItems : []),
        ...(Array.isArray(loadout.passiveItems) ? loadout.passiveItems : [])].forEach(add);
    }
  }
  const output = [...stats.values()].map((item) => ({
    id: item.id,
    uses: item.uses,
    levels: item.levels,
    wins: item.wins,
    avgScore: item.levels ? Math.round(item.score / item.levels) : 0,
    winRate: item.levels ? Math.round((item.wins / item.levels) * 1000) / 10 : 0,
  })).sort((a, b) => b.uses - a.uses).slice(0, limit);
  return json(res, 200, { kind, rows: output });
}

async function summary(req, res) {
  const [[counts]] = await pool.query(
    `SELECT COUNT(*) AS runs, COUNT(DISTINCT user_id) AS users,
            SUM(result = 'win') AS wins, SUM(result = 'loss') AS deaths,
            ROUND(AVG(duration_ms)) AS avgDurationMs
       FROM hd_runs`,
  );
  return json(res, 200, { counts });
}

async function activeSaveUser(req, res) {
  const user = await accountFromRequest(req);
  if (!user) { fail(res, 401, '请先登录。'); return null; }
  if (!user.password_hash) { fail(res, 403, '只有设置密码的账号才能同步未完成对局。'); return null; }
  return user;
}

async function getActiveSave(req, res) {
  const user = await activeSaveUser(req, res);
  if (!user) return;
  const [rows] = await pool.query(
    'SELECT client_run_id, saved_at, run, record FROM hd_active_runs WHERE user_id = ? LIMIT 1',
    [user.id],
  );
  if (!rows.length) return json(res, 200, { save: null });
  const row = rows[0];
  const parse = (value) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return null; }
  };
  return json(res, 200, {
    save: {
      savedAt: new Date(row.saved_at).getTime(),
      clientRunId: row.client_run_id,
      run: parse(row.run),
      record: parse(row.record),
    },
  });
}

async function putActiveSave(req, res) {
  const user = await activeSaveUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const savedAt = Number(body.savedAt);
  const run = body.run;
  const record = body.record && typeof body.record === 'object' ? body.record : null;
  if (!Number.isFinite(savedAt) || !run || typeof run !== 'object' || !run.level) {
    return fail(res, 400, '未完成对局数据不完整。');
  }
  const clientRunId = String(body.clientRunId || record?.clientRunId || '').slice(0, 64);
  if (!clientRunId) return fail(res, 400, '未完成对局缺少 clientRunId。');
  await pool.query(
    `INSERT INTO hd_active_runs (user_id, client_run_id, saved_at, run, record)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       client_run_id = IF(VALUES(saved_at) >= saved_at, VALUES(client_run_id), client_run_id),
       run = IF(VALUES(saved_at) >= saved_at, VALUES(run), run),
       record = IF(VALUES(saved_at) >= saved_at, VALUES(record), record),
       saved_at = GREATEST(saved_at, VALUES(saved_at))`,
    [user.id, clientRunId, new Date(savedAt), JSON.stringify(run), record ? JSON.stringify(record) : null],
  );
  return json(res, 200, { ok: true });
}

async function deleteActiveSave(req, res) {
  const user = await activeSaveUser(req, res);
  if (!user) return;
  await pool.query('DELETE FROM hd_active_runs WHERE user_id = ?', [user.id]);
  return json(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
      return res.end();
    }
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'GET' && path === '/config') {
      const [rows] = await pool.query(
        'SELECT difficulty_multiplier, level_targets FROM hd_game_config WHERE id = 1 LIMIT 1',
      );
      const row = rows[0] || {};
      let targets = row.level_targets;
      if (typeof targets === 'string') {
        try { targets = JSON.parse(targets); } catch { targets = null; }
      }
      return json(res, 200, {
        difficultyMultiplier: Number(row.difficulty_multiplier ?? 1) || 1,
        levelTargets: targets && typeof targets === 'object' ? targets : {},
      });
    }
    if (req.method === 'GET' && path === '/health') {
      await pool.query('SELECT 1');
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && path === '/check-username') return await checkUsername(req, res);
    if (req.method === 'POST' && path === '/claim') return await claim(req, res);
    if (req.method === 'POST' && path === '/password') return await setPassword(req, res);
    if (req.method === 'POST' && path === '/account') return await access(req, res);
    if (req.method === 'POST' && path === '/register') return await register(req, res);
    if (req.method === 'POST' && path === '/login') return await login(req, res);
    if (req.method === 'GET' && path === '/me') return await me(req, res);
    if (req.method === 'POST' && path === '/runs') return await saveRunRequest(req, res, false);
    if (req.method === 'POST' && path === '/runs/batch') return await saveRunRequest(req, res, true);
    if (req.method === 'GET' && path === '/active-run') return await getActiveSave(req, res);
    if (req.method === 'POST' && path === '/active-run') return await putActiveSave(req, res);
    if (req.method === 'DELETE' && path === '/active-run') return await deleteActiveSave(req, res);
    if (req.method === 'GET' && path === '/history') return await history(req, res, url);
    if (req.method === 'GET' && path === '/leaderboards') return await leaderboards(req, res, url);
    if (req.method === 'GET' && path === '/stats/entities') return await entityStats(req, res, url);
    if (req.method === 'GET' && path === '/stats/summary') return await summary(req, res);
    return fail(res, 404, 'Not found');
  } catch (error) {
    console.error(new Date().toISOString(), req.method, req.url, error?.stack || error);
    return fail(res, error?.status || 500, error?.status ? error.message : '服务器内部错误。');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`heavens-dice-api listening on 127.0.0.1:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
}
