// ui/screens/account.ts — 右上方玩家入口：先选 ID，再看是否需要密码。
import { closeOverlay, openOverlay } from '../components/overlay.ts';
import { $ } from '../dom.ts';
import { h } from '../../core/util.ts';
import { showToast } from '../components/toast.ts';
import {
  loadProfile, normalizeUserId, saveProfile, validUserId, type PlayerProfile,
} from '../../platform/profile.ts';
import {
  API_ENABLED, accessAccount, checkUsername, claimUsername, setAccountPassword,
} from '../../platform/api.ts';
import { syncEverything } from '../../platform/sync.ts';
import { setRecordUser } from '../../platform/run-record.ts';

let pendingIdentity: {
  id: string;
  onDone?: () => void;
} | null = null;

function profileLabel(profile: PlayerProfile | null): string {
  if (!profile) return '登录 / 注册';
  return profile.mode === 'synced' ? '同步账号' : profile.hasPassword ? '本地账号' : '本地用户';
}

export function refreshAccountButton(): void {
  const profile = loadProfile();
  const name = $('#account-name');
  const homeName = $('#home-account-name');
  const button = $('#account-button');
  if (name) name.textContent = profile?.id || '登录';
  if (homeName) homeName.textContent = profile?.id || '登录';
  if (button) {
    button.classList.toggle('is-synced', profile?.mode === 'synced');
    button.title = profile
      ? `${profile.id} · ${profileLabel(profile)}`
      : '登录或创建玩家 ID';
  }
}

export function openAccount(): void {
  const profile = loadProfile();
  if (!profile) {
    openIdentity();
    return;
  }
  openOverlay(accountHtml(profile), { dismissible: true });
}

export function openIdentity(onDone?: () => void): void {
  if (!API_ENABLED) {
    const id = loadProfile()?.id || '本地旅人';
    saveProfile({ id, mode: 'local', hasPassword: false, createdAt: loadProfile()?.createdAt || Date.now() });
    setRecordUser(id);
    refreshAccountButton();
    onDone?.();
    return;
  }
  const profile = loadProfile();
  if (profile) {
    onDone?.();
    return;
  }
  pendingIdentity = { id: '', onDone };
  openOverlay(identityStepOneHtml(), { dismissible: false });
}

function identityStepOneHtml(): string {
  return `
    <div class="modal account-modal identity-modal">
      <p class="modal-kicker">FIRST, YOUR NAME</p>
      <h2>先留下名字</h2>
      <p class="result-sub">这是你的玩家 ID。下一步会检查它是否已被占用；没有密码的本地用户之后可以随时在右上方头像里补上密码。</p>
      <label class="account-field"><span>玩家 ID</span><input id="identity-id" maxlength="24" autocomplete="username" placeholder="例如：灰烬旅人"></label>
      <div class="account-actions">
        <button class="primary-button" data-action="identity-next">下一步 <svg><use href="#i-arrow"></use></svg></button>
      </div>
      <p class="account-note">2–24 位，只能包含文字、数字、下划线或短横线。</p>
    </div>`;
}

function identityPasswordHtml(id: string): string {
  return `
    <div class="modal account-modal identity-modal">
      <p class="modal-kicker">WELCOME BACK</p>
      <h2>${h(id)}</h2>
      <p class="result-sub">这个 ID 已经存在，请输入密码登录。</p>
      <label class="account-field"><span>密码</span><input id="identity-password" type="password" maxlength="128" autocomplete="current-password" placeholder="输入密码"></label>
      <div class="account-actions">
        <button class="primary-button" data-action="identity-login">登录</button>
        <button class="secondary-button" data-action="identity-back">换一个 ID</button>
      </div>
      <p class="account-note">忘记密码的本地 ID 无法在其他设备恢复；请使用同一个浏览器。</p>
    </div>`;
}

function identityBlockedHtml(id: string): string {
  return `
    <div class="modal account-modal identity-modal">
      <p class="modal-kicker">NAME UNAVAILABLE</p>
      <h2>${h(id)}</h2>
      <p class="result-sub">这个 ID 已被一个还没有设置密码的本地用户占用。请换一个名字；如果这是你的 ID，请在原来那台设备上打开头像设置密码。</p>
      <div class="account-actions">
        <button class="primary-button" data-action="identity-back">换一个 ID</button>
      </div>
    </div>`;
}

