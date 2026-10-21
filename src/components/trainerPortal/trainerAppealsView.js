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
  let selectedCandidateId = ''; // Do NOT auto-assign first; let trainer select with search panel
  let candidateSearchQuery = '';
  let isCandidatePickerOpen = true;
  let selectedReason = PREPARED_REASONS[0];
  let customDescription = PREPARED_REASONS[0].defaultText;
  let appealsSearchQuery = '';
  let filterStatus = 'ALL'; // 'ALL' | 'pending' | 'resolved'
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

  function getStatusBadge(status) {
    if (status === 'resolved') {
      return `<span class="badge-status-resolved" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:11.5px; font-weight:800; border:1px solid #a7f3d0; white-space:nowrap;">
        ${getIcon('check')} Action Taken
      </span>`;
    }
    if (status === 'in-review') {
      return `<span class="badge-status-review" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11.5px; font-weight:800; border:1px solid #bfdbfe; white-space:nowrap;">
        ${getIcon('clock')} In Review
      </span>`;
    }
    if (status === 'dismissed') {
      return `<span class="badge-status-dismissed" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:11.5px; font-weight:700; border:1px solid #e2e8f0; white-space:nowrap;">
        Dismissed
      </span>`;
    }
    return `<span class="badge-status-pending" style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11.5px; font-weight:800; border:1px solid #fde68a; white-space:nowrap;">
      <span style="width:6px; height:6px; border-radius:50%; background:#f59e0b;"></span> Pending Action
    </span>`;
  }

  function render() {
    const trainerAppeals = state.getTrainerAppeals(currentTrainer.id);

    const pendingCount = trainerAppeals.filter(a => a.status === 'pending' || a.status === 'in-review').length;
    const resolvedCount = trainerAppeals.filter(a => a.status === 'resolved').length;

    // Filter appeals by status and search query
    const filteredAppeals = trainerAppeals.filter(a => {
      if (filterStatus === 'pending' && !(a.status === 'pending' || a.status === 'in-review')) return false;
      if (filterStatus === 'resolved' && a.status !== 'resolved') return false;

      if (appealsSearchQuery) {
        const q = appealsSearchQuery.toLowerCase().trim();
        const candName = (a.candidateName || '').toLowerCase();
        const candChest = (a.candidateChestNo || '').toLowerCase();
        const candCat = (a.candidateCategory || '').toLowerCase();
        const reason = (a.reasonCategory || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const notes = (a.controllerNotes || '').toLowerCase();

        return candName.includes(q) ||
          candChest.includes(q) ||
          candCat.includes(q) ||
          reason.includes(q) ||
          desc.includes(q) ||
          notes.includes(q);
      }
      return true;
    });

    const activeCandidate = assignedMentees.find(m => m.id === selectedCandidateId);

    // Filter candidate list for the selection panel
    const filteredMentees = assignedMentees.filter(m => {
      if (!candidateSearchQuery) return true;
      const q = candidateSearchQuery.toLowerCase().trim();
      const name = (m.name || '').toLowerCase();
      const chest = (m.chestNo || m.adNo || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      return name.includes(q) || chest.includes(q) || cat.includes(q);
    });

    container.innerHTML = `
      <div class="trainer-portal-container appeals-view-root" style="max-width: 1040px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- 1. HERO HEADER BANNER -->
        <div class="appeals-hero-card" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%); border-radius: 18px; padding: 18px 20px; box-shadow: 0 8px 24px rgba(30, 27, 75, 0.22); margin-bottom: 16px; color: #ffffff; position: relative; overflow: hidden;">
          <div style="position: absolute; right: -25px; top: -25px; width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); font-size: 10.5px; font-weight: 700; color: #fecaca; margin-bottom: 6px;">
                ${getIcon('appeal')} <span>ESCALATION DESK</span>
              </div>
              <h1 class="appeals-hero-title" style="font-size: 20px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: -0.01em; color: #ffffff;">
                Mentee Appeals & Issue Reports
              </h1>
              <p class="appeals-hero-desc" style="margin: 0; font-size: 12.5px; color: #e0e7ff; max-width: 580px; line-height: 1.4;">
                Escalate attendance gaps or missing tasks directly to the Controller for prompt intervention.
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="btnToggleAppealForm" class="btn btn-appeal-action" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; font-weight: 800; font-size: 12.5px; border-radius: 10px; padding: 8px 14px; border: none; box-shadow: 0 3px 10px rgba(239, 68, 68, 0.35); display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap;">
                ${getIcon(isFormOpen ? 'x' : 'plus')}
                <span class="btn-appeal-label">${isFormOpen ? 'Close Form' : '+ File Appeal'}</span>
              </button>
            </div>
          </div>

          <!-- Quick Stats Pill Row -->
          <div class="appeals-stats-row" style="position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 11.5px;">
              <span style="color: #cbd5e1;">Mentees:</span>
              <strong style="color: #ffffff; font-weight: 800;">${assignedMentees.length}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 11.5px;">
              <span style="color: #cbd5e1;">Appeals:</span>
              <strong style="color: #ffffff; font-weight: 800;">${trainerAppeals.length}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 11.5px;">
              <span style="color: #fef08a;">Pending:</span>
              <strong style="color: #fef08a; font-weight: 800;">${pendingCount}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.25); backdrop-filter: blur(8px); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 11.5px;">
              <span style="color: #a7f3d0;">Resolved:</span>
              <strong style="color: #a7f3d0; font-weight: 800;">${resolvedCount}</strong>
            </div>
          </div>
        </div>

        <!-- 2. FILE NEW APPEAL FORM -->
        <div id="appealFormContainer" style="display: ${isFormOpen ? 'block' : 'none'}; margin-bottom: 20px;">
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);">
            
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
                  ${getIcon('appeal')}
                </div>
                <div>
                  <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">Submit Mentee Appeal</h3>
                  <p class="appeals-extra-desc" style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b;">Notice is dispatched directly to the Controller Desk.</p>
                </div>
              </div>
              <button type="button" id="btnCancelForm" class="btn btn-sm btn-outline" style="border-color: #cbd5e1; color: #64748b; font-weight: 700; font-size: 11.5px; padding: 4px 10px;">
                ✕ Close
              </button>
            </div>

            ${assignedMentees.length === 0 ? `
              <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">
                You do not currently have any assigned mentees. Appeals can only be submitted for your assigned candidates.
              </div>
            ` : `
              <form id="formSubmitAppeal" style="display: flex; flex-direction: column; gap: 16px;">
                
                <!-- STEP 1: ENHANCED CANDIDATE SELECTION PANEL WITH SEARCH -->
                <div class="appeal-form-section">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <label style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.03em;">
                      1. Select Assigned Mentee <span style="color: #ef4444;">*</span>
                    </label>
                    ${activeCandidate && !isCandidatePickerOpen ? `
                      <button type="button" id="btnChangeMenteePicker" style="background: none; border: none; color: #4f46e5; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        ${getIcon('search')} <span>Change Mentee</span>
                      </button>
                    ` : ''}
                  </div>

                  <!-- Selected Candidate Confirmed Card (When chosen and picker closed) -->
                  ${activeCandidate && !isCandidatePickerOpen ? `
                    <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #059669; color: #fff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                          ${activeCandidate.photo ? `<img src="${activeCandidate.photo}" alt="${activeCandidate.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : activeCandidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style="font-size: 13.5px; font-weight: 800; color: #064e3b; display: flex; align-items: center; gap: 6px;">
                            <span>${activeCandidate.name}</span>
                            <span style="font-size: 10.5px; background: #059669; color: #fff; padding: 1px 6px; border-radius: 4px;">✓ Selected</span>
                          </div>
                          <div style="font-size: 11px; color: #047857; margin-top: 1px;">
                            Chest #${activeCandidate.chestNo || activeCandidate.adNo} &bull; <strong>${activeCandidate.category}</strong>
                          </div>
                        </div>
                      </div>
                      <button type="button" id="btnReopenPicker" class="btn btn-sm btn-outline" style="border-color: #86efac; color: #047857; font-size: 11px; font-weight: 700; border-radius: 8px;">
                        Change
                      </button>
                    </div>
                  ` : `
                    <!-- Searchable Candidate Selection Panel -->
                    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 12px;">
                      <!-- Realtime Search Input -->
                      <div style="position: relative; margin-bottom: 10px;">
                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex;">
                          ${getIcon('search')}
                        </span>
                        <input 
                          type="text" 
                          id="inputSearchMentee" 
                          placeholder="Search mentee by name, chest #, or category..." 
                          value="${candidateSearchQuery}" 
                          style="width: 100%; height: 38px; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 0 10px 0 34px; font-size: 12.5px; font-family: inherit; background: #ffffff; box-sizing: border-box;"
                        />
                        ${candidateSearchQuery ? `
                          <button type="button" id="btnClearMenteeSearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;">
                            ✕
                          </button>
                        ` : ''}
                      </div>

                      <!-- Candidate Selection Cards List -->
                      <div class="candidate-select-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; max-height: 230px; overflow-y: auto; padding-right: 4px;">
                        ${filteredMentees.length === 0 ? `
                          <div style="grid-column: 1 / -1; text-align: center; padding: 16px; color: #64748b; font-size: 12px;">
                            No assigned mentees match "${candidateSearchQuery}".
                          </div>
                        ` : filteredMentees.map(m => {
                          const isSelected = m.id === selectedCandidateId;
                          return `
                            <div 
                              class="mentee-select-card" 
                              data-candidate-id="${m.id}" 
                              style="
                                display: flex; 
                                align-items: center; 
                                gap: 10px; 
                                padding: 8px 10px; 
                                border-radius: 10px; 
                                border: 1.5px solid ${isSelected ? '#10b981' : '#e2e8f0'}; 
                                background: ${isSelected ? '#ecfdf5' : '#ffffff'}; 
                                cursor: pointer; 
                                transition: all 0.15s ease;
                              "
                            >
                              <div style="width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; color: #ffffff; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                                ${m.photo ? `<img src="${m.photo}" alt="${m.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : m.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12.5px; font-weight: 800; color: ${isSelected ? '#065f46' : '#1e293b'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                  ${m.name}
                                </div>
                                <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px;">
                                  <span>#${m.chestNo || m.adNo}</span>
                                  <span>&bull;</span>
                                  <span style="font-weight: 700; color: #4338ca;">${m.category}</span>
                                </div>
                              </div>
                              ${isSelected ? `<span style="color: #10b981; font-weight: 800; font-size: 13px;">✓</span>` : ''}
                            </div>
                          `;
                        }).join('')}
                      </div>

                      ${!selectedCandidateId ? `
                        <div style="margin-top: 8px; font-size: 11px; color: #ef4444; font-weight: 600; text-align: center;">
                          👆 Tap any candidate above to select
                        </div>
                      ` : ''}
                    </div>
                  `}
                </div>

                <!-- STEP 2: CHOOSE ESCALATION REASON -->
                <div class="appeal-form-section">
                  <label style="display: block; font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em;">
                    2. Choose Escalation Reason <span style="color: #ef4444;">*</span>
                  </label>
                  <div class="reasons-pills-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px;">
                    ${PREPARED_REASONS.map(r => {
                      const isSelected = selectedReason.id === r.id;
                      return `
                        <button type="button" class="btn-reason-pill" data-reason-id="${r.id}" style="
                          text-align: left;
                          padding: 9px 12px;
                          border-radius: 10px;
                          border: 1.5px solid ${isSelected ? '#ef4444' : '#e2e8f0'};
                          background: ${isSelected ? '#fef2f2' : '#ffffff'};
                          color: ${isSelected ? '#991b1b' : '#334155'};
                          font-weight: ${isSelected ? '800' : '600'};
                          font-size: 12px;
                          display: flex;
                          align-items: center;
                          gap: 8px;
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

                <!-- STEP 3: SITUATION DETAILS & SPECIFIC NOTES -->
                <div class="appeal-form-section">
                  <label style="display: block; font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
                    3. Details & Specific Notes <span style="color: #ef4444;">*</span>
                  </label>
                  <textarea id="txtAppealDescription" class="form-input" rows="3" style="width: 100%; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 8px 12px; font-size: 12.5px; font-family: inherit; line-height: 1.45; resize: vertical; box-sizing: border-box;" placeholder="Type detailed circumstances (e.g. absent 3 days consecutively, assignment pending since Monday)...">${customDescription}</textarea>
                  <div class="appeals-extra-desc" style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Provide dates or specific occurrences to assist the Controller in taking prompt action.
                  </div>
                </div>

                <!-- FORM SUBMIT ACTION BUTTONS -->
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                  <button type="button" id="btnCancelFormBottom" class="btn btn-outline" style="font-weight: 700; font-size: 12px; border-color: #cbd5e1; color: #475569; border-radius: 8px; padding: 8px 14px;">
                    Cancel
                  </button>
                  <button type="submit" id="btnSubmitAppealForm" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; font-weight: 800; font-size: 13px; padding: 8px 18px; border-radius: 8px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); display: flex; align-items: center; gap: 6px;">
                    ${getIcon('send')}
                    <span>Dispatch Appeal</span>
                  </button>
                </div>
              </form>
            `}
          </div>
        </div>

        <!-- 3. SUBMITTED APPEALS STATUS & SEARCH/FILTER IN A ROW -->
        <div class="appeals-list-section">
          
          <!-- SEARCH & FILTER ROW (Combined in a single compact row for phone view) -->
          <div class="appeals-filter-bar-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            
            <!-- Quick Search Input -->
            <div class="appeals-search-wrap" style="position: relative; flex: 1; min-width: 160px;">
              <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex;">
                ${getIcon('search')}
              </span>
              <input 
                type="text" 
                id="inputTrainerAppealSearch" 
                placeholder="Search appeals..." 
                value="${appealsSearchQuery}" 
                style="width: 100%; height: 36px; border-radius: 999px; border: 1.5px solid #cbd5e1; padding: 0 10px 0 32px; font-size: 12px; font-family: inherit; background: #ffffff; box-sizing: border-box;"
              />
              ${appealsSearchQuery ? `
                <button type="button" id="btnClearTrainerSearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;">
                  ✕
                </button>
              ` : ''}
            </div>

            <!-- Filter Status Pills In-Row -->
            <div class="appeals-status-pills-row" style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
              <button type="button" class="btn-filter-pill ${filterStatus === 'ALL' ? 'active' : ''}" data-filter="ALL" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'ALL' ? '#4f46e5' : '#e2e8f0'}; background: ${filterStatus === 'ALL' ? '#eef2ff' : '#ffffff'}; color: ${filterStatus === 'ALL' ? '#4f46e5' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                All (${trainerAppeals.length})
              </button>
              <button type="button" class="btn-filter-pill ${filterStatus === 'pending' ? 'active' : ''}" data-filter="pending" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'pending' ? '#f59e0b' : '#e2e8f0'}; background: ${filterStatus === 'pending' ? '#fef3c7' : '#ffffff'}; color: ${filterStatus === 'pending' ? '#92400e' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                Pending (${pendingCount})
              </button>
              <button type="button" class="btn-filter-pill ${filterStatus === 'resolved' ? 'active' : ''}" data-filter="resolved" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'resolved' ? '#10b981' : '#e2e8f0'}; background: ${filterStatus === 'resolved' ? '#ecfdf5' : '#ffffff'}; color: ${filterStatus === 'resolved' ? '#047857' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                Resolved (${resolvedCount})
              </button>
            </div>

          </div>

          <!-- Appeals List Feed -->
          ${filteredAppeals.length === 0 ? `
            <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 28px 14px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 6px;">📋</div>
              <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">No Appeals Found</h4>
              <p style="margin: 3px 0 12px 0; font-size: 12px; color: #64748b;">
                ${appealsSearchQuery ? 'No appeals match your search.' : (filterStatus === 'ALL' ? 'You have not submitted any appeals yet.' : 'No appeals in this filter category.')}
              </p>
              ${!isFormOpen && assignedMentees.length > 0 ? `
                <button type="button" id="btnEmptyStateNewAppeal" class="btn btn-sm btn-primary" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; font-weight: 800; border-radius: 8px; padding: 6px 14px; font-size: 12px;">
                  + File First Appeal
                </button>
              ` : ''}
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${filteredAppeals.map(a => {
                const cand = state.getCandidateById(a.candidateId);
                const hasControllerResponse = Boolean(a.controllerNotes && a.controllerNotes.trim());

                return `
                  <div class="appeal-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03); transition: transform 0.15s ease, box-shadow 0.15s ease;">
                    
                    <!-- Top Info Row: Candidate & Status -->
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: #4f46e5; color: #ffffff; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                          ${cand && cand.photo ? `<img src="${cand.photo}" alt="${a.candidateName}" style="width: 100%; height: 100%; object-fit: cover;" />` : a.candidateName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style="font-size: 14px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>${a.candidateName}</span>
                            <span style="font-size: 10px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px;">
                              #${a.candidateChestNo}
                            </span>
                            <span style="font-size: 10.5px; font-weight: 700; color: #64748b;">
                              ${a.candidateCategory}
                            </span>
                          </div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
                            ${formatRelativeTime(a.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        ${getStatusBadge(a.status)}
                        ${a.status === 'pending' ? `
                          <button type="button" class="btn-delete-appeal" data-appeal-id="${a.id}" style="background: none; border: 1px solid #fee2e2; color: #ef4444; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; cursor: pointer;" title="Withdraw this appeal">
                            Withdraw
                          </button>
                        ` : ''}
                      </div>
                    </div>

                    <!-- Reason Heading -->
                    <div style="font-size: 12.5px; font-weight: 800; color: #b91c1c; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                      ${getIcon('alertTriangle')}
                      <span>${a.reasonCategory}</span>
                    </div>

                    <!-- Description Quote -->
                    <div style="background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 0 8px 8px 0; padding: 8px 12px; font-size: 12px; color: #334155; line-height: 1.45;">
                      ${a.description ? a.description : '<em>No additional details provided.</em>'}
                    </div>

                    <!-- Controller Response Section (If Available) -->
                    ${hasControllerResponse ? `
                      <div style="margin-top: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                          <div style="display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; color: #065f46;">
                            <span>✓ Controller Resolution:</span>
                          </div>
                          ${a.resolvedAt ? `
                            <span style="font-size: 10.5px; color: #047857;">
                              ${formatRelativeTime(a.resolvedAt)}
                            </span>
                          ` : ''}
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #064e3b; line-height: 1.4;">
                          ${a.controllerNotes}
                        </div>
                      </div>
                    ` : a.status === 'in-review' ? `
                      <div style="margin-top: 8px; font-size: 11px; color: #1e40af; background: #eff6ff; border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 5px;">
                        ${getIcon('clock')}
                        <span>Controller is currently reviewing this appeal.</span>
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
        if (isFormOpen && !selectedCandidateId) {
          isCandidatePickerOpen = true;
        }
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
        isCandidatePickerOpen = true;
        render();
        const formCard = container.querySelector('#appealFormContainer');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    }

    // 2. Candidate Selection Events
    const inputSearchMentee = container.querySelector('#inputSearchMentee');
    if (inputSearchMentee) {
      inputSearchMentee.oninput = (e) => {
        candidateSearchQuery = e.target.value;
        renderCandidateCardsOnly();
      };
    }

    const btnClearMenteeSearch = container.querySelector('#btnClearMenteeSearch');
    if (btnClearMenteeSearch) {
      btnClearMenteeSearch.onclick = () => {
        candidateSearchQuery = '';
        renderCandidateCardsOnly();
      };
    }

    // Attach click to mentee select cards
    function attachMenteeCardClicks() {
      container.querySelectorAll('.mentee-select-card').forEach(card => {
        card.onclick = () => {
          const cId = card.getAttribute('data-candidate-id');
          if (cId) {
            selectedCandidateId = cId;
            isCandidatePickerOpen = false;
            candidateSearchQuery = '';
            render();
          }
        };
      });
    }
    attachMenteeCardClicks();

    // Partial re-render for candidate cards during search so input focus isn't lost
    function renderCandidateCardsOnly() {
      const grid = container.querySelector('.candidate-select-cards-grid');
      if (!grid) {
        render();
        return;
      }
      const filtered = assignedMentees.filter(m => {
        if (!candidateSearchQuery) return true;
        const q = candidateSearchQuery.toLowerCase().trim();
        const name = (m.name || '').toLowerCase();
        const chest = (m.chestNo || m.adNo || '').toLowerCase();
        const cat = (m.category || '').toLowerCase();
        return name.includes(q) || chest.includes(q) || cat.includes(q);
      });

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 16px; color: #64748b; font-size: 12px;">
            No assigned mentees match "${candidateSearchQuery}".
          </div>
        `;
      } else {
        grid.innerHTML = filtered.map(m => {
          const isSelected = m.id === selectedCandidateId;
          return `
            <div 
              class="mentee-select-card" 
              data-candidate-id="${m.id}" 
              style="
                display: flex; 
                align-items: center; 
                gap: 10px; 
                padding: 8px 10px; 
                border-radius: 10px; 
                border: 1.5px solid ${isSelected ? '#10b981' : '#e2e8f0'}; 
                background: ${isSelected ? '#ecfdf5' : '#ffffff'}; 
                cursor: pointer; 
                transition: all 0.15s ease;
              "
            >
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #4f46e5; color: #ffffff; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                ${m.photo ? `<img src="${m.photo}" alt="${m.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : m.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12.5px; font-weight: 800; color: ${isSelected ? '#065f46' : '#1e293b'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${m.name}
                </div>
                <div style="font-size: 10.5px; color: #64748b; display: flex; align-items: center; gap: 4px;">
                  <span>#${m.chestNo || m.adNo}</span>
                  <span>&bull;</span>
                  <span style="font-weight: 700; color: #4338ca;">${m.category}</span>
                </div>
              </div>
              ${isSelected ? `<span style="color: #10b981; font-weight: 800; font-size: 13px;">✓</span>` : ''}
            </div>
          `;
        }).join('');
        attachMenteeCardClicks();
      }
    }

    const btnChangeMentee = container.querySelector('#btnChangeMenteePicker');
    if (btnChangeMentee) {
      btnChangeMentee.onclick = () => {
        isCandidatePickerOpen = true;
        render();
      };
    }

    const btnReopen = container.querySelector('#btnReopenPicker');
    if (btnReopen) {
      btnReopen.onclick = () => {
        isCandidatePickerOpen = true;
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

    // 4. Description textarea
    const txtDesc = container.querySelector('#txtAppealDescription');
    if (txtDesc) {
      txtDesc.oninput = (e) => {
        customDescription = e.target.value;
      };
    }

    // 5. Submit Appeal Form
    const form = container.querySelector('#formSubmitAppeal');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();

        if (!selectedCandidateId) {
          toast.error('Please tap and select an assigned mentee to appeal.');
          isCandidatePickerOpen = true;
          render();
          return;
        }

        const candidate = assignedMentees.find(m => m.id === selectedCandidateId);
        if (!candidate) {
          toast.error('Selected candidate was not found in your assigned mentees.');
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
            urgency: 'normal'
          });

          toast.success(`Appeal for ${candidate.name} submitted to Controller successfully!`);
          isFormOpen = false;
          selectedCandidateId = '';
          isCandidatePickerOpen = true;
          customDescription = PREPARED_REASONS[0].defaultText;
          selectedReason = PREPARED_REASONS[0];
          render();
        } catch (err) {
          console.error('Error submitting appeal:', err);
          toast.error('Failed to submit appeal. Please try again.');
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `${getIcon('send')} <span>Dispatch Appeal</span>`;
          }
        }
      };
    }

    // 6. Appeals List Search Input
    const inputAppealsSearch = container.querySelector('#inputTrainerAppealSearch');
    if (inputAppealsSearch) {
      inputAppealsSearch.oninput = (e) => {
        appealsSearchQuery = e.target.value;
        render();
      };
    }

    const btnClearSearch = container.querySelector('#btnClearTrainerSearch');
    if (btnClearSearch) {
      btnClearSearch.onclick = () => {
        appealsSearchQuery = '';
        render();
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
