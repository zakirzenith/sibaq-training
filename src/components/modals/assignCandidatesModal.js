import { state } from '../../services/state.js';
import { excelService } from '../../services/excelService.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openAssignCandidatesModal({ programId, onSave = () => {} }) {
  const program = state.getProgramById(programId);
  if (!program) {
    toast.error('Program not found.');
    return;
  }

  // Work with a working set of assigned candidate IDs
  let assignedIds = new Set(program.candidateIds || []);
  let selectedTrainerId = program.trainerId || '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-xl saas-assign-modal">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="program-title-block">
          <div class="sdb-badges-row mb-1">
            <span class="saas-prog-capsule ${program.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">${program.code}</span>
            <span class="saas-tag-pill ${program.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
              ${program.type === 'Stage' ? getIcon('stage') : getIcon('nonStage')} ${program.type}
            </span>
            <span class="saas-tag-pill p-neutral">${program.category} Category</span>
          </div>
          <h2 class="modal-title" style="font-size: 20px; font-weight: 800; color: #0f172a;">${program.name}</h2>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body assign-modal-body" style="padding: 20px;">
        <!-- Top Section: Trainer Assignment & Assigned Candidates Pills -->
        <div class="assign-top-grid" style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; margin-bottom: 20px;">
          <!-- Trainer Assignment Card -->
          <div class="saas-section-card">
            <div class="ssc-head-title mb-2">
              <span>${getIcon('trainers')} Designated Trainer</span>
            </div>
            <div class="trainer-select-row" style="display: flex; flex-direction: column; gap: 10px;">
              <select id="modalTrainerSelect" class="saas-select-pill" style="width: 100%;">
                <option value="">-- No Trainer Assigned --</option>
              </select>
              <div id="trainerDetailsPreview" class="trainer-details-preview"></div>
            </div>
          </div>

          <!-- Currently Enrolled Summary Card -->
          <div class="saas-section-card">
            <div class="ssc-head mb-2" style="padding-bottom: 8px;">
              <div class="ssc-head-title">
                <span>${getIcon('candidates')} Enrolled Candidates</span>
                <span id="assignedCountBadge" class="saas-badge-pill">0</span>
              </div>
              <button id="btnClearAllAssigned" class="saas-pill-btn text-danger" style="padding: 3px 10px; font-size: 11px;">Clear All</button>
            </div>
            <div id="assignedChipsContainer" class="assigned-chips-container" style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 140px; overflow-y: auto; padding: 4px;">
              <!-- Dynamically filled with chips -->
            </div>
          </div>
        </div>

        <!-- Candidate Selection Toolbar -->
        <div class="saas-table-card" style="margin-bottom: 0;">
          <div class="saas-table-head-strip">
            <div>
              <div class="sth-title">Candidate Directory & Selector</div>
              <div class="text-xs text-muted">Select and link candidates into this program.</div>
            </div>
            <div class="picker-quick-actions" style="display: flex; gap: 6px;">
              <button id="btnFilterMatchingCat" class="saas-pill-btn" style="border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca;">
                ${getIcon('sparkles')} Match (${program.category})
              </button>
              <button id="btnSelectAllFiltered" class="saas-pill-btn">
                Select All Shown
              </button>
              <button id="btnDeselectAllFiltered" class="saas-pill-btn">
                Deselect All Shown
              </button>
            </div>
          </div>

          <!-- Filters Row -->
          <div class="saas-command-bar" style="margin: 12px 16px 8px 16px;">
            <div class="scb-search-wrap flex-1">
              <span class="scb-search-icon">${getIcon('search')}</span>
              <input 
                type="text" 
                id="searchCandidateInput" 
                class="scb-search-input" 
                placeholder="Search candidates by name, admission number, or class..."
              />
            </div>

            <div class="scb-filters-group">
              <select id="filterCategorySelect" class="saas-select-pill">
                <option value="ALL">All Categories</option>
              </select>

              <select id="filterClassSelect" class="saas-select-pill">
                <option value="ALL">All Classes</option>
              </select>
            </div>
          </div>

          <!-- Candidates Checklist Table -->
          <div class="saas-table-responsive" style="max-height: 260px; overflow-y: auto;">
            <table class="saas-data-table picker-table">
              <thead>
                <tr>
                  <th style="width: 44px;">
                    <input type="checkbox" id="thMasterCheckbox" title="Select / Deselect All Visible" />
                  </th>
                  <th style="width: 140px;">Admission No</th>
                  <th>Candidate Name</th>
                  <th>Category</th>
                  <th>Class</th>
                  <th>Other Enrollments</th>
                </tr>
              </thead>
              <tbody id="candidatesListBody">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
        <button id="btnExportRosterExcel" class="saas-pill-btn">
          ${getIcon('download')} Export Roster (.xlsx)
        </button>
        <div style="display: flex; gap: 8px;">
          <button id="btnCancelAssign" class="saas-pill-btn">Cancel</button>
          <button id="btnSaveAssignments" class="btn-saas-primary">
            ${getIcon('check')} Save Changes
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCancelAssign').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Elements
  const modalTrainerSelect = overlay.querySelector('#modalTrainerSelect');
  const trainerDetailsPreview = overlay.querySelector('#trainerDetailsPreview');
  const assignedChipsContainer = overlay.querySelector('#assignedChipsContainer');
  const assignedCountBadge = overlay.querySelector('#assignedCountBadge');
  const btnClearAllAssigned = overlay.querySelector('#btnClearAllAssigned');
  const searchCandidateInput = overlay.querySelector('#searchCandidateInput');
  const filterCategorySelect = overlay.querySelector('#filterCategorySelect');
  const filterClassSelect = overlay.querySelector('#filterClassSelect');
  const btnFilterMatchingCat = overlay.querySelector('#btnFilterMatchingCat');
  const btnSelectAllFiltered = overlay.querySelector('#btnSelectAllFiltered');
  const btnDeselectAllFiltered = overlay.querySelector('#btnDeselectAllFiltered');
  const thMasterCheckbox = overlay.querySelector('#thMasterCheckbox');
  const candidatesListBody = overlay.querySelector('#candidatesListBody');
  const btnSaveAssignments = overlay.querySelector('#btnSaveAssignments');
  const btnExportRosterExcel = overlay.querySelector('#btnExportRosterExcel');

  // Populate Trainers Select
  const allTrainers = state.getTrainers();
  allTrainers.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name} • ${t.expertise}`;
    if (String(t.id).trim() === String(selectedTrainerId || '').trim()) opt.selected = true;
    modalTrainerSelect.appendChild(opt);
  });

  function updateTrainerPreview() {
    const trn = state.getTrainerById(modalTrainerSelect.value);
    if (trn) {
      trainerDetailsPreview.innerHTML = `
        <div class="saas-trainer-mini-card">
          <div class="stc-avatar" style="background: ${trn.color || '#6366f1'}">
            ${trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="stc-info">
            <strong class="stc-name">${trn.name}</strong>
            <span class="text-xs text-muted">${trn.expertise} (${trn.experience || '5+ Years'})</span>
          </div>
        </div>
      `;
    } else {
      trainerDetailsPreview.innerHTML = `
        <div class="saas-empty-trainer-placeholder" style="padding: 8px;">
          <span class="text-muted text-xs">No trainer assigned to this program</span>
        </div>
      `;
    }
  }

  modalTrainerSelect.addEventListener('change', e => {
    selectedTrainerId = e.target.value;
    updateTrainerPreview();
  });
  updateTrainerPreview();

  // Populate Filter Selects
  const allCandidates = state.getCandidates();
  const categories = Array.from(new Set(allCandidates.map(c => c.category).filter(Boolean))).sort();
  const classes = Array.from(new Set(allCandidates.map(c => c.class).filter(Boolean))).sort();

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCategorySelect.appendChild(opt);
  });

  classes.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    filterClassSelect.appendChild(opt);
  });

  // Render assigned chips
  function renderAssignedChips() {
    assignedCountBadge.textContent = assignedIds.size;
    assignedChipsContainer.innerHTML = '';

    if (assignedIds.size === 0) {
      assignedChipsContainer.innerHTML = `
        <div class="no-assigned-placeholder text-muted">
          No candidates enrolled in this program yet. Check candidates below to assign.
        </div>
      `;
      return;
    }

    assignedIds.forEach(cId => {
      const candidate = state.getCandidateById(cId);
      if (!candidate) return;

      const initials = candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('');
      const chip = document.createElement('div');
      chip.className = 'saas-candidate-chip';
      chip.innerHTML = `
        <span class="scc-avatar">${initials}</span>
        <span class="scc-name">${candidate.name}</span>
        <span class="scc-code">${candidate.adNo}</span>
        <button class="scc-remove" data-id="${candidate.id}" title="Remove candidate">×</button>
      `;

      chip.querySelector('.scc-remove').addEventListener('click', e => {
        e.stopPropagation();
        assignedIds.delete(cId);
        renderAssignedChips();
        renderCandidatesTable();
      });

      assignedChipsContainer.appendChild(chip);
    });
  }

  btnClearAllAssigned.addEventListener('click', () => {
    if (assignedIds.size === 0) return;
    if (confirm('Are you sure you want to remove all candidates from this program?')) {
      assignedIds.clear();
      renderAssignedChips();
      renderCandidatesTable();
    }
  });

  // Filter candidates logic
  function getFilteredCandidates() {
    const query = searchCandidateInput.value.toLowerCase().trim();
    const selCat = filterCategorySelect.value;
    const selCls = filterClassSelect.value;

    return allCandidates.filter(c => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.adNo.toLowerCase().includes(query) ||
        (c.class && c.class.toLowerCase().includes(query));

      const matchesCat = selCat === 'ALL' || c.category === selCat;
      const matchesCls = selCls === 'ALL' || c.class === selCls;

      return matchesSearch && matchesCat && matchesCls;
    });
  }

  function renderCandidatesTable() {
    const list = getFilteredCandidates();
    candidatesListBody.innerHTML = '';

    if (list.length === 0) {
      candidatesListBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            No candidates match your search or filter criteria.
          </td>
        </tr>
      `;
      thMasterCheckbox.checked = false;
      return;
    }

    let allVisibleSelected = true;

    list.forEach(c => {
      const isSelected = assignedIds.has(c.id);
      if (!isSelected) allVisibleSelected = false;
      const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');

      // Get other programs this candidate is in
      const otherPrograms = state
        .getCandidatePrograms(c.id)
        .filter(p => p.id !== program.id);

      const tr = document.createElement('tr');
      tr.className = `saas-table-row ${isSelected ? 'row-selected' : ''}`;

      tr.innerHTML = `
        <td>
          <input type="checkbox" class="candidate-row-chk" data-id="${c.id}" ${isSelected ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;" />
        </td>
        <td><span class="saas-adno-pill">${c.adNo}</span></td>
        <td>
          <div class="saas-student-cell">
            <div class="saas-avatar-soft" style="width: 28px; height: 28px; font-size: 11px;">${initials}</div>
            <strong class="candidate-row-name">${c.name}</strong>
          </div>
        </td>
        <td>
          <span class="saas-tag-pill ${
            c.category.toLowerCase() === program.category.toLowerCase()
              ? 'p-stage'
              : 'p-neutral'
          }">
            ${c.category}
          </span>
        </td>
        <td><span class="saas-class-pill">${c.class || '-'}</span></td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${
              otherPrograms.length > 0
                ? otherPrograms
                    .map(
                      p => `<span class="saas-prog-capsule p-neutral" title="${p.name}">[${p.code}]</span>`
                    )
                    .join('')
                : '<span class="text-muted text-xs">None</span>'
            }
          </div>
        </td>
      `;

      const chk = tr.querySelector('.candidate-row-chk');
      chk.addEventListener('change', () => {
        if (chk.checked) {
          assignedIds.add(c.id);
          tr.classList.add('row-selected');
        } else {
          assignedIds.delete(c.id);
          tr.classList.remove('row-selected');
        }
        renderAssignedChips();
      });

      // Clicking row toggles checkbox
      tr.addEventListener('click', e => {
        if (e.target.tagName.toLowerCase() === 'input') return;
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change'));
      });

      candidatesListBody.appendChild(tr);
    });

    thMasterCheckbox.checked = allVisibleSelected;
  }

  // Filter events
  searchCandidateInput.addEventListener('input', renderCandidatesTable);
  filterCategorySelect.addEventListener('change', renderCandidatesTable);
  filterClassSelect.addEventListener('change', renderCandidatesTable);

  btnFilterMatchingCat.addEventListener('click', () => {
    filterCategorySelect.value = program.category;
    renderCandidatesTable();
  });

  btnSelectAllFiltered.addEventListener('click', () => {
    const list = getFilteredCandidates();
    list.forEach(c => assignedIds.add(c.id));
    renderAssignedChips();
    renderCandidatesTable();
  });

  btnDeselectAllFiltered.addEventListener('click', () => {
    const list = getFilteredCandidates();
    list.forEach(c => assignedIds.delete(c.id));
    renderAssignedChips();
    renderCandidatesTable();
  });

  thMasterCheckbox.addEventListener('change', () => {
    const list = getFilteredCandidates();
    if (thMasterCheckbox.checked) {
      list.forEach(c => assignedIds.add(c.id));
    } else {
      list.forEach(c => assignedIds.delete(c.id));
    }
    renderAssignedChips();
    renderCandidatesTable();
  });

  // Save changes
  btnSaveAssignments.addEventListener('click', () => {
    // Save candidates and trainer atomically in one update
    state.assignProgramRoster(program.id, {
      candidateIds: Array.from(assignedIds),
      trainerId: selectedTrainerId ? selectedTrainerId.trim() : null
    });

    toast.success(`Updated assignments for "${program.name}" (${assignedIds.size} candidates).`);
    close();
    onSave();
  });

  // Export roster
  btnExportRosterExcel.addEventListener('click', () => {
    const assignedCandidates = Array.from(assignedIds)
      .map(id => state.getCandidateById(id))
      .filter(Boolean);
    const trainer = state.getTrainerById(selectedTrainerId);
    excelService.exportSingleProgram(program, assignedCandidates, trainer);
    toast.info(`Exported roster for [${program.code}] ${program.name}`);
  });

  // Initial render
  renderAssignedChips();
  renderCandidatesTable();
}
