import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from '../modals/candidateDossierModal.js';
import { openProgramQuickViewModal } from '../modals/programQuickViewModal.js';
import { toast } from '../toast.js';

function formatChestNo(cand) {
  if (cand.chestNo && cand.chestNo.trim()) return `#${cand.chestNo.trim()}`;
  const idStr = String(cand.id || '');
  if (idStr.includes('-')) {
    const parts = idStr.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) return `#${lastPart}`;
  }
  return `#C-${idStr.slice(-4).toUpperCase()}`;
}

export function renderTrainerReportsView(container, navigateTo) {
  const currentTrainer = state.getActiveTrainer();

  if (!currentTrainer) {
    container.innerHTML = `
      <div class="empty-state-card" style="text-align: center; padding: 48px 16px;">
        <div class="empty-icon" style="font-size: 36px; margin-bottom: 12px;">🔒</div>
        <h2>Trainer Session Required</h2>
        <p class="text-muted text-sm">Please log in to your trainer account to access your reports and mentee dossiers.</p>
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

  // Active Sub-Tab state: 'mentees' | 'my-report' | 'comparison'
  let activeTab = 'mentees';
  let searchQuery = '';
  let quickFilter = 'ALL'; // 'ALL', 'READY', 'PREPARING', 'AT_RISK', 'PENDING'

  function render() {
    // 1. Gather Trainer Data
    const mentees = state.getTrainerMentees(currentTrainer.id);
    const assignedPrograms = state.getTrainerPrograms(currentTrainer.id);
    const allTrainerReports = state.getAllTrainersReportData();
    const myReport = allTrainerReports.find(t => t.trainer.id === currentTrainer.id) || {
      trainer: currentTrainer,
      assignedPrograms,
      menteeCount: mentees.length,
      complianceRate: 0,
      uniqueMenteesMetCount: 0,
      averageReadiness: 0,
      readiness: { hasData: false, percentage: 0, label: 'Not Evaluated' },
      distribution: { readyCount: 0, onTrackCount: 0, needsAttentionCount: 0, notEvaluatedCount: 0 }
    };

    // 2. Build Dossiers for Assigned Mentees
    const menteeDossiers = mentees.map(m => state.getCandidatePerformanceDossier(m.id)).filter(Boolean);

    // Summary counts for filter pills
    const totalMenteesCount = menteeDossiers.length;
    const readyCount = menteeDossiers.filter(d => d.hasEvaluation && d.overallReadiness >= 80).length;
    const preparingCount = menteeDossiers.filter(d => d.momentumKey === 'accelerating' || d.momentumKey === 'stage-ready').length;
    const atRiskCount = menteeDossiers.filter(d => d.momentumKey === 'at-risk' || d.momentumKey === 'stagnant' || d.momentumKey === 'not-started').length;
    const pendingCount = menteeDossiers.filter(d => d.metProgramsCount === 0).length;

    // Filter Mentees
    const filteredMentees = menteeDossiers.filter(d => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const cand = d.candidate;
        const matchesName = String(cand.name || '').toLowerCase().includes(q);
        const matchesChest = String(cand.chestNo || cand.id || '').toLowerCase().includes(q);
        const matchesCat = String(cand.category || '').toLowerCase().includes(q);
        const matchesInst = String(cand.institution || '').toLowerCase().includes(q);
        if (!matchesName && !matchesChest && !matchesCat && !matchesInst) return false;
      }

      if (quickFilter === 'READY') {
        if (!d.hasEvaluation || d.overallReadiness < 80) return false;
      } else if (quickFilter === 'PREPARING') {
        if (d.momentumKey !== 'accelerating' && d.momentumKey !== 'stage-ready') return false;
      } else if (quickFilter === 'AT_RISK') {
        if (d.momentumKey !== 'at-risk' && d.momentumKey !== 'stagnant' && d.momentumKey !== 'not-started') return false;
      } else if (quickFilter === 'PENDING') {
        if (d.metProgramsCount > 0) return false;
      }

      return true;
    });

    // 3. Academy Benchmark calculations for Comparison
    const totalTrainersCount = allTrainerReports.length || 1;
    const avgAcademyCompliance = Math.round(
      allTrainerReports.reduce((sum, t) => sum + (t.complianceRate || 0), 0) / totalTrainersCount
    );
    const trainersWithData = allTrainerReports.filter(t => t.readiness && t.readiness.hasData);
    const avgAcademyReadiness = trainersWithData.length > 0
      ? Math.round(trainersWithData.reduce((sum, t) => sum + t.averageReadiness, 0) / trainersWithData.length)
      : 0;

    // Trainer Rank Calculation
    const sortedByCompliance = [...allTrainerReports].sort((a, b) => (b.complianceRate || 0) - (a.complianceRate || 0));
    const trainerRank = sortedByCompliance.findIndex(t => t.trainer.id === currentTrainer.id) + 1;

    container.innerHTML = `
      <div class="trainer-reports-container" style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- TOP VIEW HEADER & SEGMENTED TABS -->
        <div class="reports-header-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(15,23,42,0.03);">
          <div class="trainer-reports-header-row" style="display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                ${getIcon('award')} <span>Mentor Evaluation Hub</span>
              </div>
              <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.01em;">
                Mentorship & Performance Reports
              </h1>
              <p style="font-size: 12.5px; color: #64748b; margin: 3px 0 0 0;">
                Review your assigned mentees, audit self performance, and benchmark with mentor peers.
              </p>
            </div>

            <!-- Segmented View Tabs (Desktop + Phone Responsive) -->
            <div class="reports-tab-capsule tr-tab-capsule">
              <button type="button" class="reports-tab-btn ${activeTab === 'mentees' ? 'active' : ''}" id="tabBtnMentees" title="Assigned Mentees">
                ${getIcon('award')}
                <span class="tab-lbl-full">Assigned Mentees</span>
                <span class="tab-lbl-short">Mentees</span>
                <span class="reports-tab-badge">${totalMenteesCount}</span>
              </button>
              <button type="button" class="reports-tab-btn ${activeTab === 'my-report' ? 'active' : ''}" id="tabBtnMyReport" title="My Performance Report">
                ${getIcon('dashboard')}
                <span class="tab-lbl-full">My Report</span>
                <span class="tab-lbl-short">Report</span>
                <span class="reports-tab-badge">${myReport.complianceRate}%</span>
              </button>
              <button type="button" class="reports-tab-btn ${activeTab === 'comparison' ? 'active' : ''}" id="tabBtnComparison" title="Compare with Mentor Peers">
                ${getIcon('trainers')}
                <span class="tab-lbl-full">Compare Mentors</span>
                <span class="tab-lbl-short">Compare</span>
              </button>
            </div>
          </div>
        </div>

        <!-- DYNAMIC SUB-VIEW CONTAINER -->
        <div id="trainerReportsSubView">
          ${renderActiveSubTabContent({
            activeTab,
            searchQuery,
            quickFilter,
            currentTrainer,
            mentees,
            menteeDossiers,
            filteredMentees,
            totalMenteesCount,
            readyCount,
            preparingCount,
            atRiskCount,
            pendingCount,
            myReport,
            allTrainerReports,
            avgAcademyCompliance,
            avgAcademyReadiness,
            trainerRank
          })}
        </div>

      </div>
    `;

    // Bind Tab Switching Listeners
    container.querySelector('#tabBtnMentees')?.addEventListener('click', () => {
      if (activeTab !== 'mentees') {
        activeTab = 'mentees';
        render();
      }
    });

    container.querySelector('#tabBtnMyReport')?.addEventListener('click', () => {
      if (activeTab !== 'my-report') {
        activeTab = 'my-report';
        render();
      }
    });

    container.querySelector('#tabBtnComparison')?.addEventListener('click', () => {
      if (activeTab !== 'comparison') {
        activeTab = 'comparison';
        render();
      }
    });

    // Wire Specific Sub-View Events
    wireSubViewEvents(container, {
      activeTab,
      filteredMentees,
      currentTrainer,
      searchQuery,
      quickFilter,
      onFilterChange: (newQf, newSearch) => {
        quickFilter = newQf;
        searchQuery = newSearch;
        render();
      }
    });
  }

  render();
}

/**
 * Render Content based on active sub-tab
 */
function renderActiveSubTabContent(data) {
  const { activeTab } = data;
  if (activeTab === 'mentees') {
    return renderMenteesTab(data);
  } else if (activeTab === 'my-report') {
    return renderMyReportTab(data);
  } else {
    return renderComparisonTab(data);
  }
}

/**
 * TAB 1: ASSIGNED MENTEES REPORT & DOSSIER VIEW
 */
function renderMenteesTab(data) {
  const {
    searchQuery,
    quickFilter,
    filteredMentees,
    totalMenteesCount,
    readyCount,
    preparingCount,
    atRiskCount,
    pendingCount
  } = data;

  return `
    <!-- Search & Filter Ribbon -->
    <div class="reports-command-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px;">
      <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        
        <!-- Search Input -->
        <div style="flex: 1; min-width: 220px; position: relative;">
          <input 
            type="text" 
            id="inpMenteeSearch" 
            class="form-input" 
            placeholder="Search mentee by name, chest no, category..." 
            value="${searchQuery}" 
            style="height: 38px; font-size: 12.5px; padding-left: 36px; border-radius: 9px;"
          />
          <span style="position: absolute; left: 11px; top: 10px; color: #94a3b8; pointer-events: none;">
            ${getIcon('search')}
          </span>
          ${searchQuery ? `
            <button type="button" id="btnClearMenteeSearch" style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: #94a3b8; cursor: pointer;">
              ${getIcon('x')}
            </button>
          ` : ''}
        </div>

        <!-- Desktop Print Button -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btnPrintMenteeReports" class="btn btn-outline btn-sm desktop-only-btn" style="height: 38px; padding: 0 14px; font-size: 12px; font-weight: 700; gap: 6px; border-radius: 9px; border-color: #cbd5e1;" title="Print Filtered Mentees Report Sheet">
            ${getIcon('printer')} <span>Print Mentees</span>
          </button>
          ${(searchQuery || quickFilter !== 'ALL') ? `
            <button type="button" id="btnResetMenteeFilters" class="btn btn-outline text-danger btn-sm" style="height: 38px; padding: 0 12px; font-size: 12px; font-weight: 600; border-color: #fecaca; border-radius: 9px;" title="Reset Filters">
              ${getIcon('x')} <span>Clear</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Quick Filter Pills -->
      <div class="reports-quick-pills" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 6px; overflow-x: auto;">
        <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; white-space: nowrap; margin-right: 2px;">
          Filter:
        </span>
        <button type="button" class="quick-pill-btn ${quickFilter === 'ALL' ? 'active' : ''}" data-qf="ALL">
          <span>All Mentees</span>
          <span class="qf-count">${totalMenteesCount}</span>
        </button>
        <button type="button" class="quick-pill-btn ${quickFilter === 'READY' ? 'active' : ''}" data-qf="READY">
          <span class="qf-dot" style="background: #10b981;"></span>
          <span>Stage Ready (80%+)</span>
          <span class="qf-count">${readyCount}</span>
        </button>
        <button type="button" class="quick-pill-btn ${quickFilter === 'PREPARING' ? 'active' : ''}" data-qf="PREPARING">
          <span class="qf-dot" style="background: #3b82f6;"></span>
          <span>Actively Preparing</span>
          <span class="qf-count">${preparingCount}</span>
        </button>
        <button type="button" class="quick-pill-btn ${quickFilter === 'AT_RISK' ? 'active' : ''}" data-qf="AT_RISK">
          <span class="qf-dot" style="background: #ef4444;"></span>
          <span>Follow-Up Needed</span>
          <span class="qf-count">${atRiskCount}</span>
        </button>
        <button type="button" class="quick-pill-btn ${quickFilter === 'PENDING' ? 'active' : ''}" data-qf="PENDING">
          <span class="qf-dot" style="background: #f59e0b;"></span>
          <span>Pending Check-in</span>
          <span class="qf-count">${pendingCount}</span>
        </button>
      </div>
    </div>

    <!-- Mentees List / Table -->
    ${filteredMentees.length === 0 ? `
      <div class="empty-state-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 48px 24px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
        <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">No mentees match your active filter</h3>
        <p style="font-size: 13px; color: #64748b; margin: 0 auto 16px auto; max-width: 380px;">Try clearing search keywords or switching filter pills above.</p>
      </div>
    ` : `
      <!-- 1. Desktop Table View (>= 769px) -->
      <div class="desktop-table-view reports-table-container" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); margin-bottom: 16px;">
        <table class="saas-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
              <th style="padding: 11px 14px; width: 65px;">Chest</th>
              <th style="padding: 11px 14px; min-width: 180px;">Mentee Name & Category</th>
              <th style="padding: 11px 14px; min-width: 200px;">Programs & Scores</th>
              <th style="padding: 11px 14px; width: 140px;">Overall Readiness</th>
              <th style="padding: 11px 14px; width: 100px;">Sessions</th>
              <th style="padding: 11px 14px; width: 110px;">Trajectory</th>
              <th style="padding: 11px 14px; width: 120px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMentees.map(d => {
              const cleanChest = formatChestNo(d.candidate);
              const statusClass = !d.hasEvaluation
                ? 'badge-neutral'
                : (d.overallReadiness >= 80 ? 'badge-ready' : (d.overallReadiness >= 60 ? 'badge-track' : 'badge-attention'));

              return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.12s ease;">
                  <td style="padding: 11px 14px;">
                    <span style="font-weight: 800; font-family: ui-monospace, monospace; color: #0f172a; font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">
                      ${cleanChest}
                    </span>
                  </td>
                  <td style="padding: 11px 14px;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${d.candidate.name}</div>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 1px;">
                      <span>${d.candidate.category}</span>
                      ${d.candidate.institution ? ` • <span>${d.candidate.institution}</span>` : ''}
                    </div>
                  </td>
                  <td style="padding: 11px 14px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${d.programReports.map(pr => `
                        <span style="display: inline-flex; align-items: center; gap: 3px; background: ${pr.isMet ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${pr.isMet ? '#bbf7d0' : '#e2e8f0'}; color: ${pr.isMet ? '#15803d' : '#64748b'}; padding: 1.5px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                          <strong>[${pr.program.code}]</strong> ${pr.isMet ? `${pr.latestScore}%` : 'Pending'}
                        </span>
                      `).join('')}
                    </div>
                  </td>
                  <td style="padding: 11px 14px;">
                    <span class="badge ${statusClass}" style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                      ${d.hasEvaluation ? `${d.overallReadiness}% • ${d.overallStatus.label}` : 'Pending Check-in'}
                    </span>
                  </td>
                  <td style="padding: 11px 14px;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${d.meetingRateLabel}</div>
                    <div style="font-size: 10.5px; color: #64748b;">${d.totalMeets} meets logged</div>
                  </td>
                  <td style="padding: 11px 14px;">
                    <div style="font-weight: 700; font-size: 11.5px; color: ${d.momentumColor || '#334155'};">
                      ${d.momentumLabel}
                    </div>
                  </td>
                  <td style="padding: 11px 14px; text-align: right;">
                    <button type="button" class="btn btn-sm btn-outline" data-action="view-dossier" data-cid="${d.candidate.id}" style="height: 30px; padding: 0 10px; font-size: 11.5px; font-weight: 700; gap: 4px; border-color: #cbd5e1; color: #4338ca;" title="View Complete Candidate Performance Dossier">
                      ${getIcon('award')} <span>Dossier</span>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- 2. Mobile Cards View (< 769px) -->
      <div class="mobile-cards-view" style="display: flex; flex-direction: column; gap: 10px;">
        ${filteredMentees.map(d => {
          const cleanChest = formatChestNo(d.candidate);
          const statusClass = !d.hasEvaluation
            ? 'badge-neutral'
            : (d.overallReadiness >= 80 ? 'badge-ready' : (d.overallReadiness >= 60 ? 'badge-track' : 'badge-attention'));

          return `
            <div class="mentee-report-mobile-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                    <span style="font-weight: 800; font-family: ui-monospace, monospace; color: #0f172a; font-size: 11px; background: #f1f5f9; padding: 1.5px 5px; border-radius: 4px;">
                      ${cleanChest}
                    </span>
                    <span style="font-size: 11px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 1.5px 6px; border-radius: 4px;">
                      ${d.candidate.category}
                    </span>
                  </div>
                  <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a;">${d.candidate.name}</h4>
                  ${d.candidate.institution ? `<p style="margin: 2px 0 0 0; font-size: 11.5px; color: #64748b;">${d.candidate.institution}</p>` : ''}
                </div>
                <span class="badge ${statusClass}" style="padding: 3px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 700; white-space: nowrap;">
                  ${d.hasEvaluation ? `${d.overallReadiness}%` : 'Pending'}
                </span>
              </div>

              <!-- Programs Row -->
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
                ${d.programReports.map(pr => `
                  <span style="background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; padding: 1.5px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 600;">
                    <strong>[${pr.program.code}]</strong> ${pr.isMet ? `${pr.latestScore}%` : 'Pending'}
                  </span>
                `).join('')}
              </div>

              <!-- Progress bar -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 4px;">
                  <span>Readiness & Momentum</span>
                  <strong style="color: ${d.momentumColor || '#0f172a'};">${d.momentumLabel}</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden;">
                  <div style="width: ${d.overallReadiness}%; height: 100%; background: ${d.overallReadiness >= 80 ? '#10b981' : (d.overallReadiness >= 60 ? '#3b82f6' : '#ef4444')}; border-radius: 999px;"></div>
                </div>
              </div>

              <!-- Mobile Actions -->
              <div>
                <button type="button" class="btn btn-outline btn-sm" data-action="view-dossier" data-cid="${d.candidate.id}" style="width: 100%; font-size: 12px; font-weight: 700; height: 34px; justify-content: center; gap: 6px; border-color: #cbd5e1; color: #4338ca;">
                  ${getIcon('award')} <span>View Dossier</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

/**
 * TAB 2: MY OWN MENTORSHIP & COMPLIANCE PERFORMANCE REPORT
 */
function renderMyReportTab(data) {
  const { currentTrainer, myReport } = data;
  const { distribution, assignedPrograms } = myReport;

  const totalAssignedMentees = myReport.menteeCount || 0;
  const metMenteesCount = myReport.uniqueMenteesMetCount || 0;
  const compliance = myReport.complianceRate || 0;
  const avgReadiness = myReport.averageReadiness || 0;

  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      
      <!-- Executive Summary KPIs -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;">
            Check-in Compliance
          </div>
          <div style="font-size: 26px; font-weight: 900; color: ${compliance >= 80 ? '#047857' : (compliance >= 50 ? '#b45309' : '#b91c1c')};">
            ${compliance}%
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Met <strong>${metMenteesCount}</strong> of <strong>${totalAssignedMentees}</strong> assigned mentees
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;">
            Avg Mentee Readiness
          </div>
          <div style="font-size: 26px; font-weight: 900; color: ${avgReadiness >= 80 ? '#047857' : (avgReadiness >= 60 ? '#1d4ed8' : '#b91c1c')};">
            ${myReport.readiness.hasData ? `${avgReadiness}%` : 'N/A'}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Cohort Status: <strong>${myReport.readiness.label}</strong>
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;">
            Assigned Programs
          </div>
          <div style="font-size: 26px; font-weight: 900; color: #0f172a;">
            ${assignedPrograms.length}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Specialization: <strong>${currentTrainer.expertise || 'General'}</strong>
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;">
            Event Readiness Breakdown
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;">
            <span style="font-size: 20px; font-weight: 900; color: #047857;">${distribution.readyCount} Ready</span>
            <span style="color: #cbd5e1;">/</span>
            <span style="font-size: 16px; font-weight: 800; color: #b91c1c;">${distribution.needsAttentionCount} Lagging</span>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
            ${distribution.onTrackCount} progressing steadily
          </div>
        </div>
      </div>

      <!-- Readiness Cohort Distribution Bar -->
      <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
        <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 10px 0;">
          Mentee Readiness Cohort Distribution
        </h3>
        
        <div style="width: 100%; height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; display: flex; margin-bottom: 12px;">
          <div style="width: ${totalAssignedMentees ? (distribution.readyCount / totalAssignedMentees * 100) : 0}%; background: #10b981;" title="Ready"></div>
          <div style="width: ${totalAssignedMentees ? (distribution.onTrackCount / totalAssignedMentees * 100) : 0}%; background: #3b82f6;" title="Developing"></div>
          <div style="width: ${totalAssignedMentees ? (distribution.needsAttentionCount / totalAssignedMentees * 100) : 0}%; background: #ef4444;" title="Needs Attention"></div>
          <div style="width: ${totalAssignedMentees ? (distribution.notEvaluatedCount / totalAssignedMentees * 100) : 0}%; background: #cbd5e1;" title="Pending"></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span><strong>${distribution.readyCount}</strong> Stage Ready</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #3b82f6;"></span>
            <span><strong>${distribution.onTrackCount}</strong> On Track</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span><strong>${distribution.needsAttentionCount}</strong> Follow-Up</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1;"></span>
            <span><strong>${distribution.notEvaluatedCount}</strong> Pending</span>
          </div>
        </div>
      </div>

      <!-- Assigned Programs Performance Breakdown -->
      <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
              My Assigned Programs & Enrolled Candidates
            </h3>
            <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">
              Click any program box below to view all assigned candidates, readiness scores, and dossiers.
            </p>
          </div>
          <span style="font-size: 11.5px; font-weight: 700; color: #4338ca; background: #eef2ff; padding: 3px 8px; border-radius: 6px;">
            ${assignedPrograms.length} Assigned Programs
          </span>
        </div>

        ${assignedPrograms.length === 0 ? `
          <p style="color: #64748b; font-size: 13px; margin: 0;">No training programs are currently linked to your mentor account.</p>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
            ${assignedPrograms.map(p => {
              const enrolledCount = (p.candidateIds || []).length;
              return `
                <div class="tr-assigned-program-card" data-action="view-program-candidates" data-pid="${p.id}" style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.18s ease; position: relative;" title="Click to view assigned candidates in ${p.name}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <span style="font-size: 11px; font-weight: 800; font-family: ui-monospace, monospace; color: #4338ca; background: #e0e7ff; padding: 2px 8px; border-radius: 5px;">
                      ${p.code}
                    </span>
                    <span style="font-size: 11px; font-weight: 700; color: #4f46e5; display: inline-flex; align-items: center; gap: 3px;">
                      View Candidates &rarr;
                    </span>
                  </div>
                  <h4 style="margin: 4px 0 6px 0; font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.3;">${p.name}</h4>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                    <span>${p.category || 'General'} • ${p.type || 'Standard'}</span>
                    <span style="color: #0f172a; font-weight: 700;">
                      <strong style="color: #4338ca; font-size: 13px;">${enrolledCount}</strong> assigned
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

/**
 * TAB 3: BENCHMARK & MENTOR PEER COMPARISON VIEW
 */
function renderComparisonTab(data) {
  const { currentTrainer, myReport, allTrainerReports, avgAcademyCompliance, avgAcademyReadiness, trainerRank } = data;

  const myCompliance = myReport.complianceRate || 0;
  const myReadiness = myReport.averageReadiness || 0;

  const complianceDiff = myCompliance - avgAcademyCompliance;
  const readinessDiff = myReadiness - avgAcademyReadiness;

  // Sort all trainers by compliance descending, then average readiness descending
  const rankedTrainers = [...allTrainerReports].sort((a, b) => {
    if (b.complianceRate !== a.complianceRate) {
      return (b.complianceRate || 0) - (a.complianceRate || 0);
    }
    return (b.averageReadiness || 0) - (a.averageReadiness || 0);
  });

  const top1 = rankedTrainers[0];
  const top2 = rankedTrainers[1];
  const top3 = rankedTrainers[2];

  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      
      <!-- Academy Benchmark Comparison Hero -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; border-radius: 16px; padding: 20px 22px; box-shadow: 0 4px 20px rgba(15,23,42,0.12);">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 16px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #818cf8;">
              Mentor Peer Comparison
            </div>
            <h2 style="font-size: 19px; font-weight: 900; margin: 3px 0 0 0; letter-spacing: -0.01em;">
              Sibaq Performance Benchmark. Compare with other mentors
            </h2>
          </div>
          <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
            ${trainerRank <= 3 ? (trainerRank === 1 ? '🥇' : (trainerRank === 2 ? '🥈' : '🥉')) : '🏆'} Mentor Rank: #${trainerRank} of ${rankedTrainers.length}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <!-- Compliance Comparison -->
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
              Meeting Compliance
            </div>
            <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 4px;">
              <span style="font-size: 24px; font-weight: 900;">${myCompliance}%</span>
              <span style="font-size: 12px; color: ${complianceDiff >= 0 ? '#34d399' : '#f87171'}; font-weight: 800;">
                ${complianceDiff >= 0 ? `+${complianceDiff}%` : `${complianceDiff}%`} vs Academy Avg (${avgAcademyCompliance}%)
              </span>
            </div>
          </div>

          <!-- Readiness Comparison -->
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">
              Avg Mentee Readiness
            </div>
            <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 4px;">
              <span style="font-size: 24px; font-weight: 900;">${myReport.readiness.hasData ? `${myReadiness}%` : 'N/A'}</span>
              <span style="font-size: 12px; color: ${readinessDiff >= 0 ? '#34d399' : '#f87171'}; font-weight: 800;">
                ${readinessDiff >= 0 ? `+${readinessDiff}%` : `${readinessDiff}%`} vs Academy Avg (${avgAcademyReadiness}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- TOP 3 MENTORS PODIUM SHOWCASE (#1, #2, #3 Highlights) -->
      <div class="podium-showcase-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(15,23,42,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">👑</span>
            <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.04em;">
              Top Mentors Podium Showcase
            </h3>
          </div>
          <span style="font-size: 11.5px; font-weight: 700; color: #64748b;">Top 3 Mentors Highlighted (#1, #2, #3)</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
          ${top1 ? `
            <!-- 1st Rank -->
            <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ffffff 100%); border: 2px solid #f59e0b; border-radius: 14px; padding: 14px 16px; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.22); position: relative; overflow: hidden;">
              <div style="position: absolute; right: -8px; top: -8px; font-size: 46px; opacity: 0.16; pointer-events: none;">🥇</div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 9px; border-radius: 999px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; font-size: 11px; font-weight: 800; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);">
                  🥇 #1
                </span>
                ${top1.trainer.id === currentTrainer.id ? `<span style="background: #4f46e5; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px;">YOU</span>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: ${top1.trainer.color || '#f59e0b'}; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.4); flex-shrink: 0; overflow: hidden;">
                  ${top1.trainer.photo ? `<img src="${top1.trainer.photo}" style="width:100%; height:100%; object-fit:cover;" />` : top1.trainer.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 800; font-size: 14.5px; color: #78350f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${top1.trainer.name}</div>
                  <div style="font-size: 11px; color: #92400e; font-weight: 600;">${top1.trainer.expertise || 'Specialized Mentor'}</div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 6px 10px; font-size: 11.5px;">
                <div>
                  <span style="color: #92400e; font-weight: 700;">Comp:</span>
                  <strong style="color: #b45309; font-size: 13px;"> ${top1.complianceRate}%</strong>
                </div>
                <div>
                  <span style="color: #92400e; font-weight: 700;">Readiness:</span>
                  <strong style="color: #047857; font-size: 13px;"> ${top1.readiness.hasData ? `${top1.averageReadiness}%` : 'N/A'}</strong>
                </div>
                <div style="color: #78350f; font-weight: 700;">${top1.menteeCount} mentees</div>
              </div>
            </div>
          ` : ''}

          ${top2 ? `
            <!-- 2nd Rank -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #ffffff 100%); border: 1.5px solid #94a3b8; border-radius: 14px; padding: 14px 16px; box-shadow: 0 4px 14px rgba(100, 116, 139, 0.15); position: relative; overflow: hidden;">
              <div style="position: absolute; right: -8px; top: -8px; font-size: 46px; opacity: 0.12; pointer-events: none;">🥈</div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 9px; border-radius: 999px; background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); color: #ffffff; font-size: 11px; font-weight: 800; box-shadow: 0 2px 6px rgba(100, 116, 139, 0.3);">
                  🥈 #2
                </span>
                ${top2.trainer.id === currentTrainer.id ? `<span style="background: #4f46e5; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px;">YOU</span>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: ${top2.trainer.color || '#64748b'}; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid #94a3b8; box-shadow: 0 0 8px rgba(100, 116, 139, 0.25); flex-shrink: 0; overflow: hidden;">
                  ${top2.trainer.photo ? `<img src="${top2.trainer.photo}" style="width:100%; height:100%; object-fit:cover;" />` : top2.trainer.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 800; font-size: 14.5px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${top2.trainer.name}</div>
                  <div style="font-size: 11px; color: #475569; font-weight: 600;">${top2.trainer.expertise || 'Specialized Mentor'}</div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; padding: 6px 10px; font-size: 11.5px;">
                <div>
                  <span style="color: #475569; font-weight: 700;">Comp:</span>
                  <strong style="color: #334155; font-size: 13px;"> ${top2.complianceRate}%</strong>
                </div>
                <div>
                  <span style="color: #475569; font-weight: 700;">Readiness:</span>
                  <strong style="color: #047857; font-size: 13px;"> ${top2.readiness.hasData ? `${top2.averageReadiness}%` : 'N/A'}</strong>
                </div>
                <div style="color: #475569; font-weight: 700;">${top2.menteeCount} mentees</div>
              </div>
            </div>
          ` : ''}

          ${top3 ? `
            <!-- 3rd Rank -->
            <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #ffffff 100%); border: 1.5px solid #f97316; border-radius: 14px; padding: 14px 16px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.15); position: relative; overflow: hidden;">
              <div style="position: absolute; right: -8px; top: -8px; font-size: 46px; opacity: 0.12; pointer-events: none;">🥉</div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 9px; border-radius: 999px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 11px; font-weight: 800; box-shadow: 0 2px 6px rgba(249, 115, 22, 0.3);">
                  🥉 #3
                </span>
                ${top3.trainer.id === currentTrainer.id ? `<span style="background: #4f46e5; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px;">YOU</span>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: ${top3.trainer.color || '#f97316'}; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid #f97316; box-shadow: 0 0 8px rgba(249, 115, 22, 0.25); flex-shrink: 0; overflow: hidden;">
                  ${top3.trainer.photo ? `<img src="${top3.trainer.photo}" style="width:100%; height:100%; object-fit:cover;" />` : top3.trainer.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </div>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 800; font-size: 14.5px; color: #7c2d12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${top3.trainer.name}</div>
                  <div style="font-size: 11px; color: #9a3412; font-weight: 600;">${top3.trainer.expertise || 'Specialized Mentor'}</div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 6px 10px; font-size: 11.5px;">
                <div>
                  <span style="color: #9a3412; font-weight: 700;">Comp:</span>
                  <strong style="color: #c2410c; font-size: 13px;"> ${top3.complianceRate}%</strong>
                </div>
                <div>
                  <span style="color: #9a3412; font-weight: 700;">Readiness:</span>
                  <strong style="color: #047857; font-size: 13px;"> ${top3.readiness.hasData ? `${top3.averageReadiness}%` : 'N/A'}</strong>
                </div>
                <div style="color: #9a3412; font-weight: 700;">${top3.menteeCount} mentees</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Peer Mentor Comparison Leaderboard (Other Mentors: #4 onwards) -->
      ${(() => {
        const otherTrainers = rankedTrainers.slice(3);

        return `
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                  Other Mentors Performance Matrix
                </h3>
                <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">
                  Rankings and compliance benchmarks for all other mentors (Rank #4+).
                </p>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 6px;">
                ${otherTrainers.length} Mentors
              </span>
            </div>

            ${otherTrainers.length === 0 ? `
              <div style="padding: 32px 16px; text-align: center; color: #64748b; font-size: 13px;">
                All academy mentors are currently featured on the Top Mentors podium showcase above.
              </div>
            ` : `
              <!-- 1. Desktop Comparison Table -->
              <div class="desktop-table-view">
                <table class="saas-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                      <th style="padding: 10px 14px; width: 75px;">Rank</th>
                      <th style="padding: 10px 14px; min-width: 190px;">Mentor & Specialization</th>
                      <th style="padding: 10px 14px; width: 140px;">Expertise</th>
                      <th style="padding: 10px 14px; width: 90px;">Mentees</th>
                      <th style="padding: 10px 14px; width: 140px;">Compliance</th>
                      <th style="padding: 10px 14px; width: 120px;">Avg Readiness</th>
                      <th style="padding: 10px 14px; width: 140px;">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${otherTrainers.map((t, i) => {
                      const actualRank = i + 4;
                      const isMe = t.trainer.id === currentTrainer.id;
                      const compClass = t.complianceRate >= 80 ? 'badge-ready' : (t.complianceRate >= 50 ? 'badge-track' : 'badge-attention');

                      return `
                        <tr style="border-bottom: 1px solid #f1f5f9; background: ${isMe ? '#f5f3ff' : 'transparent'}; border-left: ${isMe ? '4px solid #4f46e5' : 'none'}; font-weight: ${isMe ? '700' : 'normal'}; transition: background 0.15s ease;">
                          <td style="padding: 11px 14px;">
                            <span style="font-weight: 800; font-size: 12px; color: #64748b; padding-left: 4px;">#${actualRank}</span>
                          </td>
                          <td style="padding: 11px 14px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <span style="font-weight: 800; color: #0f172a; font-size: 13px;">${t.trainer.name}</span>
                              ${isMe ? `
                                <span style="background: #4f46e5; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 999px; letter-spacing: 0.05em;">YOU</span>
                              ` : ''}
                            </div>
                          </td>
                          <td style="padding: 11px 14px; color: #475569; font-size: 12px;">
                            ${t.trainer.expertise || 'Specialized Mentor'}
                          </td>
                          <td style="padding: 11px 14px; font-weight: 700; color: #0f172a;">
                            ${t.menteeCount}
                          </td>
                          <td style="padding: 11px 14px;">
                            <span class="badge ${compClass}" style="padding: 2.5px 7px; border-radius: 6px; font-size: 11px;">
                              ${t.complianceRate}% (${t.uniqueMenteesMetCount}/${t.menteeCount})
                            </span>
                          </td>
                          <td style="padding: 11px 14px; font-weight: 700; color: #0f172a;">
                            ${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}
                          </td>
                          <td style="padding: 11px 14px; font-size: 11.5px;">
                            <span style="color: #047857; font-weight: 700;">${t.distribution.readyCount} Ready</span>
                            <span style="color: #cbd5e1; margin: 0 2px;">/</span>
                            <span style="color: #b91c1c; font-weight: 700;">${t.distribution.needsAttentionCount} Lagging</span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <!-- 2. Mobile Peer Cards -->
              <div class="mobile-cards-view" style="display: flex; flex-direction: column; gap: 8px; padding: 10px;">
                ${otherTrainers.map((t, i) => {
                  const actualRank = i + 4;
                  const isMe = t.trainer.id === currentTrainer.id;

                  return `
                    <div style="background: ${isMe ? '#f5f3ff' : '#f8fafc'}; border: 1.5px solid ${isMe ? '#c4b5fd' : '#e2e8f0'}; border-radius: 12px; padding: 12px 14px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-weight: 800; font-size: 12px; color: #64748b;">
                            #${actualRank}
                          </span>
                          <strong style="font-size: 13.5px; color: #0f172a;">${t.trainer.name}</strong>
                          ${isMe ? `<span style="background: #4f46e5; color: #fff; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 999px;">YOU</span>` : ''}
                        </div>
                        <span style="font-size: 12px; font-weight: 800; color: ${t.complianceRate >= 80 ? '#047857' : '#b45309'};">
                          ${t.complianceRate}% Comp.
                        </span>
                      </div>
                      <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: #64748b;">
                        <span>${t.trainer.expertise || 'Mentor'} • ${t.menteeCount} mentees</span>
                        <span>Avg Readiness: <strong>${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}</strong></span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}

          </div>
        `;
      })()}

      </div>

    </div>
  `;
}

/**
 * Wire click handlers & interactive events
 */
function wireSubViewEvents(container, context) {
  const { onFilterChange, filteredMentees, currentTrainer, searchQuery, quickFilter } = context;

  // Search input
  const inpSearch = container.querySelector('#inpMenteeSearch');
  if (inpSearch) {
    inpSearch.addEventListener('input', e => {
      onFilterChange(quickFilter, e.target.value);
    });
  }

  // Clear search
  const btnClear = container.querySelector('#btnClearMenteeSearch');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      onFilterChange(quickFilter, '');
    });
  }

  // Reset filters
  const btnReset = container.querySelector('#btnResetMenteeFilters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      onFilterChange('ALL', '');
    });
  }

  // Quick filter pills
  container.querySelectorAll('.quick-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qf = btn.getAttribute('data-qf') || 'ALL';
      onFilterChange(qf, searchQuery);
    });
  });

  // Candidate Dossier Modal trigger
  container.querySelectorAll('[data-action="view-dossier"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const cid = btn.getAttribute('data-cid');
      if (cid) {
        openCandidateDossierModal(cid);
      }
    });
  });


  // Program Quick View Modal trigger (assigned programs in My Report)
  container.querySelectorAll('[data-action="view-program-candidates"]').forEach(card => {
    card.addEventListener('click', e => {
      e.stopPropagation();
      const pid = card.getAttribute('data-pid');
      if (pid) {
        openProgramQuickViewModal(pid);
      }
    });
  });

  // Print Mentees Report
  const btnPrint = container.querySelector('#btnPrintMenteeReports');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      printTrainerAssignedMenteesSheet(filteredMentees, currentTrainer, {
        quickFilter,
        searchQuery
      });
    });
  }
}

/**
 * Dedicated, pristine print generator for trainer's assigned mentees
 */
function printTrainerAssignedMenteesSheet(dossiers, trainer, meta = {}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to print mentee report.');
    return;
  }

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const scopeLabels = {
    'ALL': 'All Assigned Mentees',
    'READY': 'Stage Ready (80%+)',
    'PREPARING': 'Actively Preparing',
    'AT_RISK': 'Follow-Up Needed',
    'PENDING': 'Pending Check-in'
  };
  const activeScope = scopeLabels[meta.quickFilter] || 'All Assigned Mentees';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>DH BENGAL - Mentee Performance Report [${trainer.name}]</title>
      <style>
        @page {
          size: landscape;
          margin: 6mm 8mm 6mm 8mm;
        }
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 10px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 16px;
          margin-bottom: 12px;
          border-bottom: 2px solid #6366f1;
        }
        .header-box {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 8px;
        }
        .brand-org {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #64748b;
          text-transform: uppercase;
        }
        .brand-title {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
        }
        .scope-strip {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9.5px;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th {
          background: #f1f5f9;
          border-top: 1.5px solid #94a3b8;
          border-bottom: 1.5px solid #94a3b8;
          border-left: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          padding: 5px 6px;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e293b;
          text-align: left;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 4.5px 6px;
          vertical-align: middle;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .badge {
          display: inline-block;
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 8.5px;
          font-weight: 700;
          line-height: 1.2;
        }
        .badge-ready { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-track { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .badge-attention { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .badge-pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .chip {
          display: inline-block;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          padding: 1px 3px;
          font-size: 8px;
          margin: 1px;
          font-weight: 600;
          color: #334155;
        }
        .doc-footer {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1.5px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: #64748b;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <div>
          <strong>🖨️ Print Preview: Mentee Performance Report</strong>
          <span style="font-size: 11px; margin-left: 10px; color: #cbd5e1;">Paper size is pre-set to <strong>Landscape</strong></span>
        </div>
        <div>
          <button onclick="window.print()" style="background: #4f46e5; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; font-weight: 700; cursor: pointer;">Print / Save as PDF</button>
          <button onclick="window.close()" style="background: #334155; color: #fff; border: none; padding: 5px 12px; border-radius: 4px; margin-left: 6px; cursor: pointer;">Close</button>
        </div>
      </div>

      <div class="header-box">
        <div>
          <div class="brand-org">DARUL HUDA BENGAL • SIBAQ TRAINING ACADEMY</div>
          <div class="brand-title">ASSIGNED MENTEE PERFORMANCE & READINESS DOSSIER</div>
          <div style="font-size: 11px; color: #4338ca; font-weight: 700; margin-top: 2px;">Assigned Mentor: <strong>${trainer.name}</strong> (${trainer.expertise || 'Specialized Mentor'})</div>
        </div>
        <div style="text-align: right; font-size: 9.5px; color: #475569;">
          <div>Generated: <strong>${todayFormatted} • ${timeFormatted}</strong></div>
          <div>Mentees in Scope: <strong>${dossiers.length}</strong></div>
        </div>
      </div>

      <div class="scope-strip">
        <div style="font-size: 9.5px; font-weight: 800; color: #0f172a;">
          Filter Scope: <span style="background: #0f172a; color: #fff; padding: 2px 7px; border-radius: 999px;">${activeScope}</span>
          ${meta.searchQuery ? `<span style="background: #fff; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Search: "${meta.searchQuery}"</span>` : ''}
        </div>
        <div style="font-size: 9.5px; color: #64748b;">
          Authorized Mentor Academic Assessment
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 6%;">Chest</th>
            <th style="width: 20%;">Mentee Name & Institution</th>
            <th style="width: 9%;">Category</th>
            <th style="width: 27%;">Assigned Programs & Readiness</th>
            <th style="width: 12%;">Overall Readiness</th>
            <th style="width: 8%;">Meeting Rate</th>
            <th style="width: 8%;">Trajectory</th>
            <th style="width: 10%;">Latest Remark</th>
          </tr>
        </thead>
        <tbody>
          ${dossiers.map(d => {
            const cleanChest = formatChestNo(d.candidate);
            const statusClass = !d.hasEvaluation
              ? 'badge-pending'
              : (d.overallReadiness >= 80 ? 'badge-ready' : (d.overallReadiness >= 60 ? 'badge-track' : 'badge-attention'));

            return `
              <tr>
                <td style="font-weight: 800; font-family: ui-monospace, monospace;">${cleanChest}</td>
                <td>
                  <strong style="color: #0f172a;">${d.candidate.name}</strong>
                  ${d.candidate.institution ? `<div style="font-size: 8px; color: #64748b;">${d.candidate.institution}</div>` : ''}
                </td>
                <td style="font-weight: 600; color: #334155;">${d.candidate.category}</td>
                <td>
                  ${d.programReports.map(pr => `
                    <span class="chip" style="background: ${pr.isMet ? '#f0fdf4' : '#fff'}; border-color: ${pr.isMet ? '#86efac' : '#cbd5e1'}; color: ${pr.isMet ? '#15803d' : '#475569'};">
                      <strong>[${pr.program.code}]</strong> ${pr.isMet ? `${pr.latestScore}%` : 'Pending'}
                    </span>
                  `).join('')}
                </td>
                <td>
                  <span class="badge ${statusClass}">
                    ${d.hasEvaluation ? `${d.overallReadiness}% • ${d.overallStatus.label}` : 'Pending Check-in'}
                  </span>
                </td>
                <td style="font-weight: 700;">${d.meetingRateLabel}</td>
                <td style="font-weight: 600; color: #334155;">${d.momentumLabel}</td>
                <td style="font-size: 8.5px; color: #334155;">
                  ${d.latestRemark ? `"${d.latestRemark.text}"` : '-'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="doc-footer">
        <div>Sibaq Training Academy • Mentor Performance Hub</div>
        <div>Assigned Mentor Verification: ___________________________</div>
      </div>

      <script>
        window.focus();
        setTimeout(function() {
          try { window.print(); } catch(e) {}
        }, 300);
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
