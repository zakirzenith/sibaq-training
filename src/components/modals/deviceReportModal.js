import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Teacher Irregularity / Violation Report Modal
 * Accessible by teachers and mentors across campus to report misuse,
 * out-of-hours possession, gaming, or unauthorized apps to the Controller Panel.
 * Uses 100% SVG icons (zero raw emojis) and clean responsive styling.
 */
export function openDeviceReportModal({ permitId = null, deviceTag = null, onSubmitted = null } = {}) {
  let permit = null;
  if (permitId) {
    permit = state.getDevicePermitById(permitId);
  } else if (deviceTag) {
    permit = state.getDevicePermitByTag(deviceTag);
  }

  if (!permit) {
    toast.error('Device permit record not found.');
    return;
  }

  const candidate = state.getCandidateById(permit.candidateId) || {
    name: 'Candidate',
    category: 'GENERAL',
    chestNo: 'N/A'
  };

  const session = state.getAuthSession();
  const defaultTeacherName = session?.trainer?.name || (session?.role === 'controller' ? 'Duty Supervisor' : '');

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-report-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md device-report-dialog" style="max-width: 500px; width: 94%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid #fee2e2; background: #fff5f5;">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
            <span>${getIcon('flag')}</span>
            <span>Campus Compliance Flag</span>
          </div>
          <h2 class="modal-title" style="margin-top: 4px; font-size: 18px; font-weight: 800; color: #991b1b;">
            Report Smartphone Irregularity
          </h2>
          <p class="modal-subtitle" style="margin-top: 2px; font-size: 12px; color: #7f1d1d;">
            Filed reports are sent directly to the Controller Desk for administrative action.
          </p>
        </div>
        <button class="modal-close-btn" id="btnCloseReportModal" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Scrollable Form Body -->
      <form id="formReportIrregularity" style="display: flex; flex-direction: column; flex: 1; overflow: hidden; margin: 0;">
        <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: #ffffff;">
          
          <!-- Student Device Snapshot Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Permitted Student</div>
              <strong style="font-size: 14px; color: #0f172a;">${candidate.name}</strong>
              <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                <span class="badge badge-category-pill" style="font-size: 10px; padding: 0 5px;">${candidate.category}</span>
                <span>CHEST: ${candidate.chestNo || candidate.adNo || 'N/A'}</span>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span class="mdc-tag-capsule" style="font-size: 13px;">${permit.deviceTag}</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${permit.deviceModel || 'Smartphone'}</div>
            </div>
          </div>

          <!-- Reporting Teacher Name -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="reportTeacherName" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Reporting Teacher / Mentor Name <span class="text-danger">*</span>
            </label>
            <input type="text" id="reportTeacherName" class="form-input" required 
                   placeholder="Enter your name" value="${defaultTeacherName}" style="height: 38px;" />
          </div>

          <!-- Irregularity Category -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="reportCategory" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Violation Category <span class="text-danger">*</span>
            </label>
            <select id="reportCategory" class="form-select form-input" required style="height: 38px; font-size: 13px;">
              <option value="UNAPPROVED_APP">Gaming, Social Media, or Unapproved Entertainment Apps</option>
              <option value="OUT_OF_HOURS">Out of Permitted Hours (Holding after 10:00 PM or before 09:00 AM)</option>
              <option value="UNAUTHORIZED_LOCATION">Using Outside Designated Academic / Study Hall</option>
              <option value="ACADEMIC_NON_PRACTICE">Non-Academic Use / Idle Device (Not rehearsing)</option>
              <option value="REFUSED_INSPECTION">Refused Teacher Inspection or Surrender of Phone</option>
              <option value="OTHER">Other Institutional Rule Irregularity</option>
            </select>
          </div>

          <!-- Detailed Incident Description -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="reportNotes" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
              Incident Observations &amp; Specific Details <span class="text-danger">*</span>
            </label>
            <textarea id="reportNotes" class="form-textarea form-input" rows="3" required
                      placeholder="Describe what occurred, exact location, apps observed, or student behavior..." style="font-size: 13px;"></textarea>
          </div>

          <!-- Institutional Notice -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
            <span style="display: flex; margin-top: 1px;">${getIcon('alertTriangle')}</span>
            <div>
              <strong>Controller Notice:</strong> This flag will immediately appear in the Controller Panel. The Controller may issue a temporary suspension or permanent revocation based on this evidence.
            </div>
          </div>
        </div>

        <!-- Pinned Footer -->
        <div class="modal-footer" style="flex-shrink: 0; padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; background: #ffffff;">
          <button type="button" class="btn btn-secondary" id="btnCancelReportModal" style="height: 36px;">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btnSubmitReport" style="background: #dc2626; border-color: #dc2626; height: 36px; gap: 6px; font-weight: 700;">
            ${getIcon('flag')} <span>Submit Report to Controller</span>
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

  overlay.querySelector('#btnCloseReportModal').onclick = close;
  overlay.querySelector('#btnCancelReportModal').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  const form = overlay.querySelector('#formReportIrregularity');
  form.onsubmit = (e) => {
    e.preventDefault();

    const teacherName = overlay.querySelector('#reportTeacherName').value.trim();
    const category = overlay.querySelector('#reportCategory').value;
    const notes = overlay.querySelector('#reportNotes').value.trim();

    if (!teacherName) {
      toast.error('Please enter your name as the reporting teacher.');
      return;
    }
    if (!notes) {
      toast.error('Please provide specific details of the observation.');
      return;
    }

    const res = state.reportDeviceIrregularity(permit.id, {
      reportedBy: teacherName,
      category,
      notes
    });

    if (res.success) {
      toast.warning('Irregularity report submitted. Controller Office has been notified.');
      close();
      if (onSubmitted) onSubmitted(res.irregularity);
    } else {
      toast.error('Failed to submit report.');
    }
  };
}
