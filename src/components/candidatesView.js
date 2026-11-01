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
import { printCandidateOfflineTracker, openCandidateTrackerModal } from './candidateTrackerPrint.js';

export function renderCandidatesView(container, navigateTo) {
  let activeFilters = {};
  let currentSearchQuery = '';
  let lastFilteredCandidates = [];

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Candidates & Mentees</h1>
        <p class="svh-desc">Manage candidate master roster, bulk import Excel spreadsheets, bulk upload student photos, and track category divisions.</p>
      </div>

      <div class="saas-header-actions">
        <div class="saas-action-pill-group desktop-only-btn">
          <button id="btnBulkDailyOfflineTrackers" class="saas-pill-btn" title="Download Bulk Progress Tracker PDF for All Students (1 Nov - 20 Nov)" style="background: #000000; color: #ffffff; border-color: #000000; font-weight: 800;">
            ${getIcon('printer')} Bulk Trackers PDF (All)
          </button>
          <button id="btnDailyOfflineTrackers" class="saas-pill-btn" title="Filter / Select Candidates Progress Trackers">
            ${getIcon('filter')} Trackers Selector
          </button>
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

        <button id="btnMobileBulkDailyOfflineTrackers" class="saas-pill-btn mobile-only-btn" title="Download Bulk PDF for all students" style="background: #000000; color: #ffffff; border-color: #000000; font-weight: 800;">
          ${getIcon('printer')} Bulk PDF
        </button>

        <button id="btnMobileDailyOfflineTrackers" class="saas-pill-btn mobile-only-btn" title="Offline Trackers (1-20 Nov)" style="background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; font-weight: 700;">
          ${getIcon('filter')} Trackers
        </button>

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
              <th style="width: 140px; text-align: right;">Actions</th>
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
        key: 'status',
        label: 'Candidate Status',
        icon: 'activity',
        getOptions: () => {
          const cands = state.getCandidates();
          const pMap = state.getCandidateProgramsMap();
          let activeStage = 0;
          cands.forEach(c => {
            const progs = pMap.get(String(c.id).toLowerCase()) || (c.adNo ? pMap.get(String(c.adNo).toLowerCase()) : null) || [];
            const hasStage = progs.some(p => p.type === 'Stage' && p.status !== 'Inactive' && p.isActive !== false);
            if (hasStage) activeStage++;
          });
          const inactiveNonStage = cands.length - activeStage;
          return [
            { value: 'active', label: 'Active (Stage Candidates)', count: activeStage },
            { value: 'inactive', label: 'Inactive (Non-Stage Only)', count: inactiveNonStage }
          ];
        }
      },
      {
        key: 'enrollment',
        label: 'Enrollment Status',
        icon: 'zap',
        getOptions: () => {
          const cands = state.getCandidates();
          const pMap = state.getCandidateProgramsMap();
          let enrolled = 0;
          cands.forEach(c => {
            const progs = pMap.get(String(c.id).toLowerCase()) || (c.adNo ? pMap.get(String(c.adNo).toLowerCase()) : null) || [];
            if (progs.length > 0) enrolled++;
          });
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

  // Delegated event handling for instant, non-laggy clicks across desktop table and mobile touch cards
  const handleOpenProfile = (cid) => {
    openCandidateProfileModal({
      candidateId: cid,
      onUpdate: () => renderTable()
    });
  };

  const handlePrintTracker = (cid) => {
    const cand = state.getCandidateById(cid);
    if (cand) printCandidateOfflineTracker(cand);
  };

  const handleEdit = (cid) => {
    const cand = state.getCandidateById(cid);
    if (cand) {
      openCandidateFormModal({
        candidate: cand,
        onSave: () => renderTable()
      });
    }
  };

  const handleDelete = (cid) => {
    const cand = state.getCandidateById(cid);
    if (!cand) return;
    if (confirm(`Are you sure you want to delete candidate ${cand.name}?`)) {
      state.deleteCandidate(cid);
      toast.info(`Candidate ${cand.name} deleted.`);
      renderTable();
    }
  };

  const setupDelegatedListClicks = (containerEl) => {
    containerEl.addEventListener('click', (e) => {
      const progChip = e.target.closest('.clickable-program');
      if (progChip) {
        e.stopPropagation();
        const pid = progChip.getAttribute('data-pid');
        if (pid) {
          openAssignCandidatesModal({
            programId: pid,
            onSave: () => renderTable()
          });
        }
        return;
      }

      const printBtn = e.target.closest('.btn-print-cand-tracker');
      if (printBtn) {
        e.stopPropagation();
        const cid = printBtn.getAttribute('data-id');
        if (cid) handlePrintTracker(cid);
        return;
      }

      const editBtn = e.target.closest('.btn-edit-cand');
      if (editBtn) {
        e.stopPropagation();
        const cid = editBtn.getAttribute('data-id');
        if (cid) handleEdit(cid);
        return;
      }

      const delBtn = e.target.closest('.btn-delete-cand');
      if (delBtn) {
        e.stopPropagation();
        const cid = delBtn.getAttribute('data-id');
        if (cid) handleDelete(cid);
        return;
      }

      const profBtn = e.target.closest('.btn-view-profile, .saas-student-cell, .mcc-name-btn, .mcc-profile-bar-btn');
      if (profBtn) {
        const cid = profBtn.getAttribute('data-cid') || profBtn.closest('[data-cid]')?.getAttribute('data-cid');
        if (cid) handleOpenProfile(cid);
        return;
      }
    });
  };

  setupDelegatedListClicks(tableBody);
  setupDelegatedListClicks(mobileList);

  function renderTable() {
    const candidates = state.getCandidates();
    const progMap = state.getCandidateProgramsMap();

    const filtered = candidates.filter(c => {
      const q = currentSearchQuery.toLowerCase().trim();
      const cName = String(c.name || '').toLowerCase();
      const cAd = String(c.adNo || '').toLowerCase();
      const cCls = String(c.class || '').toLowerCase();

      const matchesSearch = !q || cName.includes(q) || cAd.includes(q) || cCls.includes(q);
      if (!matchesSearch) return false;

      // Filter: Category
      if (activeFilters.category) {
        const itemCat = String(c.category || 'General').trim().toLowerCase();
        const targetCat = String(activeFilters.category).trim().toLowerCase();
        if (itemCat !== targetCat) return false;
      }

      // Filter: Class
      if (activeFilters.class) {
        const itemCls = String(c.class || 'No Class').trim().toLowerCase();
        const targetCls = String(activeFilters.class).trim().toLowerCase();
        if (itemCls !== targetCls) return false;
      }

      // Fast O(1) Candidate Programs Lookup
      const progs = progMap.get(String(c.id).toLowerCase()) || (c.adNo ? progMap.get(String(c.adNo).toLowerCase()) : null) || [];
      const hasStage = progs.some(p => p.type === 'Stage' && p.status !== 'Inactive' && p.isActive !== false);

      // Filter: Candidate Status
      if (activeFilters.status) {
        if (activeFilters.status === 'active' && !hasStage) return false;
        if (activeFilters.status === 'inactive' && hasStage) return false;
      }

      // Filter: Enrollment
      if (activeFilters.enrollment) {
        if (activeFilters.enrollment === 'enrolled' && progs.length === 0) return false;
        if (activeFilters.enrollment === 'not_enrolled' && progs.length > 0) return false;
      }

      return true;
    });

    lastFilteredCandidates = filtered;
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
      const assignedPrograms = progMap.get(String(c.id).toLowerCase()) || (c.adNo ? progMap.get(String(c.adNo).toLowerCase()) : null) || [];
      const stagePrograms = assignedPrograms.filter(p => p.type === 'Stage' && p.status !== 'Inactive' && p.isActive !== false);
      const isInactiveNonStage = c.status === 'Inactive' || stagePrograms.length === 0;
      const initials = (c.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('');

      // 1. Desktop Table Row
      const tr = document.createElement('tr');
      tr.className = `saas-table-row ${isInactiveNonStage ? 'row-inactive-candidate' : ''}`;
      tr.innerHTML = `
        <td><span class="saas-adno-pill">${c.adNo}</span></td>
        <td>
          <div class="saas-student-cell" data-cid="${c.id}" style="cursor: pointer;">
            <div class="saas-avatar-soft">${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : initials}</div>
            <div class="saas-student-info">
              <button type="button" class="candidate-name-btn btn-view-profile" data-cid="${c.id}" title="Click to view candidate profile">
                <strong>${c.name}</strong>
              </button>
              ${isInactiveNonStage ? `
                <span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: 6px;" title="Non-Stage completed; candidate deactivated">
                  Inactive • Non-Stage
                </span>
              ` : ''}
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
                      p => {
                        const isNonStage = p.type === 'Non-Stage' || p.status === 'Inactive';
                        if (isNonStage) {
                          return `
                            <span class="saas-prog-capsule p-nonstage clickable-program" data-pid="${p.id}" title="${p.name} (Non-Stage - Completed)" style="opacity: 0.65; text-decoration: line-through; border-style: dashed; cursor: pointer;">
                              ${p.code} (Done)
                            </span>
                          `;
                        }
                        return `
                          <span class="saas-prog-capsule p-stage clickable-program" data-pid="${p.id}" title="${p.name}" style="cursor: pointer;">
                            ${p.code}
                          </span>
                        `;
                      }
                    )
                    .join(' ')
                : '<span class="text-muted text-xs">Not enrolled yet</span>'
            }
          </div>
        </td>
        <td style="text-align: right;">
          <div class="table-actions-cell" style="justify-content: flex-end;">
            <button type="button" class="saas-circle-btn btn-print-cand-tracker" title="${isInactiveNonStage ? 'Offline tracker not available (Non-Stage only)' : 'Print Offline Tracker (1-20 Nov)'}" data-id="${c.id}" style="${isInactiveNonStage ? 'color: #94a3b8; opacity: 0.6;' : 'color: #0f172a;'}">
              ${getIcon('printer')}
            </button>
            <button type="button" class="saas-circle-btn btn-edit-cand" title="Edit Candidate" data-id="${c.id}">
              ${getIcon('edit')}
            </button>
            <button type="button" class="saas-circle-btn text-danger btn-delete-cand" title="Delete Candidate" data-id="${c.id}">
              ${getIcon('trash')}
            </button>
          </div>
        </td>
      `;

      // 2. Mobile Touch Card (< 769px) with Direct Action Buttons
      const mobileCard = document.createElement('div');
      mobileCard.className = `mobile-candidate-card ${isInactiveNonStage ? 'card-inactive-candidate' : ''}`;
      mobileCard.setAttribute('data-cid', c.id);
      mobileCard.innerHTML = `
        <div class="mcc-top">
          <div class="saas-avatar-soft" style="width: 40px; height: 40px; font-size: 13.5px; flex-shrink: 0;">${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : initials}</div>
          <div class="mcc-meta">
            <button type="button" class="mcc-name-btn btn-view-profile" data-cid="${c.id}">
              <strong class="mcc-name">${c.name}</strong>
            </button>
            ${isInactiveNonStage ? `
              <span class="badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">
                Inactive • Non-Stage
              </span>
            ` : ''}
            <div class="mcc-sub">
              <span class="saas-adno-pill">${c.adNo}</span>
              <span class="saas-class-pill">${c.class || 'No Class'}</span>
              <span class="saas-tag-pill ${c.category === 'Senior' ? 'p-stage' : 'p-neutral'}">${c.category || 'General'}</span>
            </div>
          </div>
          <div class="mcc-actions">
            <button type="button" class="saas-circle-btn btn-print-cand-tracker" title="${isInactiveNonStage ? 'Offline tracker not available (Non-Stage only)' : 'Print Offline Tracker (1-20 Nov)'}" data-id="${c.id}" style="${isInactiveNonStage ? 'color: #94a3b8; opacity: 0.6;' : 'color: #0f172a;'}">
              ${getIcon('printer')}
            </button>
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
              ? assignedPrograms.map(p => {
                const isNonStage = p.type === 'Non-Stage' || p.status === 'Inactive';
                if (isNonStage) {
                  return `
                    <span class="saas-prog-capsule p-nonstage clickable-program" data-pid="${p.id}" style="opacity: 0.65; text-decoration: line-through; border-style: dashed; cursor: pointer;">
                      ${p.code} (Done)
                    </span>
                  `;
                }
                return `
                  <span class="saas-prog-capsule p-stage clickable-program" data-pid="${p.id}" style="cursor: pointer;">
                    ${p.code} • ${p.name}
                  </span>
                `;
              }).join('')
              : '<span class="text-muted text-xs">No programs assigned yet</span>'
          }
        </div>

        <button type="button" class="mcc-profile-bar-btn btn-view-profile" data-cid="${c.id}">
          <span>View Profile & Mentorship</span>
          <span class="mcc-arrow">&rarr;</span>
        </button>
      `;

      tableBody.appendChild(tr);
      mobileList.appendChild(mobileCard);
    });
  }

  // Header Actions
  const handleBulkPrintAll = () => {
    state.deactivateNonStageProgramsAndCandidates(false);
    const stageCandidates = state.getCandidates().filter(c => (state.getCandidateStagePrograms(c.id) || []).length > 0);
    if (!stageCandidates || stageCandidates.length === 0) {
      toast.error('No candidates with active Stage programs found to print.');
      return;
    }
    printCandidateOfflineTracker(stageCandidates);
  };

  const btnBulkTrackers = container.querySelector('#btnBulkDailyOfflineTrackers');
  if (btnBulkTrackers) {
    btnBulkTrackers.addEventListener('click', handleBulkPrintAll);
  }

  const btnMobileBulkTrackers = container.querySelector('#btnMobileBulkDailyOfflineTrackers');
  if (btnMobileBulkTrackers) {
    btnMobileBulkTrackers.addEventListener('click', handleBulkPrintAll);
  }

  const handleOpenOfflineTrackerModal = () => {
    openCandidateTrackerModal({
      candidates: lastFilteredCandidates.length > 0 ? lastFilteredCandidates : state.getCandidates(),
      allCandidates: state.getCandidates()
    });
  };

  const btnOfflineTrackers = container.querySelector('#btnDailyOfflineTrackers');
  if (btnOfflineTrackers) {
    btnOfflineTrackers.addEventListener('click', handleOpenOfflineTrackerModal);
  }

  const btnMobileOfflineTrackers = container.querySelector('#btnMobileDailyOfflineTrackers');
  if (btnMobileOfflineTrackers) {
    btnMobileOfflineTrackers.addEventListener('click', handleOpenOfflineTrackerModal);
  }

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
