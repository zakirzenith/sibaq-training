import { state } from '../services/state.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openProgramFormModal } from './modals/programFormModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { openCandidateSelectModal } from './modals/candidateSelectModal.js';
import { createFilterBar } from './filterEngine.js';

export function renderProgramsView(container, navigateTo) {
  let activeFilters = {};
  let currentSearchQuery = '';
  let selectedProgramId = null;
  let isSelectionMode = false;
  const selectedProgramIds = new Set();

  function getProgramsList() {
    const programs = state.getPrograms();
    return programs.filter(p => {
      const q = currentSearchQuery.toLowerCase().trim();
      const pName = String(p.name || '').toLowerCase();
      const pCode = String(p.code || '').toLowerCase();
      const pCat = String(p.category || '').toLowerCase();

      const matchesSearch = !q || pName.includes(q) || pCode.includes(q) || pCat.includes(q);
      if (!matchesSearch) return false;

      // Filter: Type
      if (activeFilters.type) {
        if (String(p.type || '').trim().toLowerCase() !== String(activeFilters.type).trim().toLowerCase()) return false;
      }

      // Filter: Category
      if (activeFilters.category) {
        const itemCat = String(p.category || 'General').trim().toLowerCase();
        const targetCat = String(activeFilters.category).trim().toLowerCase();
        if (itemCat !== targetCat) return false;
      }

      // Filter: Trainer Assignment
      if (activeFilters.trainer) {
        const hasTrainer = Boolean(p.trainerId && state.getTrainerById(p.trainerId));
        if (activeFilters.trainer === 'Assigned' && !hasTrainer) return false;
        if (activeFilters.trainer === 'Unassigned' && hasTrainer) return false;
      }

      // Filter: Candidate Enrollment
      if (activeFilters.enrollment) {
        const hasCandidates = Boolean(p.candidateIds && p.candidateIds.length > 0);
        if (activeFilters.enrollment === 'With Candidates' && !hasCandidates) return false;
        if (activeFilters.enrollment === 'No Candidates' && hasCandidates) return false;
      }

      return true;
    });
  }

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Programs & Assignments</h1>
      </div>

      <div class="saas-header-actions">
        <div class="saas-action-pill-group desktop-only-btn">
          <button id="btnDownloadProgTemplate" class="saas-pill-btn" title="Download formatted sample Excel sheet">
            ${getIcon('fileSpreadsheet')} Template
          </button>
          <button id="btnExportPrograms" class="saas-pill-btn" title="Export all programs to Excel">
            ${getIcon('download')} Export
          </button>
          <button id="btnBulkUploadPrograms" class="saas-pill-btn" title="Bulk upload programs from Excel">
            ${getIcon('upload')} Bulk Upload
          </button>
        </div>

        <button id="btnAddProgram" class="btn-saas-primary">
          ${getIcon('plus')} Add Program
        </button>
      </div>
    </div>

    <!-- Master-Detail 2-Side Layout -->
    <div class="programs-split-layout" id="programsSplitLayout">
      <!-- LEFT SIDE: All Programs List with Filter Engine -->
      <div class="programs-left-col">
        <div class="left-col-header" style="padding-bottom: 6px;">
          <!-- Modern Notion/Linear Filter Engine -->
          <div id="programsFilterBarContainer"></div>

          <!-- Selection & Count Sub-bar -->
          <div class="programs-selection-bar" id="programsSelectionBar">
            <div class="psb-left">
              <span class="programs-count-pill" id="progCountDisplay">-- Programs</span>
            </div>
            <div class="psb-right">
              <button type="button" id="btnToggleProgramSelectMode" class="btn-select-toggle" title="Select programs for bulk actions">
                ${getIcon('checkSquare')} <span>Select</span>
              </button>
              <button type="button" id="btnSelectAllPrograms" class="btn-select-all" style="display: none;">
                Select All
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable Cards List -->
        <div id="programsListContainer" class="programs-scroll-list">
          <!-- Dynamically populated -->
        </div>

        <!-- Floating Bulk Action Bar (Visible when 1+ programs selected) -->
        <div class="programs-bulk-actions-bar" id="progBulkBar" style="display: none;">
          <div class="pba-info">
            <span class="pba-count-badge" id="pbaCountBadge">0</span>
            <span class="pba-text">selected</span>
          </div>
          <div class="pba-buttons">
            <button type="button" class="btn-pba-delete" id="btnBulkDeletePrograms">
              ${getIcon('trash')} <span>Delete Selected</span>
            </button>
            <button type="button" class="btn-pba-cancel" id="btnCancelBulkSelect">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: Dedicated Program Control Center (Candidates & Trainer) -->
      <div class="programs-right-col" id="programDetailContainer">
        <!-- Dynamically rendered for active program -->
      </div>
    </div>
  `;

  const splitLayout = container.querySelector('#programsSplitLayout');
  const programsListContainer = container.querySelector('#programsListContainer');
  const programDetailContainer = container.querySelector('#programDetailContainer');
  const filterBarContainer = container.querySelector('#programsFilterBarContainer');
  const progCountDisplay = container.querySelector('#progCountDisplay');
  const btnToggleProgramSelectMode = container.querySelector('#btnToggleProgramSelectMode');
  const btnSelectAllPrograms = container.querySelector('#btnSelectAllPrograms');
  const progBulkBar = container.querySelector('#progBulkBar');
  const pbaCountBadge = container.querySelector('#pbaCountBadge');
  const btnBulkDeletePrograms = container.querySelector('#btnBulkDeletePrograms');
  const btnCancelBulkSelect = container.querySelector('#btnCancelBulkSelect');

  // Modern Notion/Linear Filter Engine for Programs
  createFilterBar({
    container: filterBarContainer,
    searchPlaceholder: 'Search by code, title, or category...',
    filterConfig: [
      {
        key: 'type',
        label: 'Type',
        icon: 'stage',
        getOptions: () => {
          const progs = state.getPrograms();
          const stageCount = progs.filter(p => p.type === 'Stage').length;
          const nonStageCount = progs.filter(p => p.type === 'Non-Stage').length;
          return [
            { value: 'Stage', label: 'Stage Only', count: stageCount },
            { value: 'Non-Stage', label: 'Non-Stage Only', count: nonStageCount }
          ];
        }
      },
      {
        key: 'category',
        label: 'Category',
        icon: 'tag',
        getOptions: () => {
          const progs = state.getPrograms();
          const counts = {};
          progs.forEach(p => {
            const cat = String(p.category || 'General').trim();
            counts[cat] = (counts[cat] || 0) + 1;
          });
          return Object.keys(counts).sort().map(cat => ({
            value: cat,
            label: cat,
            count: counts[cat]
          }));
        }
      },
      {
        key: 'trainer',
        label: 'Trainer Assignment',
        icon: 'trainers',
        getOptions: () => {
          const progs = state.getPrograms();
          const assigned = progs.filter(p => p.trainerId && state.getTrainerById(p.trainerId)).length;
          const unassigned = progs.length - assigned;
          return [
            { value: 'Assigned', label: 'Trainer Assigned', count: assigned },
            { value: 'Unassigned', label: 'No Trainer Assigned', count: unassigned }
          ];
        }
      },
      {
        key: 'enrollment',
        label: 'Candidate Roster',
        icon: 'users',
        getOptions: () => {
          const progs = state.getPrograms();
          const withCands = progs.filter(p => p.candidateIds && p.candidateIds.length > 0).length;
          const noCands = progs.length - withCands;
          return [
            { value: 'With Candidates', label: 'Has Candidates', count: withCands },
            { value: 'No Candidates', label: 'No Candidates Yet', count: noCands }
          ];
        }
      }
    ],
    onFilterChange: (filters, search) => {
      activeFilters = filters;
      currentSearchQuery = search;
      renderLeftList();
    }
  });

  function updateBulkBar() {
    const count = selectedProgramIds.size;
    if (count > 0) {
      progBulkBar.style.display = 'flex';
      pbaCountBadge.textContent = count;
      const delBtnText = btnBulkDeletePrograms.querySelector('span');
      if (delBtnText) delBtnText.textContent = `Delete (${count})`;
    } else {
      progBulkBar.style.display = 'none';
    }

    const currentList = getProgramsList();
    if (isSelectionMode && currentList.length > 0) {
      btnSelectAllPrograms.textContent = selectedProgramIds.size === currentList.length ? 'Deselect All' : 'Select All';
    }
  }

  // Toggle selection mode
  btnToggleProgramSelectMode.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) {
      selectedProgramIds.clear();
      btnToggleProgramSelectMode.classList.remove('active');
      btnToggleProgramSelectMode.innerHTML = `${getIcon('checkSquare')} <span>Select</span>`;
      btnSelectAllPrograms.style.display = 'none';
    } else {
      btnToggleProgramSelectMode.classList.add('active');
      btnToggleProgramSelectMode.innerHTML = `${getIcon('x')} <span>Done</span>`;
      btnSelectAllPrograms.style.display = 'inline-flex';
    }
    updateBulkBar();
    renderLeftList();
  });

  // Select all / Deselect all
  btnSelectAllPrograms.addEventListener('click', () => {
    const currentList = getProgramsList();
    if (selectedProgramIds.size === currentList.length) {
      selectedProgramIds.clear();
    } else {
      currentList.forEach(p => selectedProgramIds.add(p.id));
    }
    updateBulkBar();
    renderLeftList();
  });

  // Cancel bulk selection
  btnCancelBulkSelect.addEventListener('click', () => {
    selectedProgramIds.clear();
    isSelectionMode = false;
    btnToggleProgramSelectMode.classList.remove('active');
    btnToggleProgramSelectMode.innerHTML = `${getIcon('checkSquare')} <span>Select</span>`;
    btnSelectAllPrograms.style.display = 'none';
    updateBulkBar();
    renderLeftList();
  });

  // Execute bulk deletion
  btnBulkDeletePrograms.addEventListener('click', () => {
    const count = selectedProgramIds.size;
    if (count === 0) return;

    if (confirm(`Are you sure you want to delete ${count} program${count > 1 ? 's' : ''}? This will also unassign enrolled candidates and mentors.`)) {
      const deletedCount = state.deleteProgramsBulk(Array.from(selectedProgramIds));
      toast.success(`Successfully deleted ${deletedCount} program${deletedCount > 1 ? 's' : ''}.`);
      selectedProgramIds.clear();
      isSelectionMode = false;
      btnToggleProgramSelectMode.classList.remove('active');
      btnToggleProgramSelectMode.innerHTML = `${getIcon('checkSquare')} <span>Select</span>`;
      btnSelectAllPrograms.style.display = 'none';
      updateBulkBar();

      splitLayout.classList.remove('mobile-show-detail');
      renderLeftList();
    }
  });

  function renderLeftList() {
    const list = getProgramsList();
    programsListContainer.innerHTML = '';
    progCountDisplay.textContent = `${list.length} Program${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
      programsListContainer.innerHTML = `
        <div class="empty-state-card py-4" style="text-align: center; padding: 36px 16px;">
          <div class="empty-icon">${getIcon('programs')}</div>
          <h4 style="margin: 8px 0 4px; font-size: 15px;">No matching programs</h4>
          <p class="text-xs text-muted">Try clearing or adjusting your active filters.</p>
        </div>
      `;
      renderRightDetail(null);
      return;
    }

    if (!selectedProgramId || !list.some(p => p.id === selectedProgramId)) {
      selectedProgramId = list[0].id;
    }

    list.forEach(p => {
      const isSelected = p.id === selectedProgramId;
      const isChecked = selectedProgramIds.has(p.id);
      const isStage = p.type === 'Stage';
      const trainer = p.trainerId ? state.getTrainerById(p.trainerId) : null;
      const candidatesCount = p.candidateIds ? p.candidateIds.length : 0;

      const item = document.createElement('div');
      item.className = `prog-sidebar-card ${isSelected ? 'active-program' : ''} ${
        isStage ? 'prog-card-stage' : 'prog-card-nonstage'
      } ${isChecked ? 'is-bulk-checked' : ''}`;
      item.setAttribute('data-id', p.id);

      item.innerHTML = `
        <div class="prog-side-header">
          <div class="prog-side-header-left">
            ${isSelectionMode ? `
              <div class="prog-card-select-box ${isChecked ? 'checked' : ''}" data-action="toggle-select">
                ${isChecked ? getIcon('check') : ''}
              </div>
            ` : ''}
            <span class="program-code-pill">${p.code}</span>
            <span class="badge ${isStage ? 'badge-stage' : 'badge-nonstage'}">
              ${isStage ? getIcon('stage') : getIcon('nonStage')} ${p.type}
            </span>
          </div>
          <span class="badge badge-neutral-xs">${p.category}</span>
        </div>

        <h3 class="prog-side-title">${p.name}</h3>

        <div class="prog-side-footer">
          <div class="prog-side-trainer">
            ${
              trainer
                ? `<span class="trainer-tag-text" style="color: ${trainer.color || '#4f46e5'}">
                    ${getIcon('trainers')} ${trainer.name}
                  </span>`
                : `<span class="text-warning text-xs font-semibold">No Trainer</span>`
            }
          </div>

          <span class="badge ${candidatesCount > 0 ? 'badge-primary-subtle' : 'badge-neutral'}">
            ${getIcon('candidates')} ${candidatesCount}
          </span>
        </div>
      `;

      item.addEventListener('click', (e) => {
        // If clicking on select box or if in selection mode:
        if (isSelectionMode || e.target.closest('[data-action="toggle-select"]')) {
          e.stopPropagation();
          if (selectedProgramIds.has(p.id)) {
            selectedProgramIds.delete(p.id);
          } else {
            selectedProgramIds.add(p.id);
          }
          updateBulkBar();
          renderLeftList();
          return;
        }

        selectedProgramId = p.id;
        // On phone view, switch to detail view and scroll to top
        splitLayout.classList.add('mobile-show-detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderLeftList();
        renderRightDetail(p);
      });

      programsListContainer.appendChild(item);
    });

    const activeProg = state.getProgramById(selectedProgramId);
    renderRightDetail(activeProg);
  }

  function renderRightDetail(programOrId) {
    const program = typeof programOrId === 'object' ? programOrId : state.getProgramById(programOrId);

    if (!program) {
      programDetailContainer.innerHTML = `
        <div class="empty-state-box py-5 text-center" style="padding: 40px 16px;">
          <div class="empty-icon">${getIcon('programs')}</div>
          <h3>Select a program from the list</h3>
        </div>
      `;
      return;
    }

    const isStage = program.type === 'Stage';
    const assignedTrainer = program.trainerId ? state.getTrainerById(program.trainerId) : null;
    const assignedCandidates = state.getProgramCandidates(program.id);
    const allTrainers = state.getTrainers();

    programDetailContainer.innerHTML = `
      <!-- Single Unified Top Row for Back & Action Buttons -->
      <div class="program-detail-top-bar">
        <button type="button" class="pdt-back-btn" id="btnMobileBackToPrograms" title="Back to programs list">
          ${getIcon('chevronLeft')} <span>Back</span>
        </button>

        <div class="pdt-badges">
          <span class="program-code-pill">${program.code}</span>
          <span class="badge ${isStage ? 'badge-stage' : 'badge-nonstage'}">
            ${isStage ? getIcon('stage') : getIcon('nonStage')} ${program.type}
          </span>
          <span class="badge badge-neutral-xs">${program.category}</span>
        </div>

        <div class="pdt-actions">
          <button type="button" id="btnExportThisProg" class="saas-pill-btn-sm desktop-only-btn" title="Export this roster to Excel">
            ${getIcon('download')} <span>Export</span>
          </button>
          <button type="button" id="btnEditThisProg" class="saas-pill-btn-sm" title="Edit Program">
            ${getIcon('edit')} <span>Edit</span>
          </button>
          <button type="button" id="btnDeleteThisProg" class="saas-circle-btn-sm text-danger" title="Delete Program">
            ${getIcon('trash')}
          </button>
        </div>
      </div>

      <!-- Program Title Banner -->
      <div class="program-detail-title-card">
        <h2 class="sdb-title">${program.name}</h2>
      </div>

      <!-- 1. DEDICATED TRAINER & MENTOR PANEL -->
      <div class="saas-section-card trainer-management-panel" style="margin-bottom: 14px;">
        <div class="ssc-head" style="margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
          <div class="ssc-head-title">
            <span>${getIcon('trainers')} Program Trainer & Mentor</span>
            ${
              assignedTrainer
                ? `<span class="saas-tag-pill p-stage">${getIcon('check')} Assigned</span>`
                : `<span class="saas-tag-pill p-neutral">Not Assigned</span>`
            }
          </div>
        </div>

        <div class="trainer-card-content-grid">
          <!-- Current Trainer Information / Empty State -->
          <div class="trainer-status-column">
            ${
              assignedTrainer
                ? `
              <div class="saas-trainer-mini-card">
                <div class="stc-avatar" style="background: ${assignedTrainer.color || '#6366f1'}">
                  ${(assignedTrainer.name || 'T').split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div class="stc-info">
                  <strong class="stc-name">${assignedTrainer.name}</strong>
                  <div class="stc-domain text-xs text-muted">${assignedTrainer.expertise}</div>
                  <div class="stc-mentees text-xs font-semibold text-primary">
                    ${state.getTrainerMentees(assignedTrainer.id).length} Mentees Coached
                  </div>
                </div>
                <button id="btnUnassignTrainer" class="btn btn-outline btn-xs text-danger" title="Unassign Trainer from this program" style="white-space: nowrap; flex-shrink: 0; padding: 6px 12px; display: inline-flex; align-items: center; gap: 4px;">
                  ${getIcon('trash')} Unassign
                </button>
              </div>
            `
                : `
              <div class="saas-empty-trainer-placeholder" style="display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 14px; background: #f8fafc; border-radius: 12px;">
                <div class="empty-icon-sm" style="color: #f59e0b; flex-shrink: 0;">${getIcon('info')}</div>
                <div>
                  <strong class="text-xs text-main" style="display: block;">No trainer assigned yet</strong>
                </div>
              </div>
            `
            }
          </div>

          <!-- Assign or Change Trainer Workspace -->
          <div class="trainer-action-column">
            <label class="form-label text-xs font-semibold mb-1" style="display: block;">
              ${assignedTrainer ? 'Change Trainer:' : 'Assign Trainer:'}
            </label>
            <div class="trainer-assign-input-group">
              <select id="trainerDropdown" class="saas-select-pill flex-1">
                <option value="">-- Choose Trainer --</option>
                ${allTrainers
                  .map(
                    t => `
                  <option value="${t.id}" ${String(program.trainerId || '').trim() === String(t.id).trim() ? 'selected' : ''}>
                    ${t.name} (${t.expertise})
                  </option>
                `
                  )
                  .join('')}
              </select>
              <button id="btnSaveTrainer" class="btn-saas-primary btn-sm btn-assign-trainer-action">
                ${getIcon('check')} ${assignedTrainer ? 'Update' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. CANDIDATES IN PROGRAM -->
      <div class="saas-section-card candidate-management-panel">
        <div class="ssc-head">
          <div class="ssc-head-title">
            <span>${getIcon('candidates')} Candidates</span>
            <span class="saas-badge-pill">${assignedCandidates.length} Enrolled</span>
          </div>
          <button id="btnOpenCandidateModalBox" class="btn-saas-primary btn-sm">
            ${getIcon('plus')} Add Candidates
          </button>
        </div>

        <!-- Desktop Table View (>= 769px) -->
        <div class="saas-table-responsive desktop-table-view" style="margin-top: 14px;">
          ${
            assignedCandidates.length === 0
              ? `
              <div class="no-assigned-placeholder text-center py-5 text-muted">
                <div class="empty-icon-sm mb-2">${getIcon('candidates')}</div>
                <strong class="text-main" style="font-size: 14px;">No candidates assigned yet</strong>
              </div>
            `
              : `
              <table class="saas-data-table assigned-candidates-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Admission No</th>
                    <th>Category</th>
                    <th>Class</th>
                    <th style="width: 44px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignedCandidates
                    .map(
                      cand => {
                        const initials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('');
                        return `
                    <tr class="saas-table-row">
                      <td>
                        <div class="saas-student-cell" data-cid="${cand.id}">
                          <div class="saas-avatar-soft">${initials}</div>
                          <button class="candidate-name-btn btn-open-cand-profile" data-cid="${cand.id}" title="Click to view candidate profile">
                            <strong>${cand.name}</strong>
                          </button>
                        </div>
                      </td>
                      <td><span class="saas-adno-pill">${cand.adNo}</span></td>
                      <td><span class="saas-tag-pill p-neutral">${cand.category}</span></td>
                      <td><span class="saas-class-pill">${cand.class || '-'}</span></td>
                      <td style="text-align: right;">
                        <button class="saas-circle-btn text-danger btn-remove-assigned-cand" data-cid="${cand.id}" title="Remove candidate from this program">
                          ${getIcon('x')}
                        </button>
                      </td>
                    </tr>
                  `;
                      }
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }
        </div>

        <!-- Mobile Touch List (< 769px) - Zero Scrolling, Nothing Hidden -->
        <div class="mobile-assigned-candidates-list mobile-cards-view" style="margin-top: 10px; gap: 8px;">
          ${
            assignedCandidates.length === 0
              ? `
              <div class="no-assigned-placeholder text-center py-4 text-muted">
                <div class="empty-icon-sm mb-1">${getIcon('candidates')}</div>
                <strong class="text-xs text-main">No candidates assigned yet</strong>
              </div>
            `
              : assignedCandidates
                  .map(cand => {
                    const initials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('');
                    return `
                <div class="mobile-assigned-cand-item" data-cid="${cand.id}">
                  <div class="maci-left">
                    <div class="saas-avatar-soft" style="width: 38px; height: 38px; font-size: 13px;">${initials}</div>
                    <div class="maci-info">
                      <button type="button" class="candidate-name-btn btn-open-cand-profile maci-name" data-cid="${cand.id}">
                        <strong>${cand.name}</strong>
                      </button>
                      <div class="maci-pills">
                        <span class="saas-adno-pill">${cand.adNo}</span>
                        <span class="saas-class-pill">${cand.class || '-'}</span>
                        <span class="saas-tag-pill p-neutral">${cand.category}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" class="saas-circle-btn text-danger btn-remove-assigned-cand" data-cid="${cand.id}" title="Remove candidate">
                    ${getIcon('trash')}
                  </button>
                </div>
              `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;

    // Hook Mobile Back Button
    const btnMobileBack = programDetailContainer.querySelector('#btnMobileBackToPrograms');
    if (btnMobileBack) {
      btnMobileBack.addEventListener('click', () => {
        splitLayout.classList.remove('mobile-show-detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 1. Export program roster (Desktop)
    const btnExportThisProg = programDetailContainer.querySelector('#btnExportThisProg');
    if (btnExportThisProg) {
      btnExportThisProg.addEventListener('click', () => {
        excelService.exportSingleProgram(program, assignedCandidates, assignedTrainer);
        toast.info(`Exported roster for [${program.code}] ${program.name}`);
      });
    }

    // 2. Edit program
    programDetailContainer.querySelector('#btnEditThisProg').addEventListener('click', () => {
      openProgramFormModal({
        program,
        onSave: () => {
          renderLeftList();
        }
      });
    });

    // 3. Delete program
    programDetailContainer.querySelector('#btnDeleteThisProg').addEventListener('click', () => {
      if (confirm(`Delete program [${program.code}] "${program.name}"?`)) {
        state.deleteProgram(program.id);
        toast.info(`Program [${program.code}] deleted.`);
        splitLayout.classList.remove('mobile-show-detail');
        renderLeftList();
      }
    });

    // 4. Candidate Profile Modal
    programDetailContainer.querySelectorAll('.btn-open-cand-profile, .saas-student-cell').forEach(btn => {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid') || btn.closest('[data-cid]')?.getAttribute('data-cid');
        if (!cid) return;
        openCandidateProfileModal({
          candidateId: cid,
          onUpdate: () => {
            renderLeftList();
            renderRightDetail(program.id);
          }
        });
      });
    });

    // 5. Remove assigned candidate (Desktop and Mobile)
    programDetailContainer.querySelectorAll('.btn-remove-assigned-cand').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid');
        const cand = state.getCandidateById(cid);
        if (confirm(`Remove ${cand?.name} from ${program.name}?`)) {
          state.removeCandidateFromProgram(program.id, cid);
          toast.info(`Removed ${cand?.name} from ${program.name}`);
          renderLeftList();
          renderRightDetail(program.id);
        }
      });
    });

    // 6. "+ Add Candidates" Button
    programDetailContainer.querySelector('#btnOpenCandidateModalBox').addEventListener('click', () => {
      openCandidateSelectModal({
        program,
        onAdd: () => {
          renderLeftList();
          renderRightDetail(program.id);
        }
      });
    });

    // 7. Save Trainer from Dropdown
    const trainerDropdown = programDetailContainer.querySelector('#trainerDropdown');
    const btnSaveTrainer = programDetailContainer.querySelector('#btnSaveTrainer');

    const handleTrainerSave = () => {
      const newTrainerId = trainerDropdown.value ? trainerDropdown.value.trim() : null;
      state.assignTrainerToProgram(program.id, newTrainerId);
      const trn = newTrainerId ? state.getTrainerById(newTrainerId) : null;
      toast.success(
        trn
          ? `Assigned trainer "${trn.name}" to ${program.name}`
          : `Unassigned trainer from ${program.name}`
      );
      renderLeftList();
      renderRightDetail(program.id);
    };

    trainerDropdown.addEventListener('change', handleTrainerSave);
    btnSaveTrainer.addEventListener('click', handleTrainerSave);

    // 8. Unassign Trainer button
    const btnUnassignTrainer = programDetailContainer.querySelector('#btnUnassignTrainer');
    if (btnUnassignTrainer) {
      btnUnassignTrainer.addEventListener('click', () => {
        state.assignTrainerToProgram(program.id, null);
        toast.info(`Removed trainer from ${program.name}`);
        renderLeftList();
        renderRightDetail(program.id);
      });
    }
  }

  // Top Action Buttons
  const btnDownloadProgTemplate = container.querySelector('#btnDownloadProgTemplate');
  if (btnDownloadProgTemplate) {
    btnDownloadProgTemplate.addEventListener('click', () => {
      excelService.downloadProgramsTemplate();
    });
  }

  const btnExportPrograms = container.querySelector('#btnExportPrograms');
  if (btnExportPrograms) {
    btnExportPrograms.addEventListener('click', () => {
      const list = state.getPrograms();
      excelService.exportPrograms(list, state);
      toast.success(`Exported ${list.length} programs to Excel.`);
    });
  }

  const btnBulkUploadPrograms = container.querySelector('#btnBulkUploadPrograms');
  if (btnBulkUploadPrograms) {
    btnBulkUploadPrograms.addEventListener('click', () => {
      openExcelUploadModal({
        type: 'programs',
        onComplete: () => {
          renderLeftList();
        }
      });
    });
  }

  container.querySelector('#btnAddProgram').addEventListener('click', () => {
    openProgramFormModal({
      onSave: () => {
        renderLeftList();
      }
    });
  });

  // Initial render
  renderLeftList();

  // Live synchronization
  const unsubscribeState = state.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubscribeState();
      return;
    }
    renderLeftList();
    if (selectedProgramId) {
      renderRightDetail(selectedProgramId);
    }
  });
}
