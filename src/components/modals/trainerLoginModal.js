import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openTrainerLoginModal({ onSuccess = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 440px;">
      <div class="modal-header" style="text-align: center; display: flex; flex-direction: column; align-items: center; position: relative;">
        <button class="modal-close-btn" aria-label="Close" style="position: absolute; right: 14px; top: 14px;">${getIcon('x')}</button>
        <div class="official-logo-wrap" style="width: 52px; height: 52px; margin-bottom: 8px;">
          <img src="/logo.png" alt="Logo" class="sidebar-brand-logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div class="modal-badge" style="background: #eef2ff; color: #4f46e5; font-weight: 700;">Trainer Portal</div>
        <h2 class="modal-title" style="margin-top: 4px; font-size: 20px;">Trainer Sign In</h2>
        <p class="modal-subtitle" style="font-size: 12.5px; color: #64748b; margin-top: 2px;">
          Access your assigned candidates, programs, and progress reports.
        </p>
      </div>

      <form id="trainerLoginForm" class="modal-body" style="padding-top: 8px; display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group" style="margin: 0;">
          <label class="form-label" for="txtLoginUsername" style="font-size: 13px; font-weight: 600;">Username / ID</label>
          <input 
            type="text" 
            id="txtLoginUsername" 
            class="form-input" 
            required 
            placeholder="e.g. elena"
            autocomplete="username"
            style="height: 42px; font-size: 14px;"
          />
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label" for="txtLoginPassword" style="font-size: 13px; font-weight: 600;">Password</label>
          <div style="position: relative;">
            <input 
              type="password" 
              id="txtLoginPassword" 
              class="form-input" 
              required 
              placeholder="Enter your password"
              autocomplete="current-password"
              style="height: 42px; font-size: 14px; padding-right: 36px;"
            />
            <button type="button" id="btnToggleLoginPwd" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;" title="Show/Hide">
              👁️
            </button>
          </div>
        </div>

        <button type="submit" id="btnSubmitLogin" class="btn btn-primary" style="height: 44px; width: 100%; font-size: 14px; font-weight: 700; justify-content: center; margin-top: 6px;">
          Sign In to Trainer Panel &rarr;
        </button>
      </form>

      <div class="modal-footer" style="justify-content: center; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 10px 16px;">
        <span style="font-size: 12px; color: #64748b;">
          Looking for Controller Admin? Click <strong>Cancel</strong> or close.
        </span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const txtUser = overlay.querySelector('#txtLoginUsername');
  const txtPwd = overlay.querySelector('#txtLoginPassword');
  const btnToggle = overlay.querySelector('#btnToggleLoginPwd');
  const form = overlay.querySelector('#trainerLoginForm');

  // Toggle password view
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      txtPwd.type = txtPwd.type === 'password' ? 'text' : 'password';
      btnToggle.textContent = txtPwd.type === 'password' ? '👁️' : '🔒';
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = txtUser.value.trim();
    const password = txtPwd.value.trim();

    const result = state.authenticateTrainer(username, password);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`Welcome back, ${result.trainer.name}!`);
    close();
    onSuccess(result.trainer);
  });
}
