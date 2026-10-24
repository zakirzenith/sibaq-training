import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Device Permit Issuance & Editing Modal
 * Used by controllers & mentors to grant strict smartphone permissions for practice.
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
    <div class="modal-dialog modal-md device-permit-dialog" style="max-width: 520px; width: 95%;">
      <div class="modal-header">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="color: #6366f1;">${getIcon('smartphone')}</span>
            <span>Asset &amp; Device Control</span>
          </div>
          <h2 class="modal-title" style="margin-top: 4px;">
            ${isEdit ? `Edit Permit: ${existing?.deviceTag || ''}` : 'Issue Smartphone Permit'}
          </h2>
          <p class="modal-subtitle" style="margin-top: 2px;">
            Allowed hours: <strong>09:00 AM — 10:00 PM</strong> daily. Mandatory return before 10:00 PM.
          </p>
        </div>
        <button class="modal-close-btn" id="btnClosePermitModal" aria-label="Close">${getIcon('x')}</button>
      </div>

      <form id="formDevicePermit" class="modal-body" style="padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;">
        
        <!-- Candidate Selection -->
        <div class="form-group">
          <label class="form-label" for="dpCandidateId">Candidate / Student <span class="text-danger">*</span></label>
          <select id="dpCandidateId" class="form-select" required ${isEdit ? 'disabled' : ''}>
            <option value="">-- Select Candidate Who Extremely Needs Phone --</option>
            ${candidates.map(c => {
              const selected = existing && existing.candidateId === c.id ? 'selected' : '';
              return `<option value="${c.id}" ${selected}>${c.name} (${c.category} • Chest: ${c.chestNo || c.adNo || c.id})</option>`;
            }).join('')}
          </select>
          <span class="form-help text-muted" style="font-size: 11px;">
            Only candidates registered in competition programs can receive a device pass.
          </span>
        </div>

        <!-- Device Tag & Model in 2 columns -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" for="dpDeviceTag">Device Tag / Label <span class="text-danger">*</span></label>
            <input type="text" id="dpDeviceTag" class="form-control" placeholder="e.g. DEV-01" required 
                   value="${existing ? existing.deviceTag : nextTag}" style="text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;" />
            <span class="form-help text-muted" style="font-size: 11px;">Sticker identifier code</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="dpDeviceModel">Phone Model / Brand</label>
            <input type="text" id="dpDeviceModel" class="form-control" placeholder="e.g. Samsung A15 / Redmi" 
                   value="${existing ? existing.deviceModel || '' : ''}" />
          </div>
        </div>

        <!-- Practice Focus / Reason -->
        <div class="form-group">
          <label class="form-label" for="dpReason">Primary Practice Need / Justification <span class="text-danger">*</span></label>
          <input type="text" id="dpReason" class="form-control" required placeholder="e.g. Speech practice, audio recording, research" 
                 value="${existing ? existing.reason || '' : ''}" />
        </div>

        <!-- Status & Validity Dates -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" for="dpStatus">Permit Status</label>
            <select id="dpStatus" class="form-select">
              <option value="active" ${!existing || existing.status === 'active' ? 'selected' : ''}>Active (Authorized)</option>
              <option value="suspended" ${existing && existing.status === 'suspended' ? 'selected' : ''}>Suspended (Temporary Hold)</option>
              <option value="revoked" ${existing && existing.status === 'revoked' ? 'selected' : ''}>Revoked (Forbidden)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="dpValidUntil">Valid Until</label>
            <input type="date" id="dpValidUntil" class="form-control" 
                   value="${existing ? existing.validUntil || '2026-11-30' : '2026-11-30'}" />
          </div>
        </div>

        <!-- Supervisor Notes / Special Instructions -->
        <div class="form-group">
          <label class="form-label" for="dpNotes">Supervisor Notes / Restrictions</label>
          <textarea id="dpNotes" class="form-control" rows="2" placeholder="e.g. Permitted only inside Study Hall #2. Return strictly before 10 PM.">${existing ? existing.notes || '' : ''}</textarea>
        </div>

        <!-- Institutional Rule Notice Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; color: #475569; display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 14px; line-height: 1;">📌</span>
          <div>
            <strong>Enforced Institutional Rule:</strong> Phones can be issued from <strong>09:00 AM</strong> onwards. They must be submitted back to the desk before <strong>10:00 PM</strong> daily. Any phone held past 10:00 PM will trigger an instant Red Violation Alert when scanned.
          </div>
        </div>

        <div class="modal-footer" style="padding: 12px 0 0 0; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button type="button" class="btn btn-secondary" id="btnCancelPermitModal">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btnSavePermit" style="gap: 6px;">
            ${getIcon('check')} ${isEdit ? 'Save Changes' : 'Issue Permit'}
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

    const candidateId = overlay.querySelector('#dpCandidateId').value;
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
