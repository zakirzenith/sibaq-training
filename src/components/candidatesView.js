import { state } from '../services/state.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openCandidateFormModal } from './modals/candidateFormModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { createFilterBar } from './filterEngine.js';

export function renderCandidatesView(container, navigateTo) {
  let activeFilters = {};
  let currentSearchQuery = '';

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Candidates & Mentees</h1>
        <p class="svh-desc">Manage candidate master roster, bulk import Excel spreadsheets, and track category divisions.</p>
      </div>

      <div class="saas-header-actions">
        <div class="saas-action-pill-group desktop-only-btn">
          <button id="btnDownloadCandTemplate" class="saas-pill-btn" title="Download formatted sample Excel sheet">
            ${getIcon('fileSpreadsheet')} Template
          </button>
          <button id="btnExportCandidates" class="saas-pill-btn" title="Export current list to Excel">
            ${getIcon('download')} Export
          </button>
          <button id="btnBulkUploadCandidates" class="saas-pill-btn" title="Bulk upload candidates from Excel">
            ${getIcon('upload')} Bulk Upload
          </button>
        </div>

        <button id="btnAddCandidate" class="btn-saas-primary">
          ${getIcon('plus')} Add Candidate
        </button>
      </div>
    </div>

    <!-- Modern Notion/Linear Filter Engine -->
    <div id="candidatesFilterBar"></div>

    <!-- Candidates Card -->
    <div class="saas-table-card">
      <div class="saas-table-head-strip">
        <div class="sth-left">
          <span class="sth-title">Active Candidate Directory</span>
          <span id="candidatesCountBadge" class="saas-badge-pill">0</span>
        </div>
        <div class="sth-right text-xs text-muted desktop-only-btn">
          Click student name to view enrolled programs & trainers
        </div>
      </div>

      <!-- Desktop Table View (>= 769px) -->
      <div class="saas-table-responsive desktop-table-view">
        <table class="saas-data-table">
          <thead>
            <tr>
              <th style="width: 140px;">Admission No</th>
              <th>Student / Candidate</th>
              <th>Category</th>
              <th>Class / Grade</th>
              <th>Enrolled Programs</th>
              <th style="width: 110px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="candidatesTableBody">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>

      <!-- Mobile Touch Cards List (< 769px) -->
      <div id="candidatesMobileList" class="mobile-cards-view">
        <!-- Rendered dynamically for phone view -->
      </div>
    </div>
  `;

  const tableBody = container.querySelector('#candidatesTableBody');
  const mobileList = container.querySelector('#candidatesMobileList');
  const countBadge = container.querySelector('#candidatesCountBadge');
  const filterContainer = container.querySelector('#candidatesFilterBar');

  // Filter Engine Configuration
  const filterEngine = createFilterBar({
    container: filterContainer,
    searchPlaceholder: 'Search by candidate name, admission no, or class...',
    filterConfig: [
      {
        key: 'category',
        label: 'Category',
        icon: '🏷️',
        getOptions: () => {
          const cands = state.getCandidates();
          const counts = {};
          cands.forEach(c => {
            const cat = c.category || 'General';
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
        key: 'class',
        label: 'Class / Grade',
        icon: '🎓',
        getOptions: () => {
          const cands = state.getCandidates();
          const counts = {};
          cands.forEach(c => {
            const cls = c.class || 'No Class';
            counts[cls] = (counts[cls] || 0) + 1;
          });
          return Object.keys(counts).sort().map(cls => ({
            value: cls === 'No Class' ? '' : cls,
            label: cls,
            count: counts[cls]
          }));
        }
      },
      {
        key: 'enrollment',
        label: 'Enrollment Status',
        icon: '⚡',
        getOptions: () => [
          { value: 'enrolled', label: 'Enrolled in Programs' },
          { value: 'not_enrolled', label: 'Not Enrolled' }
        ]
      }
    ],
    onFilterChange: (newFilters, newSearch) => {
      activeFilters = newFilters;
      currentSearchQuery = newSearch;
      renderTable();
    }
  });

  function renderTable() {
    const candidates = state.getCandidates();

    const filtered = candidates.filter(c => {
      const q = currentSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.adNo.toLowerCase().includes(q) ||
        (c.class && c.class.toLowerCase().includes(q));

      const matchesCat = !activeFilters.category || c.category === activeFilters.category;
      const matchesCls = activeFilters.class === undefined || (c.class || '') === activeFilters.class;

      let matchesEnrollment = true;
      if (activeFilters.enrollment) {
        const progCount = state.getCandidatePrograms(c.id).length;
        if (activeFilters.enrollment === 'enrolled') {
          matchesEnrollment = progCount > 0;
        } else if (activeFilters.enrollment === 'not_enrolled') {
          matchesEnrollment = progCount === 0;
        }
      }

      return matchesSearch && matchesCat && matchesCls && matchesEnrollment;
    });

    countBadge.textContent = `${filtered.length} Candidates`;
    tableBody.innerHTML = '';
    mobileList.innerHTML = '';

    if (filtered.length === 0) {
      const emptyHtml = `
        <div class="empty-state-box py-5 text-center">
          <div class="empty-icon">${getIcon('candidates')}</div>
          <h3>No candidates match your filters</h3>
          <p class="text-xs text-muted mt-1">Try clearing some filter chips or search queries.</p>
          <button id="btnResetAllCandFilters" class="btn btn-secondary btn-sm mt-3">
            Reset All Filters
          </button>
        </div>
      `;

      tableBody.innerHTML = `<tr><td colspan="6">${emptyHtml}</td></tr>`;
      mobileList.innerHTML = emptyHtml;

      container.querySelectorAll('#btnResetAllCandFilters').forEach(btn => {
        btn.addEventListener('click', () => {
          filterEngine.clearAll();
        });
      });
      return;
    }

    filtered.forEach(c => {
      const assignedPrograms = state.getCandidatePrograms(c.id);
      const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');

      // 1. Desktop Row
      const tr = document.createElement('tr');
      tr.className = 'saas-table-row';
      tr.innerHTML = `
        <td><span class="saas-adno-pill">${c.adNo}</span></td>
        <td>
          <div class="saas-student-cell" data-cid="${c.id}" style="cursor: pointer;">
            <div class="saas-avatar-soft">${initials}</div>
            <div class="saas-student-info">
              <button class="candidate-name-btn btn-view-profile" data-cid="${c.id}" title="Click to view candidate profile">
                <strong>${c.name}</strong>
              </button>
            </div>
          </div>
        </td>
        <td>
          <span class="saas-tag-pill ${
            c.category === 'Senior'
              ? 'p-stage'
              : c.category === 'Junior'
              ? 'p-cyan'
              : c.category === 'Sub-Junior'
              ? 'p-pink'
              : 'p-neutral'
          }">
            ${c.category}
          </span>
        </td>
        <td><span class="saas-class-pill">${c.class || '-'}</span></td>
        <td>
          <div class="assigned-programs-pills">
            ${
              assignedPrograms.length > 0
                ? assignedPrograms
                    .map(
                      p => `
                  <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'} clickable-program" data-pid="${p.id}" title="${p.name} • Assigned Trainer: ${p.trainerId ? state.getTrainerById(p.trainerId)?.name : 'Unassigned'}">
                    ${p.code}
                  </span>
                `
                    )
                    .join(' ')
                : '<span class="text-muted text-xs">Not enrolled yet</span>'
            }
          </div>
        </td>
        <td style="text-align: right;">
          <div class="table-actions-cell" style="justify-content: flex-end;">
            <button class="saas-circle-btn btn-edit-cand" title="Edit Candidate" data-id="${c.id}">
              ${getIcon('edit')}
            </button>
            <button class="saas-circle-btn text-danger btn-delete-cand" title="Delete Candidate" data-id="${c.id}">
              ${getIcon('trash')}
            </button>
          </div>
        </td>
      `;

      // 2. Mobile Card (Touch-Friendly Phone View)
      const mobileCard = document.createElement('div');
      mobileCard.className = 'mobile-candidate-card';
      mobileCard.setAttribute('data-cid', c.id);
      mobileCard.innerHTML = `
        <div class="mcc-top">
          <div class="saas-avatar-soft" style="width: 38px; height: 38px; font-size: 13px;">${initials}</div>
          <div class="mcc-meta">
            <strong class="mcc-name">${c.name}</strong>
            <div class="mcc-sub">
              <span class="saas-adno-pill">${c.adNo}</span>
              <span class="saas-class-pill">${c.class || 'No Class'}</span>
            </div>
          </div>
          <span class="saas-tag-pill ${c.category === 'Senior' ? 'p-stage' : 'p-neutral'}">${c.category}</span>
        </div>
        <div class="mcc-programs-strip">
          ${
            assignedPrograms.length > 0
              ? assignedPrograms.map(p => `
                <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
                  ${p.code} • ${p.name}
                </span>
              `).join('')
              : '<span class="text-muted text-xs">No programs assigned</span>'
          }
        </div>
      `;

      // Wire Desktop Events
      tr.querySelectorAll('.clickable-program').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = chip.getAttribute('data-pid');
          openAssignCandidatesModal({
            programId: pid,
            onSave: () => renderTable()
          });
        });
      });

      tr.querySelectorAll('.btn-view-profile, .saas-student-cell').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openCandidateProfileModal({
            candidateId: c.id,
            onUpdate: () => renderTable()
          });
        });
      });

      tr.querySelector('.btn-edit-cand').addEventListener('click', (e) => {
        e.stopPropagation();
        openCandidateFormModal({
          candidate: c,
          onSave: () => renderTable()
        });
      });

      tr.querySelector('.btn-delete-cand').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete candidate ${c.name} (${c.adNo})?`)) {
          state.deleteCandidate(c.id);
          toast.info(`Deleted ${c.name}`);
          renderTable();
        }
      });

      // Wire Mobile Events (Tap card opens full profile directly)
      mobileCard.addEventListener('click', () => {
        openCandidateProfileModal({
          candidateId: c.id,
          onUpdate: () => renderTable()
        });
      });

      tableBody.appendChild(tr);
      mobileList.appendChild(mobileCard);
    });
  }

  // Header button events
  container.querySelector('#btnAddCandidate').addEventListener('click', () => {
    openCandidateFormModal({
      onSave: () => renderTable()
    });
  });

  const btnDownloadTemplate = container.querySelector('#btnDownloadCandTemplate');
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      excelService.downloadTemplate('candidates');
    });
  }

  const btnExport = container.querySelector('#btnExportCandidates');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const candidates = state.getCandidates();
      excelService.exportCandidates(candidates);
      toast.success(`Exported ${candidates.length} candidates.`);
    });
  }

  const btnBulkUpload = container.querySelector('#btnBulkUploadCandidates');
  if (btnBulkUpload) {
    btnBulkUpload.addEventListener('click', () => {
      openExcelUploadModal({
        type: 'candidates',
        onComplete: () => renderTable()
      });
    });
  }

  // Initial render
  renderTable();
}
