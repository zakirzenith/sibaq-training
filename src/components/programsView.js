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

  function getProgramsList() {
    const programs = state.getPrograms();
    return programs.filter(p => {
      const q = currentSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Filter: Type
      if (activeFilters.type && p.type !== activeFilters.type) return false;

      // Filter: Category
      if (activeFilters.category && p.category !== activeFilters.category) return false;

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
        <h1 class="svh-title">Programs, Candidates & Trainers</h1>
        <p class="svh-desc">Select a program to assign candidates, assign trainers, and view candidate profiles.</p>
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
        <div class="left-col-header" style="padding-bottom: 8px;">
          <!-- Modern Notion/Linear Filter Engine -->
          <div id="programsFilterBarContainer"></div>
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

  const splitLayout = container.querySelector('#programsSplitLayout');
  const programsListContainer = container.querySelector('#programsListContainer');
  const programDetailContainer = container.querySelector('#programDetailContainer');
  const filterBarContainer = container.querySelector('#programsFilterBarContainer');

  // Modern Notion/Linear Filter Engine for Programs
  createFilterBar({
    container: filterBarContainer,
    searchPlaceholder: 'Search by code, title, or category...',
    filterConfig: [
      {
        key: 'type',
        label: 'Type',
        icon: '🎭',
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
        icon: '🏷️',
        getOptions: () => {
          const progs = state.getPrograms();
          const counts = {};
          progs.forEach(p => {
            const cat = p.category || 'General';
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
        icon: '👨‍🏫',
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
        icon: '👥',
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

  function renderLeftList() {
    const list = getProgramsList();
    programsListContainer.innerHTML = '';

    if (list.length === 0) {
      programsListContainer.innerHTML = `
        <div class="empty-state-card py-4" style="text-align: center; padding: 32px 16px;">
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

      item.addEventListener('click', () => {
        selectedProgramId = p.id;
        // On phone view, switch to detail view
        splitLayout.classList.add('mobile-show-detail');
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
        <div class="empty-state-box py-5">
          <div class="empty-icon">${getIcon('programs')}</div>
          <h3>Select a program from the list</h3>
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
      <!-- Mobile Only Back Button to Return to Program List -->
      <div class="mobile-programs-back-bar" id="btnMobileBackToPrograms">
        ${getIcon('chevronLeft')} <span>Back to Programs</span>
      </div>

      <!-- Program Header Strip -->
      <div class="saas-detail-banner">
        <div class="sdb-main">
          <div class="sdb-badges-row">
            <span class="saas-prog-capsule ${isStage ? 'p-stage' : 'p-nonstage'}">${program.code}</span>
            <span class="saas-tag-pill ${isStage ? 'p-stage' : 'p-nonstage'}">
              ${isStage ? getIcon('stage') : getIcon('nonStage')} ${program.type}
            </span>
            <span class="saas-tag-pill p-neutral">${program.category}</span>
          </div>
          <h2 class="sdb-title">${program.name}</h2>
        </div>

        <div class="sdb-actions">
          <button id="btnExportThisProg" class="saas-pill-btn desktop-only-btn" title="Export this roster to Excel">
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

      <!-- 1. DEDICATED TRAINER & MENTOR PANEL -->
      <div class="saas-section-card trainer-management-panel" style="margin-bottom: 20px;">
        <div class="ssc-head" style="margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
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
                  ${assignedTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
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
              <div class="saas-empty-trainer-placeholder" style="display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 16px;">
                <div class="empty-icon-sm" style="color: #f59e0b; flex-shrink: 0;">${getIcon('info')}</div>
                <div>
                  <strong class="text-xs text-main" style="display: block;">No trainer assigned yet</strong>
                  <span class="text-muted text-xs">Assign a trainer below to mentor candidates in this program.</span>
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

        <!-- Candidates List for this Program -->
        <div class="saas-table-responsive" style="margin-top: 14px;">
          ${
            assignedCandidates.length === 0
              ? `
              <div class="no-assigned-placeholder text-center py-5 text-muted">
                <div class="empty-icon-sm mb-2">${getIcon('candidates')}</div>
                <strong class="text-main" style="font-size: 14px;">No candidates assigned yet</strong>
                <p class="text-xs mt-1">Tap "Add Candidates" above to select candidates from the directory.</p>
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
                        const initials = cand.name.split(' ').map(n => n[0]).slice(0, 2).join('');
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
      </div>
    `;

    // Hook Mobile Back Button
    const btnMobileBack = programDetailContainer.querySelector('#btnMobileBackToPrograms');
    if (btnMobileBack) {
      btnMobileBack.addEventListener('click', () => {
        splitLayout.classList.remove('mobile-show-detail');
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
