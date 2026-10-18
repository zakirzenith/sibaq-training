import { getIcon } from './icons.js';

/**
 * Modern Notion/Linear-Style Filter Engine
 * Provides "+ Add Filter" popover, search inside popover, removable active filter chips,
 * multi-filter combination (AND logic), and touch-friendly mobile bottom sheet.
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
  let valueSearchQuery = '';

  container.innerHTML = `
    <div class="saas-filter-engine-wrap">
      <!-- Search Box & Add Filter Button Row -->
      <div class="sfe-main-row">
        <div class="sfe-search-box">
          <span class="sfe-search-icon">${getIcon('search')}</span>
          <input 
            type="text" 
            class="sfe-search-input" 
            placeholder="${searchPlaceholder}"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="sfe-search-clear" style="display: none;" title="Clear search">×</button>
        </div>

        <div class="sfe-popover-anchor">
          <button type="button" class="btn-sfe-add-filter" id="btnSfeAddFilter" title="Add a filter">
            <svg class="sfe-funnel-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span class="btn-text">Add Filter</span>
            <span class="sfe-badge" id="sfeBadge" style="display: none;">0</span>
          </button>
        </div>
      </div>

      <!-- Active Filter Chips Strip -->
      <div class="sfe-chips-bar" id="sfeChipsBar" style="display: none;">
        <span class="sfe-chips-label">Filters:</span>
        <div class="sfe-chips-list" id="sfeChipsList"></div>
        <button type="button" class="sfe-clear-all-btn" id="sfeClearAllBtn">Clear All</button>
      </div>

      <!-- Modal Backdrop for Mobile & Desktop Popover Dismissal -->
      <div class="sfe-backdrop" id="sfeBackdrop" style="display: none;"></div>

      <!-- Floating Popover / Mobile Bottom Sheet -->
      <div class="sfe-popover-dropdown" id="sfePopover" style="display: none;">
        <!-- Injected dynamically -->
      </div>
    </div>
  `;

  const searchInput = container.querySelector('.sfe-search-input');
  const searchClear = container.querySelector('.sfe-search-clear');
  const btnAddFilter = container.querySelector('#btnSfeAddFilter');
  const popover = container.querySelector('#sfePopover');
  const backdrop = container.querySelector('#sfeBackdrop');
  const chipsBar = container.querySelector('#sfeChipsBar');
  const chipsList = container.querySelector('#sfeChipsList');
  const clearAllBtn = container.querySelector('#sfeClearAllBtn');
  const badgeEl = container.querySelector('#sfeBadge');

  // Stop clicks inside popover from bubbling up
  popover.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Notify parent component of filter or search change
  function notifyChange() {
    renderChips();
    onFilterChange(activeFilters, currentSearchQuery);
  }

  // Render Active Filter Chips
  function renderChips() {
    const keys = Object.keys(activeFilters).filter(
      k => activeFilters[k] !== undefined && activeFilters[k] !== null && activeFilters[k] !== 'ALL' && activeFilters[k] !== ''
    );
    chipsList.innerHTML = '';

    if (keys.length === 0) {
      chipsBar.style.display = 'none';
      badgeEl.style.display = 'none';
      btnAddFilter.classList.remove('has-filters');
      return;
    }

    chipsBar.style.display = 'flex';
    badgeEl.style.display = 'inline-flex';
    badgeEl.textContent = keys.length;
    btnAddFilter.classList.add('has-filters');

    keys.forEach(k => {
      const cfg = filterConfig.find(f => f.key === k);
      if (!cfg) return;

      const val = activeFilters[k];
      let displayLabel = val;
      if (cfg.getOptions) {
        const opts = cfg.getOptions() || [];
        const opt = opts.find(o => String(o.value).toLowerCase() === String(val).toLowerCase());
        if (opt) displayLabel = opt.label;
      }

      const chip = document.createElement('span');
      chip.className = 'sfe-filter-chip';
      chip.setAttribute('data-key', k);

      chip.innerHTML = `
        <span class="sfe-chip-field">${cfg.label}:</span>
        <strong class="sfe-chip-val">${displayLabel}</strong>
        <button type="button" class="sfe-chip-remove" title="Remove filter" data-key="${k}">×</button>
      `;

      // Remove specific filter chip
      chip.querySelector('.sfe-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        delete activeFilters[k];
        notifyChange();
      });

      // Tap chip body to re-open popover to change value
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        activeFieldForPopover = k;
        valueSearchQuery = '';
        openPopover();
      });

      chipsList.appendChild(chip);
    });
  }

  // Render Popover Content (Stage 1: Field Selector, Stage 2: Value Selector)
  function renderPopoverContent() {
    if (!activeFieldForPopover) {
      // Stage 1: Field Selection
      popover.innerHTML = `
        <div class="sfe-sheet-handle-bar"></div>
        <div class="sfe-popover-header">
          <span class="sfe-ph-title">Filter by</span>
          <button type="button" class="sfe-ph-close" id="sfePopClose" aria-label="Close">×</button>
        </div>
        <div class="sfe-fields-list">
          ${filterConfig
            .map(f => {
              const isApplied = activeFilters[f.key] !== undefined && activeFilters[f.key] !== null && activeFilters[f.key] !== 'ALL' && activeFilters[f.key] !== '';
              const iconSvg = f.icon ? (f.icon.startsWith('<svg') ? f.icon : (getIcon(f.icon) || getIcon('tag'))) : getIcon('tag');
              return `
                <button type="button" class="sfe-field-item ${isApplied ? 'is-active' : ''}" data-key="${f.key}">
                  <div class="sfe-fi-left">
                    <span class="sfe-fi-icon">${iconSvg}</span>
                    <span class="sfe-fi-label">${f.label}</span>
                  </div>
                  <div class="sfe-fi-right">
                    ${isApplied ? `<span class="sfe-fi-check">${getIcon('check')}</span>` : `<span class="sfe-fi-arrow">&rsaquo;</span>`}
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>
      `;

      const btnClose = popover.querySelector('#sfePopClose');
      if (btnClose) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          closePopover();
        });
      }

      popover.querySelectorAll('.sfe-field-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          activeFieldForPopover = item.getAttribute('data-key');
          valueSearchQuery = '';
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

      const allOptions = (cfg.getOptions ? cfg.getOptions() : []) || [];
      const currentVal = activeFilters[cfg.key];

      // Filter options by valueSearchQuery if present
      const q = valueSearchQuery.toLowerCase().trim();
      const filteredOptions = q
        ? allOptions.filter(o => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
        : allOptions;

      popover.innerHTML = `
        <div class="sfe-sheet-handle-bar"></div>
        <div class="sfe-popover-header">
          <button type="button" class="sfe-back-btn" id="sfePopBack">&larr; Back</button>
          <span class="sfe-ph-title">${cfg.label}</span>
          <button type="button" class="sfe-ph-close" id="sfePopClose" aria-label="Close">×</button>
        </div>

        ${allOptions.length > 5 ? `
          <div class="sfe-val-search-wrap">
            <span class="sfe-val-search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              class="sfe-val-search-input" 
              placeholder="Search ${cfg.label}..." 
              value="${valueSearchQuery}"
              autocomplete="off"
            />
          </div>
        ` : ''}

        <div class="sfe-values-list">
          <button type="button" class="sfe-val-item ${!currentVal || currentVal === 'ALL' ? 'selected' : ''}" data-val="ALL">
            <span class="sfe-val-name">All ${cfg.label.endsWith('y') ? cfg.label.slice(0, -1) + 'ies' : (cfg.label.endsWith('s') ? cfg.label : cfg.label + 's')} (Reset)</span>
            ${!currentVal || currentVal === 'ALL' ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
          </button>

          ${filteredOptions.length === 0 ? `
            <div class="sfe-no-options">No matches for "${valueSearchQuery}"</div>
          ` : filteredOptions.map(opt => {
            const isSelected = String(currentVal).toLowerCase() === String(opt.value).toLowerCase();
            return `
              <button type="button" class="sfe-val-item ${isSelected ? 'selected' : ''}" data-val="${opt.value}">
                <span class="sfe-val-name">${opt.label}</span>
                <div class="sfe-val-right">
                  ${opt.count !== undefined ? `<span class="sfe-val-count">${opt.count}</span>` : ''}
                  ${isSelected ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `;

      // Back button
      const btnBack = popover.querySelector('#sfePopBack');
      if (btnBack) {
        btnBack.addEventListener('click', (e) => {
          e.stopPropagation();
          activeFieldForPopover = null;
          valueSearchQuery = '';
          renderPopoverContent();
        });
      }

      // Close button
      const btnClose = popover.querySelector('#sfePopClose');
      if (btnClose) {
        btnClose.addEventListener('click', (e) => {
          e.stopPropagation();
          closePopover();
        });
      }

      // Search input inside value picker
      const valSearchInput = popover.querySelector('.sfe-val-search-input');
      if (valSearchInput) {
        valSearchInput.addEventListener('input', (e) => {
          valueSearchQuery = e.target.value;
          // Re-render only values list while keeping focus
          const containerList = popover.querySelector('.sfe-values-list');
          if (containerList) {
            const qInner = valueSearchQuery.toLowerCase().trim();
            const filteredInner = qInner
              ? allOptions.filter(o => o.label.toLowerCase().includes(qInner) || String(o.value).toLowerCase().includes(qInner))
              : allOptions;

            containerList.innerHTML = `
              <button type="button" class="sfe-val-item ${!currentVal || currentVal === 'ALL' ? 'selected' : ''}" data-val="ALL">
                <span class="sfe-val-name">All ${cfg.label}s (Reset)</span>
                ${!currentVal || currentVal === 'ALL' ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
              </button>
              ${filteredInner.length === 0 ? `
                <div class="sfe-no-options">No matches found</div>
              ` : filteredInner.map(opt => {
                const isSelected = String(currentVal).toLowerCase() === String(opt.value).toLowerCase();
                return `
                  <button type="button" class="sfe-val-item ${isSelected ? 'selected' : ''}" data-val="${opt.value}">
                    <span class="sfe-val-name">${opt.label}</span>
                    <div class="sfe-val-right">
                      ${opt.count !== undefined ? `<span class="sfe-val-count">${opt.count}</span>` : ''}
                      ${isSelected ? `<span class="sfe-val-check">${getIcon('check')}</span>` : ''}
                    </div>
                  </button>
                `;
              }).join('')}
            `;

            wireValueItems();
          }
        });
      }

      // Wire option selections
      function wireValueItems() {
        popover.querySelectorAll('.sfe-val-item').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
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
      wireValueItems();
    }
  }

  function openPopover() {
    popoverOpen = true;
    popover.classList.add('is-open');
    backdrop.classList.add('is-open');
    popover.style.display = '';
    backdrop.style.display = '';
    renderPopoverContent();
  }

  function closePopover() {
    popoverOpen = false;
    popover.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    popover.style.display = 'none';
    backdrop.style.display = 'none';
    activeFieldForPopover = null;
    valueSearchQuery = '';
  }

  // "+ Add Filter" button toggle
  btnAddFilter.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popoverOpen) {
      closePopover();
    } else {
      activeFieldForPopover = null;
      valueSearchQuery = '';
      openPopover();
    }
  });

  // Tapping backdrop closes popover
  backdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    closePopover();
  });

  // Clicking outside popover closes it
  document.addEventListener('click', (e) => {
    if (popoverOpen && !popover.contains(e.target) && !btnAddFilter.contains(e.target)) {
      closePopover();
    }
  });

  // Escape key closes popover
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popoverOpen) {
      closePopover();
    }
  });

  // "Clear All" active filters button
  clearAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    activeFilters = {};
    notifyChange();
  });

  // Live Search Input handler
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    searchClear.style.display = currentSearchQuery ? 'block' : 'none';
    onFilterChange(activeFilters, currentSearchQuery);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    searchClear.style.display = 'none';
    onFilterChange(activeFilters, currentSearchQuery);
    searchInput.focus();
  });

  return {
    getActiveFilters: () => ({ ...activeFilters }),
    getSearchQuery: () => currentSearchQuery,
    setFilter: (key, value) => {
      if (value === null || value === undefined || value === 'ALL') {
        delete activeFilters[key];
      } else {
        activeFilters[key] = value;
      }
      notifyChange();
    },
    clearAll: () => {
      activeFilters = {};
      currentSearchQuery = '';
      searchInput.value = '';
      searchClear.style.display = 'none';
      notifyChange();
    }
  };
}
