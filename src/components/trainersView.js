import { state } from '../services/state.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openTrainerFormModal } from './modals/trainerFormModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';
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
        <button id="btnAddTrainer" class="btn-saas-primary">
          ${getIcon('plus')} Add Trainer
        </button>
      </div>
    </div>

    <!-- Modern Notion/Linear Filter Engine -->
    <div id="trainersFilterBar"></div>

    <!-- Trainers Count & Grid Container -->
    <div class="saas-table-card" style="padding: 16px;">
      <div class="saas-table-head-strip" style="margin-bottom: 16px;">
        <div class="sth-left">
          <span class="sth-title">Active Faculty Network</span>
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

      const card = document.createElement('div');
      card.className = 'saas-trainer-card';

      card.innerHTML = `
        <div class="stc-top">
          <div class="stc-avatar-wrap" style="background: ${t.color || '#6366f1'}">
            ${t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="stc-meta">
            <h3 class="stc-title">${t.name}</h3>
            <span class="saas-tag-pill p-stage">${t.expertise}</span>
          </div>
          <div class="stc-actions">
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
            <div class="stc-stat-pill">
              <span class="stc-val">${t.experience || '5+ Yrs'}</span>
              <span class="stc-lbl">Exp</span>
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
        </div>
      `;

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

  container.querySelector('#btnAddTrainer').addEventListener('click', () => {
    openTrainerFormModal({ onSave: renderGrid });
  });

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
