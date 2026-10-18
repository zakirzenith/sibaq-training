import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';

/**
 * Universal Searchable Trainer Picker Modal
 * Allows searching trainers by name, domain, expertise, or experience,
 * and selecting or clearing a trainer assignment with 1 click.
 */
export function openTrainerPickerModal({
  currentTrainerId = null,
  title = 'Select Trainer & Mentor',
  subtitle = 'Search and assign a specialized trainer for candidate coaching',
  onSelect = () => {}
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md trainer-picker-dialog">
      <div class="modal-header">
        <div>
          <div class="modal-badge">Trainer Directory</div>
          <h2 class="modal-title">${title}</h2>
          <p class="modal-subtitle">${subtitle}</p>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body trainer-picker-body">
        <!-- Search Input Bar -->
        <div class="tpm-search-bar">
          <span class="tpm-search-icon">${getIcon('search')}</span>
          <input 
            type="text" 
            id="tpmSearchInput" 
            class="tpm-search-input" 
            placeholder="Search by name, expertise, domain (e.g. English, Technical, Fiqh)..." 
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" id="tpmSearchClear" class="tpm-clear-btn" style="display: none;" title="Clear search">×</button>
        </div>

        <div class="tpm-status-strip">
          <span id="tpmCountText" class="text-xs text-muted">Showing all trainers</span>
          ${
            currentTrainerId
              ? `<button type="button" id="tpmBtnUnassign" class="tpm-unassign-btn">
                  ${getIcon('trash')} Unassign Trainer
                </button>`
              : ''
          }
        </div>

        <!-- Scrollable Trainer Cards List -->
        <div id="tpmTrainersList" class="tpm-trainers-list">
          <!-- Dynamically populated -->
        </div>
      </div>

      <div class="modal-footer">
        <button id="tpmBtnCancel" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#tpmBtnCancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const searchInput = overlay.querySelector('#tpmSearchInput');
  const searchClear = overlay.querySelector('#tpmSearchClear');
  const trainersList = overlay.querySelector('#tpmTrainersList');
  const countText = overlay.querySelector('#tpmCountText');
  const btnUnassign = overlay.querySelector('#tpmBtnUnassign');

  if (btnUnassign) {
    btnUnassign.addEventListener('click', () => {
      onSelect(null);
      close();
    });
  }

  function renderList(query = '') {
    const all = state.getTrainers();
    const q = query.toLowerCase().trim();

    const filtered = all.filter(t => {
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.expertise && t.expertise.toLowerCase().includes(q)) ||
        (t.experience && t.experience.toLowerCase().includes(q))
      );
    });

    countText.textContent = `${filtered.length} of ${all.length} trainers`;
    trainersList.innerHTML = '';

    if (filtered.length === 0) {
      trainersList.innerHTML = `
        <div class="empty-state-box py-4" style="text-align: center;">
          <div class="empty-icon-sm mb-1">${getIcon('trainers')}</div>
          <strong class="text-xs text-main">No trainers match "${query}"</strong>
          <p class="text-xs text-muted mt-1">Try searching for a different keyword or domain.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(t => {
      const isCurrent = String(t.id).trim() === String(currentTrainerId || '').trim();
      const assignedProgs = state.getTrainerPrograms(t.id);
      const mentees = state.getTrainerMentees(t.id);
      const readiness = state.getTrainerReadiness(t.id);
      const readinessStatus = readiness.hasData
        ? getProgressStatus(readiness.percentage)
        : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

      const item = document.createElement('div');
      item.className = `tpm-trainer-item ${isCurrent ? 'is-current' : ''}`;
      item.innerHTML = `
        <div class="tpm-avatar" style="background: ${t.color || '#6366f1'};">
          ${t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div class="tpm-info">
          <div class="tpm-name-row">
            <strong class="tpm-name">${t.name}</strong>
            ${isCurrent ? `<span class="badge badge-success-subtle text-xs">Currently Assigned</span>` : ''}
          </div>
          <div class="tpm-tags-row">
            <span class="badge badge-primary-subtle text-xs">${t.expertise}</span>
            <span class="badge ${readiness.hasData ? readinessStatus.badgeClass : 'badge-neutral'} text-xs font-semibold">
              ${readiness.hasData ? `${readiness.percentage}% Readiness` : '0% Readiness'}
            </span>
            <span class="text-xs text-muted">•</span>
            <span class="text-xs text-muted">${assignedProgs.length} Programs</span>
            <span class="text-xs text-muted">•</span>
            <span class="text-xs text-muted">${mentees.length} Mentees</span>
          </div>
        </div>
        <button type="button" class="btn btn-sm ${isCurrent ? 'btn-secondary' : 'btn-primary'} tpm-select-btn">
          ${isCurrent ? 'Keep' : 'Select'}
        </button>
      `;

      item.addEventListener('click', (e) => {
        onSelect(t);
        close();
      });

      trainersList.appendChild(item);
    });
  }

  // Search events
  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    searchClear.style.display = val ? 'block' : 'none';
    renderList(val);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    renderList('');
    searchInput.focus();
  });

  renderList('');
  setTimeout(() => searchInput.focus(), 80);
}
