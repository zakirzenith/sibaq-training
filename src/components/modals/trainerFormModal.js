import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openTrainerFormModal({ trainer = null, onSave = () => {} }) {
  const isEdit = Boolean(trainer);
  const title = isEdit ? 'Edit Trainer' : 'Add New Trainer';

  const defaultUsername = trainer 
    ? (trainer.username || trainer.name.toLowerCase().replace(/[^a-z0-9]/g, '')) 
    : '';
  const defaultPassword = trainer ? (trainer.password || '123456') : '123456';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 500px;">
      <div class="modal-header">
        <div>
          <div class="modal-badge">Faculty & Trainers</div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-subtitle">Manage trainer profile and Portal login credentials.</p>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="trainerForm" class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="txtTrainerName">Trainer Name *</label>
          <input 
            type="text" 
            id="txtTrainerName" 
            class="form-input" 
            required 
            placeholder="e.g. Elena Rostova"
            value="${trainer ? trainer.name : ''}"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="txtTrainerExpertise">Field of Expertise / Specialization *</label>
          <input 
            type="text" 
            id="txtTrainerExpertise" 
            class="form-input" 
            required
            placeholder="e.g. Classical Dance, Elocution, Vocal Music"
            value="${trainer ? trainer.expertise : ''}"
          />
        </div>

        <!-- Portal Credentials Card -->
        <div class="trainer-credentials-box" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-top: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #4f46e5;">${getIcon('lock')}</span>
              <strong style="font-size: 13px; color: #0f172a;">Trainer Portal Credentials</strong>
            </div>
            <span class="badge badge-primary-subtle" style="font-size: 10.5px;">Portal Access</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="txtTrainerUsername" style="font-size: 12px;">Login Username *</label>
              <input 
                type="text" 
                id="txtTrainerUsername" 
                class="form-input" 
                required
                placeholder="e.g. elena"
                value="${defaultUsername}"
                style="font-size: 13px;"
              />
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="txtTrainerPassword" style="font-size: 12px;">Login Password *</label>
              <div style="position: relative;">
                <input 
                  type="password" 
                  id="txtTrainerPassword" 
                  class="form-input" 
                  required
                  placeholder="e.g. 123456"
                  value="${defaultPassword}"
                  style="font-size: 13px; padding-right: 32px;"
                />
                <button type="button" id="btnTogglePwdView" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;" title="Show/Hide Password">
                  👁️
                </button>
              </div>
            </div>
          </div>

          <div style="font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.4;">
            ℹ️ The trainer will use these credentials to log in to their personal Trainer Panel.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="txtTrainerPhone">Phone / Contact (Optional)</label>
          <input 
            type="tel" 
            id="txtTrainerPhone" 
            class="form-input" 
            placeholder="e.g. +91 98765 43210"
            value="${trainer && trainer.phone ? trainer.phone : ''}"
          />
        </div>
      </form>

      <div class="modal-footer">
        <button id="btnCancelTrainer" class="btn btn-secondary">Cancel</button>
        <button id="btnSubmitTrainer" class="btn btn-primary">
          ${getIcon('check')} ${isEdit ? 'Update Trainer' : 'Add Trainer'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCancelTrainer').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const txtName = overlay.querySelector('#txtTrainerName');
  const txtExpertise = overlay.querySelector('#txtTrainerExpertise');
  const txtUsername = overlay.querySelector('#txtTrainerUsername');
  const txtPassword = overlay.querySelector('#txtTrainerPassword');
  const txtPhone = overlay.querySelector('#txtTrainerPhone');
  const btnSubmit = overlay.querySelector('#btnSubmitTrainer');
  const btnTogglePwd = overlay.querySelector('#btnTogglePwdView');

  // Auto-generate username from name if adding new trainer
  if (!isEdit) {
    txtName.addEventListener('input', () => {
      if (!txtUsername.dataset.userEdited) {
        txtUsername.value = txtName.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
    });
    txtUsername.addEventListener('input', () => {
      txtUsername.dataset.userEdited = 'true';
    });
  }

  // Toggle password visibility
  if (btnTogglePwd) {
    btnTogglePwd.addEventListener('click', () => {
      if (txtPassword.type === 'password') {
        txtPassword.type = 'text';
        btnTogglePwd.textContent = '🔒';
      } else {
        txtPassword.type = 'password';
        btnTogglePwd.textContent = '👁️';
      }
    });
  }

  btnSubmit.addEventListener('click', e => {
    e.preventDefault();

    const name = txtName.value.trim();
    const expertise = txtExpertise.value.trim();
    const username = txtUsername.value.trim().toLowerCase();
    const password = txtPassword.value.trim();
    const phone = txtPhone.value.trim();

    if (!name || !expertise) {
      toast.error('Trainer name and field of expertise are required.');
      return;
    }

    if (!username || !password) {
      toast.error('Login username and password are required for the Trainer Portal.');
      return;
    }

    // Check duplicate username among other trainers
    const allTrainers = state.getTrainers();
    const duplicate = allTrainers.find(t => {
      if (isEdit && t.id === trainer.id) return false;
      const u = String(t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase();
      return u === username;
    });

    if (duplicate) {
      toast.error(`The username "${username}" is already taken by trainer "${duplicate.name}". Please pick another.`);
      return;
    }

    const payload = {
      name,
      expertise,
      username,
      password,
      phone
    };

    if (!isEdit) {
      state.addTrainer(payload);
      toast.success(`Trainer "${name}" added with credentials!`);
    } else {
      state.updateTrainer(trainer.id, payload);
      toast.success(`Trainer "${name}" updated successfully!`);
    }

    close();
    onSave();
  });
}
