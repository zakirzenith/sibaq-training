import { state } from '../services/state.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openTrainerFormModal } from './modals/trainerFormModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';

export function renderTrainersView(container, navigateTo) {
  let searchQuery = '';

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <div class="svh-eyebrow">
          <span class="saas-tag-pill p-stage">${getIcon('trainers')} Faculty & Mentors</span>
          <span class="svh-meta-text">Coaching Network</span>
        </div>
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

    <!-- Search Command Bar -->
    <div class="saas-command-bar">
      <div class="scb-search-wrap flex-1">
        <span class="scb-search-icon">${getIcon('search')}</span>
        <input 
          type="text" 
          id="searchTrainers" 
          class="scb-search-input" 
          placeholder="Search by trainer name or domain of expertise..."
        />
      </div>

      <div class="scb-filters-group">
        <span id="trainersCountBadge" class="saas-badge-pill">0 Trainers</span>
      </div>
    </div>

    <!-- Trainers Cards Grid -->
    <div id="trainersGrid" class="trainers-cards-grid">
      <!-- Rendered dynamically -->
    </div>
  `;

  const searchInput = container.querySelector('#searchTrainers');
  const trainersGrid = container.querySelector('#trainersGrid');
  const countBadge = container.querySelector('#trainersCountBadge');

  function renderGrid() {
    const trainers = state.getTrainers();

    const filtered = trainers.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.expertise.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q))
      );
    });

    countBadge.textContent = `${filtered.length} Trainers`;
    trainersGrid.innerHTML = '';

    if (filtered.length === 0) {
      trainersGrid.innerHTML = `
        <div class="empty-state-card col-span-full">
          <div class="empty-icon">${getIcon('trainers')}</div>
          <h3>No trainers found</h3>
          <p>Add mentors to assign them to your Stage and Non-Stage programs.</p>
          <button id="btnEmptyAddTrainer" class="btn-saas-primary btn-sm mt-3">
            ${getIcon('plus')} Add First Trainer
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

      // Program link clicks inside trainer card
      card.querySelectorAll('.btn-program-link').forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-pid');
          openAssignCandidatesModal({
            programId: pid,
            onSave: renderGrid
          });
        });
      });

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

  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderGrid();
  });

  container.querySelector('#btnAddTrainer').addEventListener('click', () => {
    openTrainerFormModal({ onSave: renderGrid });
  });

  renderGrid();
}
