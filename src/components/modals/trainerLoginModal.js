import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openTrainerLoginModal({ onSuccess = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  const trainers = state.getTrainers();

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

        ${trainers.length > 0 ? `
          <div style="margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Quick Test / Select Trainer</span>
              <span class="badge badge-neutral-xs">${trainers.length} Registered</span>
            </div>
            <select id="quickTrainerSelect" class="form-select" style="font-size: 12.5px; height: 38px; background: #f8fafc;">
              <option value="">-- Choose Trainer to Auto-Fill & Test --</option>
              ${trainers.map(t => {
                const u = t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const menteesCount = state.getTrainerMentees(t.id).length;
                return `<option value="${t.id}" data-username="${u}" data-pwd="${t.password || '123456'}">
                  ${t.name} (${t.expertise}) • ${menteesCount} Mentees
                </option>`;
              }).join('')}
            </select>
          </div>
        ` : `
          <div style="font-size: 12px; color: #f59e0b; background: #fffbeb; padding: 8px 12px; border-radius: 8px; border: 1px solid #fde68a;">
            ⚠️ No trainers registered yet. Go to Trainers section in Controller Panel to add trainers first.
          </div>
        `}
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
  const quickSelect = overlay.querySelector('#quickTrainerSelect');
  const form = overlay.querySelector('#trainerLoginForm');

  // Toggle password view
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      txtPwd.type = txtPwd.type === 'password' ? 'text' : 'password';
      btnToggle.textContent = txtPwd.type === 'password' ? '👁️' : '🔒';
    });
  }

  // Quick trainer selection auto-fills credentials
  if (quickSelect) {
    quickSelect.addEventListener('change', () => {
      const opt = quickSelect.selectedOptions[0];
      if (opt && opt.value) {
        txtUser.value = opt.getAttribute('data-username') || '';
        txtPwd.value = opt.getAttribute('data-pwd') || '123456';
      }
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
