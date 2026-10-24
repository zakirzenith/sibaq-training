import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Device Permit Issuance & Editing Modal
 * Used by controllers & mentors to grant strict smartphone permissions for practice.
 * Fully styled with responsive flex rows and scrollable body for mobile phone view.
 */
export function openDevicePermitModal({ permitId = null, onSaved = null } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-permit-modal-backdrop';

  const isEdit = Boolean(permitId);
  const existing = isEdit ? state.getDevicePermitById(permitId) : null;
  const candidates = state.getCandidates();
  const permits = state.getDevicePermits();

  // Next recommended device tag
  const nextTag = `DEV-${(permits.length + 1).toString().padStart(2, '0')}`;

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
          
          <!-- Candidate Selection -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="dpCandidateId" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Candidate / Student <span class="text-danger">*</span>
            </label>
            <select id="dpCandidateId" class="form-select form-input" required ${isEdit ? 'disabled' : ''} style="height: 40px; font-size: 13.5px;">
              <option value="">-- Select Candidate Who Extremely Needs Phone --</option>
              ${candidates.map(c => {
                const selected = existing && existing.candidateId === c.id ? 'selected' : '';
                return `<option value="${c.id}" ${selected}>${c.name} (${c.category} • Chest: ${c.chestNo || c.adNo || c.id})</option>`;
              }).join('')}
            </select>
            <span class="form-hint text-muted" style="font-size: 11px; margin-top: 3px; display: block;">
              Only candidates registered in competition programs can receive a device pass.
            </span>
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
            <span style="font-size: 16px; line-height: 1;">📌</span>
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
      ? (existing ? existing.candidateId : overlay.querySelector('#dpCandidateId').value)
      : overlay.querySelector('#dpCandidateId').value;
    const deviceTag = overlay.querySelector('#dpDeviceTag').value.trim().toUpperCase();
    const deviceModel = overlay.querySelector('#dpDeviceModel').value.trim();
    const reason = overlay.querySelector('#dpReason').value.trim();
    const statusVal = overlay.querySelector('#dpStatus').value;
    const validUntil = overlay.querySelector('#dpValidUntil').value;
    const notes = overlay.querySelector('#dpNotes').value.trim();

    if (!candidateId) {
      toast.error('Please select a candidate.');
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
