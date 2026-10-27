// ui/screens/account.ts — 自编 ID 的本地档案、设置密码与同步。
import { closeOverlay, openOverlay } from '../components/overlay.ts';
import { $ } from '../dom.ts';
import { h } from '../../core/util.ts';
import { showToast } from '../components/toast.ts';
import { loadProfile, normalizeUserId, saveProfile, validUserId, type PlayerProfile } from '../../platform/profile.ts';
import { loginAccount, registerAccount } from '../../platform/api.ts';
import { syncEverything } from '../../platform/sync.ts';
import { setRecordUser } from '../../platform/run-record.ts';

function profileLabel(profile: PlayerProfile | null): string {
  if (!profile) return '未命名';
  return profile.mode === 'synced' ? '同步账号' : '本地用户';
}

export function refreshAccountButton(): void {
  const profile = loadProfile();
  const name = $('#account-name');
  const button = $('#account-button');
  if (name) name.textContent = profile?.id || '旅人';
  if (button) {
    button.classList.toggle('is-synced', profile?.mode === 'synced');
    button.title = profile
      ? `${profile.id} · ${profileLabel(profile)}`
      : '设置玩家 ID';
  }
}

export function openAccount(force = false): void {
  const profile = loadProfile();
  openOverlay(accountHtml(profile, force), { dismissible: true });
}

function accountHtml(profile: PlayerProfile | null, force: boolean): string {
  if (!profile || force) {
    return `
      <div class="modal account-modal">
        <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
        <p class="modal-kicker">YOUR NAME AT THE TABLE</p>
        <h2>${profile ? '换一个身份' : '先留下名字'}</h2>
        <p class="result-sub">自编一个 ID。密码留空就是纯本地用户；填写密码会注册/登录并把历程同步到服务器。ID 注册后不可重名。</p>
        <label class="account-field"><span>玩家 ID</span><input id="account-id" maxlength="24" autocomplete="username" placeholder="例如：灰烬旅人" value="${profile ? h(profile.id) : ''}"></label>
        <label class="account-field"><span>密码（可选）</span><input id="account-password" type="password" maxlength="128" autocomplete="current-password" placeholder="留空则只保存在这台设备"></label>
        <div class="account-actions">
          <button class="primary-button" data-action="account-save-local">${profile ? '保存本地身份' : '以本地用户开始'}</button>
          <button class="secondary-button" data-action="account-sync">使用密码 / 同步</button>
        </div>
        <p class="account-note">本地用户的 ID 只在当前浏览器有效；设置密码时若 ID 已被注册，需要换一个名字或输入正确密码登录。</p>
      </div>`;
  }
  const synced = profile.mode === 'synced';
  return `
    <div class="modal account-modal">
      <button class="modal-close" data-action="close-overlay" aria-label="关闭"><svg><use href="#i-close"></use></svg></button>
      <p class="modal-kicker">YOUR NAME AT THE TABLE</p>
      <h2>${h(profile.id)}</h2>
      <p class="result-sub"><span class="account-badge ${synced ? 'is-synced' : ''}">${synced ? '已同步' : '本地用户'}</span> ${synced ? '历程会在通关/死亡后上传。' : '历程只保存在本机；设置密码后可跨设备同步。'}</p>
      ${synced ? `
        <div class="account-actions">
          <button class="primary-button" data-action="account-sync-now">立即同步</button>
          <button class="secondary-button" data-action="account-switch">换一个身份</button>
          <button class="secondary-button" data-action="account-logout">退出账号</button>
        </div>` : `
        <label class="account-field"><span>设置密码并同步</span><input id="account-password" type="password" maxlength="128" autocomplete="new-password" placeholder="至少 4 位，之后可跨设备登录"></label>
        <div class="account-actions">
          <button class="primary-button" data-action="account-set-password">设置密码并同步</button>
          <button class="secondary-button" data-action="account-switch">换一个身份</button>
        </div>
        <p class="account-note">设置密码会注册「${h(profile.id)}」；如果该 ID 已被别人注册，需要换名或改用已有账号登录。</p>`}
    </div>`;
}

function accountInputs(): { id: string; password: string } {
  return {
    id: normalizeUserId(($('#account-id') as HTMLInputElement | null)?.value || ''),
    password: (($('#account-password') as HTMLInputElement | null)?.value || '').trim(),
  };
}

export function saveLocalAccount(): void {
  const { id } = accountInputs();
  if (!validUserId(id)) { showToast('ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。', 'error'); return; }
  const previous = loadProfile();
  saveProfile({ id, mode: 'local', createdAt: previous?.createdAt || Date.now() });
  refreshAccountButton();
  closeOverlay();
  showToast(`已使用本地身份「${id}」。`, 'good');
}

export async function syncAccount(): Promise<void> {
  const { id, password } = accountInputs();
  if (!validUserId(id)) { showToast('ID 需要 2–24 位，只能包含文字、数字、下划线或短横线。', 'error'); return; }
  if (!password) { showToast('请输入密码；留空请使用「以本地用户开始」。', 'error'); return; }
  if (password.length < 4) { showToast('密码至少 4 位。', 'error'); return; }
  try {
    let auth;
    try {
      auth = await loginAccount(id, password);
    } catch {
      auth = await registerAccount(id, password);
    }
    saveProfile({ id: auth.user.id, mode: 'synced', token: auth.token, createdAt: Date.now() });
    setRecordUser(auth.user.id);
    refreshAccountButton();
    const result = await syncEverything();
    closeOverlay();
    showToast(result.failed ? `已登录，${result.synced} 局已同步，${result.failed} 局待重试。` : `已登录并同步 ${result.synced} 局历程。`, 'good');
  } catch (error) {
    showToast((error as Error).message || '登录失败。', 'error');
  }
}

export async function setPasswordAndSync(): Promise<void> {
  const { password } = accountInputs();
  const profile = loadProfile();
  if (!profile) return;
  if (password.length < 4) { showToast('密码至少 4 位。', 'error'); return; }
  try {
    let auth;
    try {
      auth = await registerAccount(profile.id, password);
    } catch {
      auth = await loginAccount(profile.id, password);
    }
    saveProfile({ id: auth.user.id, mode: 'synced', token: auth.token, createdAt: profile.createdAt });
    setRecordUser(auth.user.id);
    refreshAccountButton();
    const result = await syncEverything();
    closeOverlay();
    showToast(result.failed ? `密码已设置，${result.synced} 局已同步，${result.failed} 局待重试。` : `密码已设置，${result.synced} 局历程已同步。`, 'good');
  } catch (error) {
    showToast((error as Error).message || '设置密码失败。', 'error');
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
  showToast('已退出同步账号，当前历程仍保存在本地。', 'good');
}

export function switchAccount(): void {
  const profile = loadProfile();
  openOverlay(accountHtml(profile, true), { dismissible: true });
}
