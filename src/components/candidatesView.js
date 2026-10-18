import { state } from '../services/state.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openCandidateFormModal } from './modals/candidateFormModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';

export function renderCandidatesView(container, navigateTo) {
  let searchQuery = '';
  let selectedCategory = 'ALL';
  let selectedClass = 'ALL';

  container.innerHTML = `
    <div class="saas-view-header">
      <div class="svh-title-block">
        <div class="svh-eyebrow">
          <span class="saas-tag-pill p-stage">${getIcon('candidates')} Roster Management</span>
          <span class="svh-meta-text">Cohort 2026</span>
        </div>
        <h1 class="svh-title">Candidates & Mentees</h1>
        <p class="svh-desc">Manage candidate master roster, bulk import Excel spreadsheets, and track category divisions.</p>
      </div>

      <div class="saas-header-actions">
        <div class="saas-action-pill-group">
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

    <!-- Filters & Search Command Bar -->
    <div class="saas-command-bar">
      <div class="scb-search-wrap flex-1">
        <span class="scb-search-icon">${getIcon('search')}</span>
        <input 
          type="text" 
          id="searchCandidates" 
          class="scb-search-input" 
          placeholder="Search by candidate name, admission number, or class..."
        />
      </div>

      <div class="scb-filters-group">
        <select id="filterCategory" class="saas-select-pill">
          <option value="ALL">All Categories</option>
        </select>

        <select id="filterClass" class="saas-select-pill">
          <option value="ALL">All Classes</option>
        </select>

        <button id="btnResetFilters" class="saas-circle-btn" title="Reset all filters">
          ${getIcon('refresh')}
        </button>
      </div>
    </div>

    <!-- Candidates Table Card -->
    <div class="saas-table-card">
      <div class="saas-table-head-strip">
        <div class="sth-left">
          <span class="sth-title">Active Candidate Directory</span>
          <span id="candidatesCountBadge" class="saas-badge-pill">0</span>
        </div>
        <div class="sth-right text-xs text-muted">
          Click student name to view all enrolled programs & trainers
        </div>
      </div>

      <div class="saas-table-responsive">
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
    </div>
  `;

  // Elements
  const searchInput = container.querySelector('#searchCandidates');
  const categorySelect = container.querySelector('#filterCategory');
  const classSelect = container.querySelector('#filterClass');
  const resetBtn = container.querySelector('#btnResetFilters');
  const tableBody = container.querySelector('#candidatesTableBody');
  const countBadge = container.querySelector('#candidatesCountBadge');

  // Populate Filter Dropdowns
  function populateFilters() {
    const candidates = state.getCandidates();
    const categories = Array.from(new Set(candidates.map(c => c.category).filter(Boolean))).sort();
    const classes = Array.from(new Set(candidates.map(c => c.class).filter(Boolean))).sort();

    categorySelect.innerHTML = '<option value="ALL">All Categories</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selectedCategory) opt.selected = true;
      categorySelect.appendChild(opt);
    });

    classSelect.innerHTML = '<option value="ALL">All Classes</option>';
    classes.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      if (cls === selectedClass) opt.selected = true;
      classSelect.appendChild(opt);
    });
  }

  function renderTable() {
    const candidates = state.getCandidates();

    const filtered = candidates.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.adNo.toLowerCase().includes(q) ||
        (c.class && c.class.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
      const matchesCls = selectedClass === 'ALL' || c.class === selectedClass;

      return matchesSearch && matchesCat && matchesCls;
    });

    countBadge.textContent = `${filtered.length} Candidates`;
    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5 text-muted">
            <div class="empty-state-box">
              <div class="empty-icon">${getIcon('candidates')}</div>
              <h3>No candidates found</h3>
              <p>Try clearing your filters or upload candidates in bulk using an Excel file.</p>
              <button id="btnEmptyUploadCand" class="btn btn-primary btn-sm mt-3">
                ${getIcon('upload')} Bulk Upload via Excel
              </button>
            </div>
          </td>
        </tr>
      `;

      const emptyUploadBtn = tableBody.querySelector('#btnEmptyUploadCand');
      if (emptyUploadBtn) {
        emptyUploadBtn.addEventListener('click', () => {
          openExcelUploadModal({
            type: 'candidates',
            onComplete: () => {
              populateFilters();
              renderTable();
            }
          });
        });
      }
      return;
    }

    filtered.forEach(c => {
      const assignedPrograms = state.getCandidatePrograms(c.id);
      const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');

      const tr = document.createElement('tr');
      tr.className = 'saas-table-row';
      tr.innerHTML = `
        <td><span class="saas-adno-pill">${c.adNo}</span></td>
        <td>
          <div class="saas-student-cell">
            <div class="saas-avatar-soft">${initials}</div>
            <div class="saas-student-info">
              <button class="candidate-name-btn btn-view-profile" data-cid="${c.id}" title="Click to view candidate profile with assigned programs & trainers">
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

      // Click on program badge opens the program assignment modal
      tr.querySelectorAll('.clickable-program').forEach(chip => {
        chip.addEventListener('click', () => {
          const pid = chip.getAttribute('data-pid');
          openAssignCandidatesModal({
            programId: pid,
            onSave: () => renderTable()
          });
        });
      });

      // Click candidate name or avatar opens full profile instantly
      tr.querySelectorAll('.btn-view-profile, .saas-student-cell').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openCandidateProfileModal({
            candidateId: c.id,
            onUpdate: () => renderTable()
          });
        });
      });

      // Edit candidate
      tr.querySelector('.btn-edit-cand').addEventListener('click', () => {
        openCandidateFormModal({
          candidate: c,
          onSave: () => {
            populateFilters();
            renderTable();
          }
        });
      });

      // Delete candidate
      tr.querySelector('.btn-delete-cand').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${c.name}" (${c.adNo})? They will also be removed from any assigned programs.`)) {
          state.deleteCandidate(c.id);
          toast.info(`Candidate ${c.name} deleted.`);
          populateFilters();
          renderTable();
        }
      });

      tableBody.appendChild(tr);
    });
  }

  // Filter Listeners
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderTable();
  });

  categorySelect.addEventListener('change', e => {
    selectedCategory = e.target.value;
    renderTable();
  });

  classSelect.addEventListener('change', e => {
    selectedClass = e.target.value;
    renderTable();
  });

  resetBtn.addEventListener('click', () => {
    searchQuery = '';
    selectedCategory = 'ALL';
    selectedClass = 'ALL';
    searchInput.value = '';
    categorySelect.value = 'ALL';
    classSelect.value = 'ALL';
    renderTable();
  });

  // Action Buttons
  container.querySelector('#btnDownloadCandTemplate').addEventListener('click', () => {
    excelService.downloadCandidatesTemplate();
  });

  container.querySelector('#btnExportCandidates').addEventListener('click', () => {
    const list = state.getCandidates();
    excelService.exportCandidates(list, state);
    toast.success(`Exported ${list.length} candidates to Excel.`);
  });

  container.querySelector('#btnBulkUploadCandidates').addEventListener('click', () => {
    openExcelUploadModal({
      type: 'candidates',
      onComplete: () => {
        populateFilters();
        renderTable();
      }
    });
  });

  container.querySelector('#btnAddCandidate').addEventListener('click', () => {
    openCandidateFormModal({
      onSave: () => {
        populateFilters();
        renderTable();
      }
    });
  });

  // Initial
  populateFilters();
  renderTable();
}
