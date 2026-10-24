import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Device Permit Issuance & Editing Modal
 * Used by controllers & mentors to grant strict smartphone permissions for practice.
 * Features an interactive real-time Candidate Search Box with category filtering
 * and instant 1-click candidate selection.
 */
export function openDevicePermitModal({ permitId = null, onSaved = null } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-permit-modal-backdrop';

  const isEdit = Boolean(permitId);
  const existing = isEdit ? state.getDevicePermitById(permitId) : null;
  const allCandidates = state.getCandidates();
  const permits = state.getDevicePermits();

  // Next recommended device tag
  const nextTag = `DEV-${(permits.length + 1).toString().padStart(2, '0')}`;

  // Currently selected candidate ID state
  let selectedCandidateId = existing ? existing.candidateId : '';
  let candidateSearchQuery = '';
  let selectedCatFilter = 'ALL';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md device-permit-dialog" style="max-width: 540px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
      <!-- Header -->
      <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
            <span>${getIcon('smartphone')}</span>
            <span>Asset &amp; Device Control</span>
          </div>
          <h2 class="modal-title" style="margin-top: 4px; font-size: 18px; font-weight: 800; color: #0f172a;">
            ${isEdit ? `Edit Permit: ${existing?.deviceTag || ''}` : 'Issue Smartphone Permit'}
          </h2>
          <p class="modal-subtitle" style="margin-top: 2px; font-size: 12px; color: #64748b;">
            Allowed hours: <strong>09:00 AM — 10:00 PM</strong> daily. Mandatory return before 10:00 PM.
          </p>
        </div>
        <button class="modal-close-btn" id="btnClosePermitModal" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Scrollable Form Body -->
      <form id="formDevicePermit" style="display: flex; flex-direction: column; flex: 1; overflow: hidden; margin: 0;">
        <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: #f8fafc;">
          
          <!-- Hidden Input holding selected candidateId -->
          <input type="hidden" id="dpCandidateId" value="${selectedCandidateId}" required />

          <!-- CANDIDATE SELECTION WITH REAL-TIME SEARCH PANE -->
          <div class="form-group" style="margin-bottom: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" style="font-size: 12px; font-weight: 700; color: #334155; margin: 0;">
                Candidate / Student <span class="text-danger">*</span>
              </label>
              ${!isEdit && selectedCandidateId ? `
                <button type="button" id="btnChangeSelectedCandidate" style="background: none; border: none; color: #4f46e5; font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 0;">
                  Change Student
                </button>
              ` : ''}
            </div>

            <!-- Dynamic Candidate Selector Container -->
            <div id="dpCandidateSelectorContainer">
              <!-- Rendered dynamically below -->
            </div>
          </div>

          <!-- Device Tag & Model (Responsive Flex Row) -->
          <div class="form-row" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="dpDeviceTag" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Device Tag / Label <span class="text-danger">*</span>
              </label>
              <input type="text" id="dpDeviceTag" class="form-input" placeholder="e.g. DEV-01" required 
                     value="${existing ? existing.deviceTag : nextTag}" 
                     style="text-transform: uppercase; font-weight: 800; font-family: monospace; letter-spacing: 0.5px; height: 40px;" />
              <span class="form-hint text-muted" style="font-size: 11px; margin-top: 3px; display: block;">Sticker identifier code</span>
            </div>

            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="dpDeviceModel" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Phone Model / Brand
              </label>
              <input type="text" id="dpDeviceModel" class="form-input" placeholder="e.g. Samsung A15 / Redmi Note" 
                     value="${existing ? existing.deviceModel || '' : ''}" style="height: 40px;" />
              <span class="form-hint text-muted" style="font-size: 11px; margin-top: 3px; display: block;">Hardware brand description</span>
            </div>
          </div>

          <!-- Practice Focus / Reason -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="dpReason" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Primary Practice Need / Justification <span class="text-danger">*</span>
            </label>
            <input type="text" id="dpReason" class="form-input" required placeholder="e.g. Speech practice, audio recording, research" 
                   value="${existing ? existing.reason || '' : ''}" style="height: 40px;" />
          </div>

          <!-- Status & Validity Dates (Responsive Flex Row) -->
          <div class="form-row" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="dpStatus" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Permit Status
              </label>
              <select id="dpStatus" class="form-select form-input" style="height: 40px; font-size: 13.5px;">
                <option value="active" ${!existing || existing.status === 'active' ? 'selected' : ''}>Active (Authorized)</option>
                <option value="suspended" ${existing && existing.status === 'suspended' ? 'selected' : ''}>Suspended (Temporary Hold)</option>
                <option value="revoked" ${existing && existing.status === 'revoked' ? 'selected' : ''}>Revoked (Forbidden)</option>
              </select>
            </div>

            <div class="form-group flex-1" style="min-width: 180px; margin-bottom: 0;">
              <label class="form-label" for="dpValidUntil" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                Valid Until Date
              </label>
              <input type="date" id="dpValidUntil" class="form-input" 
                     value="${existing ? existing.validUntil || '2026-11-30' : '2026-11-30'}" style="height: 40px;" />
            </div>
          </div>

          <!-- Supervisor Notes / Special Instructions -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="dpNotes" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Supervisor Notes / Restrictions
            </label>
            <textarea id="dpNotes" class="form-textarea form-input" rows="2" 
                      placeholder="e.g. Permitted only inside Study Hall #2. Return strictly before 10 PM.">${existing ? existing.notes || '' : ''}</textarea>
          </div>

          <!-- Institutional Rule Notice Box -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 11px 13px; font-size: 12px; color: #334155; display: flex; align-items: flex-start; gap: 8px;">
            <span style="display: flex; margin-top: 1px; color: #4f46e5;">${getIcon('info')}</span>
            <div>
              <strong>Enforced Campus Rule:</strong> Phones can be checked out from <strong>09:00 AM</strong> onwards. They must be submitted back to the desk before <strong>10:00 PM</strong> daily. Any phone held past 10:00 PM triggers an instant Red Overdue Alert.
            </div>
          </div>
        </div>

        <!-- Pinned Footer -->
        <div class="modal-footer" style="flex-shrink: 0; padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #ffffff;">
          <button type="button" class="btn btn-secondary" id="btnCancelPermitModal" style="height: 38px;">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btnSavePermit" style="height: 38px; gap: 6px; font-weight: 700;">
            ${getIcon('check')} <span>${isEdit ? 'Save Changes' : 'Issue Permit'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // --- RENDER CANDIDATE SELECTOR PANE ---
  const renderCandidatePane = () => {
    const selectorContainer = overlay.querySelector('#dpCandidateSelectorContainer');
    const hiddenInput = overlay.querySelector('#dpCandidateId');
    if (!selectorContainer) return;

    // A: Candidate is Selected -> Show Rich Verified Student Card
    if (selectedCandidateId) {
      hiddenInput.value = selectedCandidateId;
      const cand = state.getCandidateById(selectedCandidateId) || {
        name: 'Selected Candidate',
        category: 'GENERAL',
        chestNo: 'N/A'
      };
      const candInitials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

      selectorContainer.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #10b981; border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 1px 4px rgba(16, 185, 129, 0.08);">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: #10b981; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; overflow: hidden; flex-shrink: 0;">
              ${cand.photo 
                ? `<img src="${cand.photo}" alt="${cand.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : candInitials}
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 14px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${cand.name}
              </div>
              <div style="font-size: 11.5px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <span class="badge badge-category-pill" style="font-size: 10px; padding: 1px 6px;">${cand.category}</span>
                <span>CHEST: <strong>${cand.chestNo || cand.adNo || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <span style="font-size: 11px; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 6px;">
              ✓ Selected
            </span>
            ${!isEdit ? `
              <button type="button" id="btnReselectCandidate" class="btn btn-sm btn-outline" style="font-size: 11px; height: 28px; padding: 0 8px; border-color: #cbd5e1;" title="Choose another candidate">
                Change
              </button>
            ` : ''}
          </div>
        </div>
      `;

      const btnReselect = selectorContainer.querySelector('#btnReselectCandidate');
      if (btnReselect) {
        btnReselect.onclick = () => {
          selectedCandidateId = '';
          hiddenInput.value = '';
          renderCandidatePane();
        };
      }
      return;
    }

    // B: No Candidate Selected -> Render Real-Time Search Input & Candidate Picker List
    hiddenInput.value = '';

    // Filter candidates by query and category
    const q = candidateSearchQuery.toLowerCase().trim();
    const filteredCandidates = allCandidates.filter(c => {
      if (selectedCatFilter !== 'ALL' && c.category !== selectedCatFilter) {
        return false;
      }
      if (!q) return true;
      const matchName = String(c.name || '').toLowerCase().includes(q);
      const matchChest = String(c.chestNo || '').toLowerCase().includes(q);
      const matchAd = String(c.adNo || '').toLowerCase().includes(q);
      const matchCat = String(c.category || '').toLowerCase().includes(q);
      return matchName || matchChest || matchAd || matchCat;
    });

    selectorContainer.innerHTML = `
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
        <!-- Real-time Candidate Search Bar -->
        <div class="search-input-wrapper" style="position: relative; width: 100%;">
          <span class="search-icon" style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex;">
            ${getIcon('search')}
          </span>
          <input type="text" id="dpCandidateSearchInput" class="form-input" 
                 placeholder="Search student by name, chest #, or category..." 
                 value="${candidateSearchQuery}"
                 style="padding-left: 34px; height: 38px; font-size: 13px; width: 100%; border-radius: 8px;" />
          ${candidateSearchQuery ? `
            <button type="button" id="dpCandidateSearchClear" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 14px; color: #94a3b8; cursor: pointer; padding: 2px;">
              ✕
            </button>
          ` : ''}
        </div>

        <!-- Category Filter Pills Row -->
        <div style="display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px;">
          ${['ALL', 'BIDĀYA', 'ŪLĀ', 'THĀNAWIYYAH', 'ʿĀLIYAH'].map(cat => `
            <button type="button" class="btn-cat-chip" data-cat="${cat}" style="font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; border: 1px solid ${selectedCatFilter === cat ? '#4f46e5' : '#e2e8f0'}; background: ${selectedCatFilter === cat ? '#4f46e5' : '#f8fafc'}; color: ${selectedCatFilter === cat ? '#ffffff' : '#64748b'}; cursor: pointer; white-space: nowrap;">
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Scrollable Candidate Results List -->
        <div id="dpCandidateResultsList" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; border: 1px solid #f1f5f9; border-radius: 8px; padding: 4px; background: #fbfcfe;">
          ${filteredCandidates.length === 0 ? `
            <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
              No candidates found matching "${candidateSearchQuery}".
            </div>
          ` : filteredCandidates.map(c => {
            const initials = (c.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            // Check if already has an assigned device permit
            const existingPermit = permits.find(p => p.candidateId === c.id);

            return `
              <div class="candidate-pick-row" data-id="${c.id}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; border-radius: 7px; cursor: pointer; transition: all 0.12s ease; border: 1px solid transparent; background: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; overflow: hidden; flex-shrink: 0;">
                    ${c.photo 
                      ? `<img src="${c.photo}" alt="${c.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                      : initials}
                  </div>
                  <div style="min-width: 0;">
                    <strong style="font-size: 13px; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${c.name}
                    </strong>
                    <div style="font-size: 11px; color: #64748b; display: flex; gap: 5px; align-items: center;">
                      <span class="badge badge-category-pill" style="font-size: 9.5px; padding: 0 5px;">${c.category}</span>
                      <span>CHEST: ${c.chestNo || c.adNo || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                  ${existingPermit ? `
                    <span style="font-size: 10px; font-weight: 700; color: #d97706; background: #fef3c7; border: 0.5px solid #fde68a; padding: 1px 5px; border-radius: 4px;" title="Already assigned device">
                      Has ${existingPermit.deviceTag}
                    </span>
                  ` : ''}
                  <span style="font-size: 11.5px; font-weight: 800; color: #4f46e5;">Select &rarr;</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Candidate Search Input Handler
    const searchInput = selectorContainer.querySelector('#dpCandidateSearchInput');
    if (searchInput) {
      // Focus if just cleared
      if (!selectedCandidateId && candidateSearchQuery) {
        searchInput.focus();
        searchInput.setSelectionRange(candidateSearchQuery.length, candidateSearchQuery.length);
      }

      searchInput.oninput = (e) => {
        candidateSearchQuery = e.target.value;
        renderCandidatePane();
      };
    }

    const searchClear = selectorContainer.querySelector('#dpCandidateSearchClear');
    if (searchClear) {
      searchClear.onclick = () => {
        candidateSearchQuery = '';
        renderCandidatePane();
      };
    }

    // Category Filter Chips
    selectorContainer.querySelectorAll('.btn-cat-chip').forEach(btn => {
      btn.onclick = () => {
        selectedCatFilter = btn.getAttribute('data-cat');
        renderCandidatePane();
      };
    });

    // Row Click to Select Candidate
    selectorContainer.querySelectorAll('.candidate-pick-row').forEach(row => {
      row.onmouseenter = () => {
        row.style.background = '#eef2ff';
        row.style.borderColor = '#c7d2fe';
      };
      row.onmouseleave = () => {
        row.style.background = '#ffffff';
        row.style.borderColor = 'transparent';
      };
      row.onclick = () => {
        const id = row.getAttribute('data-id');
        selectedCandidateId = id;
        renderCandidatePane();
      };
    });
  };

  // Initial candidate pane render
  renderCandidatePane();

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnClosePermitModal').onclick = close;
  overlay.querySelector('#btnCancelPermitModal').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  const form = overlay.querySelector('#formDevicePermit');
  form.onsubmit = (e) => {
    e.preventDefault();

    const candidateId = isEdit 
      ? (existing ? existing.candidateId : selectedCandidateId)
      : selectedCandidateId;
    const deviceTag = overlay.querySelector('#dpDeviceTag').value.trim().toUpperCase();
    const deviceModel = overlay.querySelector('#dpDeviceModel').value.trim();
    const reason = overlay.querySelector('#dpReason').value.trim();
    const statusVal = overlay.querySelector('#dpStatus').value;
    const validUntil = overlay.querySelector('#dpValidUntil').value;
    const notes = overlay.querySelector('#dpNotes').value.trim();

    if (!candidateId) {
      toast.error('Please search and select a candidate for this phone permit.');
      return;
    }
    if (!deviceTag) {
      toast.error('Device Tag is required.');
      return;
    }

    // Check duplicate tag
    const tagConflict = state.getDevicePermits().find(p => p.deviceTag === deviceTag && (!isEdit || p.id !== existing.id));
    if (tagConflict) {
      toast.error(`Device tag "${deviceTag}" is already assigned to another candidate.`);
      return;
    }

    if (isEdit) {
      state.updateDevicePermit(existing.id, {
        candidateId,
        deviceTag,
        deviceModel,
        reason,
        status: statusVal,
        validUntil,
        notes
      });
      toast.success(`Device permit ${deviceTag} updated successfully!`);
    } else {
      state.createDevicePermit({
        candidateId,
        deviceTag,
        deviceModel,
        reason,
        status: statusVal,
        validUntil,
        notes,
        permittedBy: 'Controller Desk'
      });
      toast.success(`Smartphone permit ${deviceTag} issued successfully!`);
    }

    close();
    if (onSaved) onSaved();
  };
}
