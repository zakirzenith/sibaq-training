import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';

export function openCandidateFormModal({
  candidate = null,
  programId = null,
  defaultCategory = null,
  onSave = () => {}
}) {
  const isEdit = Boolean(candidate);
  const title = isEdit ? 'Edit Candidate' : 'Add New Candidate';

  const allPrograms = state.getPrograms();
  const allCategories = state.getAvailableCategories();

  // If editing, load the candidate's currently enrolled program IDs
  // If adding, if programId was supplied, pre-select it
  const initialEnrolledIds = isEdit
    ? state.getCandidatePrograms(candidate.id).map(p => String(p.id).trim())
    : (programId ? [String(programId).trim()] : []);

  const selectedProgramIds = new Set(initialEnrolledIds);

  const initialCategory = candidate
    ? candidate.category
    : (defaultCategory || (allCategories.includes('BIDĀYAH') ? 'BIDĀYAH' : (allCategories[0] || 'General')));

  let currentProgramSearch = '';
  let programCategoryFilter = 'MATCH_CANDIDATE'; // 'MATCH_CANDIDATE', 'ALL', or specific category

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md" style="max-width: 640px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 16px 20px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: #eef2ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
            ${getIcon('candidates')}
          </div>
          <div>
            <div class="modal-badge">Candidates & Programs Registry</div>
            <h2 class="modal-title" style="font-size: 18px; margin: 2px 0 0 0; color: #0f172a;">${title}</h2>
          </div>
        </div>
        <button class="modal-close-btn" id="btnCandidateModalClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <form id="candidateForm" class="modal-body" style="overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: #f8fafc;">
        
        <!-- Candidate Profile Details Card -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
            Candidate Basic Information
          </div>

          <div class="form-row" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="txtAdNo" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Admission / Chest No *
              </label>
              <input 
                type="text" 
                id="txtAdNo" 
                class="form-input" 
                required 
                placeholder="e.g. AD-104 or 104"
                value="${candidate ? (candidate.adNo || '') : ''}"
                style="height: 38px; font-size: 13px;"
              />
              <div id="adNoFeedback" style="font-size: 11px; margin-top: 4px; display: none;"></div>
            </div>

            <div class="form-group flex-1" style="min-width: 220px; margin-bottom: 0;">
              <label class="form-label" for="txtName" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Full Name *
              </label>
              <input 
                type="text" 
                id="txtName" 
                class="form-input" 
                required 
                placeholder="e.g. Muhammad Al-Ameen"
                value="${candidate ? (candidate.name || '') : ''}"
                style="height: 38px; font-size: 13px;"
              />
            </div>
          </div>

          <div class="form-row" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="selCategory" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Category Division *
              </label>
              <select id="selCategory" class="form-select" style="height: 38px; font-size: 13px;">
                ${allCategories.map(cat => `
                  <option value="${cat}" ${cat === initialCategory ? 'selected' : ''}>
                    ${cat}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="txtClass" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Class / Grade (Optional)
              </label>
              <input 
                type="text" 
                id="txtClass" 
                class="form-input" 
                placeholder="e.g. Standard 8-B"
                value="${candidate ? (candidate.class || '') : ''}"
                style="height: 38px; font-size: 13px;"
              />
            </div>
          </div>
        </div>

        <!-- Program Enrollment Section -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #4f46e5;">${getIcon('programs')}</span>
              <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">
                Enroll In Programs
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="candSelectedProgsCountBadge" class="badge badge-stage" style="font-size: 11px; font-weight: 800; padding: 2px 8px;">
                ${selectedProgramIds.size} Selected
              </span>
            </div>
          </div>

          <!-- Programs Search & Category Filter Strip -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div class="reports-search-box" style="flex: 1; min-width: 180px; margin-bottom: 0;">
              <span class="search-icon">${getIcon('search')}</span>
              <input 
                type="text" 
                id="inpCandProgSearch" 
                class="search-input" 
                placeholder="Search programs by code or name..." 
                style="height: 34px; font-size: 12px;"
              />
            </div>

            <div style="display: flex; gap: 6px; align-items: center;">
              <select id="selCandProgCategoryFilter" class="form-select" style="height: 34px; font-size: 11.5px; padding: 0 8px; width: auto; font-weight: 600;">
                <option value="MATCH_CANDIDATE">Category: Match Candidate</option>
                <option value="ALL">Show All Categories</option>
                ${allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
              </select>

              <button type="button" id="btnSelectAllVisibleProgs" class="btn btn-sm btn-outline" style="height: 34px; font-size: 11px; padding: 0 8px; white-space: nowrap;" title="Select all currently visible programs">
                Select All
              </button>
              <button type="button" id="btnClearSelectedProgs" class="btn btn-sm btn-outline text-danger" style="height: 34px; font-size: 11px; padding: 0 8px; white-space: nowrap;" title="Clear selected programs">
                Clear
              </button>
            </div>
          </div>

          <!-- Programs Checklist Container -->
          <div id="candProgramsListContainer" style="max-height: 230px; overflow-y: auto; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px; background: #f8fafc; display: flex; flex-direction: column; gap: 4px;">
            <!-- Rendered dynamically -->
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
            <span>Candidates can be enrolled in multiple stage & non-stage items.</span>
            <span id="candVisibleProgsCount">0 programs available</span>
          </div>
        </div>

      </form>

      <!-- Modal Footer -->
      <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
        <button id="btnCancelCandidate" type="button" class="btn btn-secondary" style="font-weight: 700; font-size: 13px; height: 38px; padding: 0 16px;">
          Cancel
        </button>
        <button id="btnSubmitCandidate" type="button" class="btn btn-primary" style="font-weight: 800; font-size: 13px; height: 38px; padding: 0 20px; gap: 6px;">
          ${getIcon('check')} <span>${isEdit ? 'Update Candidate & Roster' : 'Add Candidate & Enroll'}</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnCandidateModalClose').addEventListener('click', close);
  overlay.querySelector('#btnCancelCandidate').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const txtAdNo = overlay.querySelector('#txtAdNo');
  const txtName = overlay.querySelector('#txtName');
  const selCategory = overlay.querySelector('#selCategory');
  const txtClass = overlay.querySelector('#txtClass');
  const btnSubmit = overlay.querySelector('#btnSubmitCandidate');

  const inpSearch = overlay.querySelector('#inpCandProgSearch');
  const selFilter = overlay.querySelector('#selCandProgCategoryFilter');
  const listContainer = overlay.querySelector('#candProgramsListContainer');
  const badgeCount = overlay.querySelector('#candSelectedProgsCountBadge');
  const countVisibleLabel = overlay.querySelector('#candVisibleProgsCount');
  const btnSelectAll = overlay.querySelector('#btnSelectAllVisibleProgs');
  const btnClearAll = overlay.querySelector('#btnClearSelectedProgs');

  // Filter programs based on search and category
  const getVisiblePrograms = () => {
    const candidateCat = selCategory.value.trim().toLowerCase();
    const query = currentProgramSearch.toLowerCase().trim();

    return allPrograms.filter(prog => {
      // 1. Text search
      if (query) {
        const matchesCode = (prog.code || '').toLowerCase().includes(query);
        const matchesName = (prog.name || '').toLowerCase().includes(query);
        if (!matchesCode && !matchesName) return false;
      }

      // 2. Category filter
      if (programCategoryFilter === 'MATCH_CANDIDATE') {
        const pCat = (prog.category || '').trim().toLowerCase();
        // If program category equals candidate category or is General/Shared
        if (pCat && candidateCat) {
          const isMatch = pCat === candidateCat ||
                          pCat.includes(candidateCat) ||
                          candidateCat.includes(pCat) ||
                          pCat === 'general';
          if (!isMatch) return false;
        }
      } else if (programCategoryFilter !== 'ALL') {
        const target = programCategoryFilter.trim().toLowerCase();
        const pCat = (prog.category || '').trim().toLowerCase();
        if (pCat !== target) return false;
      }

      return true;
    });
  };

  const renderProgramsList = () => {
    const visible = getVisiblePrograms();
    countVisibleLabel.textContent = `${visible.length} program${visible.length === 1 ? '' : 's'} available`;
    badgeCount.textContent = `${selectedProgramIds.size} Selected`;

    if (visible.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 12px; color: #64748b; font-size: 12.5px;">
          No programs match your search or category filter.
          <div style="margin-top: 6px;">
            <button type="button" id="btnShowAllProgsPrompt" class="btn btn-sm btn-outline" style="font-size: 11px; height: 26px;">
              Show All Categories
            </button>
          </div>
        </div>
      `;
      const btnPrompt = listContainer.querySelector('#btnShowAllProgsPrompt');
      if (btnPrompt) {
        btnPrompt.addEventListener('click', () => {
          programCategoryFilter = 'ALL';
          selFilter.value = 'ALL';
          renderProgramsList();
        });
      }
      return;
    }

    listContainer.innerHTML = visible.map(prog => {
      const pid = String(prog.id).trim();
      const isSelected = selectedProgramIds.has(pid);
      const isStage = prog.type === 'Stage';
      const trainer = prog.trainerId ? state.getTrainerById(prog.trainerId) : null;
      const candCount = prog.candidateIds ? prog.candidateIds.length : 0;

      return `
        <label class="cand-prog-checkbox-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; border-radius: 6px; border: 1.5px solid ${isSelected ? '#818cf8' : '#e2e8f0'}; background: ${isSelected ? '#eef2ff' : '#ffffff'}; cursor: pointer; transition: all 0.12s ease; user-select: none;">
          <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
            <input 
              type="checkbox" 
              class="chk-prog-item" 
              data-pid="${pid}" 
              ${isSelected ? 'checked' : ''} 
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #4f46e5; flex-shrink: 0;"
            />
            <span class="badge ${isStage ? 'p-stage' : 'p-nonstage'}" style="font-size: 10.5px; font-weight: 800; padding: 2px 6px; flex-shrink: 0;">
              [${prog.code}]
            </span>
            <div style="min-width: 0;">
              <strong style="font-size: 12.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">
                ${prog.name}
              </strong>
              <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">
                ${prog.category || 'General'} ${trainer ? `• Mentor: ${trainer.name}` : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <span class="badge badge-neutral" style="font-size: 9.5px; padding: 1px 6px;">
              ${candCount} cand
            </span>
            <span class="badge ${isStage ? 'badge-stage' : 'badge-neutral'}" style="font-size: 9.5px; padding: 1px 5px;">
              ${prog.type}
            </span>
          </div>
        </label>
      `;
    }).join('');

    // Bind checkboxes
    listContainer.querySelectorAll('.chk-prog-item').forEach(chk => {
      chk.addEventListener('change', () => {
        const pid = chk.getAttribute('data-pid');
        if (chk.checked) {
          selectedProgramIds.add(pid);
        } else {
          selectedProgramIds.delete(pid);
        }
        renderProgramsList();
      });
    });
  };

  // Live search
  inpSearch.addEventListener('input', e => {
    currentProgramSearch = e.target.value;
    renderProgramsList();
  });

  // Category filter
  selFilter.addEventListener('change', e => {
    programCategoryFilter = e.target.value;
    renderProgramsList();
  });

  // Candidate category change should refresh the MATCH_CANDIDATE filter
  selCategory.addEventListener('change', () => {
    if (programCategoryFilter === 'MATCH_CANDIDATE') {
      renderProgramsList();
    }
  });

  // Select all visible
  btnSelectAll.addEventListener('click', () => {
    const visible = getVisiblePrograms();
    visible.forEach(p => selectedProgramIds.add(String(p.id).trim()));
    renderProgramsList();
  });

  // Clear all selections
  btnClearAll.addEventListener('click', () => {
    selectedProgramIds.clear();
    renderProgramsList();
  });

  // Live validation for Admission / Chest No
  const adNoFeedback = overlay.querySelector('#adNoFeedback');
  const validateAdNo = () => {
    const val = txtAdNo.value.trim();
    if (!val) {
      txtAdNo.style.borderColor = '';
      if (adNoFeedback) {
        adNoFeedback.style.display = 'none';
        adNoFeedback.textContent = '';
      }
      return null;
    }

    const existing = state.getCandidateByAdNo(val);
    const isSelf = isEdit && candidate && existing && String(existing.id).trim() === String(candidate.id).trim();

    if (existing && !isSelf) {
      txtAdNo.style.borderColor = '#ef4444';
      if (adNoFeedback) {
        adNoFeedback.style.display = 'block';
        adNoFeedback.style.color = '#dc2626';
        adNoFeedback.innerHTML = `<strong>⚠️ Duplicate:</strong> Number "${val}" is already registered to <strong>${existing.name}</strong>.`;
      }
      return existing;
    } else {
      txtAdNo.style.borderColor = '#10b981';
      if (adNoFeedback) {
        adNoFeedback.style.display = 'block';
        adNoFeedback.style.color = '#059669';
        adNoFeedback.textContent = '✓ Number is available';
      }
      return null;
    }
  };

  txtAdNo.addEventListener('input', validateAdNo);
  txtAdNo.addEventListener('blur', validateAdNo);

  // Submit handler
  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();

    const adNo = txtAdNo.value.trim();
    const name = txtName.value.trim();
    const category = selCategory.value;
    const studentClass = txtClass.value.trim();
    const programIds = Array.from(selectedProgramIds);

    if (!adNo || !name) {
      toast.error('Admission number and candidate name are required.');
      return;
    }

    // Check duplicate adNo / chestNo
    const duplicate = validateAdNo();
    if (duplicate) {
      toast.error(`Admission / Chest No "${adNo}" is already assigned to "${duplicate.name}". Cannot add duplicate candidate.`);
      txtAdNo.focus();
      return;
    }

    // Double check via state
    const existing = state.getCandidateByAdNo(adNo);
    const isSelf = isEdit && candidate && existing && String(existing.id).trim() === String(candidate.id).trim();
    if (existing && !isSelf) {
      toast.error(`Admission / Chest No "${adNo}" is already registered to "${existing.name}". Duplicate candidates cannot be created.`);
      txtAdNo.focus();
      return;
    }

    if (!isEdit) {
      const newCand = state.addCandidate({
        adNo,
        chestNo: adNo,
        name,
        category,
        class: studentClass,
        programIds
      });

      if (!newCand) {
        toast.error(`Could not add candidate: Admission / Chest No "${adNo}" is already registered.`);
        txtAdNo.focus();
        return;
      }

      toast.success(
        programIds.length > 0
          ? `Candidate "${name}" added and enrolled in ${programIds.length} program(s)!`
          : `Candidate "${name}" added successfully!`
      );
      close();
      onSave(newCand);
    } else {
      const updatedCand = state.updateCandidate(candidate.id, {
        adNo,
        chestNo: adNo,
        name,
        category,
        class: studentClass,
        programIds
      });

      if (!updatedCand) {
        toast.error(`Could not update candidate: Admission / Chest No "${adNo}" is already in use by another candidate.`);
        txtAdNo.focus();
        return;
      }

      toast.success(
        programIds.length > 0
          ? `Candidate "${name}" updated with ${programIds.length} enrolled program(s)!`
          : `Candidate "${name}" updated successfully!`
      );
      close();
      onSave(updatedCand);
    }
  };

  btnSubmit.addEventListener('click', handleFormSubmit);
  const formEl = overlay.querySelector('#candidateForm');
  if (formEl) formEl.addEventListener('submit', handleFormSubmit);

  // Initial render
  renderProgramsList();
}
