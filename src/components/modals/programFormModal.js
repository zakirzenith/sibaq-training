import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';
import { openTrainerPickerModal } from './trainerPickerModal.js';

export function openProgramFormModal({ program = null, onSave = () => {} }) {
  const isEdit = Boolean(program);
  const title = isEdit ? 'Edit Program Details' : 'Create New Program';
  const trainers = state.getTrainers();

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <div class="modal-badge">Programs Catalog</div>
          <h2 class="modal-title">${title}</h2>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="programForm" class="modal-body">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="txtProgCode">Program Code *</label>
            <input 
              type="text" 
              id="txtProgCode" 
              class="form-input" 
              required 
              placeholder="e.g. STG-105"
              value="${program ? program.code : ''}"
            />
            <div class="form-hint">Unique shortcode</div>
          </div>

          <div class="form-group flex-1">
            <label class="form-label" for="selProgType">Type (Stage / Non-Stage) *</label>
            <select id="selProgType" class="form-select">
              <option value="Stage" ${program && program.type === 'Stage' ? 'selected' : ''}>Stage</option>
              <option value="Non-Stage" ${!program || program.type === 'Non-Stage' ? 'selected' : ''}>Non-Stage</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="txtProgName">Program Name *</label>
          <input 
            type="text" 
            id="txtProgName" 
            class="form-input" 
            required 
            placeholder="e.g. Classical Solo Bharatanatyam"
            value="${program ? program.name : ''}"
          />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="selProgCategory">Category *</label>
            <select id="selProgCategory" class="form-select">
              ${state.getAvailableCategories().map(cat => `
                <option value="${cat}" ${program && program.category === cat ? 'selected' : (!program && cat === 'BIDĀYAH' ? 'selected' : '')}>
                  ${cat}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label" for="btnChooseTrainerInForm">Assign Trainer</label>
            <input type="hidden" id="selProgTrainer" value="${program && program.trainerId ? program.trainerId : ''}" />
            <button type="button" id="btnChooseTrainerInForm" class="form-trainer-picker-trigger" title="Click to search and choose trainer">
              <span class="ftpt-icon">${getIcon('trainers')}</span>
              <span class="ftpt-text" id="lblFormTrainerText">
                ${
                  program && program.trainerId && state.getTrainerById(program.trainerId)
                    ? `${state.getTrainerById(program.trainerId).name} (${state.getTrainerById(program.trainerId).expertise})`
                    : '-- Choose Trainer --'
                }
              </span>
              <span class="ftpt-chevron">${getIcon('chevronDown')}</span>
            </button>
          </div>
        </div>
      </form>

      <div class="modal-footer">
        <button id="btnCancelProgram" class="btn btn-secondary">Cancel</button>
        <button id="btnSubmitProgram" class="btn btn-primary">
          ${getIcon('check')} ${isEdit ? 'Update Program' : 'Create Program'}
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
  overlay.querySelector('#btnCancelProgram').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const txtProgCode = overlay.querySelector('#txtProgCode');
  const selProgType = overlay.querySelector('#selProgType');
  const txtProgName = overlay.querySelector('#txtProgName');
  const selProgCategory = overlay.querySelector('#selProgCategory');
  const selProgTrainer = overlay.querySelector('#selProgTrainer');
  const btnChooseTrainer = overlay.querySelector('#btnChooseTrainerInForm');
  const lblFormTrainerText = overlay.querySelector('#lblFormTrainerText');
  const btnSubmit = overlay.querySelector('#btnSubmitProgram');

  if (btnChooseTrainer) {
    btnChooseTrainer.addEventListener('click', () => {
      openTrainerPickerModal({
        currentTrainerId: selProgTrainer.value,
        title: 'Select Program Trainer',
        subtitle: 'Search trainer directory by name or domain expertise',
        onSelect: (t) => {
          selProgTrainer.value = t ? t.id : '';
          lblFormTrainerText.textContent = t ? `${t.name} (${t.expertise})` : '-- Choose Trainer --';
        }
      });
    });
  }

  btnSubmit.addEventListener('click', e => {
    e.preventDefault();

    const code = txtProgCode.value.trim().toUpperCase();
    const name = txtProgName.value.trim();
    const type = selProgType.value;
    const category = selProgCategory.value;
    const trainerId = selProgTrainer.value || null;

    if (!code || !name) {
      toast.error('Program code and program name are required.');
      return;
    }

    if (!isEdit) {
      const existing = state.getProgramByCode(code);
      if (existing) {
        toast.error(`Program code "${code}" already exists ("${existing.name}").`);
        return;
      }

      state.addProgram({
        code,
        name,
        type,
        category,
        trainerId
      });
      toast.success(`Program [${code}] "${name}" created successfully!`);
    } else {
      state.updateProgram(program.id, {
        code,
        name,
        type,
        category,
        trainerId
      });
      toast.success(`Program [${code}] updated successfully!`);
    }

    close();
    onSave();
  });
}
