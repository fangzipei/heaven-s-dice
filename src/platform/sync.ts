// platform/sync.ts — 已结算历程的本地保存与后端同步。
import { clearPending, queuePending, readHistory, readPending, saveHistory } from './save.ts';
import { uploadRuns } from './api.ts';
import { loadProfile, saveProfile } from './profile.ts';
import type { RunRecord } from './run-record.ts';

export function storeFinishedRun(record: RunRecord): void {
  saveHistory(record);
  const profile = loadProfile();
  // Claimed local accounts already hold a server token; upload as soon as a
  // run ends instead of waiting for the player to set a password.
  if (profile?.token) {
    void syncRecords([record]);
  }
}

export async function syncRecords(records: RunRecord[]): Promise<{ synced: number; failed: number }> {
  const profile = loadProfile();
  if (!profile?.token || !records.length) return { synced: 0, failed: 0 };
  let synced = 0;
  for (let index = 0; index < records.length; index += 10) {
    const chunk = records.slice(index, index + 10);
    try {
      await uploadRuns(profile.token, chunk);
      chunk.forEach((record) => clearPending(record.clientRunId));
      synced += chunk.length;
    } catch {
      chunk.forEach((record) => queuePending(record));
    }
  }
  if (synced) {
    saveProfile({ ...profile, lastSyncAt: Date.now() });
  }
  return { synced, failed: records.length - synced };
}

export async function syncEverything(): Promise<{ synced: number; failed: number }> {
  const history = readHistory();
  const pending = readPending();
  const map = new Map<string, RunRecord>();
  [...history, ...pending].forEach((record) => map.set(record.clientRunId, record));
  return syncRecords([...map.values()]);
}
