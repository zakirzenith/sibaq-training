import { state } from '../services/state.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openProgramFormModal } from './modals/programFormModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { openCandidateSelectModal } from './modals/candidateSelectModal.js';

export function renderProgramsView(container, navigateTo) {
  let searchQuery = '';
  let selectedType = 'ALL';
  let selectedCategory = 'ALL';
  let selectedProgramId = null;

  function getProgramsList() {
    const programs = state.getPrograms();
    return programs.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);

      const matchesType = selectedType === 'ALL' || p.type === selectedType;
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;

      return matchesSearch && matchesType && matchesCat;
    });
  }

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <div class="svh-eyebrow">
          <span class="saas-tag-pill p-stage">${getIcon('programs')} Program Operations</span>
          <span class="svh-meta-text">Stage & Non-Stage Master</span>
        </div>
        <h1 class="svh-title">Programs, Candidates & Trainers</h1>
        <p class="svh-desc">Select a program on the left to assign candidates, assign trainers, and view candidate profiles.</p>
      </div>

      <div class="saas-header-actions">
        <div class="saas-action-pill-group">
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
    <div class="programs-split-layout">
      <!-- LEFT SIDE: All Programs List with Details -->
      <div class="programs-left-col">
        <div class="left-col-header">
          <div class="scb-search-wrap mb-2">
            <span class="scb-search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="searchProgramsInput" 
              class="scb-search-input" 
              placeholder="Search by code or name..."
            />
          </div>

          <div class="left-filters-row" style="display: flex; gap: 6px; align-items: center;">
            <select id="filterProgType" class="saas-select-pill flex-1">
              <option value="ALL">All Types</option>
              <option value="Stage">Stage Only</option>
              <option value="Non-Stage">Non-Stage</option>
            </select>

            <select id="filterProgCategory" class="saas-select-pill flex-1">
              <option value="ALL">All Categories</option>
            </select>

            <button id="btnResetProgFilters" class="saas-circle-btn" title="Reset filters">
              ${getIcon('refresh')}
            </button>
          </div>
        </div>

        <!-- Scrollable Cards List -->
        <div id="programsListContainer" class="programs-scroll-list">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- RIGHT SIDE: Dedicated Program Control Center (Candidates & Trainer) -->
      <div class="programs-right-col" id="programDetailContainer">
        <!-- Dynamically rendered for active program -->
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#searchProgramsInput');
  const typeSelect = container.querySelector('#filterProgType');
  const categorySelect = container.querySelector('#filterProgCategory');
  const resetFiltersBtn = container.querySelector('#btnResetProgFilters');
  const programsListContainer = container.querySelector('#programsListContainer');
  const programDetailContainer = container.querySelector('#programDetailContainer');

  function populateCategories() {
    const programs = state.getPrograms();
    const categories = Array.from(new Set(programs.map(p => p.category).filter(Boolean))).sort();

    categorySelect.innerHTML = '<option value="ALL">All Categories</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedCategory) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  function renderLeftList() {
    const list = getProgramsList();
    programsListContainer.innerHTML = '';

    if (list.length === 0) {
      programsListContainer.innerHTML = `
        <div class="empty-state-card py-4">
          <div class="empty-icon">${getIcon('programs')}</div>
          <h4>No programs match</h4>
          <p class="text-xs text-muted">Try clearing search filters.</p>
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
      const isStage = p.type === 'Stage';
      const trainer = p.trainerId ? state.getTrainerById(p.trainerId) : null;
      const candidatesCount = p.candidateIds ? p.candidateIds.length : 0;

      const item = document.createElement('div');
      item.className = `prog-sidebar-card ${isSelected ? 'active-program' : ''} ${
        isStage ? 'prog-card-stage' : 'prog-card-nonstage'
      }`;
      item.setAttribute('data-id', p.id);

      item.innerHTML = `
        <div class="prog-side-header">
          <span class="program-code-pill">${p.code}</span>
          <span class="badge ${isStage ? 'badge-stage' : 'badge-nonstage'}">
            ${isStage ? getIcon('stage') : getIcon('nonStage')} ${p.type}
          </span>
          <span class="badge badge-neutral-xs">${p.category}</span>
        </div>

        <h3 class="prog-side-title">${p.name}</h3>

        <div class="prog-side-footer">
          <div class="prog-side-trainer">
            ${
              trainer
                ? `<span class="trainer-tag-text" style="color: ${trainer.color}">
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

      item.addEventListener('click', () => {
        selectedProgramId = p.id;
        renderLeftList();
        renderRightDetail(p);
      });

      programsListContainer.appendChild(item);
    });

    const activeProg = state.getProgramById(selectedProgramId);
    renderRightDetail(activeProg);
  }

  function renderRightDetail(program) {
    if (!program) {
      programDetailContainer.innerHTML = `
        <div class="empty-state-box py-5">
          <div class="empty-icon">${getIcon('programs')}</div>
          <h3>Select a program from the left side</h3>
          <p class="text-muted">You will be able to assign candidates, assign trainers, and view candidate profiles.</p>
        </div>
      `;
      return;
    }

    const isStage = program.type === 'Stage';
    const assignedTrainer = program.trainerId ? state.getTrainerById(program.trainerId) : null;
    const assignedCandidates = state.getProgramCandidates(program.id);
    const allTrainers = state.getTrainers();

    programDetailContainer.innerHTML = `
      <!-- Program Header Strip (Clean: No Venue or Date) -->
      <div class="saas-detail-banner">
        <div class="sdb-main">
          <div class="sdb-badges-row">
            <span class="saas-prog-capsule ${isStage ? 'p-stage' : 'p-nonstage'}">${program.code}</span>
            <span class="saas-tag-pill ${isStage ? 'p-stage' : 'p-nonstage'}">
              ${isStage ? getIcon('stage') : getIcon('nonStage')} ${program.type}
            </span>
            <span class="saas-tag-pill p-neutral">${program.category} Category</span>
          </div>
          <h2 class="sdb-title">${program.name}</h2>
        </div>

        <div class="sdb-actions">
          <button id="btnExportThisProg" class="saas-pill-btn" title="Export this roster to Excel">
            ${getIcon('download')} Export Roster
          </button>
          <button id="btnEditThisProg" class="saas-pill-btn" title="Edit Program">
            ${getIcon('edit')} Edit
          </button>
          <button id="btnDeleteThisProg" class="saas-circle-btn text-danger" title="Delete Program">
            ${getIcon('trash')}
          </button>
        </div>
      </div>

      <!-- TWO SECTIONS ON THE RIGHT: 1. CANDIDATES & 2. TRAINER -->
      <div class="prog-detail-sections-grid">
        
        <!-- SECTION 1: CANDIDATES SECTION -->
        <div class="saas-section-card candidate-management-panel">
          <div class="ssc-head">
            <div class="ssc-head-title">
              <span>${getIcon('candidates')} Candidates in Program</span>
              <span class="saas-badge-pill">${assignedCandidates.length} Enrolled</span>
            </div>
            <!-- OPENS POPUP MODAL BOX INSTEAD OF BOTTOM PANEL -->
            <button id="btnOpenCandidateModalBox" class="btn-saas-primary btn-sm">
              ${getIcon('plus')} Add Candidates
            </button>
          </div>

          <!-- Candidates List for this Program -->
          <div class="saas-table-responsive" style="margin-top: 12px;">
            ${
              assignedCandidates.length === 0
                ? `
                <div class="no-assigned-placeholder text-center py-4 text-muted">
                  <div class="empty-icon-sm mb-2">${getIcon('candidates')}</div>
                  <strong class="text-main">No candidates assigned yet</strong>
                  <p class="text-xs">Click "Add Candidates" above to select candidates from the directory.</p>
                </div>
              `
                : `
                <table class="saas-data-table assigned-candidates-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
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
                          const initials = cand.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                          return `
                      <tr class="saas-table-row">
                        <td>
                          <!-- CLICKING CANDIDATE NAME OPENS PROFILE MODAL -->
                          <div class="saas-student-cell">
                            <div class="saas-avatar-soft">${initials}</div>
                            <button class="candidate-name-btn btn-open-cand-profile" data-cid="${cand.id}" title="Click to view candidate profile with all assigned programs and trainers">
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
        </div>

        <!-- SECTION 2: TRAINER SECTION (COMPACT / SHORT PLACE) -->
        <div class="saas-section-card trainer-management-panel">
          <div class="ssc-head">
            <div class="ssc-head-title">
              <span>${getIcon('trainers')} Program Trainer</span>
              ${
                assignedTrainer
                  ? `<span class="saas-tag-pill p-stage">Assigned</span>`
                  : `<span class="saas-tag-pill p-neutral">Unassigned</span>`
              }
            </div>
          </div>

          <!-- Compact Trainer Assignment Workspace -->
          <div class="trainer-assignment-control" style="margin-top: 14px;">
            <div class="form-group mb-3">
              <label class="form-label text-xs">Assign Trainer:</label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <select id="trainerDropdown" class="saas-select-pill flex-1">
                  <option value="">-- No Trainer Assigned --</option>
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
                <button id="btnSaveTrainer" class="btn-saas-primary btn-sm">
                  ${getIcon('check')} Assign
                </button>
              </div>
            </div>

            <!-- Compact Active Trainer Badge -->
            ${
              assignedTrainer
                ? `
              <div class="saas-trainer-mini-card">
                <div class="stc-avatar" style="background: ${assignedTrainer.color || '#6366f1'}">
                  ${assignedTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div class="stc-info">
                  <strong class="stc-name">${assignedTrainer.name}</strong>
                  <div class="stc-domain text-xs text-muted">${assignedTrainer.expertise}</div>
                  <div class="stc-mentees text-xs font-semibold text-primary">
                    ${state.getTrainerMentees(assignedTrainer.id).length} Mentees Coached
                  </div>
                </div>
                <button id="btnUnassignTrainer" class="saas-circle-btn text-danger" title="Unassign Trainer">
                  ${getIcon('trash')}
                </button>
              </div>
            `
                : `
              <div class="saas-empty-trainer-placeholder">
                <span class="text-muted text-xs">Select a trainer from the dropdown to assign.</span>
              </div>
            `
            }
          </div>
      </div>
    `;

    // Wire up events:

    // 1. Export program roster
    programDetailContainer.querySelector('#btnExportThisProg').addEventListener('click', () => {
      excelService.exportSingleProgram(program, assignedCandidates, assignedTrainer);
      toast.info(`Exported roster for [${program.code}] ${program.name}`);
    });

    // 2. Edit program
    programDetailContainer.querySelector('#btnEditThisProg').addEventListener('click', () => {
      openProgramFormModal({
        program,
        onSave: () => {
          populateCategories();
          renderLeftList();
        }
      });
    });

    // 3. Delete program
    programDetailContainer.querySelector('#btnDeleteThisProg').addEventListener('click', () => {
      if (confirm(`Delete program [${program.code}] "${program.name}"?`)) {
        state.deleteProgram(program.id);
        toast.info(`Program [${program.code}] deleted.`);
        populateCategories();
        renderLeftList();
      }
    });

    // 4. Clicking Candidate Name opens Candidate Profile Modal!
    programDetailContainer.querySelectorAll('.btn-open-cand-profile').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid');
        openCandidateProfileModal({
          candidateId: cid,
          onUpdate: () => {
            renderLeftList();
            renderRightDetail(program.id);
          }
        });
      });
    });

    // 5. Remove assigned candidate
    programDetailContainer.querySelectorAll('.btn-remove-assigned-cand').forEach(btn => {
      btn.addEventListener('click', () => {
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

    // 6. "+ Add Candidates" Button -> OPENS POPUP MODAL BOX
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
    btnSaveTrainer.addEventListener('click', () => {
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
    });

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

  // Left List Filter Listeners
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderLeftList();
  });

  typeSelect.addEventListener('change', e => {
    selectedType = e.target.value;
    renderLeftList();
  });

  categorySelect.addEventListener('change', e => {
    selectedCategory = e.target.value;
    renderLeftList();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchQuery = '';
    selectedType = 'ALL';
    selectedCategory = 'ALL';
    searchInput.value = '';
    typeSelect.value = 'ALL';
    categorySelect.value = 'ALL';
    renderLeftList();
  });

  // Top Action Buttons
  container.querySelector('#btnDownloadProgTemplate').addEventListener('click', () => {
    excelService.downloadProgramsTemplate();
  });

  container.querySelector('#btnExportPrograms').addEventListener('click', () => {
    const list = state.getPrograms();
    excelService.exportPrograms(list, state);
    toast.success(`Exported ${list.length} programs to Excel.`);
  });

  container.querySelector('#btnBulkUploadPrograms').addEventListener('click', () => {
    openExcelUploadModal({
      type: 'programs',
      onComplete: () => {
        populateCategories();
        renderLeftList();
      }
    });
  });

  container.querySelector('#btnAddProgram').addEventListener('click', () => {
    openProgramFormModal({
      onSave: () => {
        populateCategories();
        renderLeftList();
      }
    });
  });

  // Initial render
  populateCategories();
  renderLeftList();

  // Live cross-device synchronization
  const unsubscribeState = state.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubscribeState();
      return;
    }
    populateCategories();
    renderLeftList();
    if (selectedProgramId) {
      renderRightDetail(selectedProgramId);
    }
  });
}
