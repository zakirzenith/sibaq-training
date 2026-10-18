import { state, getProgressStatus } from '../services/state.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openTrainerFormModal } from './modals/trainerFormModal.js';
import { openTrainerProfileModal } from './modals/trainerProfileModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { excelService } from '../services/excelService.js';
import { createFilterBar } from './filterEngine.js';

export function renderTrainersView(container, navigateTo) {
  let activeFilters = {};
  let currentSearchQuery = '';

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Trainers & Mentors</h1>
        <p class="svh-desc">
          Add trainers, view specialized domains, and monitor candidates/mentees under their coaching.
        </p>
      </div>

      <div class="saas-header-actions">
        <button id="btnHeaderTrainerPortalLogin" class="saas-pill-btn" title="Sign in to Trainer Panel">
          ${getIcon('lock')} Trainer Portal Login
        </button>
        <button id="btnBulkUploadTrainers" class="saas-pill-btn" title="Bulk import trainers via Excel/CSV">
          ${getIcon('upload')} Bulk Upload
        </button>
        <button id="btnExportTrainers" class="saas-pill-btn desktop-only-btn" title="Export all trainers to Excel">
          ${getIcon('download')} Export
        </button>
        <button id="btnAddTrainer" class="btn-saas-primary">
          ${getIcon('plus')} Add Trainer
        </button>
      </div>
    </div>

    <!-- Modern Notion/Linear Filter Engine -->
    <div id="trainersFilterBar"></div>

    <!-- Trainers Count & Grid Container -->
    <div class="saas-table-card trainers-table-card">
      <div class="saas-table-head-strip" style="margin-bottom: 14px;">
        <div class="sth-left">
          <span class="sth-title">Active Trainer Network</span>
          <span id="trainersCountBadge" class="saas-badge-pill">0</span>
        </div>
      </div>

      <!-- Trainers Cards Grid -->
      <div id="trainersGrid" class="trainers-cards-grid">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  const filterContainer = container.querySelector('#trainersFilterBar');
  const trainersGrid = container.querySelector('#trainersGrid');
  const countBadge = container.querySelector('#trainersCountBadge');

  // Filter Engine Configuration
  createFilterBar({
    container: filterContainer,
    searchPlaceholder: 'Search trainer by name or domain of expertise...',
    filterConfig: [
      {
        key: 'expertise',
        label: 'Domain / Expertise',
        icon: 'target',
        getOptions: () => {
          const trainers = state.getTrainers();
          const counts = {};
          trainers.forEach(t => {
            const exp = t.expertise || 'General';
            counts[exp] = (counts[exp] || 0) + 1;
          });
          return Object.keys(counts).sort().map(exp => ({
            value: exp,
            label: exp,
            count: counts[exp]
          }));
        }
      },
      {
        key: 'programs',
        label: 'Program Assignment',
        icon: 'programs',
        getOptions: () => {
          const trainers = state.getTrainers();
          const withProgs = trainers.filter(t => state.getTrainerPrograms(t.id).length > 0).length;
          const noProgs = trainers.length - withProgs;
          return [
            { value: 'Assigned', label: 'Assigned to Programs', count: withProgs },
            { value: 'Unassigned', label: 'No Programs Assigned', count: noProgs }
          ];
        }
      },
      {
        key: 'mentees',
        label: 'Mentee Roster',
        icon: 'users',
        getOptions: () => {
          const trainers = state.getTrainers();
          const withMentees = trainers.filter(t => state.getTrainerMentees(t.id).length > 0).length;
          const noMentees = trainers.length - withMentees;
          return [
            { value: 'With Mentees', label: 'Coaching Mentees', count: withMentees },
            { value: 'No Mentees', label: 'No Mentees Yet', count: noMentees }
          ];
        }
      }
    ],
    onFilterChange: (filters, search) => {
      activeFilters = filters;
      currentSearchQuery = search;
      renderGrid();
    }
  });

  function renderGrid() {
    const trainers = state.getTrainers();

    const filtered = trainers.filter(t => {
      const q = currentSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.expertise.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Filter: Expertise
      if (activeFilters.expertise && t.expertise !== activeFilters.expertise) return false;

      // Filter: Programs
      if (activeFilters.programs) {
        const hasProgs = state.getTrainerPrograms(t.id).length > 0;
        if (activeFilters.programs === 'Assigned' && !hasProgs) return false;
        if (activeFilters.programs === 'Unassigned' && hasProgs) return false;
      }

      // Filter: Mentees
      if (activeFilters.mentees) {
        const hasMentees = state.getTrainerMentees(t.id).length > 0;
        if (activeFilters.mentees === 'With Mentees' && !hasMentees) return false;
        if (activeFilters.mentees === 'No Mentees' && hasMentees) return false;
      }

      return true;
    });

    countBadge.textContent = `${filtered.length}`;
    trainersGrid.innerHTML = '';

    if (filtered.length === 0) {
      trainersGrid.innerHTML = `
        <div class="empty-state-card col-span-full" style="text-align: center; padding: 40px 16px;">
          <div class="empty-icon">${getIcon('trainers')}</div>
          <h3 style="margin: 8px 0 4px; font-size: 16px;">No trainers match your filter</h3>
          <p class="text-xs text-muted">Try clearing the active filters or search query.</p>
          <button id="btnEmptyAddTrainer" class="btn-saas-primary btn-sm mt-3">
            ${getIcon('plus')} Add New Trainer
          </button>
        </div>
      `;

      const emptyBtn = trainersGrid.querySelector('#btnEmptyAddTrainer');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          openTrainerFormModal({ onSave: renderGrid });
        });
      }
      return;
    }

    filtered.forEach(t => {
      const assignedPrograms = state.getTrainerPrograms(t.id);
      const mentees = state.getTrainerMentees(t.id);
      const readiness = state.getTrainerReadiness(t.id);
      const readinessStatus = readiness.hasData
        ? getProgressStatus(readiness.percentage)
        : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

      const card = document.createElement('div');
      card.className = 'saas-trainer-card';

      card.innerHTML = `
        <div class="stc-top">
          <div class="stc-avatar-wrap" style="background: ${t.color || '#6366f1'}; cursor: pointer;" title="Click to view ${t.name}'s profile">
            ${t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="stc-meta">
            <h3 class="stc-title" style="cursor: pointer;" title="Click to view ${t.name}'s profile">${t.name}</h3>
            <span class="saas-tag-pill p-stage">${t.expertise}</span>
          </div>
          <div class="stc-actions">
            <button class="saas-circle-btn btn-view-trainer-profile" title="View Trainer Profile & Candidates">
              ${getIcon('user')}
            </button>
            <button class="saas-circle-btn btn-edit-trainer" title="Edit Trainer">
              ${getIcon('edit')}
            </button>
            <button class="saas-circle-btn text-danger btn-delete-trainer" title="Delete Trainer">
              ${getIcon('trash')}
            </button>
          </div>
        </div>

        <div class="stc-body">
          <!-- Stats Strip -->
          <div class="stc-stats-row">
            <div class="stc-stat-pill">
              <span class="stc-val">${assignedPrograms.length}</span>
              <span class="stc-lbl">Programs</span>
            </div>
            <div class="stc-stat-pill">
              <span class="stc-val">${mentees.length}</span>
              <span class="stc-lbl">Mentees</span>
            </div>
            <div class="stc-stat-pill" style="border-bottom: 2px solid ${readinessStatus.color};">
              <span class="stc-val" style="color: ${readiness.hasData ? readinessStatus.color : 'inherit'};">
                ${readiness.hasData ? `${readiness.percentage}%` : '0%'}
              </span>
              <span class="stc-lbl">Readiness</span>
            </div>
          </div>

          <!-- Assigned Programs Badges -->
          <div class="stc-programs-box">
            <div class="stc-prog-label">Assigned Programs</div>
            <div class="stc-prog-tags">
              ${
                assignedPrograms.length > 0
                  ? assignedPrograms
                      .map(
                        p => `
                    <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
                      ${p.code} • ${p.name}
                    </span>
                  `
                      )
                      .join('')
                  : '<span class="text-muted text-xs">No programs assigned yet</span>'
              }
            </div>
          </div>

          <!-- Portal Quick Access Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 4px;">
            <div style="display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #64748b;">
              <span>Login:</span>
              <code style="background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 11px; color: #4338ca;">@${t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, '')}</code>
            </div>
            <button type="button" class="btn-open-trainer-portal" data-tid="${t.id}" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;">
              <span>Open Portal &rarr;</span>
            </button>
          </div>
        </div>
      `;

      // Open Trainer Profile
      const openProfile = () => {
        openTrainerProfileModal({
          trainerId: t.id,
          onUpdate: renderGrid
        });
      };
      card.querySelector('.stc-avatar-wrap').addEventListener('click', openProfile);
      card.querySelector('.stc-title').addEventListener('click', openProfile);
      card.querySelector('.btn-view-trainer-profile').addEventListener('click', openProfile);

      // Open Trainer Portal directly
      const btnPortal = card.querySelector('.btn-open-trainer-portal');
      if (btnPortal) {
        btnPortal.addEventListener('click', (e) => {
          e.stopPropagation();
          state.setActiveTrainer(t.id);
          if (window.appInstance) {
            window.appInstance.switchPortal('trainer', t);
          }
        });
      }

      // Edit trainer
      card.querySelector('.btn-edit-trainer').addEventListener('click', () => {
        openTrainerFormModal({
          trainer: t,
          onSave: renderGrid
        });
      });

      // Delete trainer
      card.querySelector('.btn-delete-trainer').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete trainer "${t.name}"? They will be unassigned from any programs.`)) {
          state.deleteTrainer(t.id);
          toast.info(`Trainer ${t.name} deleted.`);
          renderGrid();
        }
      });

      trainersGrid.appendChild(card);
    });
  }

  // Header Trainer Portal Login
  const btnHeaderPortal = container.querySelector('#btnHeaderTrainerPortalLogin');
  if (btnHeaderPortal) {
    btnHeaderPortal.addEventListener('click', () => {
      if (typeof window.openTrainerLogin === 'function') {
        window.openTrainerLogin();
      }
    });
  }

  container.querySelector('#btnAddTrainer').addEventListener('click', () => {
    openTrainerFormModal({ onSave: renderGrid });
  });

  const btnBulkUploadTrainers = container.querySelector('#btnBulkUploadTrainers');
  if (btnBulkUploadTrainers) {
    btnBulkUploadTrainers.addEventListener('click', () => {
      openExcelUploadModal({
        type: 'trainers',
        onComplete: () => {
          renderGrid();
        }
      });
    });
  }

  const btnExportTrainers = container.querySelector('#btnExportTrainers');
  if (btnExportTrainers) {
    btnExportTrainers.addEventListener('click', () => {
      const allTrainers = state.getTrainers();
      if (allTrainers.length === 0) {
        toast.info('No trainers in the trainer roster to export.');
        return;
      }
      excelService.exportTrainers(allTrainers, state);
      toast.info('Exported trainers roster to Excel.');
    });
  }

  renderGrid();

  // Cross-device sync
  const unsubscribeState = state.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubscribeState();
      return;
    }
    renderGrid();
  });
}
