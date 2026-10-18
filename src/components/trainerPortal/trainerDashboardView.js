import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openRecordMeetModal } from '../modals/recordMeetModal.js';
import { openCandidateProfileModal } from '../modals/candidateProfileModal.js';

export function renderTrainerDashboardView(container, navigateTo) {
  const currentTrainer = state.getActiveTrainer();

  if (!currentTrainer) {
    container.innerHTML = `
      <div class="empty-state-card" style="text-align: center; padding: 48px 16px;">
        <div class="empty-icon" style="font-size: 36px; margin-bottom: 12px;">🔒</div>
        <h2>Trainer Session Required</h2>
        <p class="text-muted text-sm">Please log in to your trainer account to access the Trainer Portal.</p>
        <button id="btnGoToLogin" class="btn btn-primary" style="margin-top: 16px;">
          Go to Trainer Login
        </button>
      </div>
    `;
    const btn = container.querySelector('#btnGoToLogin');
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof window.openTrainerLogin === 'function') {
          window.openTrainerLogin();
        }
      });
    }
    return;
  }

  const assignedPrograms = state.getTrainerPrograms(currentTrainer.id);
  const trainerReadiness = state.getTrainerReadiness(currentTrainer.id);
  const readinessStatus = trainerReadiness.hasData
    ? getProgressStatus(trainerReadiness.percentage)
    : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

  let activeProgramFilter = 'ALL';
  let activeStatusFilter = 'ALL';
  let searchQuery = '';

  const render = () => {
    const rawRoster = state.getTrainerDetailedRoster(currentTrainer.id);

    const filteredRoster = rawRoster.filter(item => {
      const c = item.candidate;
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        String(c.adNo || '').toLowerCase().includes(q) ||
        String(c.class || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeProgramFilter !== 'ALL') {
        const hasProg = item.programs.some(p => p.id === activeProgramFilter);
        if (!hasProg) return false;
      }

      if (activeStatusFilter !== 'ALL') {
        if (activeStatusFilter === 'evaluated' && !item.hasEvaluation) return false;
        if (activeStatusFilter === 'not-evaluated' && item.hasEvaluation) return false;
        if (activeStatusFilter !== 'evaluated' && activeStatusFilter !== 'not-evaluated') {
          if (item.readinessStatus?.key !== activeStatusFilter) return false;
        }
      }

      return true;
    });

    container.innerHTML = `
      <div class="trainer-portal-container">
        <!-- 1. TRAINER IDENTITY & PROFILE HERO BANNER -->
        <div class="trainer-hero-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 16px;">
          <div class="thc-top-row" style="display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
            <div class="thc-identity" style="display: flex; align-items: center; gap: 14px;">
              <div class="thc-avatar" style="width: 52px; height: 52px; border-radius: 50%; background: ${currentTrainer.color || '#6366f1'}; color: #ffffff; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.12); flex-shrink: 0;">
                ${currentTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div class="thc-info">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0;">${currentTrainer.name}</h1>
                  <span class="saas-tag-pill p-stage">${currentTrainer.expertise}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: #64748b; margin-top: 4px; flex-wrap: wrap;">
                  <span>Username: <strong>@${currentTrainer.username || currentTrainer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}</strong></span>
                  ${currentTrainer.phone ? `<span>• Tel: <strong>${currentTrainer.phone}</strong></span>` : ''}
                  <span>• Status: <strong style="color: #10b981;">Active Faculty</strong></span>
                </div>
              </div>
            </div>

            <div class="thc-actions" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="btnGoToTrainerProgress" class="btn btn-primary btn-sm" style="height: 38px; border-radius: 10px; font-weight: 700;">
                ${getIcon('calendar')} Daily Progress Tracker &rarr;
              </button>
            </div>
          </div>
        </div>

        <!-- 2. QUICK STATS ROW -->
        <div class="trainer-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <!-- Card 1: Assigned Programs -->
          <div class="t-stat-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Assigned Programs</span>
              <span style="color: #6366f1;">${getIcon('programs')}</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${assignedPrograms.length}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
              ${assignedPrograms.length > 0 ? assignedPrograms.map(p => p.code).slice(0, 3).join(', ') + (assignedPrograms.length > 3 ? '...' : '') : 'None assigned'}
            </div>
          </div>

          <!-- Card 2: Candidates / Mentees -->
          <div class="t-stat-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Mentees</span>
              <span style="color: #06b6d4;">${getIcon('candidates')}</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${rawRoster.length}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">Candidates under your coaching</div>
          </div>

          <!-- Card 3: Overall Readiness -->
          <div class="t-stat-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Overall Readiness</span>
              <span class="badge ${readinessStatus.badgeClass}" style="font-size: 10px;">${readinessStatus.label}</span>
            </div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 24px; font-weight: 800; color: ${trainerReadiness.hasData ? readinessStatus.color : '#0f172a'};">
                ${trainerReadiness.hasData ? `${trainerReadiness.percentage}%` : '0%'}
              </span>
              <span style="font-size: 11.5px; color: #64748b;">(${trainerReadiness.evaluatedCount}/${rawRoster.length} evaluated)</span>
            </div>
            <div style="width: 100%; height: 5px; background: #f1f5f9; border-radius: 99px; margin-top: 8px; overflow: hidden;">
              <div style="height: 100%; width: ${trainerReadiness.hasData ? trainerReadiness.percentage : 0}%; background: ${readinessStatus.color}; border-radius: 99px;"></div>
            </div>
          </div>

          <!-- Card 4: Meets Recorded Today -->
          <div class="t-stat-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Today's Check-ins</span>
              <span style="color: #10b981;">${getIcon('check')}</span>
            </div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a;">
              ${state.getDailyMeets(new Date().toISOString().split('T')[0]).filter(m => String(m.trainerId || '').trim() === currentTrainer.id).length}
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">Sessions logged today</div>
          </div>
        </div>

        <!-- 3. MAIN BODY: ASSIGNED CANDIDATES ROSTER -->
        <div class="trainer-roster-box" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div class="trb-header" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">Assigned Candidates & Readiness</h2>
                <span class="saas-badge-pill">${filteredRoster.length}</span>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">
                All candidates enrolled in programs assigned to you, along with their programs and readiness status.
              </p>
            </div>
          </div>

          <!-- Filter & Search Strip -->
          <div class="trb-filter-strip" style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
            <!-- Search -->
            <div class="sfe-search-box" style="flex: 1; min-width: 220px; height: 38px;">
              <span class="sfe-search-icon">${getIcon('search')}</span>
              <input 
                type="text" 
                id="txtRosterSearch" 
                class="sfe-search-input" 
                placeholder="Search candidate by name, admission no, or class..." 
                value="${searchQuery}"
              />
            </div>

            <!-- Program Filter Dropdown -->
            ${assignedPrograms.length > 1 ? `
              <select id="selRosterProgram" class="form-select" style="height: 38px; font-size: 12.5px; width: auto; min-width: 160px;">
                <option value="ALL">All Assigned Programs</option>
                ${assignedPrograms.map(p => `
                  <option value="${p.id}" ${activeProgramFilter === p.id ? 'selected' : ''}>[${p.code}] ${p.name}</option>
                `).join('')}
              </select>
            ` : ''}

            <!-- Readiness Status Filter -->
            <select id="selRosterStatus" class="form-select" style="height: 38px; font-size: 12.5px; width: auto; min-width: 160px;">
              <option value="ALL" ${activeStatusFilter === 'ALL' ? 'selected' : ''}>All Readiness Levels</option>
              <option value="event-ready" ${activeStatusFilter === 'event-ready' ? 'selected' : ''}>🟢 Event Ready (90-100%)</option>
              <option value="proficient" ${activeStatusFilter === 'proficient' ? 'selected' : ''}>🔵 Proficient (75-89%)</option>
              <option value="progressing" ${activeStatusFilter === 'progressing' ? 'selected' : ''}>🔷 Progressing (60-74%)</option>
              <option value="need-improvement" ${activeStatusFilter === 'need-improvement' ? 'selected' : ''}>🟡 Need Improvement (40-59%)</option>
              <option value="need-focus" ${activeStatusFilter === 'need-focus' ? 'selected' : ''}>🔴 Need Focus (0-39%)</option>
              <option value="not-evaluated" ${activeStatusFilter === 'not-evaluated' ? 'selected' : ''}>⚪ Not Evaluated Yet</option>
            </select>
          </div>

          <!-- Empty State -->
          ${filteredRoster.length === 0 ? `
            <div class="empty-state-card" style="text-align: center; padding: 40px 16px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc;">
              <div class="empty-icon" style="font-size: 28px; margin-bottom: 8px;">👥</div>
              <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">No assigned candidates match criteria</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0;">Try adjusting your search query or readiness filter.</p>
            </div>
          ` : `
            <!-- Desktop Table View (>= 769px) -->
            <div class="desktop-table-view saas-table-responsive">
              <table class="saas-data-table">
                <thead>
                  <tr>
                    <th style="width: 120px;">Admission No</th>
                    <th>Candidate</th>
                    <th>Class / Cat</th>
                    <th>Assigned Program(s)</th>
                    <th style="width: 180px;">Overall Readiness</th>
                    <th style="width: 140px; text-align: right;">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRoster.map(item => {
                    const c = item.candidate;
                    const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                    const st = item.readinessStatus;

                    return `
                      <tr class="saas-table-row">
                        <td><span class="saas-adno-pill">${c.adNo}</span></td>
                        <td>
                          <div class="saas-student-cell btn-view-cand-profile" data-cid="${c.id}" style="cursor: pointer;">
                            <div class="saas-avatar-soft">${initials}</div>
                            <div>
                              <strong style="color: #0f172a; font-size: 13.5px; display: block;">${c.name}</strong>
                              <span class="text-xs text-muted">${item.meets.length} meet${item.meets.length === 1 ? '' : 's'} logged</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span class="saas-class-pill" style="align-self: flex-start;">${c.class || 'No Class'}</span>
                            <span class="text-xs text-muted">${c.category || 'General'}</span>
                          </div>
                        </td>
                        <td>
                          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${item.programs.map(p => `
                              <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}" title="${p.name}">
                                ${p.code} • ${p.name}
                              </span>
                            `).join('')}
                          </div>
                        </td>
                        <td>
                          <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                              <span class="badge ${st.badgeClass}" style="font-size: 11px;">${st.label}</span>
                              <strong style="font-size: 13px; color: ${item.hasEvaluation ? st.color : '#64748b'};">
                                ${item.hasEvaluation ? `${item.readiness}%` : 'N/A'}
                              </strong>
                            </div>
                            <div style="width: 100%; height: 5px; background: #f1f5f9; border-radius: 99px; overflow: hidden;">
                              <div style="height: 100%; width: ${item.hasEvaluation ? item.readiness : 0}%; background: ${item.hasEvaluation ? st.color : '#cbd5e1'}; border-radius: 99px;"></div>
                            </div>
                          </div>
                        </td>
                        <td style="text-align: right;">
                          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                            <button type="button" class="btn-saas-primary btn-sm btn-record-candidate-meet" data-cid="${c.id}" data-pid="${item.programs[0]?.id || ''}" style="height: 32px; font-size: 11.5px; padding: 0 10px;">
                              ${getIcon('plus')} Meet
                            </button>
                            <button type="button" class="saas-circle-btn btn-view-cand-profile" data-cid="${c.id}" title="View Candidate Profile">
                              ${getIcon('user')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards View (< 769px) -->
            <div class="mobile-cards-view" style="display: flex; flex-direction: column; gap: 10px;">
              ${filteredRoster.map(item => {
                const c = item.candidate;
                const initials = c.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                const st = item.readinessStatus;

                return `
                  <div class="mobile-candidate-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="saas-avatar-soft" style="width: 40px; height: 40px; font-size: 13.5px; flex-shrink: 0;">${initials}</div>
                        <div>
                          <strong style="font-size: 15px; color: #0f172a; display: block;">${c.name}</strong>
                          <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                            <span class="saas-adno-pill">${c.adNo}</span>
                            <span class="saas-class-pill">${c.class || 'No Class'}</span>
                          </div>
                        </div>
                      </div>
                      <span class="badge ${st.badgeClass}" style="font-size: 11px;">${item.hasEvaluation ? `${item.readiness}%` : 'N/A'}</span>
                    </div>

                    <!-- Programs -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 6px;">
                      <span style="font-size: 11px; font-weight: 700; color: #64748b;">Programs:</span>
                      ${item.programs.map(p => `
                        <span class="saas-prog-capsule ${p.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
                          ${p.code} • ${p.name}
                        </span>
                      `).join('')}
                    </div>

                    <!-- Readiness status pill -->
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #64748b;">
                      <span>Readiness: <strong style="color: ${item.hasEvaluation ? st.color : 'inherit'};">${st.label}</strong></span>
                      <span>${item.meets.length} meet${item.meets.length === 1 ? '' : 's'} recorded</span>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 8px; margin-top: 2px;">
                      <button type="button" class="btn-saas-primary btn-sm btn-record-candidate-meet" data-cid="${c.id}" data-pid="${item.programs[0]?.id || ''}" style="flex: 2; height: 38px; justify-content: center; font-size: 12.5px;">
                        ${getIcon('plus')} Record Meet
                      </button>
                      <button type="button" class="btn btn-outline btn-sm btn-view-cand-profile" data-cid="${c.id}" style="flex: 1; height: 38px; justify-content: center; font-size: 12px;">
                        Profile
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    // Hook events
    const btnProgress = container.querySelector('#btnGoToTrainerProgress');
    if (btnProgress) {
      btnProgress.addEventListener('click', () => {
        navigateTo('trainer-daily-progress');
      });
    }

    const txtSearch = container.querySelector('#txtRosterSearch');
    if (txtSearch) {
      txtSearch.addEventListener('input', e => {
        searchQuery = e.target.value;
        render();
      });
    }

    const selProgram = container.querySelector('#selRosterProgram');
    if (selProgram) {
      selProgram.addEventListener('change', e => {
        activeProgramFilter = e.target.value;
        render();
      });
    }

    const selStatus = container.querySelector('#selRosterStatus');
    if (selStatus) {
      selStatus.addEventListener('change', e => {
        activeStatusFilter = e.target.value;
        render();
      });
    }

    // Record meet buttons
    container.querySelectorAll('.btn-record-candidate-meet').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const cid = btn.getAttribute('data-cid');
        const pid = btn.getAttribute('data-pid');
        openRecordMeetModal({
          candidateId: cid,
          programId: pid,
          trainerId: currentTrainer.id,
          onSave: render
        });
      });
    });

    // View profile buttons
    container.querySelectorAll('.btn-view-cand-profile').forEach(btn => {
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
