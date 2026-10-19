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
          <div class="modal-badge">Trainers & Mentors</div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-subtitle">Manage trainer profile and Portal login credentials.</p>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="trainerForm" class="modal-body" style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Trainer Profile Photo Row -->
        <div class="trainer-photo-upload-row" style="display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
          <div style="position: relative; width: 62px; height: 62px; flex-shrink: 0;">
            <div id="trainerPhotoPreview" style="width: 100%; height: 100%; border-radius: 50%; background: ${trainer && trainer.color ? trainer.color : '#6366f1'}; color: #ffffff; font-weight: 800; font-size: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid #ffffff;">
              ${trainer && trainer.photo 
                ? `<img src="${trainer.photo}" alt="Trainer Photo" style="width: 100%; height: 100%; object-fit: cover;" />`
                : (trainer ? trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'TR')}
            </div>
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">Profile Photo</div>
            <div style="font-size: 11.5px; color: #64748b; margin-bottom: 6px;">Upload a photo of the trainer (JPG, PNG, WebP).</div>
            
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <input type="file" id="inpTrainerPhotoFile" accept="image/*" style="display: none;" />
              <button type="button" id="btnUploadTrainerPhoto" class="btn btn-sm btn-outline" style="font-size: 11.5px; height: 30px; padding: 0 10px; gap: 5px; font-weight: 700; border-radius: 7px; border-color: #cbd5e1; background: #ffffff; cursor: pointer;">
                ${getIcon('upload')} <span>${trainer && trainer.photo ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              <button type="button" id="btnRemoveTrainerPhoto" class="btn btn-sm text-danger" style="font-size: 11.5px; height: 30px; padding: 0 8px; gap: 4px; font-weight: 600; border: none; background: transparent; display: ${trainer && trainer.photo ? 'inline-flex' : 'none'}; cursor: pointer;">
                ${getIcon('trash')} <span>Remove</span>
              </button>
            </div>
          </div>
        </div>

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
                <button type="button" id="btnTogglePwdView" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;" title="Show/Hide Password">
                  ${getIcon('eye')}
                </button>
              </div>
            </div>
          </div>

          <div style="font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.4; display: flex; align-items: center; gap: 5px;">
            <span style="color: #6366f1; display: inline-flex;">${getIcon('info')}</span>
            <span>The trainer will use these credentials to log in to their personal Trainer Panel.</span>
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

  // Photo state & DOM elements
  let currentPhotoData = trainer && trainer.photo ? trainer.photo : null;
  const photoPreview = overlay.querySelector('#trainerPhotoPreview');
  const inpPhotoFile = overlay.querySelector('#inpTrainerPhotoFile');
  const btnUploadPhoto = overlay.querySelector('#btnUploadTrainerPhoto');
  const btnRemovePhoto = overlay.querySelector('#btnRemoveTrainerPhoto');

  const updatePreview = () => {
    if (currentPhotoData) {
      photoPreview.innerHTML = `<img src="${currentPhotoData}" alt="Trainer Photo" style="width: 100%; height: 100%; object-fit: cover;" />`;
      btnRemovePhoto.style.display = 'inline-flex';
      btnUploadPhoto.querySelector('span').textContent = 'Change Photo';
    } else {
      const nameVal = txtName.value.trim();
      const initials = nameVal 
        ? nameVal.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() 
        : (trainer ? trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'TR');
      photoPreview.innerHTML = initials;
      btnRemovePhoto.style.display = 'none';
      btnUploadPhoto.querySelector('span').textContent = 'Upload Photo';
    }
  };

  btnUploadPhoto.addEventListener('click', () => {
    inpPhotoFile.click();
  });

  btnRemovePhoto.addEventListener('click', () => {
    currentPhotoData = null;
    inpPhotoFile.value = '';
    updatePreview();
    toast.info('Trainer photo removed.');
  });

  inpPhotoFile.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Client-side image optimization (max 400x400)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        currentPhotoData = compressedBase64;
        updatePreview();
        toast.success('Photo uploaded! Click save to apply changes.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Auto-generate username from name if adding new trainer
  txtName.addEventListener('input', () => {
    if (!isEdit && !txtUsername.dataset.userEdited) {
      txtUsername.value = txtName.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    if (!currentPhotoData) {
      updatePreview();
    }
  });

  if (!isEdit) {
    txtUsername.addEventListener('input', () => {
      txtUsername.dataset.userEdited = 'true';
    });
  }

  // Toggle password visibility
  if (btnTogglePwd) {
    btnTogglePwd.addEventListener('click', () => {
      if (txtPassword.type === 'password') {
        txtPassword.type = 'text';
        btnTogglePwd.innerHTML = getIcon('eyeOff');
      } else {
        txtPassword.type = 'password';
        btnTogglePwd.innerHTML = getIcon('eye');
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
      phone,
      photo: currentPhotoData
    };

    if (!isEdit) {
      state.addTrainer(payload);
      toast.success(`Trainer "${name}" added successfully!`);
    } else {
      state.updateTrainer(trainer.id, payload);
      toast.success(`Trainer "${name}" updated successfully!`);
    }

    close();
    onSave();
  });
}
