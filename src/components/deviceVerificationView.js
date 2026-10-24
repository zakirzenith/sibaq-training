import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';

/**
 * Live Device Verification & Program Progress Inspection View
 * Loaded when scanning the physical QR sticker on back of phone.
 * Shows instant legal/illegal status, permitted hours countdown, and
 * live candidate competition progress to verify productive educational use.
 */
export function renderDeviceVerificationView(container, tagOrId = null, onNavigate = null) {
  // If not passed directly, parse from URL query string
  if (!tagOrId) {
    const params = new URLSearchParams(window.location.search);
    tagOrId = params.get('tag') || params.get('device') || params.get('id') || '';
  }

  const permit = state.getDevicePermitByTag(tagOrId) || state.getDevicePermitById(tagOrId);
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  if (!permit) {
    container.innerHTML = `
      <div class="device-verify-wrapper">
        <div class="dv-card dv-card-invalid">
          <div class="dv-status-header status-red">
            <div class="dv-status-icon-wrap">${getIcon('xCircle')}</div>
            <div class="dv-status-title-group">
              <span class="dv-status-pill pill-red">INVALID STICKER / PASS</span>
              <h2 class="dv-status-heading">No Device Record Found</h2>
            </div>
          </div>
          <div class="dv-card-body" style="padding: 16px 20px;">
            <p class="dv-desc-text">
              No registered institutional device permit matches tag <strong>"${tagOrId || 'N/A'}"</strong>.
            </p>
            <div class="dv-warning-box" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; font-size: 12.5px; color: #991b1b; margin-top: 10px;">
              ⚠️ <strong>Security Notice:</strong> If this phone is being used on campus, it is unauthorized. Please escort the student to the Controller Office.
            </div>
            <div class="dv-actions-row" style="margin-top: 20px;">
              <button class="btn btn-primary" id="btnDvGoHome" style="width: 100%; height: 42px; font-weight: 700;">
                Return to Device Desk
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    const btnHome = container.querySelector('#btnDvGoHome');
    if (btnHome) {
      btnHome.onclick = () => {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.pushState({}, '', cleanUrl);
        if (onNavigate) {
          onNavigate('devices');
        } else {
          window.location.reload();
        }
      };
    }
    return;
  }

  const candidate = state.getCandidateById(permit.candidateId) || {
    id: permit.candidateId,
    name: 'Unknown Candidate',
    category: 'GENERAL',
    chestNo: 'N/A'
  };

  const status = state.getDevicePermitStatus(permit, now);
  const candInitials = (candidate.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  // Fetch candidate's progress and program dossier data
  const dossierData = state.getCandidateMenteeDashboardData(candidate.id);
  const programs = dossierData?.dossier?.programs || [];
  const todayMeets = dossierData?.todayStatus?.meets || [];
  const hasMetToday = todayMeets.length > 0;

  // Header status banner class & colors
  let statusClass = 'status-green';
  let pillClass = 'pill-green';
  let statusIcon = getIcon('checkCircle');

  if (status.code === 'ILLEGAL_OVERDUE' || status.code === 'ILLEGAL_EARLY' || status.code === 'REVOKED') {
    statusClass = 'status-red';
    pillClass = 'pill-red';
    statusIcon = getIcon('alertTriangle');
  } else if (status.code === 'SUBMITTED') {
    statusClass = 'status-amber';
    pillClass = 'pill-amber';
    statusIcon = getIcon('shieldCheck');
  } else if (status.code === 'NOT_CHECKED_OUT') {
    statusClass = 'status-slate';
    pillClass = 'pill-slate';
    statusIcon = getIcon('clock');
  }

  container.innerHTML = `
    <div class="device-verify-wrapper">
      
      <!-- Top Global Seal & Scanner Header -->
      <div class="dv-top-crest-bar">
        <div class="dv-crest-left">
          <img src="/logo.png" alt="DH Bengal" class="dv-crest-logo" />
          <div>
            <div class="dv-crest-title">SIBAQ 2026 • DEVICE INSPECTION DESK</div>
            <div class="dv-crest-sub">Official Academic Practice &amp; Smartphone Compliance Radar</div>
          </div>
        </div>
        <div class="dv-live-clock">
          <span class="dv-live-dot"></span>
          <span>${timeFormatted}</span>
        </div>
      </div>

      <!-- PRIMARY VERIFICATION STATUS CARD -->
      <div class="dv-card ${statusClass}">
        <div class="dv-status-header">
          <div class="dv-status-icon-wrap">${statusIcon}</div>
          <div class="dv-status-title-group">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="dv-status-pill ${pillClass}">${status.badge}</span>
              <span class="dv-tag-pill">TAG: <strong>${permit.deviceTag}</strong></span>
            </div>
            <h1 class="dv-status-heading">
              ${status.isLegal ? 'Authorized Practice Session in Progress' : status.description}
            </h1>
          </div>
        </div>

        <div class="dv-rule-countdown-bar">
          <div class="dv-rc-item">
            <span class="dv-rc-k">Permitted Hours:</span>
            <span class="dv-rc-v">09:00 AM — 10:00 PM</span>
          </div>
          <div class="dv-rc-item">
            <span class="dv-rc-k">Inspection Time:</span>
            <span class="dv-rc-v">${timeFormatted}</span>
          </div>
          <div class="dv-rc-item">
            <span class="dv-rc-k">Status Detail:</span>
            <span class="dv-rc-v" style="font-weight: 800;">
              ${status.remainingMinutes !== null ? `⏳ ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m remaining until 10:00 PM` : ''}
              ${status.overdueMinutes !== null ? `🚨 OVERDUE by ${status.overdueMinutes} mins! Return Now!` : ''}
              ${status.code === 'SUBMITTED' ? `✅ Safe in Storage` : ''}
              ${status.code === 'NOT_CHECKED_OUT' ? `⚠️ Unrecorded Checkout` : ''}
            </span>
          </div>
        </div>
      </div>

      <!-- CANDIDATE IDENTIFICATION CARD -->
      <div class="dv-card dv-candidate-card">
        <div class="dv-cand-header">
          <div class="dv-cand-avatar">
            ${candidate.photo 
              ? `<img src="${candidate.photo}" alt="${candidate.name}" />` 
              : candInitials}
          </div>
          <div class="dv-cand-meta">
            <div class="dv-pill-row">
              <span class="badge badge-category-pill">${candidate.category}</span>
              <span class="badge badge-adno-pill">CHEST: ${candidate.chestNo || candidate.adNo || 'N/A'}</span>
              <span class="badge badge-class-pill">${permit.deviceModel || 'Phone'}</span>
            </div>
            <h2 class="dv-cand-name">${candidate.name}</h2>
            <p class="dv-cand-inst">${candidate.institution || 'DH BENGAL'} • Permitted for: <strong>${permit.reason}</strong></p>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- CORE TEACHER QUESTION: IS HE PROGRESSING FROM HIS PHONE?   -->
      <!-- ============================================================ -->
      <div class="dv-card dv-progress-card">
        <div class="dv-card-title-row">
          <div class="dv-card-title-left">
            <span class="dv-title-icon">${getIcon('trendingUp')}</span>
            <div>
              <h3 class="dv-section-title">Is He Progressing From His Phone?</h3>
              <p class="dv-section-sub">Live competition practice records, mentor scores &amp; today's rehearsal activity</p>
            </div>
          </div>
          <div class="dv-practice-indicator ${hasMetToday ? 'dpi-active' : 'dpi-idle'}">
            ${hasMetToday ? '🟢 Rehearsals Logged Today' : '🟡 No Practice Logged Yet Today'}
          </div>
        </div>

        <!-- Today's Activity Summary Box -->
        <div class="dv-today-box">
          <div class="dv-today-stat">
            <span class="dv-tstat-val">${todayMeets.length}</span>
            <span class="dv-tstat-lbl">Meets Today</span>
          </div>
          <div class="dv-today-stat">
            <span class="dv-tstat-val">${programs.length}</span>
            <span class="dv-tstat-lbl">Assigned Programs</span>
          </div>
          <div class="dv-today-stat">
            <span class="dv-tstat-val">${dossierData?.dossier?.meetingRateLabel || 'Active'}</span>
            <span class="dv-tstat-lbl">Mentorship Momentum</span>
          </div>
        </div>

        <!-- Programs Breakdown & Scores -->
        <h4 class="dv-sub-heading" style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 14px 0 8px 0;">
          Enrolled Competition Programs &amp; Mentor Evaluations
        </h4>
        
        ${programs.length === 0 ? `
          <div class="dv-empty-programs" style="padding: 16px; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
            <p class="text-muted" style="margin: 0; font-size: 12.5px;">No programs currently assigned to this candidate.</p>
          </div>
        ` : `
          <div class="dv-programs-list">
            ${programs.map(p => {
              const progScore = p.latestScore !== null ? `${p.latestScore} / 100` : 'Not Scored';
              const isStage = p.program.isStage;
              const hasCritique = p.latestMeet && p.latestMeet.remarks;
              
              return `
                <div class="dv-program-item">
                  <div class="dv-prog-top">
                    <div>
                      <div class="dv-prog-type-badge ${isStage ? 'type-stage' : 'type-nonstage'}">
                        ${isStage ? 'STAGE EVENT' : 'NON-STAGE EVENT'}
                      </div>
                      <h4 class="dv-prog-title">${p.program.name}</h4>
                    </div>
                    <div class="dv-prog-score-badge">
                      <span class="dv-score-label">Score</span>
                      <strong class="dv-score-val">${progScore}</strong>
                    </div>
                  </div>

                  <div class="dv-prog-trainer-row">
                    <span class="text-muted">Mentor:</span>
                    <strong>${p.trainer ? p.trainer.name : 'Unassigned'}</strong>
                    <span class="dv-prog-meets-count">• ${p.meetCount} practice session(s)</span>
                  </div>

                  ${hasCritique ? `
                    <div class="dv-mentor-critique">
                      <span class="dv-critique-quote">“</span>
                      <span>${p.latestMeet.remarks}</span>
                    </div>
                  ` : `
                    <div class="dv-critique-pending text-muted" style="font-size: 11.5px; margin-top: 6px;">
                      No written critique recorded yet for this program.
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- SUPERVISOR / TEACHER QUICK ACTIONS BAR -->
      <div class="dv-card dv-actions-card">
        <h3 class="dv-actions-title">Supervisor / Teacher On-Duty Actions</h3>
        <p class="dv-actions-desc">You can directly record the device return or report misuse without leaving this page.</p>

        <div class="dv-action-buttons-grid">
          ${status.code === 'LEGAL' || status.code === 'ILLEGAL_OVERDUE' ? `
            <button class="btn btn-primary dv-btn-action" id="btnDvSubmitPhone" style="background: #059669; border-color: #059669;">
              ${getIcon('check')} Submit &amp; Return Phone to Locker
            </button>
          ` : `
            <button class="btn btn-secondary dv-btn-action" id="btnDvCheckoutPhone">
              ${getIcon('plus')} Issue / Check Out Phone for Today
            </button>
          `}

          <button class="btn btn-outline dv-btn-action" id="btnDvFlagMisuse" style="border-color: #fca5a5; color: #b91c1c; background: #ffffff;">
            ${getIcon('flag')} Flag Irregularity / Non-Practice Use
          </button>
        </div>
      </div>

      <!-- Bottom Nav / Back to Desk -->
      <div class="dv-footer-nav" style="margin-top: 6px;">
        <button class="btn btn-secondary" id="btnDvReturnPortal" style="width: 100%; height: 42px; font-weight: 700;">
          ${getIcon('chevronLeft')} Return to Student Device Desk
        </button>
      </div>

    </div>
  `;

  // --- INTERACTIVE ACTION HANDLERS ---
  const btnSubmitPhone = container.querySelector('#btnDvSubmitPhone');
  if (btnSubmitPhone) {
    btnSubmitPhone.onclick = () => {
      const supervisorName = prompt('Enter Teacher / Supervisor Name who received the phone:', 'Duty Teacher');
      if (supervisorName === null) return;
      
      const res = state.submitDevice(permit.id, supervisorName.trim() || 'Duty Teacher');
      if (res.success) {
        toast.success(`Device ${permit.deviceTag} successfully marked as SUBMITTED!`);
        renderDeviceVerificationView(container, permit.deviceTag, onNavigate);
      }
    };
  }

  const btnCheckoutPhone = container.querySelector('#btnDvCheckoutPhone');
  if (btnCheckoutPhone) {
    btnCheckoutPhone.onclick = () => {
      const issuerName = prompt('Enter Teacher / Supervisor Name issuing this phone:', 'Duty Teacher');
      if (issuerName === null) return;

      const res = state.checkoutDevice(permit.id, issuerName.trim() || 'Duty Teacher');
      if (res.success) {
        toast.success(`Device ${permit.deviceTag} issued to candidate!`);
        renderDeviceVerificationView(container, permit.deviceTag, onNavigate);
      }
    };
  }

  const btnFlagMisuse = container.querySelector('#btnDvFlagMisuse');
  if (btnFlagMisuse) {
    btnFlagMisuse.onclick = () => {
      const note = prompt('Describe the irregularity or non-practice use (e.g. Gaming, refusal to submit, unapproved apps):');
      if (!note) return;

      const updatedNotes = permit.notes ? `${permit.notes}\n[FLAGGED ${new Date().toLocaleTimeString()}]: ${note}` : `[FLAGGED ${new Date().toLocaleTimeString()}]: ${note}`;
      state.updateDevicePermit(permit.id, { notes: updatedNotes });
      toast.warning('Irregularity recorded on student device permit.');
      renderDeviceVerificationView(container, permit.deviceTag, onNavigate);
    };
  }

  const btnReturnPortal = container.querySelector('#btnDvReturnPortal');
  if (btnReturnPortal) {
    btnReturnPortal.onclick = () => {
      // Clear URL parameter so it returns cleanly to devices desk
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, '', cleanUrl);
      if (onNavigate) {
        onNavigate('devices');
      } else {
        window.location.reload();
      }
    };
  }
}
