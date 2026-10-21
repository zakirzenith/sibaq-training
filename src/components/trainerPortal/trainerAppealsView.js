import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

const PREPARED_REASONS = [
  {
    id: 'attendance',
    title: 'Irregular Attendance / Missing Meets',
    icon: 'calendar',
    defaultText: 'Mentee has been repeatedly absent from daily scheduled coaching sessions without prior notice or valid excuse.'
  },
  {
    id: 'assignment',
    title: 'Not Submitting Assignments / Practice Tasks',
    icon: 'fileSpreadsheet',
    defaultText: 'Mentee is not completing or submitting the mandatory daily practice assignments and performance tasks on time.'
  },
  {
    id: 'unresponsive',
    title: 'Unreachable / Not Responding to Contact',
    icon: 'phone',
    defaultText: 'Unable to reach candidate or guardian via phone call or WhatsApp messages despite repeated attempts.'
  },
  {
    id: 'preparation',
    title: 'Lack of Serious Preparation for Grand Finale',
    icon: 'alertTriangle',
    defaultText: 'Candidate exhibits low commitment, insufficient practice time, and poor readiness trajectory for Sibaq 2026.'
  },
  {
    id: 'discipline',
    title: 'Attitude / Disciplinary Concern',
    icon: 'alertCircle',
    defaultText: 'Candidate displays lack of engagement, unwillingness to follow trainer instructions, or disruptive behavior during training.'
  },
  {
    id: 'emergency',
    title: 'Health / Personal Emergency',
    icon: 'info',
    defaultText: 'Candidate or family reported physical illness or unavoidable personal circumstance preventing daily attendance.'
  },
  {
    id: 'other',
    title: 'Other Specific Issue',
    icon: 'flag',
    defaultText: ''
  }
];

