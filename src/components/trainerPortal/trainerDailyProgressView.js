import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openRecordMeetModal } from '../modals/recordMeetModal.js';
import { openCandidateProfileModal } from '../modals/candidateProfileModal.js';

export function renderTrainerDailyProgressView(container, navigateTo) {
  const currentTrainer = state.getActiveTrainer();

  if (!currentTrainer) {
    container.innerHTML = `
      <div class="empty-state-card" style="text-align: center; padding: 48px 16px;">
        <div class="empty-icon" style="font-size: 36px; margin-bottom: 12px;">🔒</div>
        <h2>Trainer Session Required</h2>
        <p class="text-muted text-sm">Please log in to your trainer account to access the Trainer Portal.</p>
      </div>
    `;
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let selectedDate = todayStr;
  let activeStatusFilter = 'ALL';
  let activeProgramFilter = 'ALL';
  let searchQuery = '';
  const expandedRows = new Set();

  const assignedPrograms = state.getTrainerPrograms(currentTrainer.id);

  const render = () => {
    const rawRoster = state.getTrainerDetailedRoster(currentTrainer.id);
    const dailyMeets = state.getDailyMeets(selectedDate).filter(
      m => String(m.trainerId || '').trim() === currentTrainer.id
    );

    const isToday = selectedDate === todayStr;
    const isPast = selectedDate < todayStr;

    // Build item for each candidate-program pairing under this trainer
    const rosterItems = [];
    rawRoster.forEach(candEntry => {
      const c = candEntry.candidate;
      candEntry.programs.forEach(prog => {
        const meetsForThisProgToday = dailyMeets.filter(
          m => m.candidateId === c.id && m.programId === prog.id
        );

        const isMet = meetsForThisProgToday.length > 0;
        const isMissed = !isMet && isPast;
        const isPending = !isMet && isToday;

        rosterItems.push({
          candidate: c,
          program: prog,
          meetsToday: meetsForThisProgToday,
          latestMeetToday: meetsForThisProgToday[meetsForThisProgToday.length - 1] || null,
          allTrainerMeets: candEntry.meets.filter(m => m.programId === prog.id),
          isMet,
          isMissed,
          isPending
        });
      });
    });

    const filteredItems = rosterItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const c = item.candidate;
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        String(c.adNo || '').toLowerCase().includes(q) ||
        String(c.class || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeProgramFilter !== 'ALL' && item.program.id !== activeProgramFilter) {
        return false;
      }

      if (activeStatusFilter === 'MET' && !item.isMet) return false;
      if (activeStatusFilter === 'PENDING' && !item.isPending) return false;
      if (activeStatusFilter === 'MISSED' && !item.isMissed) return false;

      return true;
    });

    const metCount = rosterItems.filter(i => i.isMet).length;
    const pendingCount = rosterItems.filter(i => i.isPending).length;
    const missedCount = rosterItems.filter(i => i.isMissed).length;

    container.innerHTML = `
      <div class="trainer-daily-progress-container">
        <!-- 1. VIEW HEADER -->
        <div class="saas-view-header" style="margin-bottom: 14px;">
          <div class="svh-title-block">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-primary-subtle" style="font-size: 11px;">Faculty Session Tracker</span>
              <span class="text-xs text-muted">• Logged in as <strong>${currentTrainer.name}</strong></span>
            </div>
            <h1 class="svh-title" style="margin-top: 4px;">My Daily Progress & Meetings</h1>
            <p class="svh-desc">
              Record and track candidate meetings strictly for your assigned programs.
            </p>
          </div>

          <div class="saas-header-actions">
            <button type="button" id="btnBackToTrainerDash" class="btn btn-outline btn-sm" style="border-radius: 10px; font-weight: 700;">
              &larr; Back to Dashboard
            </button>
          </div>
        </div>

        <!-- 2. DATE & SUMMARY BAR -->
        <div class="tdp-summary-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); margin-bottom: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <!-- Date Segmented Control -->
            <div class="saas-date-segmented" style="display: flex; gap: 6px; align-items: center;">
              <button type="button" class="saas-date-btn ${selectedDate === todayStr ? 'active' : ''}" id="btnDateToday" style="padding: 7px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 700; border: 1px solid #cbd5e1; background: ${selectedDate === todayStr ? '#4f46e5' : '#ffffff'}; color: ${selectedDate === todayStr ? '#ffffff' : '#334155'}; cursor: pointer;">
                Today
              </button>
              <button type="button" class="saas-date-btn ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'active' : ''}" id="btnDateYesterday" style="padding: 7px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 700; border: 1px solid #cbd5e1; background: ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? '#4f46e5' : '#ffffff'}; color: ${selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? '#ffffff' : '#334155'}; cursor: pointer;">
                Yesterday
              </button>
              <input 
                type="date" 
                id="inpProgressDate" 
                class="saas-date-input" 
                value="${selectedDate}"
                style="height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 12.5px; font-weight: 600;"
              />
            </div>

            <!-- Stats Counts -->
            <div style="display: flex; align-items: center; gap: 12px; font-size: 12.5px;">
              <span style="color: #10b981; font-weight: 700;">🟢 Met: ${metCount}</span>
              <span style="color: #f59e0b; font-weight: 700;">🟡 Pending: ${pendingCount}</span>
              ${missedCount > 0 ? `<span style="color: #ef4444; font-weight: 700;">🔴 Missed: ${missedCount}</span>` : ''}
              <span class="text-muted font-bold">Total: ${rosterItems.length}</span>
            </div>
          </div>
        </div>

        <!-- 3. SEARCH & FILTER STRIP -->
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;">
          <div class="sfe-search-box" style="flex: 1; min-width: 200px; height: 38px;">
            <span class="sfe-search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="txtProgressSearch" 
              class="sfe-search-input" 
              placeholder="Search candidate by name, ad no..." 
              value="${searchQuery}"
            />
          </div>

          ${assignedPrograms.length > 1 ? `
            <select id="selProgFilter" class="form-select" style="height: 38px; font-size: 12.5px; width: auto; min-width: 150px;">
              <option value="ALL">All My Programs</option>
              ${assignedPrograms.map(p => `
                <option value="${p.id}" ${activeProgramFilter === p.id ? 'selected' : ''}>${p.code} • ${p.name}</option>
              `).join('')}
            </select>
          ` : ''}

          <select id="selStatusFilter" class="form-select" style="height: 38px; font-size: 12.5px; width: auto; min-width: 130px;">
            <option value="ALL" ${activeStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="MET" ${activeStatusFilter === 'MET' ? 'selected' : ''}>Met</option>
            <option value="PENDING" ${activeStatusFilter === 'PENDING' ? 'selected' : ''}>Pending</option>
            <option value="MISSED" ${activeStatusFilter === 'MISSED' ? 'selected' : ''}>Missed</option>
          </select>
        </div>

        <!-- 4. CANDIDATES ROSTER LIST (DESKTOP & MOBILE 360px OPTIMIZED) -->
        <div class="trainer-roster-list" style="display: flex; flex-direction: column; gap: 10px;">
          ${filteredItems.length === 0 ? `
            <div class="empty-state-card" style="text-align: center; padding: 40px 16px; border: 1px dashed #cbd5e1; border-radius: 14px; background: #ffffff;">
              <div class="empty-icon" style="font-size: 28px; margin-bottom: 8px;">📋</div>
              <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">No candidate records found</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Adjust search or date filter to view roster.</p>
            </div>
          ` : filteredItems.map(item => {
            const c = item.candidate;
            const p = item.program;
            const meets = item.meetsToday;
            const latest = item.latestMeetToday;
            const rowKey = `${c.id}_${p.id}`;
            const isExpanded = expandedRows.has(rowKey);

            let statusCapsuleHtml = '';
            if (item.isMet) {
              const pStatus = getProgressStatus(latest.percentage);
              statusCapsuleHtml = `
                <div class="saas-status-capsule saas-status-met">
                  <span class="saas-dot dot-emerald"></span>
                  <span class="saas-meet-pill">Meet #${meets.length}</span>
                  <span class="saas-score-num"><strong>${latest.percentage}%</strong></span>
                  <span class="saas-score-label">${pStatus.label}</span>
                </div>
              `;
            } else if (item.isMissed) {
              statusCapsuleHtml = `
                <div class="saas-status-capsule saas-status-missed">
                  <span class="saas-dot dot-danger"></span>
                  <span class="saas-score-label">Missed</span>
                  <span class="text-muted text-xs desktop-only-btn">(Cutoff)</span>
                </div>
              `;
            } else {
              statusCapsuleHtml = `
                <div class="saas-status-capsule saas-status-pending">
                  <span class="saas-dot dot-amber"></span>
                  <span class="saas-score-label">Pending</span>
                  <span class="text-muted text-xs desktop-only-btn">(Due today)</span>
                </div>
              `;
            }

            return `
              <div class="saas-candidate-row ${isExpanded ? 'row-expanded' : ''} ${item.isMissed ? 'row-missed' : (item.isMet ? 'row-met' : 'row-pending')}" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div class="saas-row-master">
                  <!-- Col 1: Student Identity -->
                  <div class="src-col src-student">
                    <div class="saas-avatar-soft" style="width: 42px; height: 42px; font-size: 14px; flex-shrink: 0;">
                      ${c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div class="src-student-info">
                      <strong class="saas-student-name btn-open-cand-profile" data-cid="${c.id}" style="cursor: pointer;">
                        ${c.name}
                      </strong>
                      <div class="saas-meta-strip">
                        <span class="saas-code-badge">${c.adNo}</span>
                        <span class="saas-bullet">•</span>
                        <span class="saas-meta-txt">${c.class || 'No Class'}</span>
                        <span class="saas-bullet desktop-only-btn">•</span>
                        <span class="saas-meta-txt desktop-only-btn">${c.category}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Col 2: Program -->
                  <div class="src-col src-program">
                    <div class="src-prog-top">
                      <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
                        ${p.code}
                      </span>
                      <span class="saas-prog-name truncate" title="${p.name}">
                        ${p.name}
                      </span>
                    </div>
                    <div class="src-prog-bottom">
                      <span class="saas-mentor-pill">
                        <span class="saas-dot" style="background: ${currentTrainer.color || '#6366f1'};"></span>
                        <span class="saas-mentor-name">${currentTrainer.name} (You)</span>
                      </span>
                    </div>
                  </div>

                  <!-- Col 3: Status -->
                  <div class="src-col src-status">
                    ${statusCapsuleHtml}
                  </div>

                  <!-- Col 4: Action & Reports Toggle -->
                  <div class="src-col src-action">
                    <button type="button" class="saas-action-btn ${item.isMet ? 'saas-btn-accent' : 'saas-btn-primary'} btn-record-meet" data-cid="${c.id}" data-pid="${p.id}">
                      ${getIcon('plus')} ${item.isMet ? `Meet #${meets.length + 1}` : 'Meet #1'}
                    </button>

                    <button type="button" class="saas-report-toggle-pill btn-toggle-row-drawer ${isExpanded ? 'active' : ''}" data-key="${rowKey}">
                      <span>${isExpanded ? 'Hide' : `Reports (${item.allTrainerMeets.length})`}</span>
                      <span class="saas-chevron ${isExpanded ? 'open' : ''}">▼</span>
                    </button>
                  </div>
                </div>

                <!-- Expandable Drawer for Meeting Sessions -->
                ${isExpanded ? `
                  <div class="saas-row-drawer" style="margin-top: 12px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                    <div class="drawer-compact-tray" style="padding: 0; background: transparent; display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 700; color: #475569;">
                          Meeting History for [${p.code}] ${p.name} (${item.allTrainerMeets.length} total sessions)
                        </span>
                        <button type="button" class="btn-compact-add btn-record-meet" data-cid="${c.id}" data-pid="${p.id}" style="padding: 5px 12px; font-size: 11.5px;">
                          ${getIcon('plus')} Record New Meet
                        </button>
                      </div>

                      ${item.allTrainerMeets.length === 0 ? `
                        <div class="compact-empty-strip" style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 12px; text-align: center;">
                          <span class="ces-text">
                            ⏳ No sessions recorded yet for <strong>${c.name}</strong> under <strong>${p.name}</strong>.
                          </span>
                          <button type="button" class="btn-compact-add btn-record-meet" data-cid="${c.id}" data-pid="${p.id}" style="margin-top: 8px;">
                            ${getIcon('plus')} Record First Meeting
                          </button>
                        </div>
                      ` : `
                        <div class="compact-sessions-scroll" style="display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto;">
                          ${item.allTrainerMeets.map((m, idx) => {
                            const mStatus = getProgressStatus(m.percentage);
                            return `
                              <div class="compact-session-strip status-border-${mStatus.key}" style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid ${mStatus.color}; border-radius: 8px; padding: 8px 12px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                  <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-weight: 800; font-size: 11px; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">
                                      Meet #${idx + 1}
                                    </span>
                                    <span class="text-xs text-muted font-mono">${m.date} ${m.time || ''}</span>
                                  </div>
                                  <span class="badge ${mStatus.badgeClass}" style="font-size: 11px;">
                                    <strong>${m.percentage}%</strong> ${m.status}
                                  </span>
                                </div>
                                ${m.remark ? `
                                  <div style="font-size: 11.5px; font-style: italic; color: #334155; margin-top: 4px;">
                                    "${m.remark}"
                                  </div>
                                ` : ''}
                              </div>
                            `;
                          }).join('')}
                        </div>
                      `}
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Hook events
    const btnBack = container.querySelector('#btnBackToTrainerDash');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        navigateTo('trainer-dashboard');
      });
    }

    const inpDate = container.querySelector('#inpProgressDate');
    if (inpDate) {
      inpDate.addEventListener('change', e => {
        selectedDate = e.target.value;
        render();
      });
    }

    const btnToday = container.querySelector('#btnDateToday');
    if (btnToday) {
      btnToday.addEventListener('click', () => {
        selectedDate = todayStr;
        render();
      });
    }

    const btnYesterday = container.querySelector('#btnDateYesterday');
    if (btnYesterday) {
      btnYesterday.addEventListener('click', () => {
        const d = new Date(Date.now() - 86400000);
        selectedDate = d.toISOString().split('T')[0];
        render();
      });
    }

    const txtSearch = container.querySelector('#txtProgressSearch');
    if (txtSearch) {
      txtSearch.addEventListener('input', e => {
        searchQuery = e.target.value;
        render();
      });
    }

    const selProg = container.querySelector('#selProgFilter');
    if (selProg) {
      selProg.addEventListener('change', e => {
        activeProgramFilter = e.target.value;
        render();
      });
    }

    const selStatus = container.querySelector('#selStatusFilter');
    if (selStatus) {
      selStatus.addEventListener('change', e => {
        activeStatusFilter = e.target.value;
        render();
      });
    }

    // Toggle drawer
    container.querySelectorAll('.btn-toggle-row-drawer').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (expandedRows.has(key)) {
          expandedRows.delete(key);
        } else {
          expandedRows.add(key);
        }
        render();
      });
    });

    // Record meet
    container.querySelectorAll('.btn-record-meet').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid');
        const pid = btn.getAttribute('data-pid');
        openRecordMeetModal({
          candidateId: cid,
          programId: pid,
          trainerId: currentTrainer.id,
          dateStr: selectedDate,
          onSave: render
        });
      });
    });

    // Candidate profile modal
    container.querySelectorAll('.btn-open-cand-profile').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid');
        if (cid) {
          openCandidateProfileModal({
            candidateId: cid,
            onUpdate: render
          });
        }
      });
    });
  };

  render();
}
