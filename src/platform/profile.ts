// platform/profile.ts — 本地玩家档案与登录名的唯一入口。
export const PROFILE_KEY = 'heavensDice.profile.v1';

export type ProfileMode = 'local' | 'synced';

export interface PlayerProfile {
  id: string;
  mode: ProfileMode;
  token?: string;
  createdAt: number;
  lastSyncAt?: number;
}

export function normalizeUserId(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validUserId(value: string): boolean {
  const id = normalizeUserId(value);
  return id.length >= 2 && id.length <= 24 && /^[\p{L}\p{N}_-]+$/u.test(id);
}

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') as Partial<PlayerProfile> | null;
    if (!raw || typeof raw.id !== 'string' || !validUserId(raw.id)) return null;
    return {
      id: raw.id,
      mode: raw.mode === 'synced' && raw.token ? 'synced' : 'local',
      token: typeof raw.token === 'string' ? raw.token : undefined,
      createdAt: Number(raw.createdAt) || Date.now(),
      lastSyncAt: Number(raw.lastSyncAt) || undefined,
    };
  } catch { return null; }
}

export function saveProfile(profile: PlayerProfile | null): void {
  try {
    if (!profile) localStorage.removeItem(PROFILE_KEY);
    else localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /* private mode */ }
}

export function currentUserId(): string {
  return loadProfile()?.id || 'local';
}
