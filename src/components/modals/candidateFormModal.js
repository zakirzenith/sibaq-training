import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openCandidateFormModal({ candidate = null, onSave = () => {} }) {
  const isEdit = Boolean(candidate);
  const title = isEdit ? 'Edit Candidate' : 'Add New Candidate';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <div>
          <div class="modal-badge">Candidates Registry</div>
          <h2 class="modal-title">${title}</h2>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="candidateForm" class="modal-body">
        <div class="form-group">
          <label class="form-label" for="txtAdNo">Admission Number *</label>
          <input 
            type="text" 
            id="txtAdNo" 
            class="form-input" 
            required 
            placeholder="e.g. AD-2026-45"
            value="${candidate ? candidate.adNo : ''}"
          />
          <div class="form-hint">Unique identifier / Roll number for candidate</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="txtName">Full Name *</label>
          <input 
            type="text" 
            id="txtName" 
            class="form-input" 
            required 
            placeholder="e.g. Liam Henderson"
            value="${candidate ? candidate.name : ''}"
          />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="selCategory">Category *</label>
            <select id="selCategory" class="form-select">
              <option value="Senior" ${candidate && candidate.category === 'Senior' ? 'selected' : ''}>Senior</option>
              <option value="Junior" ${candidate && candidate.category === 'Junior' ? 'selected' : ''}>Junior</option>
              <option value="Sub-Junior" ${candidate && candidate.category === 'Sub-Junior' ? 'selected' : ''}>Sub-Junior</option>
              <option value="General" ${!candidate || candidate.category === 'General' ? 'selected' : ''}>General</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label" for="txtClass">Class / Grade</label>
            <input 
              type="text" 
              id="txtClass" 
              class="form-input" 
              placeholder="e.g. Grade 11-A"
              value="${candidate ? candidate.class : ''}"
            />
          </div>
        </div>
      </form>

      <div class="modal-footer">
        <button id="btnCancelCandidate" class="btn btn-secondary">Cancel</button>
        <button id="btnSubmitCandidate" class="btn btn-primary">
          ${getIcon('check')} ${isEdit ? 'Update Candidate' : 'Add Candidate'}
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
  overlay.querySelector('#btnCancelCandidate').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const txtAdNo = overlay.querySelector('#txtAdNo');
  const txtName = overlay.querySelector('#txtName');
  const selCategory = overlay.querySelector('#selCategory');
  const txtClass = overlay.querySelector('#txtClass');
  const btnSubmit = overlay.querySelector('#btnSubmitCandidate');

  btnSubmit.addEventListener('click', e => {
    e.preventDefault();

    const adNo = txtAdNo.value.trim();
    const name = txtName.value.trim();
    const category = selCategory.value;
    const studentClass = txtClass.value.trim();

    if (!adNo || !name) {
      toast.error('Admission number and candidate name are required.');
      return;
    }

    // Check duplicate adNo if adding
    if (!isEdit) {
      const existing = state.getCandidateByAdNo(adNo);
      if (existing) {
        toast.error(`Admission number "${adNo}" is already registered to ${existing.name}.`);
        return;
      }

      state.addCandidate({ adNo, name, category, class: studentClass });
      toast.success(`Candidate ${name} added successfully!`);
    } else {
      state.updateCandidate(candidate.id, { adNo, name, category, class: studentClass });
      toast.success(`Candidate ${name} updated successfully!`);
    }

    close();
    onSave();
  });
}
