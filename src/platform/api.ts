// platform/api.ts — 与 /heavens-dice/api 通信。开发时由 Vite 代理，线上由 Nginx 代理。
import type { RunRecord } from './run-record.ts';

const API_BASE = './api';

export interface ApiAccount {
  id: string;
  hasPassword: boolean;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: ApiAccount;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  durationMs: number;
  levelReached: number;
  finalScore: number;
  coins: number;
  luckIndex: number;
  result: string;
  endedAt: string;
}

export interface EntityStat {
  id: string;
  uses: number;
  levels: number;
  wins: number;
  avgScore: number;
  winRate: number;
}

interface ApiErrorBody { error?: string }

async function request<T>(path: string, options: {
  method?: string; body?: unknown; token?: string; timeoutMs?: number;
} = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(`${API_BASE}/${path.replace(/^\/+/, '')}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      credentials: 'same-origin',
    });
    const data = await response.json().catch(() => ({})) as T & ApiErrorBody;
    if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`);
    return data;
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('连接服务器超时，本地档案仍可继续使用。');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function registerAccount(id: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('register', { method: 'POST', body: { id, password } });
}

export async function loginAccount(id: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('login', { method: 'POST', body: { id, password } });
}

/** 一次请求完成“已有账号就登录，没有就注册”，避免新用户先吃一个 401。 */
export async function accessAccount(id: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('account', { method: 'POST', body: { id, password } });
}

export interface UsernameCheck {
  exists: boolean;
  hasPassword: boolean;
}

export async function checkUsername(id: string): Promise<UsernameCheck> {
  return request<UsernameCheck>('check-username', { method: 'POST', body: { id } });
}

export async function claimUsername(id: string): Promise<AuthResult> {
  return request<AuthResult>('claim', { method: 'POST', body: { id } });
}

export async function setAccountPassword(token: string, password: string): Promise<ApiAccount> {
  const result = await request<{ user: ApiAccount }>('password', {
    method: 'POST', body: { password }, token,
  });
  return result.user;
}

export async function fetchMe(token: string): Promise<ApiAccount> {
  const result = await request<{ user: ApiAccount }>('me', { token });
  return result.user;
}

export async function uploadRun(token: string, run: RunRecord): Promise<void> {
  await request('runs', { method: 'POST', body: { run }, token, timeoutMs: 12000 });
}

export async function uploadRuns(token: string, runs: RunRecord[]): Promise<void> {
  if (!runs.length) return;
  await request('runs/batch', { method: 'POST', body: { runs }, token, timeoutMs: 20000 });
}

export async function fetchLeaderboard(board: 'time' | 'luck', limit = 20): Promise<LeaderboardRow[]> {
  const result = await request<{ rows: LeaderboardRow[] }>(`leaderboards?board=${board}&limit=${limit}`);
  return result.rows;
}

export async function fetchEntityStats(kind: 'die' | 'barrel' | 'item', limit = 50): Promise<EntityStat[]> {
  const result = await request<{ rows: EntityStat[] }>(`stats/entities?kind=${kind}&limit=${limit}`);
  return result.rows;
}

export async function pingApi(): Promise<boolean> {
  try {
    await request('health', { timeoutMs: 3000 });
    return true;
  } catch { return false; }
}