function accountHtml(profile: PlayerProfile): string {
  const synced = profile.mode === 'synced';
  return `
    <div class="modal account-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <p class="modal-kicker">YOUR NAME AT THE TABLE</p>
      <h2>${h(profile.id)}</h2>
      <p class="result-sub"><span class="account-badge ${synced ? 'is-synced' : ''}">${profileLabel(profile)}</span> ${synced ? '每局结束后会自动上传并同步。' : profile.token ? '每局结束后会自动上传；设置密码后可跨设备登录。' : '历程目前只保存在本机。'}</p>
      ${synced ? `
        <div class="account-actions">
          <button class="primary-button" data-action="account-sync-now">立即同步</button>
          <button class="secondary-button" data-action="account-switch">换一个身份</button>
          <button class="secondary-button" data-action="account-logout">退出登录</button>
        </div>` : `
        <label class="account-field"><span>设置密码</span><input id="account-password" type="password" maxlength="128" autocomplete="new-password" placeholder="至少 4 位"></label>
        <div class="account-actions">
          <button class="primary-button" data-action="account-set-password">保存密码并同步</button>
          <button class="secondary-button" data-action="account-switch">换一个身份</button>
        </div>
        <p class="account-note">${profile.hasPassword ? '本地账号已设置密码；登录后可跨设备同步。' : '密码留空时，ID 仍会在服务器占位，但只能在本机继续使用。'}</p>`}
    </div>`;
}

function identityInput(): string {
  return normalizeUserId(($('#identity-id') as HTMLInputElement | null)?.value || '');
}

export async function identityNext(): Promise<void> {
  const id = identityInput();
  if (!validUserId(id)) { showToast('ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。', 'error'); return; }
  if (!pendingIdentity) pendingIdentity = { id };
  pendingIdentity.id = id;
  try {
    const check = await checkUsername(id);
    if (!check.exists) {
      const auth = await claimUsername(id);
      saveProfile({ id: auth.user.id, mode: 'local', token: auth.token, hasPassword: false, createdAt: Date.now() });
      setRecordUser(auth.user.id);
      refreshAccountButton();
      const done = pendingIdentity.onDone;
      pendingIdentity = null;
      closeOverlay();
      showToast(`已创建本地用户「${id}」。点右上方头像可以随时设置密码。`, 'good');
      done?.();
      return;
    }
    if (check.hasPassword) {
      pendingIdentity.id = id;
      openOverlay(identityPasswordHtml(id), { dismissible: false });
      return;
    }
    openOverlay(identityBlockedHtml(id), { dismissible: false });
  } catch (error) {
    showToast((error as Error).message || '检查用户名失败。', 'error');
  }
}

export async function identityLogin(): Promise<void> {
  const id = pendingIdentity?.id;
  const password = (($('#identity-password') as HTMLInputElement | null)?.value || '').trim();
  if (!id) return;
  if (!password) { showToast('请输入密码。', 'error'); return; }
  try {
    const auth = await accessAccount(id, password);
    saveProfile({ id: auth.user.id, mode: 'synced', token: auth.token, hasPassword: true, createdAt: Date.now() });
    setRecordUser(auth.user.id);
    refreshAccountButton();
    const result = await syncEverything();
    const done = pendingIdentity?.onDone;
    pendingIdentity = null;
    closeOverlay();
    showToast(result.failed ? `已登录，${result.synced} 局已同步，${result.failed} 局待重试。` : `已登录并同步 ${result.synced} 局。`, 'good');
    done?.();
  } catch (error) {
    showToast((error as Error).message || '登录失败。', 'error');
  }
}

export function identityBack(): void {
  const id = pendingIdentity?.id || '';
  pendingIdentity = { id, onDone: pendingIdentity?.onDone };
  openOverlay(identityStepOneHtml(), { dismissible: false });
  const input = $('#identity-id') as HTMLInputElement | null;
  if (input) input.value = id;
}

/** Local account (with or without a server claim token) upgrades to sync. */
export async function setPasswordAndSync(): Promise<void> {
  const password = (($('#account-password') as HTMLInputElement | null)?.value || '').trim();
  const profile = loadProfile();
  if (!profile) return;
  if (password.length < 4) { showToast('密码至少 4 位。', 'error'); return; }
  try {
    if (profile.token && !profile.hasPassword) {
      await setAccountPassword(profile.token, password);
    } else {
      const auth = await accessAccount(profile.id, password);
      profile.token = auth.token;
    }
    saveProfile({ ...profile, mode: 'synced', hasPassword: true });
    setRecordUser(profile.id);
    refreshAccountButton();
    const result = await syncEverything();
    closeOverlay();
    showToast(result.failed ? `密码已保存，${result.synced} 局已同步，${result.failed} 局待重试。` : `密码已保存，${result.synced} 局历程已同步。`, 'good');
  } catch (error) {
    showToast((error as Error).message || '保存密码失败。', 'error');
  }
}

export async function syncNow(): Promise<void> {
  const result = await syncEverything();
  showToast(result.failed ? `同步完成：${result.synced} 局成功，${result.failed} 局待重试。` : `已同步 ${result.synced} 局历程。`, result.failed ? 'error' : 'good');
}

export function logoutAccount(): void {
  saveProfile(null);
  refreshAccountButton();
  closeOverlay();
  showToast('已退出登录；本地历程仍然保留。', 'good');
}

export function switchAccount(): void {
  saveProfile(null);
  refreshAccountButton();
  openIdentity();
}

// Backwards-compatible entry points used by older action handlers.
export function saveLocalAccount(): void { openIdentity(); }
export function syncAccount(): void { openIdentity(); }
