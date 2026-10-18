import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openTrainerFormModal({ trainer = null, onSave = () => {} }) {
  const isEdit = Boolean(trainer);
  const title = isEdit ? 'Edit Trainer' : 'Add New Trainer';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 480px;">
      <div class="modal-header">
        <div>
          <div class="modal-badge">Faculty & Trainers</div>
          <h2 class="modal-title">${title}</h2>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="trainerForm" class="modal-body">
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

        <div class="form-group">
          <label class="form-label" for="txtTrainerExperience">Experience / Level</label>
          <input 
            type="text" 
            id="txtTrainerExperience" 
            class="form-input" 
            placeholder="e.g. 8+ Years"
            value="${trainer ? trainer.experience : '5+ Years'}"
          />
        </div>
      </form>

      <div class="modal-footer">
        <button id="btnCancelTrainer" class="btn btn-secondary">Cancel</button>
        <button id="btnSubmitTrainer" class="btn btn-primary">
          ${getIcon('check')} ${isEdit ? 'Update' : 'Add Trainer'}
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
  const txtExperience = overlay.querySelector('#txtTrainerExperience');
  const btnSubmit = overlay.querySelector('#btnSubmitTrainer');

  btnSubmit.addEventListener('click', e => {
    e.preventDefault();

    const name = txtName.value.trim();
    const expertise = txtExpertise.value.trim();
    const experience = txtExperience.value.trim();

    if (!name || !expertise) {
      toast.error('Trainer name and field of expertise are required.');
      return;
    }

    if (!isEdit) {
      state.addTrainer({ name, expertise, experience });
      toast.success(`Trainer "${name}" added!`);
    } else {
      state.updateTrainer(trainer.id, { name, expertise, experience });
      toast.success(`Trainer "${name}" updated!`);
    }

    close();
    onSave();
  });
}
