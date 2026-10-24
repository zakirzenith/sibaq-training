import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Controller Professional Device Action Modal
 * Provides granular institutional controls:
 * 1. Daily Issue / Return (Desk Locker Operations)
 * 2. Disciplinary Actions: Temporary Suspension & Permanent Revocation
 * 3. Restoration / Reinstatement of suspended devices
 * 4. Teacher Incident Reports feed & resolution
 */
export function openDeviceActionModal({ permitId = null, onActionComplete = null } = {}) {
  const permit = state.getDevicePermitById(permitId);
  if (!permit) {
    toast.error('Device permit not found.');
    return;
  }

  const candidate = state.getCandidateById(permit.candidateId) || {
    name: 'Candidate',
    category: 'GENERAL',
    chestNo: 'N/A'
  };

  const now = new Date();
  const status = state.getDevicePermitStatus(permit, now);
  const isCheckedOut = status.code === 'LEGAL';
  const isSuspended = permit.status === 'suspended';
  const isRevoked = permit.status === 'revoked';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-action-modal-backdrop';

  // Active tab state: 'desk' | 'discipline' | 'reports'
  let activeTab = (isSuspended || isRevoked) ? 'discipline' : 'desk';

  const renderModalContent = () => {
    const candInitials = (candidate.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const irregularities = Array.isArray(permit.irregularities) ? permit.irregularities : [];
    const pendingCount = irregularities.filter(i => i.status === 'pending').length;

    overlay.innerHTML = `
      <div class="modal-dialog modal-md device-action-dialog" style="max-width: 560px; width: 95%; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden;">
        
        <!-- Modal Header -->
        <div class="modal-header" style="flex-shrink: 0; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
          <div>
            <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
              <span>${getIcon('smartphone')}</span>
              <span>Asset &amp; Disciplinary Desk</span>
            </div>
            <h2 class="modal-title" style="margin-top: 3px; font-size: 18px; font-weight: 800; color: #0f172a;">
              Manage Device: ${permit.deviceTag}
            </h2>
            <p class="modal-subtitle" style="margin-top: 2px; font-size: 12px; color: #64748b;">
              ${candidate.name} (${candidate.category} • Chest: ${candidate.chestNo || candidate.adNo || 'N/A'})
            </p>
          </div>
          <button class="modal-close-btn" id="btnCloseActionModal" aria-label="Close">${getIcon('x')}</button>
        </div>

        <!-- Student & Status Snapshot Ribbon -->
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; overflow: hidden; flex-shrink: 0;">
              ${candidate.photo ? `<img src="${candidate.photo}" alt="${candidate.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : candInitials}
            </div>
            <div style="min-width: 0;">
              <strong style="font-size: 13.5px; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${candidate.name}</strong>
              <div style="font-size: 11px; color: #64748b;">${permit.deviceModel || 'Smartphone'} • ${permit.reason}</div>
            </div>
          </div>

          <div style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor}; flex-shrink: 0;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${status.color};"></span>
            <span>${status.badge}</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: #ffffff; padding: 0 16px; flex-shrink: 0;">
          <button type="button" class="action-tab-btn ${activeTab === 'desk' ? 'active' : ''}" data-tab="desk" style="padding: 10px 14px; font-size: 12.5px; font-weight: 700; border: none; background: none; color: ${activeTab === 'desk' ? '#4f46e5' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'desk' ? '#4f46e5' : 'transparent'}; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>${getIcon('smartphone')}</span>
            <span>Issue &amp; Return</span>
          </button>

          <button type="button" class="action-tab-btn ${activeTab === 'discipline' ? 'active' : ''}" data-tab="discipline" style="padding: 10px 14px; font-size: 12.5px; font-weight: 700; border: none; background: none; color: ${activeTab === 'discipline' ? '#dc2626' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'discipline' ? '#dc2626' : 'transparent'}; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>${getIcon('shieldAlert')}</span>
            <span>Disciplinary &amp; Revocation</span>
          </button>

          <button type="button" class="action-tab-btn ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports" style="padding: 10px 14px; font-size: 12.5px; font-weight: 700; border: none; background: none; color: ${activeTab === 'reports' ? '#4f46e5' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'reports' ? '#4f46e5' : 'transparent'}; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>${getIcon('flag')}</span>
            <span>Teacher Reports</span>
            ${pendingCount > 0 ? `<span style="background: #dc2626; color: #fff; border-radius: 999px; font-size: 10px; font-weight: 800; padding: 1px 6px;">${pendingCount}</span>` : ''}
          </button>
        </div>

        <!-- Scrollable Tab Body -->
        <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 18px 20px; background: #ffffff;">
          
          <!-- ================= TAB 1: DESK OPERATIONS (ISSUE & RETURN) ================= -->
          ${activeTab === 'desk' ? `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${isSuspended || isRevoked ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 12px; color: #991b1b; display: flex; align-items: flex-start; gap: 8px;">
                  <span style="display: flex; margin-top: 1px;">${getIcon('ban')}</span>
                  <div>
                    <strong>Action Blocked:</strong> This permit is currently <strong>${permit.status.toUpperCase()}</strong>. It cannot be issued until reinstated by the Controller in the Disciplinary tab.
                  </div>
                </div>
              ` : `
                <!-- Current Checkout Status Box -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Today's Desk Status</div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                    ${isCheckedOut ? 'Phone is Currently Checked Out with Student' : 'Phone is Stored in Supervisor Locker'}
                  </div>
                  <p style="font-size: 12px; color: #64748b; margin: 0;">
                    Allowed practice hours: <strong>09:00 AM — 10:00 PM</strong> daily. Phones held past 10:00 PM automatically trigger a high-priority red alert.
                  </p>
                </div>

                <!-- Action Form -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="deskSupervisorName" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                    ${isCheckedOut ? 'Receiving Supervisor / Teacher Name' : 'Issuing Duty Supervisor Name'} <span class="text-danger">*</span>
                  </label>
                  <input type="text" id="deskSupervisorName" class="form-input" value="Controller Desk" style="height: 38px;" />
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="deskConditionNote" style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                    Hardware Condition / Handover Notes
                  </label>
                  <input type="text" id="deskConditionNote" class="form-input" placeholder="e.g. Screen intact, battery 85%, practice in Hall 2" style="height: 38px;" />
                </div>

                <div style="margin-top: 6px;">
                  ${isCheckedOut ? `
                    <button type="button" class="btn btn-primary" id="btnExecuteSubmitPhone" style="width: 100%; height: 42px; background: #059669; border-color: #059669; font-weight: 800; gap: 6px;">
                      ${getIcon('check')} Log Return &amp; Lock in Cabinet
                    </button>
                  ` : `
                    <button type="button" class="btn btn-primary" id="btnExecuteCheckoutPhone" style="width: 100%; height: 42px; font-weight: 800; gap: 6px;">
                      ${getIcon('plus')} Issue &amp; Check Out Phone for Today
                    </button>
                  `}
                </div>
              `}
            </div>
          ` : ''}

          <!-- ================= TAB 2: DISCIPLINARY & REVOCATION ================= -->
          ${activeTab === 'discipline' ? `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${isSuspended ? `
                <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px;">
                  <div style="display: flex; align-items: center; gap: 6px; color: #b45309; font-weight: 800; font-size: 13px;">
                    <span>${getIcon('pauseCircle')}</span>
                    <span>TEMPORARILY SUSPENDED</span>
                  </div>
                  <div style="font-size: 12.5px; color: #78350f; margin-top: 6px;">
                    Suspended until: <strong>${permit.suspendedUntil || 'Further Notice'}</strong>
                  </div>
                  <div style="font-size: 12px; color: #92400e; margin-top: 4px;">
                    Reason: "${permit.suspensionReason || 'Disciplinary hold'}"
                  </div>
                  <button type="button" class="btn btn-primary" id="btnExecuteReinstate" style="margin-top: 12px; width: 100%; height: 38px; font-weight: 700; gap: 6px; background: #059669; border-color: #059669;">
                    ${getIcon('check')} Reinstate &amp; Restore Active Pass
                  </button>
                </div>
              ` : isRevoked ? `
                <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 10px; padding: 14px;">
                  <div style="display: flex; align-items: center; gap: 6px; color: #b91c1c; font-weight: 800; font-size: 13px;">
                    <span>${getIcon('ban')}</span>
                    <span>PERMANENTLY REVOKED</span>
                  </div>
                  <div style="font-size: 12.5px; color: #991b1b; margin-top: 6px;">
                    Permit cancelled on: <strong>${new Date(permit.revokedAt || permit.permittedAt).toLocaleDateString()}</strong>
                  </div>
                  <div style="font-size: 12px; color: #991b1b; margin-top: 4px;">
                    Reason: "${permit.revokedReason || 'Severe policy violation'}"
                  </div>
                  <button type="button" class="btn btn-primary" id="btnExecuteReinstate" style="margin-top: 12px; width: 100%; height: 38px; font-weight: 700; gap: 6px; background: #059669; border-color: #059669;">
                    ${getIcon('check')} Reinstate &amp; Re-Authorize Student
                  </button>
                </div>
              ` : `
                <!-- Option A: Temporary Suspension -->
                <div style="background: #ffffff; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px;">
                  <div style="display: flex; align-items: center; gap: 6px; color: #b45309; font-weight: 800; font-size: 13.5px; margin-bottom: 8px;">
                    <span>${getIcon('pauseCircle')}</span>
                    <span>Temporary Suspension</span>
                  </div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
                    Temporarily blocks phone checkout for a defined disciplinary duration.
                  </p>

                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Suspension Duration</label>
                    <select id="suspendDuration" class="form-select form-input" style="height: 36px; font-size: 12.5px;">
                      <option value="1">24 Hours (1 Day)</option>
                      <option value="2">48 Hours (2 Days)</option>
                      <option value="3">3 Days</option>
                      <option value="7">1 Week (7 Days)</option>
                    </select>
                  </div>

                  <div class="form-group" style="margin-bottom: 10px;">
                    <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Disciplinary Justification <span class="text-danger">*</span></label>
                    <input type="text" id="suspendReason" class="form-input" placeholder="e.g. Gaming during rehearsal, out-of-hours possession" style="height: 36px;" />
                  </div>

                  <button type="button" class="btn btn-primary" id="btnExecuteSuspend" style="width: 100%; height: 38px; background: #d97706; border-color: #d97706; font-weight: 700; gap: 6px;">
                    ${getIcon('pauseCircle')} Apply Temporary Suspension
                  </button>
                </div>

                <!-- Option B: Permanent Revocation -->
                <div style="background: #ffffff; border: 1.5px solid #fecaca; border-radius: 10px; padding: 14px;">
                  <div style="display: flex; align-items: center; gap: 6px; color: #b91c1c; font-weight: 800; font-size: 13.5px; margin-bottom: 8px;">
                    <span>${getIcon('ban')}</span>
                    <span>Permanent Revocation</span>
                  </div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
                    Permanently cancels smartphone authorization for this candidate.
                  </p>

                  <div class="form-group" style="margin-bottom: 10px;">
                    <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Cancellation Reason <span class="text-danger">*</span></label>
                    <input type="text" id="revokeReason" class="form-input" placeholder="e.g. Serious policy breach, non-academic misuse, confiscated" style="height: 36px;" />
                  </div>

                  <button type="button" class="btn btn-primary" id="btnExecuteRevoke" style="width: 100%; height: 38px; background: #dc2626; border-color: #dc2626; font-weight: 700; gap: 6px;">
                    ${getIcon('ban')} Permanently Revoke Smartphone Access
                  </button>
                </div>
              `}
            </div>
          ` : ''}

          <!-- ================= TAB 3: TEACHER INCIDENT REPORTS FEED ================= -->
          ${activeTab === 'reports' ? `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${irregularities.length === 0 ? `
                <div style="text-align: center; padding: 30px 10px; color: #64748b;">
                  <div style="display: flex; justify-content: center; margin-bottom: 8px;">${getIcon('checkCircle')}</div>
                  <strong style="color: #0f172a; font-size: 14px;">Clean Record</strong>
                  <p style="font-size: 12px; margin-top: 4px; color: #64748b;">No violation flags or misuse reports recorded for this device.</p>
                </div>
              ` : irregularities.map(irr => {
                const isPending = irr.status === 'pending';
                const reportDate = new Date(irr.reportedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

                return `
                  <div style="background: #ffffff; border: 1px solid ${isPending ? '#fecaca' : '#e2e8f0'}; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div>
                        <span style="font-size: 10.5px; font-weight: 800; color: ${isPending ? '#b91c1c' : '#059669'}; background: ${isPending ? '#fef2f2' : '#ecfdf5'}; padding: 2px 7px; border-radius: 4px; border: 1px solid ${isPending ? '#fecaca' : '#a7f3d0'};">
                          ${isPending ? 'PENDING CONTROLLER REVIEW' : 'RESOLVED'}
                        </span>
                        <h4 style="font-size: 13.5px; font-weight: 700; color: #0f172a; margin: 6px 0 2px 0;">
                          ${irr.category.replace(/_/g, ' ')}
                        </h4>
                      </div>
                      <span style="font-size: 11px; color: #64748b; white-space: nowrap;">${reportDate}</span>
                    </div>

                    <p style="font-size: 12.5px; color: #334155; margin: 6px 0; background: #f8fafc; padding: 8px 10px; border-radius: 6px;">
                      "${irr.notes}"
                    </p>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; flex-wrap: wrap; gap: 6px;">
                      <div>Reported by: <strong>${irr.reportedBy}</strong></div>
                      ${isPending ? `
                        <div style="display: flex; gap: 6px;">
                          <button type="button" class="btn btn-sm btn-outline btn-dismiss-report" data-id="${irr.id}" style="height: 28px; font-size: 11px; padding: 0 8px; border-color: #cbd5e1;">
                            Dismiss Flag
                          </button>
                          <button type="button" class="btn btn-sm btn-primary btn-action-report" data-id="${irr.id}" style="height: 28px; font-size: 11px; padding: 0 8px; background: #d97706; border-color: #d97706;">
                            Take Action
                          </button>
                        </div>
                      ` : `
                        <span style="color: #059669; font-weight: 700;">Action: ${irr.actionTaken || 'Reviewed'}</span>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

        </div>

        <!-- Pinned Footer -->
        <div class="modal-footer" style="flex-shrink: 0; padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #ffffff;">
          <button type="button" class="btn btn-secondary" id="btnDoneActionModal" style="height: 36px;">Close</button>
        </div>
      </div>
    `;

    // Wire Tab Switching
    overlay.querySelectorAll('.action-tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.getAttribute('data-tab');
        renderModalContent();
      };
    });

    // Close Listeners
    const close = () => {
      overlay.classList.add('modal-closing');
      setTimeout(() => overlay.remove(), 200);
      if (onActionComplete) onActionComplete();
    };
    overlay.querySelector('#btnCloseActionModal').onclick = close;
    overlay.querySelector('#btnDoneActionModal').onclick = close;

    // Execute Checkout
    const btnCheckout = overlay.querySelector('#btnExecuteCheckoutPhone');
    if (btnCheckout) {
      btnCheckout.onclick = () => {
        const sup = overlay.querySelector('#deskSupervisorName').value.trim() || 'Controller Desk';
        const note = overlay.querySelector('#deskConditionNote').value.trim();
        const res = state.checkoutDevice(permit.id, sup, note);
        if (res.success) {
          toast.success(`Phone ${permit.deviceTag} issued to ${candidate.name} for today.`);
          renderModalContent();
        }
      };
    }

    // Execute Submit
    const btnSubmit = overlay.querySelector('#btnExecuteSubmitPhone');
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const sup = overlay.querySelector('#deskSupervisorName').value.trim() || 'Controller Desk';
        const note = overlay.querySelector('#deskConditionNote').value.trim();
        const res = state.submitDevice(permit.id, sup, note);
        if (res.success) {
          toast.success(`Phone ${permit.deviceTag} submitted and safely stored in locker.`);
          renderModalContent();
        }
      };
    }

    // Execute Suspend
    const btnSuspend = overlay.querySelector('#btnExecuteSuspend');
    if (btnSuspend) {
      btnSuspend.onclick = () => {
        const days = parseInt(overlay.querySelector('#suspendDuration').value, 10) || 1;
        const reason = overlay.querySelector('#suspendReason').value.trim();
        if (!reason) {
          toast.error('Please specify a disciplinary justification.');
          return;
        }

        const untilDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
        state.suspendDevicePermit(permit.id, {
          suspendedUntil: untilDate,
          reason,
          supervisor: 'Controller Desk'
        });

        toast.warning(`Device ${permit.deviceTag} suspended until ${untilDate}.`);
        renderModalContent();
      };
    }

    // Execute Revoke
    const btnRevoke = overlay.querySelector('#btnExecuteRevoke');
    if (btnRevoke) {
      btnRevoke.onclick = () => {
        const reason = overlay.querySelector('#revokeReason').value.trim();
        if (!reason) {
          toast.error('Please specify an official cancellation reason.');
          return;
        }

        if (confirm(`Permanently revoke device permit ${permit.deviceTag} for ${candidate.name}?`)) {
          state.revokeDevicePermit(permit.id, {
            reason,
            supervisor: 'Controller Desk'
          });
          toast.error(`Device permit ${permit.deviceTag} permanently revoked.`);
          renderModalContent();
        }
      };
    }

    // Execute Reinstate
    const btnReinstate = overlay.querySelector('#btnExecuteReinstate');
    if (btnReinstate) {
      btnReinstate.onclick = () => {
        state.reinstateDevicePermit(permit.id, { supervisor: 'Controller Desk' });
        toast.success(`Device permit ${permit.deviceTag} restored to Active status!`);
        renderModalContent();
      };
    }

    // Dismiss Report
    overlay.querySelectorAll('.btn-dismiss-report').forEach(b => {
      b.onclick = () => {
        const irrId = b.getAttribute('data-id');
        state.resolveDeviceIrregularity(permit.id, irrId, { action: 'dismissed' });
        toast.info('Report dismissed.');
        renderModalContent();
      };
    });

    // Action Report
    overlay.querySelectorAll('.btn-action-report').forEach(b => {
      b.onclick = () => {
        const irrId = b.getAttribute('data-id');
        state.resolveDeviceIrregularity(permit.id, irrId, { action: 'action_taken', actionNote: 'Controller reviewed and took action' });
        activeTab = 'discipline';
        renderModalContent();
      };
    });
  };

  document.body.appendChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.classList.add('modal-closing');
      setTimeout(() => overlay.remove(), 200);
      if (onActionComplete) onActionComplete();
    }
  };

  renderModalContent();
}
