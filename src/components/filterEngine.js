import { getIcon } from './icons.js';

/**
 * Modern Notion/Linear-Style Filter Engine
 * Provides "Add Filter" popover, removable active filter chips, multi-filter combination,
 * and seamless mobile responsiveness.
 */
export function createFilterBar({
  container,
  searchPlaceholder = 'Search...',
  filterConfig = [],
  onFilterChange = () => {}
}) {
  let activeFilters = {}; // { [filterKey]: selectedValue }
  let currentSearchQuery = '';
  let popoverOpen = false;
  let activeFieldForPopover = null; // null = field selector, string = value selector

  container.innerHTML = `
    <div class="saas-filter-engine-wrap">
      <div class="sfe-main-row">
        <!-- Search Input -->
        <div class="sfe-search-box">
          <span class="sfe-search-icon">${getIcon('search')}</span>
          <input 
            type="text" 
            class="sfe-search-input" 
            placeholder="${searchPlaceholder}"
          />
          <button class="sfe-search-clear" style="display: none;" title="Clear search">×</button>
        </div>

        <!-- Add Filter Button & Popover Anchor -->
        <div class="sfe-popover-anchor">
          <button class="btn-sfe-add-filter" id="btnSfeAddFilter" title="Add a filter">
            <svg class="sfe-funnel-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span class="btn-text">Add Filter</span>
            <span class="sfe-badge" id="sfeBadge" style="display: none;">0</span>
          </button>

          <!-- Floating Popover -->
          <div class="sfe-popover-dropdown" id="sfePopover" style="display: none;">
            <!-- Injected dynamically -->
          </div>
        </div>
      </div>

      <!-- Active Filter Chips Bar -->
      <div class="sfe-chips-bar" id="sfeChipsBar" style="display: none;">
        <span class="sfe-chips-label">Filters:</span>
        <div class="sfe-chips-list" id="sfeChipsList"></div>
        <button class="sfe-clear-all-btn" id="sfeClearAllBtn">Clear All</button>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('.sfe-search-input');
  const searchClear = container.querySelector('.sfe-search-clear');
  const btnAddFilter = container.querySelector('#btnSfeAddFilter');
  const popover = container.querySelector('#sfePopover');
  const chipsBar = container.querySelector('#sfeChipsBar');
  const chipsList = container.querySelector('#sfeChipsList');
  const clearAllBtn = container.querySelector('#sfeClearAllBtn');
  const badgeEl = container.querySelector('#sfeBadge');

  // Trigger change
  function notifyChange() {
    renderChips();
    onFilterChange(activeFilters, currentSearchQuery);
  }

  // Render Active Filter Chips
  function renderChips() {
    const keys = Object.keys(activeFilters).filter(k => activeFilters[k] !== undefined && activeFilters[k] !== null && activeFilters[k] !== 'ALL');
    chipsList.innerHTML = '';

    if (keys.length === 0) {
      chipsBar.style.display = 'none';
      badgeEl.style.display = 'none';
      btnAddFilter.classList.remove('has-filters');
      return;
    }

    chipsBar.style.display = 'flex';
    badgeEl.style.display = 'inline-block';
    badgeEl.textContent = keys.length;
    btnAddFilter.classList.add('has-filters');

    keys.forEach(k => {
      const cfg = filterConfig.find(f => f.key === k);
      if (!cfg) return;

      const val = activeFilters[k];
      let displayLabel = val;
      if (cfg.getOptions) {
        const opt = cfg.getOptions().find(o => String(o.value) === String(val));
        if (opt) displayLabel = opt.label;
      }

      const chip = document.createElement('span');
      chip.className = 'sfe-filter-chip';
      chip.setAttribute('data-key', k);

      chip.innerHTML = `
        <span class="sfe-chip-field">${cfg.label}:</span>
        <strong class="sfe-chip-val">${displayLabel}</strong>
        <button class="sfe-chip-remove" title="Remove filter" data-key="${k}">×</button>
      `;

      // Clicking remove button
      chip.querySelector('.sfe-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        delete activeFilters[k];
        notifyChange();
      });

      // Clicking chip body re-opens popover on that field to edit
      chip.addEventListener('click', () => {
        activeFieldForPopover = k;
        openPopover();
      });

      chipsList.appendChild(chip);
    });
  }

  // Render Popover Content
  function renderPopoverContent() {
    if (!activeFieldForPopover) {
      // Stage 1: Field Selection
      popover.innerHTML = `
        <div class="sfe-popover-header">
          <span class="sfe-ph-title">Filter by</span>
          <button class="sfe-ph-close" id="sfePopClose">×</button>
        </div>
        <div class="sfe-fields-list">
          ${filterConfig
            .map(f => {
              const isApplied = activeFilters[f.key] !== undefined && activeFilters[f.key] !== 'ALL';
              return `
                <button class="sfe-field-item ${isApplied ? 'is-active' : ''}" data-key="${f.key}">
                  <span class="sfe-fi-icon">${f.icon || '🏷️'}</span>
                  <span class="sfe-fi-label">${f.label}</span>
                  ${isApplied ? `<span class="sfe-fi-check">${getIcon('check')}</span>` : `<span class="sfe-fi-arrow">&rsaquo;</span>`}
                </button>
              `;
            })
            .join('')}
        </div>
      `;

      popover.querySelector('#sfePopClose').addEventListener('click', closePopover);

      popover.querySelectorAll('.sfe-field-item').forEach(item => {
        item.addEventListener('click', () => {
          activeFieldForPopover = item.getAttribute('data-key');
          renderPopoverContent();
        });
      });
    } else {
      // Stage 2: Value Selection for activeFieldForPopover
      const cfg = filterConfig.find(f => f.key === activeFieldForPopover);
      if (!cfg) {
        activeFieldForPopover = null;
        renderPopoverContent();
        return;
      }

      const options = cfg.getOptions ? cfg.getOptions() : [];
      const currentVal = activeFilters[cfg.key];

      popover.innerHTML = `
        <div class="sfe-popover-header">
          <button class="sfe-back-btn" id="sfePopBack">&larr; Back</button>
          <span class="sfe-ph-title">${cfg.label}</span>
          <button class="sfe-ph-close" id="sfePopClose">×</button>
        </div>
        <div class="sfe-values-list">
          <button class="sfe-val-item ${!currentVal || currentVal === 'ALL' ? 'selected' : ''}" data-val="ALL">
            <span>All ${cfg.label}s (Reset)</span>
            ${!currentVal || currentVal === 'ALL' ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
          </button>
          ${options
            .map(opt => {
              const isSelected = String(currentVal) === String(opt.value);
              return `
                <button class="sfe-val-item ${isSelected ? 'selected' : ''}" data-val="${opt.value}">
                  <span>${opt.label}</span>
                  ${opt.count !== undefined ? `<span class="sfe-val-count">${opt.count}</span>` : ''}
                  ${isSelected ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
                </button>
              `;
            })
            .join('')}
        </div>
      `;

      popover.querySelector('#sfePopClose').addEventListener('click', closePopover);
      popover.querySelector('#sfePopBack').addEventListener('click', () => {
        activeFieldForPopover = null;
        renderPopoverContent();
      });

      popover.querySelectorAll('.sfe-val-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-val');
          if (val === 'ALL') {
            delete activeFilters[cfg.key];
          } else {
            activeFilters[cfg.key] = val;
          }
          closePopover();
          notifyChange();
        });
      });
    }
  }

  function openPopover() {
    popoverOpen = true;
    popover.style.display = 'block';
    renderPopoverContent();
  }

  function closePopover() {
    popoverOpen = false;
    popover.style.display = 'none';
    activeFieldForPopover = null;
  }

  btnAddFilter.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popoverOpen) {
      closePopover();
    } else {
      activeFieldForPopover = null;
      openPopover();
    }
  });

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (popoverOpen && !popover.contains(e.target) && !btnAddFilter.contains(e.target)) {
      closePopover();
    }
  });

  // Clear All
  clearAllBtn.addEventListener('click', () => {
    activeFilters = {};
    notifyChange();
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    searchClear.style.display = currentSearchQuery ? 'block' : 'none';
    notifyChange();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClear.style.display = 'none';
    notifyChange();
  });

  return {
    getActiveFilters: () => ({ ...activeFilters }),
    getSearchQuery: () => currentSearchQuery,
    setFilter: (key, value) => {
      if (value === 'ALL' || !value) {
        delete activeFilters[key];
      } else {
        activeFilters[key] = value;
      }
      notifyChange();
    },
    clearAll: () => {
      activeFilters = {};
      searchInput.value = '';
      currentSearchQuery = '';
      searchClear.style.display = 'none';
      notifyChange();
    }
  };
}