export function renderTrainerAppealsView(container, navigateTo) {
  const currentTrainer = state.getActiveTrainer();

  if (!currentTrainer) {
    container.innerHTML = `
      <div class="empty-state-card" style="text-align: center; padding: 48px 16px;">
        <div class="empty-icon" style="font-size: 36px; margin-bottom: 12px;">🔒</div>
        <h2>Trainer Session Required</h2>
        <p class="text-muted text-sm">Please log in to your trainer account to file or view mentee appeals.</p>
        <button id="btnGoToLogin" class="btn btn-primary" style="margin-top: 16px;">
          Go to Trainer Login
        </button>
      </div>
    `;
    const btn = container.querySelector('#btnGoToLogin');
    if (btn && typeof window.openTrainerLogin === 'function') {
      btn.onclick = () => window.openTrainerLogin();
    }
    return;
  }

  // Trainer assigned mentees
  const assignedMentees = state.getTrainerMentees(currentTrainer.id);

  // Local state
  let selectedCandidateId = assignedMentees.length > 0 ? assignedMentees[0].id : '';
  let selectedReason = PREPARED_REASONS[0];
  let customDescription = PREPARED_REASONS[0].defaultText;
  let selectedUrgency = 'normal'; // 'normal' | 'high' | 'critical'
  let filterStatus = 'ALL'; // 'ALL' | 'pending' | 'in-review' | 'resolved'
  let isFormOpen = false;

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function getUrgencyBadge(urgency) {
    if (urgency === 'critical') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#fee2e2; color:#b91c1c; font-size:11px; font-weight:800; border:1px solid #fca5a5;">
        <span style="width:6px; height:6px; border-radius:50%; background:#ef4444; animation:pulse 1.5s infinite;"></span> Critical / Urgent
      </span>`;
    }
    if (urgency === 'high') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#ffedd5; color:#c2410c; font-size:11px; font-weight:700; border:1px solid #fdba74;">
        <span style="width:6px; height:6px; border-radius:50%; background:#f97316;"></span> High Priority
      </span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:11px; font-weight:600; border:1px solid #e2e8f0;">
      <span style="width:6px; height:6px; border-radius:50%; background:#94a3b8;"></span> Normal Notice
    </span>`;
  }

  function getStatusBadge(status) {
    if (status === 'resolved') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:11.5px; font-weight:800; border:1px solid #a7f3d0;">
        ${getIcon('check')} Action Taken / Resolved
      </span>`;
    }
    if (status === 'in-review') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11.5px; font-weight:800; border:1px solid #bfdbfe;">
        ${getIcon('clock')} Under Controller Review
      </span>`;
    }
    if (status === 'dismissed') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:11.5px; font-weight:700; border:1px solid #e2e8f0;">
        Closed / Dismissed
      </span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11.5px; font-weight:800; border:1px solid #fde68a;">
      <span style="width:6px; height:6px; border-radius:50%; background:#f59e0b;"></span> Pending Controller Action
    </span>`;
  }

  function render() {
    const trainerAppeals = state.getTrainerAppeals(currentTrainer.id);

    const pendingCount = trainerAppeals.filter(a => a.status === 'pending' || a.status === 'in-review').length;
    const resolvedCount = trainerAppeals.filter(a => a.status === 'resolved').length;

    const filteredAppeals = trainerAppeals.filter(a => {
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'pending') return a.status === 'pending';
      if (filterStatus === 'in-review') return a.status === 'in-review';
      if (filterStatus === 'resolved') return a.status === 'resolved';
      return true;
    });

    const activeCandidate = assignedMentees.find(m => m.id === selectedCandidateId) || assignedMentees[0];

    container.innerHTML = `
      <div class="trainer-portal-container" style="max-width: 1040px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- 1. HERO HEADER BANNER -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%); border-radius: 20px; padding: 22px 24px; box-shadow: 0 10px 25px rgba(30, 27, 75, 0.25); margin-bottom: 20px; color: #ffffff; position: relative; overflow: hidden;">
          <div style="position: absolute; right: -25px; top: -25px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%); pointer-events: none;"></div>
          <div style="position: absolute; left: 35%; bottom: -40px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); font-size: 11px; font-weight: 700; color: #fecaca; margin-bottom: 8px;">
                ${getIcon('appeal')} <span>OFFICIAL ESCALATION DESK</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 900; margin: 0 0 6px 0; letter-spacing: -0.01em; color: #ffffff;">
                Mentee Appeals & Issue Reports
              </h1>
              <p style="margin: 0; font-size: 13px; color: #e0e7ff; max-width: 600px; line-height: 1.45;">
                Escalate attendance gaps, missing daily assignments, or unreachable mentees directly to the Central Controller panel for urgent intervention.
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button type="button" id="btnToggleAppealForm" class="btn" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-weight: 800; font-size: 13px; border-radius: 12px; padding: 10px 18px; border: none; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.15s ease;">
                ${getIcon(isFormOpen ? 'x' : 'plus')}
                <span>${isFormOpen ? 'Close Form' : 'File New Appeal'}</span>
              </button>
            </div>
          </div>

          <!-- Quick Stats Pill Row -->
          <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; margin-top: 18px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 7px 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px;">
              <span style="color: #cbd5e1;">Assigned Mentees:</span>
              <strong style="color: #ffffff; font-weight: 800;">${assignedMentees.length}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 7px 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px;">
              <span style="color: #cbd5e1;">Appeals Filed:</span>
              <strong style="color: #ffffff; font-weight: 800;">${trainerAppeals.length}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 7px 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px;">
              <span style="color: #fef08a;">Pending Review:</span>
              <strong style="color: #fef08a; font-weight: 800;">${pendingCount}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 7px 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 12px;">
              <span style="color: #a7f3d0;">Resolved:</span>
              <strong style="color: #a7f3d0; font-weight: 800;">${resolvedCount}</strong>
            </div>
          </div>
        </div>

        <!-- 2. FILE NEW APPEAL FORM (Card with smooth expand/collapse) -->
        <div id="appealFormContainer" style="display: ${isFormOpen ? 'block' : 'none'}; margin-bottom: 24px;">
          <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);">
            
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 18px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 10px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
                  ${getIcon('appeal')}
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">Submit New Mentee Appeal</h3>
                  <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Notice will be instantly dispatched to the Controller Desk.</p>
                </div>
              </div>
              <button type="button" id="btnCancelForm" class="btn btn-sm btn-outline" style="border-color: #cbd5e1; color: #64748b; font-weight: 700;">
                Cancel
              </button>
            </div>

            ${assignedMentees.length === 0 ? `
              <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">
                You do not currently have any assigned mentees. Appeals can only be submitted for your assigned candidates.
              </div>
            ` : `
              <form id="formSubmitAppeal" style="display: flex; flex-direction: column; gap: 18px;">
                
                <!-- Step 1: Select Candidate -->
                <div>
                  <label style="display: block; font-size: 12.5px; font-weight: 800; color: #1e293b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                    1. Select Assigned Mentee <span style="color: #ef4444;">*</span>
                  </label>
                  <select id="selectAppealCandidate" class="form-input" style="width: 100%; height: 44px; font-size: 13.5px; font-weight: 600; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 0 12px; background: #f8fafc;">
                    ${assignedMentees.map(m => `
                      <option value="${m.id}" ${m.id === selectedCandidateId ? 'selected' : ''}>
                        ${m.name} • #${m.chestNo || m.adNo || m.id} • ${m.category || 'BIDĀYA'}
                      </option>
                    `).join('')}
                  </select>

                  ${activeCandidate ? `
                    <div style="margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; color: #fff; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                          ${activeCandidate.photo ? `<img src="${activeCandidate.photo}" alt="${activeCandidate.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : activeCandidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${activeCandidate.name}</div>
                          <div style="font-size: 11px; color: #64748b;">
                            Chest #${activeCandidate.chestNo || activeCandidate.adNo} • <span style="font-weight: 700; color: #4338ca;">${activeCandidate.category}</span>
                          </div>
                        </div>
                      </div>
                      <div style="font-size: 11.5px; color: #475569; background: #e0e7ff; padding: 3px 8px; border-radius: 8px; font-weight: 700;">
                        ${state.getCandidatePrograms(activeCandidate.id).length} Enrolled Program(s)
                      </div>
                    </div>
                  ` : ''}
                </div>

                <!-- Step 2: Choose Prepared Reason -->
                <div>
                  <label style="display: block; font-size: 12.5px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">
                    2. Choose Escalation Reason <span style="color: #ef4444;">*</span>
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;">
                    ${PREPARED_REASONS.map(r => {
                      const isSelected = selectedReason.id === r.id;
                      return `
                        <button type="button" class="btn-reason-pill" data-reason-id="${r.id}" style="
                          text-align: left;
                          padding: 10px 12px;
                          border-radius: 12px;
                          border: 1.5px solid ${isSelected ? '#ef4444' : '#e2e8f0'};
                          background: ${isSelected ? '#fef2f2' : '#ffffff'};
                          color: ${isSelected ? '#991b1b' : '#334155'};
                          font-weight: ${isSelected ? '800' : '600'};
                          font-size: 12.5px;
                          display: flex;
                          align-items: center;
                          gap: 9px;
                          cursor: pointer;
                          transition: all 0.15s ease;
                        ">
                          <span style="color: ${isSelected ? '#ef4444' : '#64748b'};">${getIcon(r.icon || 'alertCircle')}</span>
                          <span style="flex: 1; min-width: 0; line-height: 1.25;">${r.title}</span>
                          ${isSelected ? `<span style="color: #ef4444;">${getIcon('check')}</span>` : ''}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>

                <!-- Step 3: Urgency Level -->
                <div>
                  <label style="display: block; font-size: 12.5px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">
                    3. Urgency / Severity Level
                  </label>
                  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <label class="urgency-option" style="flex: 1; min-width: 130px; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid ${selectedUrgency === 'normal' ? '#94a3b8' : '#e2e8f0'}; background: ${selectedUrgency === 'normal' ? '#f8fafc' : '#ffffff'}; cursor: pointer;">
                      <input type="radio" name="appealUrgency" value="normal" ${selectedUrgency === 'normal' ? 'checked' : ''} style="accent-color: #64748b;" />
                      <div>
                        <div style="font-size: 12.5px; font-weight: 800; color: #334155;">Normal Notice</div>
                        <div style="font-size: 10.5px; color: #64748b;">Informational record</div>
                      </div>
                    </label>

                    <label class="urgency-option" style="flex: 1; min-width: 130px; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid ${selectedUrgency === 'high' ? '#f97316' : '#e2e8f0'}; background: ${selectedUrgency === 'high' ? '#fff7ed' : '#ffffff'}; cursor: pointer;">
                      <input type="radio" name="appealUrgency" value="high" ${selectedUrgency === 'high' ? 'checked' : ''} style="accent-color: #f97316;" />
                      <div>
                        <div style="font-size: 12.5px; font-weight: 800; color: #c2410c;">High Priority</div>
                        <div style="font-size: 10.5px; color: #ea580c;">Follow-up needed</div>
                      </div>
                    </label>

                    <label class="urgency-option" style="flex: 1; min-width: 130px; display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; border: 1.5px solid ${selectedUrgency === 'critical' ? '#ef4444' : '#e2e8f0'}; background: ${selectedUrgency === 'critical' ? '#fef2f2' : '#ffffff'}; cursor: pointer;">
                      <input type="radio" name="appealUrgency" value="critical" ${selectedUrgency === 'critical' ? 'checked' : ''} style="accent-color: #ef4444;" />
                      <div>
                        <div style="font-size: 12.5px; font-weight: 800; color: #b91c1c;">Critical / Urgent</div>
                        <div style="font-size: 10.5px; color: #dc2626;">Immediate action</div>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Step 4: Specific Remarks Textarea -->
                <div>
                  <label style="display: block; font-size: 12.5px; font-weight: 800; color: #1e293b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                    4. Situation Details & Specific Notes <span style="color: #ef4444;">*</span>
                  </label>
                  <textarea id="txtAppealDescription" class="form-input" rows="3" style="width: 100%; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.45; resize: vertical;" placeholder="Type detailed circumstances (e.g. absent 3 days consecutively, guardian phone switched off, assignment pending since Monday)...">${customDescription}</textarea>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Provide accurate dates, occurrences, or specific program names to assist the Controller in taking prompt action.
                  </div>
                </div>

                <!-- Form Submit Action -->
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 6px; border-top: 1.5px solid #f1f5f9; padding-top: 14px;">
                  <button type="button" id="btnCancelFormBottom" class="btn btn-outline" style="font-weight: 700; border-color: #cbd5e1; color: #475569; border-radius: 10px;">
                    Cancel
                  </button>
                  <button type="submit" id="btnSubmitAppealForm" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; font-weight: 800; font-size: 13.5px; padding: 10px 22px; border-radius: 10px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); display: flex; align-items: center; gap: 8px;">
                    ${getIcon('send')}
                    <span>Dispatch Appeal to Controller</span>
                  </button>
                </div>
              </form>
            `}
          </div>
        </div>

        <!-- 3. SUBMITTED APPEALS STATUS & HISTORY SECTION -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
            <div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                Appeals Filed by You (${trainerAppeals.length})
              </h2>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                Track controller review status, resolutions, and official actions taken.
              </p>
            </div>

            <!-- Filter Status Pills -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn-filter-pill ${filterStatus === 'ALL' ? 'active' : ''}" data-filter="ALL" style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'ALL' ? '#4f46e5' : '#e2e8f0'}; background: ${filterStatus === 'ALL' ? '#eef2ff' : '#ffffff'}; color: ${filterStatus === 'ALL' ? '#4f46e5' : '#64748b'}; cursor: pointer;">
                All (${trainerAppeals.length})
              </button>
              <button type="button" class="btn-filter-pill ${filterStatus === 'pending' ? 'active' : ''}" data-filter="pending" style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'pending' ? '#f59e0b' : '#e2e8f0'}; background: ${filterStatus === 'pending' ? '#fef3c7' : '#ffffff'}; color: ${filterStatus === 'pending' ? '#92400e' : '#64748b'}; cursor: pointer;">
                Pending (${pendingCount})
              </button>
              <button type="button" class="btn-filter-pill ${filterStatus === 'resolved' ? 'active' : ''}" data-filter="resolved" style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'resolved' ? '#10b981' : '#e2e8f0'}; background: ${filterStatus === 'resolved' ? '#ecfdf5' : '#ffffff'}; color: ${filterStatus === 'resolved' ? '#047857' : '#64748b'}; cursor: pointer;">
                Resolved (${resolvedCount})
              </button>
            </div>
          </div>

          <!-- Appeals List -->
          ${filteredAppeals.length === 0 ? `
            <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 16px; padding: 36px 16px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">No Appeals Found</h4>
              <p style="margin: 4px 0 16px 0; font-size: 12.5px; color: #64748b;">
                ${filterStatus === 'ALL' ? 'You haven’t filed any mentee appeals yet. Use "File New Appeal" whenever a candidate needs controller intervention.' : 'No appeals match this filter criteria.'}
              </p>
              ${!isFormOpen && assignedMentees.length > 0 ? `
                <button type="button" id="btnEmptyStateNewAppeal" class="btn btn-sm btn-primary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; font-weight: 800; border-radius: 10px; padding: 8px 16px;">
                  + File First Appeal
                </button>
              ` : ''}
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${filteredAppeals.map(a => {
                const cand = state.getCandidateById(a.candidateId);
                const hasControllerResponse = Boolean(a.controllerNotes && a.controllerNotes.trim());

                return `
                  <div class="appeal-card" style="background: #ffffff; border: 1.5px solid ${a.urgency === 'critical' ? '#fecaca' : '#e2e8f0'}; border-radius: 16px; padding: 18px 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); transition: transform 0.15s ease, box-shadow 0.15s ease;">
                    
                    <!-- Top Info Row -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${getUrgencyBadge(a.urgency)}
                        ${getStatusBadge(a.status)}
                      </div>
                      <div style="font-size: 11.5px; color: #64748b; font-weight: 600;">
                        Filed ${formatRelativeTime(a.createdAt)} • ${new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <!-- Mentee & Issue Row -->
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 42px; height: 42px; border-radius: 50%; background: #4f46e5; color: #ffffff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                          ${cand && cand.photo ? `<img src="${cand.photo}" alt="${a.candidateName}" style="width: 100%; height: 100%; object-fit: cover;" />` : a.candidateName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style="font-size: 15px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span>${a.candidateName}</span>
                            <span style="font-size: 11px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px;">
                              #${a.candidateChestNo}
                            </span>
                            <span style="font-size: 11px; font-weight: 700; color: #64748b;">
                              ${a.candidateCategory}
                            </span>
                          </div>
                          <div style="font-size: 13px; font-weight: 800; color: #b91c1c; margin-top: 3px; display: flex; align-items: center; gap: 6px;">
                            ${getIcon('alertTriangle')}
                            <span>${a.reasonCategory}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${a.status === 'pending' ? `
                          <button type="button" class="btn btn-sm btn-outline btn-delete-appeal" data-appeal-id="${a.id}" style="border-color: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px;" title="Withdraw this appeal">
                            ${getIcon('trash')} Withdraw
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Description Quote -->
                    <div style="margin-top: 12px; background: #f8fafc; border-left: 3.5px solid ${a.urgency === 'critical' ? '#ef4444' : '#6366f1'}; border-radius: 0 10px 10px 0; padding: 10px 14px; font-size: 13px; color: #334155; line-height: 1.45;">
                      ${a.description ? a.description : '<em>No additional details provided.</em>'}
                    </div>

                    <!-- Controller Response Section (If Available) -->
                    ${hasControllerResponse ? `
                      <div style="margin-top: 12px; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 14px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; color: #065f46;">
                            <span style="width: 18px; height: 18px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px;">✓</span>
                            <span>Controller Resolution & Action Taken:</span>
                          </div>
                          ${a.resolvedAt ? `
                            <span style="font-size: 11px; color: #047857; font-weight: 600;">
                              ${formatRelativeTime(a.resolvedAt)}
                            </span>
                          ` : ''}
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: #064e3b; line-height: 1.4; padding-left: 24px;">
                          ${a.controllerNotes}
                        </div>
                      </div>
                    ` : a.status === 'in-review' ? `
                      <div style="margin-top: 10px; font-size: 12px; color: #1e40af; background: #eff6ff; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 6px;">
                        ${getIcon('clock')}
                        <span>Controller has opened this appeal and is currently reviewing or contacting the mentee.</span>
                      </div>
                    ` : ''}

                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;

    // Attach Event Listeners
    attachEvents();
  }

  function attachEvents() {
    // 1. Toggle Form
    const btnToggle = container.querySelector('#btnToggleAppealForm');
    if (btnToggle) {
      btnToggle.onclick = () => {
        isFormOpen = !isFormOpen;
        render();
        if (isFormOpen) {
          const formCard = container.querySelector('#appealFormContainer');
          if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
    }

    const btnCancel = container.querySelector('#btnCancelForm');
    if (btnCancel) {
      btnCancel.onclick = () => {
        isFormOpen = false;
        render();
      };
    }

    const btnCancelBottom = container.querySelector('#btnCancelFormBottom');
    if (btnCancelBottom) {
      btnCancelBottom.onclick = () => {
        isFormOpen = false;
        render();
      };
    }

    const btnEmptyNew = container.querySelector('#btnEmptyStateNewAppeal');
    if (btnEmptyNew) {
      btnEmptyNew.onclick = () => {
        isFormOpen = true;
        render();
        const formCard = container.querySelector('#appealFormContainer');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    }

    // 2. Select Candidate change
    const selCand = container.querySelector('#selectAppealCandidate');
    if (selCand) {
      selCand.onchange = (e) => {
        selectedCandidateId = e.target.value;
        render();
      };
    }

    // 3. Select Reason Pills
    container.querySelectorAll('.btn-reason-pill').forEach(btn => {
      btn.onclick = () => {
        const rId = btn.getAttribute('data-reason-id');
        const match = PREPARED_REASONS.find(r => r.id === rId);
        if (match) {
          selectedReason = match;
          const txtDesc = container.querySelector('#txtAppealDescription');
          if (txtDesc && (!txtDesc.value.trim() || PREPARED_REASONS.some(r => r.defaultText === txtDesc.value.trim()))) {
            txtDesc.value = match.defaultText;
            customDescription = match.defaultText;
          }
          render();
        }
      };
    });

    // 4. Urgency Radios
    container.querySelectorAll('input[name="appealUrgency"]').forEach(radio => {
      radio.onchange = (e) => {
        selectedUrgency = e.target.value;
      };
    });

    // 5. Description textarea
    const txtDesc = container.querySelector('#txtAppealDescription');
    if (txtDesc) {
      txtDesc.oninput = (e) => {
        customDescription = e.target.value;
      };
    }

    // 6. Submit Appeal Form
    const form = container.querySelector('#formSubmitAppeal');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();

        const candidate = assignedMentees.find(m => m.id === selectedCandidateId);
        if (!candidate) {
          toast.error('Please select an assigned mentee to appeal.');
          return;
        }

        const reason = selectedReason ? selectedReason.title : 'Other Specific Issue';
        const description = (txtDesc ? txtDesc.value : customDescription).trim();

        if (!description) {
          toast.error('Please enter details or specific notes for this appeal.');
          if (txtDesc) txtDesc.focus();
          return;
        }

        const btnSubmit = container.querySelector('#btnSubmitAppealForm');
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `<span>Submitting...</span>`;
        }

        try {
          await state.createAppeal({
            candidateId: candidate.id,
            candidateName: candidate.name,
            candidateChestNo: candidate.chestNo || candidate.adNo || candidate.id,
            candidateCategory: candidate.category || 'BIDĀYA',
            trainerId: currentTrainer.id,
            trainerName: currentTrainer.name,
            trainerSpecialization: currentTrainer.expertise || 'Specialized Mentor',
            reasonCategory: reason,
            description,
            urgency: selectedUrgency
          });

          toast.success(`Appeal for ${candidate.name} submitted to Controller successfully!`);
          isFormOpen = false;
          customDescription = PREPARED_REASONS[0].defaultText;
          selectedReason = PREPARED_REASONS[0];
          selectedUrgency = 'normal';
          render();
        } catch (err) {
          console.error('Error submitting appeal:', err);
          toast.error('Failed to submit appeal. Please try again.');
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `${getIcon('send')} <span>Dispatch Appeal to Controller</span>`;
          }
        }
      };
    }

    // 7. Filter Status Pills
    container.querySelectorAll('.btn-filter-pill').forEach(btn => {
      btn.onclick = () => {
        filterStatus = btn.getAttribute('data-filter') || 'ALL';
        render();
      };
    });

    // 8. Delete / Withdraw Appeal
    container.querySelectorAll('.btn-delete-appeal').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        if (!appealId) return;

        if (confirm('Are you sure you want to withdraw this appeal?')) {
          try {
            await state.deleteAppeal(appealId);
            toast.info('Appeal withdrawn.');
            render();
          } catch (e) {
            toast.error('Failed to withdraw appeal.');
          }
        }
      };
    });
  }

  // Initial render
  render();
}
