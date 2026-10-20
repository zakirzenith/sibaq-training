import { state } from '../services/state.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openCandidateFormModal } from './modals/candidateFormModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { openBulkPhotoUploadModal } from './modals/bulkPhotoUploadModal.js';
import { createFilterBar } from './filterEngine.js';

export function renderCandidatesView(container, navigateTo) {
  let activeFilters = {};
  let currentSearchQuery = '';

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Candidates & Mentees</h1>
        <p class="svh-desc">Manage candidate master roster, bulk import Excel spreadsheets, bulk upload student photos, and track category divisions.</p>
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
            ${getIcon('upload')} Bulk Excel
          </button>
          <button id="btnBulkUploadPhotos" class="saas-pill-btn" title="Bulk upload candidate photos by Admission No" style="background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 700;">
            ${getIcon('camera') || getIcon('image') || getIcon('upload')} Bulk Photos
          </button>
        </div>

        <button id="btnMobileBulkPhotos" class="saas-pill-btn mobile-only-btn" title="Bulk upload photos" style="background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 700;">
          ${getIcon('camera') || getIcon('image') || getIcon('upload')} Photos
        </button>

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
        icon: 'tag',
        getOptions: () => {
          const cands = state.getCandidates();
          const counts = {};
          cands.forEach(c => {
            const cat = String(c.category || 'General').trim();
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
        icon: 'graduationCap',
        getOptions: () => {
          const cands = state.getCandidates();
          const counts = {};
          cands.forEach(c => {
            const cls = String(c.class || 'No Class').trim();
            counts[cls] = (counts[cls] || 0) + 1;
          });
          return Object.keys(counts).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          }).map(cls => ({
            value: cls,
            label: cls,
            count: counts[cls]
          }));
        }
      },
      {
        key: 'enrollment',
        label: 'Enrollment Status',
        icon: 'zap',
        getOptions: () => {
          const cands = state.getCandidates();
          const enrolled = cands.filter(c => state.getCandidatePrograms(c.id).length > 0).length;
          const notEnrolled = cands.length - enrolled;
          return [
            { value: 'enrolled', label: 'Enrolled in Programs', count: enrolled },
            { value: 'not_enrolled', label: 'Not Enrolled', count: notEnrolled }
          ];
        }
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
      const cName = String(c.name || '').toLowerCase();
      const cAd = String(c.adNo || '').toLowerCase();
      const cCls = String(c.class || '').toLowerCase();

      const matchesSearch = !q || cName.includes(q) || cAd.includes(q) || cCls.includes(q);
      if (!matchesSearch) return false;

      // Filter: Category (robust normalized comparison)
      if (activeFilters.category) {
        const itemCat = String(c.category || 'General').trim().toLowerCase();
        const targetCat = String(activeFilters.category).trim().toLowerCase();
        if (itemCat !== targetCat) return false;
      }

      // Filter: Class (robust normalized comparison)
      if (activeFilters.class) {
        const itemCls = String(c.class || 'No Class').trim().toLowerCase();
        const targetCls = String(activeFilters.class).trim().toLowerCase();
        if (itemCls !== targetCls) return false;
      }

      // Filter: Enrollment
      if (activeFilters.enrollment) {
        const progCount = state.getCandidatePrograms(c.id).length;
        if (activeFilters.enrollment === 'enrolled' && progCount === 0) return false;
        if (activeFilters.enrollment === 'not_enrolled' && progCount > 0) return false;
      }

      return true;
    });

    countBadge.textContent = `${filtered.length}`;
    tableBody.innerHTML = '';
    mobileList.innerHTML = '';

    if (filtered.length === 0) {
      const emptyHtml = `
        <div class="empty-state-box py-5 text-center" style="padding: 36px 16px; text-align: center;">
          <div class="empty-icon">${getIcon('candidates')}</div>
          <h3 style="margin: 8px 0 4px; font-size: 16px;">No candidates match your filters</h3>
          <p class="text-xs text-muted">Try clearing some filter chips or search queries.</p>
          <button type="button" id="btnResetAllCandFilters" class="btn btn-secondary btn-sm mt-3" style="margin-top: 12px;">
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
      const initials = (c.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('');

      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      tr.className = 'saas-table-row';
      tr.innerHTML = `
        <td><span class="saas-adno-pill">${c.adNo}</span></td>
        <td>
          <div class="saas-student-cell" data-cid="${c.id}" style="cursor: pointer;">
            <div class="saas-avatar-soft">${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : initials}</div>
            <div class="saas-student-info">
              <button class="candidate-name-btn btn-view-profile" data-cid="${c.id}" title="Click to view candidate profile">
                <strong>${c.name}</strong>
              </button>
            </div>
          </div>
        </td>
        <td>
          <span class="saas-tag-pill ${c.category === 'Senior' ? 'p-stage' : 'p-neutral'}">
            ${c.category || 'General'}
          </span>
        </td>
        <td>
          <span class="saas-class-pill">${c.class || '-'}</span>
        </td>
        <td>
          <div class="saas-prog-chips-wrap">
            ${
              assignedPrograms.length > 0
                ? assignedPrograms
                    .map(
                      p => `
                  <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'} clickable-program" data-pid="${p.id}" title="${p.name}">
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

      // 2. Mobile Touch Card (< 769px) with Direct Action Buttons
      const mobileCard = document.createElement('div');
      mobileCard.className = 'mobile-candidate-card';
      mobileCard.setAttribute('data-cid', c.id);
      mobileCard.innerHTML = `
        <div class="mcc-top">
          <div class="saas-avatar-soft" style="width: 40px; height: 40px; font-size: 13.5px; flex-shrink: 0;">${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : initials}</div>
          <div class="mcc-meta">
            <button type="button" class="mcc-name-btn btn-view-profile" data-cid="${c.id}">
              <strong class="mcc-name">${c.name}</strong>
            </button>
            <div class="mcc-sub">
              <span class="saas-adno-pill">${c.adNo}</span>
              <span class="saas-class-pill">${c.class || 'No Class'}</span>
              <span class="saas-tag-pill ${c.category === 'Senior' ? 'p-stage' : 'p-neutral'}">${c.category || 'General'}</span>
            </div>
          </div>
          <div class="mcc-actions">
            <button type="button" class="saas-circle-btn btn-edit-cand" title="Edit" data-id="${c.id}">
              ${getIcon('edit')}
            </button>
            <button type="button" class="saas-circle-btn text-danger btn-delete-cand" title="Delete" data-id="${c.id}">
              ${getIcon('trash')}
            </button>
          </div>
        </div>

        <div class="mcc-programs-strip">
          <span class="mcc-prog-label">Programs:</span>
          ${
            assignedPrograms.length > 0
              ? assignedPrograms.map(p => `
                <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
                  ${p.code} • ${p.name}
                </span>
              `).join('')
              : '<span class="text-muted text-xs">No programs assigned yet</span>'
          }
        </div>

        <button type="button" class="mcc-profile-bar-btn btn-view-profile" data-cid="${c.id}">
          <span>View Profile & Mentorship</span>
          <span class="mcc-arrow">&rarr;</span>
        </button>
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

      // Wire Profile Clicks on Both Desktop & Mobile
      const openProfile = (cid) => {
        openCandidateProfileModal({
          candidateId: cid,
          onUpdate: () => renderTable()
        });
      };

      tr.querySelectorAll('.btn-view-profile, .saas-student-cell').forEach(el => {
        el.addEventListener('click', () => openProfile(c.id));
      });

      mobileCard.querySelectorAll('.btn-view-profile').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openProfile(c.id);
        });
      });

      // Wire Edit Candidate
      const handleEdit = (cid) => {
        const cand = state.getCandidateById(cid);
        if (cand) {
          openCandidateFormModal({
            candidate: cand,
            onSave: () => renderTable()
          });
        }
      };

      tr.querySelector('.btn-edit-cand').addEventListener('click', () => handleEdit(c.id));
      mobileCard.querySelector('.btn-edit-cand').addEventListener('click', (e) => {
        e.stopPropagation();
        handleEdit(c.id);
      });

      // Wire Delete Candidate
      const handleDelete = (cid) => {
        const cand = state.getCandidateById(cid);
        if (confirm(`Are you sure you want to delete candidate ${cand?.name}?`)) {
          state.deleteCandidate(cid);
          toast.info(`Candidate ${cand?.name} deleted.`);
          renderTable();
        }
      };

      tr.querySelector('.btn-delete-cand').addEventListener('click', () => handleDelete(c.id));
      mobileCard.querySelector('.btn-delete-cand').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(c.id);
      });

      tableBody.appendChild(tr);
      mobileList.appendChild(mobileCard);
    });
  }

  // Header Actions
  const btnDownloadTemplate = container.querySelector('#btnDownloadCandTemplate');
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      excelService.downloadCandidatesTemplate();
    });
  }

  const btnExport = container.querySelector('#btnExportCandidates');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const list = state.getCandidates();
      excelService.exportCandidates(list, state);
      toast.success(`Exported ${list.length} candidates to Excel.`);
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

  const handleOpenBulkPhotos = () => {
    openBulkPhotoUploadModal({
      onComplete: () => renderTable()
    });
  };

  const btnBulkPhotos = container.querySelector('#btnBulkUploadPhotos');
  if (btnBulkPhotos) {
    btnBulkPhotos.addEventListener('click', handleOpenBulkPhotos);
  }

  const btnMobileBulkPhotos = container.querySelector('#btnMobileBulkPhotos');
  if (btnMobileBulkPhotos) {
    btnMobileBulkPhotos.addEventListener('click', handleOpenBulkPhotos);
  }

  container.querySelector('#btnAddCandidate').addEventListener('click', () => {
    openCandidateFormModal({
      onSave: () => renderTable()
    });
  });

  // Initial render
  renderTable();

  // Cross-device sync
  const unsubscribeState = state.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubscribeState();
      return;
    }
    renderTable();
  });
}
