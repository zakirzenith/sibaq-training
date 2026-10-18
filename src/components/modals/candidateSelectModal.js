import { state } from '../../services/state.js';
import { toast } from '../toast.js';
import { getIcon } from '../icons.js';
import { openCandidateProfileModal } from './candidateProfileModal.js';

/**
 * Candidate Select Modal (Popup Box)
 * Appears when clicking "Add Candidates" in the Programs view.
 */
export function openCandidateSelectModal({ program, onAdd = () => {} }) {
  const currentAssignedIds = new Set(program.candidateIds || []);
  let selectedIdsToAdd = new Set();
  let searchQuery = '';
  let selectedCategory = 'ALL';
  let selectedClass = 'ALL';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg saas-assign-modal select-candidates-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="program-title-block">
          <div class="sdb-badges-row mb-1">
            <span class="saas-prog-capsule ${program.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">${program.code}</span>
            <span class="saas-tag-pill ${program.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
              ${program.type === 'Stage' ? getIcon('stage') : getIcon('nonStage')} ${program.type}
            </span>
            <span class="saas-tag-pill p-neutral">${program.category} Category</span>
          </div>
          <h2 class="modal-title" style="font-size: 20px; font-weight: 800; color: #0f172a;">Add Candidates to ${program.name}</h2>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body select-candidates-body" style="padding: 20px;">
        <!-- Toolbar & Quick Filters -->
        <div class="saas-command-bar" style="margin-bottom: 12px;">
          <div class="scb-search-wrap flex-1">
            <span class="scb-search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="modalCandidateSearch" 
              class="scb-search-input" 
              placeholder="Search by name, admission no, or class..."
            />
          </div>

          <div class="scb-filters-group">
            <button id="btnModalMatchCat" class="saas-pill-btn" style="border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca;">
              ${getIcon('sparkles')} Match (${program.category})
            </button>
            <select id="modalFilterCat" class="saas-select-pill">
              <option value="ALL">All Categories</option>
            </select>
            <select id="modalFilterCls" class="saas-select-pill">
              <option value="ALL">All Classes</option>
            </select>
          </div>
        </div>

        <!-- Quick Selection Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px;">
          <span class="text-xs text-muted">
            Selected: <strong id="selectedCandidatesBadge" class="text-primary font-semibold">0</strong> candidates
          </span>
          <div style="display: flex; gap: 6px;">
            <button id="btnModalSelectAll" class="saas-pill-btn">Select All Shown</button>
            <button id="btnModalDeselectAll" class="saas-pill-btn">Clear Selection</button>
          </div>
        </div>

        <!-- Candidates Checklist Table -->
        <div class="saas-table-responsive" style="max-height: 280px; overflow-y: auto;">
          <table class="saas-data-table picker-table">
            <thead>
              <tr>
                <th style="width: 44px;">
                  <input type="checkbox" id="masterSelectCheckbox" title="Select / deselect all visible" />
                </th>
                <th style="width: 140px;">Admission No</th>
                <th>Candidate Name</th>
                <th>Category</th>
                <th>Class</th>
                <th>Current Programs</th>
              </tr>
            </thead>
            <tbody id="modalCandidateTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
        <button id="btnCancelCandidateSelect" class="saas-pill-btn">Cancel</button>
        <button id="btnConfirmCandidateSelect" class="btn-saas-primary" disabled>
          ${getIcon('check')} Add Selected Candidates (<span id="btnSelectedCount">0</span>)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCancelCandidateSelect').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const searchInput = overlay.querySelector('#modalCandidateSearch');
  const catSelect = overlay.querySelector('#modalFilterCat');
  const clsSelect = overlay.querySelector('#modalFilterCls');
  const btnMatchCat = overlay.querySelector('#btnModalMatchCat');
  const btnSelectAll = overlay.querySelector('#btnModalSelectAll');
  const btnDeselectAll = overlay.querySelector('#btnModalDeselectAll');
  const masterCheckbox = overlay.querySelector('#masterSelectCheckbox');
  const tableBody = overlay.querySelector('#modalCandidateTableBody');
  const selectedBadge = overlay.querySelector('#selectedCandidatesBadge');
  const btnConfirm = overlay.querySelector('#btnConfirmCandidateSelect');
  const btnSelectedCount = overlay.querySelector('#btnSelectedCount');

  // Populate Categories & Classes
  const allCandidates = state.getCandidates();
  const categories = Array.from(new Set(allCandidates.map(c => c.category).filter(Boolean))).sort();
  const classes = Array.from(new Set(allCandidates.map(c => c.class).filter(Boolean))).sort();

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });

  classes.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    clsSelect.appendChild(opt);
  });

  function getAvailableCandidates() {
    const q = searchQuery.toLowerCase().trim();
    return allCandidates.filter(c => {
      // Don't list already assigned candidates
      if (currentAssignedIds.has(c.id)) return false;

      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.adNo.toLowerCase().includes(q) ||
        (c.class && c.class.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
      const matchesCls = selectedClass === 'ALL' || c.class === selectedClass;

      return matchesSearch && matchesCat && matchesCls;
    });
  }

  function renderTable() {
    const list = getAvailableCandidates();
    tableBody.innerHTML = '';

    selectedBadge.textContent = selectedIdsToAdd.size;
    btnSelectedCount.textContent = selectedIdsToAdd.size;
    btnConfirm.disabled = selectedIdsToAdd.size === 0;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted text-xs">
            No candidates available matching search filters (or all matching candidates are already enrolled).
          </td>
        </tr>
      `;
      masterCheckbox.checked = false;
      return;
    }

    let allChecked = true;

    list.forEach(c => {
      const isChecked = selectedIdsToAdd.has(c.id);
      if (!isChecked) allChecked = false;

      const otherPrograms = state.getCandidatePrograms(c.id);

      const tr = document.createElement('tr');
      if (isChecked) tr.classList.add('row-selected');

      tr.innerHTML = `
        <td>
          <input type="checkbox" class="modal-row-chk" data-cid="${c.id}" ${isChecked ? 'checked' : ''} />
        </td>
        <td><code>${c.adNo}</code></td>
        <td>
          <button class="candidate-name-btn btn-modal-cand-profile" data-cid="${c.id}" title="Click to view full candidate profile">
            <span class="cand-avatar-dot"></span>
            <strong>${c.name}</strong>
          </button>
        </td>
        <td>
          <span class="badge ${
            c.category.toLowerCase() === program.category.toLowerCase()
              ? 'badge-primary-subtle'
              : 'badge-neutral-xs'
          }">
            ${c.category}
          </span>
        </td>
        <td><span class="text-xs text-muted">${c.class || '-'}</span></td>
        <td>
          <span class="text-xs text-muted">${otherPrograms.length} program(s)</span>
        </td>
      `;

      const chk = tr.querySelector('.modal-row-chk');
      chk.addEventListener('change', () => {
        if (chk.checked) {
          selectedIdsToAdd.add(c.id);
          tr.classList.add('row-selected');
        } else {
          selectedIdsToAdd.delete(c.id);
          tr.classList.remove('row-selected');
        }
        selectedBadge.textContent = selectedIdsToAdd.size;
        btnSelectedCount.textContent = selectedIdsToAdd.size;
        btnConfirm.disabled = selectedIdsToAdd.size === 0;
      });

      // Clicking row toggles checkbox (except when clicking candidate name)
      tr.addEventListener('click', e => {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.closest('.candidate-name-btn')) return;
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change'));
      });

      // Candidate profile click
      tr.querySelector('.btn-modal-cand-profile').addEventListener('click', e => {
        e.stopPropagation();
        openCandidateProfileModal({ candidateId: c.id });
      });

      tableBody.appendChild(tr);
    });

    masterCheckbox.checked = allChecked && list.length > 0;
  }

  // Filter Listeners
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderTable();
  });

  catSelect.addEventListener('change', e => {
    selectedCategory = e.target.value;
    renderTable();
  });

  clsSelect.addEventListener('change', e => {
    selectedClass = e.target.value;
    renderTable();
  });

  btnMatchCat.addEventListener('click', () => {
    selectedCategory = program.category;
    catSelect.value = program.category;
    renderTable();
  });

  btnSelectAll.addEventListener('click', () => {
    const list = getAvailableCandidates();
    list.forEach(c => selectedIdsToAdd.add(c.id));
    renderTable();
  });

  btnDeselectAll.addEventListener('click', () => {
    const list = getAvailableCandidates();
    list.forEach(c => selectedIdsToAdd.delete(c.id));
    renderTable();
  });

  masterCheckbox.addEventListener('change', () => {
    const list = getAvailableCandidates();
    if (masterCheckbox.checked) {
      list.forEach(c => selectedIdsToAdd.add(c.id));
    } else {
      list.forEach(c => selectedIdsToAdd.delete(c.id));
    }
    renderTable();
  });

  // Confirm selection
  btnConfirm.addEventListener('click', () => {
    const currentList = program.candidateIds || [];
    const updatedIds = Array.from(new Set([...currentList, ...selectedIdsToAdd]));
    state.assignCandidatesToProgram(program.id, updatedIds);
    toast.success(`Enrolled ${selectedIdsToAdd.size} candidate(s) into [${program.code}] "${program.name}"!`);
    close();
    onAdd();
  });

  // Initial table render
  renderTable();
}
