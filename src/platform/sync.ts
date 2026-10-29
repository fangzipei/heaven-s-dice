// platform/sync.ts — 已结算历程与未完成对局的本地保存和后端同步。
import { buildSavedGame, clearGameSave, clearPending, loadGame, queuePending, readHistory, readPending, saveHistory, writeSavedGame } from './save.ts';
import { API_ENABLED, deleteActiveSave, fetchActiveSave, uploadActiveSave, uploadRuns } from './api.ts';
import { loadProfile, saveProfile } from './profile.ts';
import type { RunState } from '../core/types.ts';
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
  if (!API_ENABLED || !profile?.token || !records.length) return { synced: 0, failed: 0 };
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
  const result = await syncRecords([...map.values()]);
  await restoreActiveGame();
  return result;
}

/** Upload the current clean-level checkpoint for cross-device resume. */
export async function uploadActiveGame(run: RunState, record: RunRecord | null): Promise<boolean> {
  const profile = loadProfile();
  if (!API_ENABLED || !profile?.token || !profile.hasPassword || !record?.clientRunId) return false;
  const save = buildSavedGame(run, record);
  try {
    await uploadActiveSave(profile.token, {
      savedAt: save.savedAt,
      clientRunId: record.clientRunId,
      run: save.run,
      record: save.record,
    });
    return true;
  } catch {
    return false;
  }
}

/** Pull a newer cloud checkpoint after login; a newer local save wins. */
export async function restoreActiveGame(): Promise<boolean> {
  const profile = loadProfile();
  if (!API_ENABLED || !profile?.token || !profile.hasPassword) return false;
  try {
    const remote = await fetchActiveSave(profile.token);
    const loaded = loadGame();
    const local = loaded && (!loaded.record || loaded.record.userId === profile.id) ? loaded : null;
    if (loaded && !local) clearGameSave();
    if (!remote?.run) {
      if (local?.record) {
        const payload = buildSavedGame(local.run, local.record, local.savedAt);
        await uploadActiveSave(profile.token, {
          savedAt: payload.savedAt, clientRunId: local.record.clientRunId, run: payload.run, record: payload.record,
        });
      }
      return false;
    }
    if (local && local.savedAt >= remote.savedAt) {
      if (local.record) {
        const payload = buildSavedGame(local.run, local.record, local.savedAt);
        await uploadActiveSave(profile.token, {
          savedAt: payload.savedAt, clientRunId: local.record.clientRunId, run: payload.run, record: payload.record,
        });
      }
      return false;
    }
    writeSavedGame({
      version: 2,
      savedAt: remote.savedAt,
      run: remote.run,
      record: remote.record,
    });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('hd:save-restored'));
    return true;
  } catch {
    return false;
  }
}

export async function clearActiveGame(): Promise<void> {
  const profile = loadProfile();
  if (!API_ENABLED || !profile?.token || !profile.hasPassword) return;
  try { await deleteActiveSave(profile.token); } catch { /* keep local flow usable */ }
}
