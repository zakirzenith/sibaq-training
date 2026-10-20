import { state, getProgressStatus } from '../services/state.js';
import { getIcon } from './icons.js';
import { openRecordMeetModal } from './modals/recordMeetModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { openTrainerProfileModal } from './modals/trainerProfileModal.js';
import { createFilterBar } from './filterEngine.js';
import { toast } from './toast.js';

/**
 * Daily Progress & Mentorship Tracker View
 * Controller Panel View supporting:
 *   1. Candidate Check-ins Tracker (individual student meet progress)
 *   2. Trainer Report (Daily trainer accountability, showing who met, partially met, or missed after 11:59 PM cutoff)
 */
export function renderDailyProgressView(container, navigateTo) {
  const todayStr = new Date().toISOString().split('T')[0];
  let selectedDate = todayStr;
  let viewMode = 'candidates'; // 'candidates' or 'trainers'
  let activeFilters = {};
  let currentSearchQuery = '';
  let statusTabFilter = 'ALL'; // ALL, MET, PARTIAL, PENDING, MISSED
  const expandedRows = new Set(); // tracks expanded candidate IDs
  const expandedTrainers = new Set(); // tracks expanded trainer IDs

  function renderView() {
    const summary = state.getDailySummary(selectedDate);
    const trainerData = state.getTrainersDailyReport(selectedDate);

    const isToday = selectedDate === todayStr;
    const isYesterday = (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return selectedDate === y.toISOString().split('T')[0];
    })();

    container.innerHTML = `
      <!-- Top Hero / Header Area -->
      <div class="saas-view-header daily-progress-header">
        <div class="svh-title-block">
          <div class="svh-badge-row" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="badge ${viewMode === 'trainers' ? 'badge-primary' : 'badge-stage'}">
              ${viewMode === 'trainers' ? '🧑‍🏫 Mentor Accountability' : '👥 Candidate Tracker'}
            </span>
            <span class="badge badge-portal-active">Auto Cutoff: 11:59 PM Daily</span>
            <span class="badge badge-category-pill">${selectedDate}</span>
          </div>

          <h1 class="svh-title">
            ${viewMode === 'trainers' ? 'Daily Trainer Mentorship Reports' : 'Daily Mentorship & Progress'}
          </h1>
          <p class="svh-desc">
            ${viewMode === 'trainers' 
              ? `Daily trainer accountability report for ${selectedDate}. Monitors trainer check-ins with mentees. If a trainer hasn't met with their mentee and 11:59 PM passes, they are marked as Missed; partially met trainers are marked as Partially Met.`
              : `Daily trainer check-ins, dynamic skill ratings, and multi-session tracking for ${selectedDate}. Every candidate must complete at least 1 meet daily.`}
          </p>
        </div>

        <div class="saas-header-actions" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <!-- Primary Mode Switcher Capsule (Candidate vs Trainer Report) -->
          <div class="daily-mode-capsule" role="tablist" aria-label="Daily View Mode">
            <button type="button" class="dmc-btn ${viewMode === 'candidates' ? 'active' : ''}" id="btnModeCandidates" data-mode="candidates" title="View Candidate Check-in Roster">
              ${getIcon('candidates')}
              <span>Candidates</span>
              <span class="dmc-badge">${summary.totalScheduled}</span>
            </button>
            <button type="button" class="dmc-btn ${viewMode === 'trainers' ? 'active' : ''}" id="btnModeTrainers" data-mode="trainers" title="View Daily Trainer Mentorship Activity Report">
              ${getIcon('trainers')}
              <span>Trainer Report</span>
              <span class="dmc-badge">${trainerData.totalTrainers}</span>
            </button>
          </div>

          <!-- Segmented Date Control Capsule -->
          <div class="saas-date-segmented">
            <button type="button" class="saas-date-btn ${isYesterday ? 'active' : ''}" id="btnDateYesterday">Yesterday</button>
            <button type="button" class="saas-date-btn ${isToday ? 'active' : ''}" id="btnDateToday">Today</button>
            <div class="saas-date-input-wrap" title="Select specific date">
              <span class="sdi-icon">${getIcon('calendar')}</span>
              <input type="date" id="dailyDatePicker" value="${selectedDate}" class="saas-date-input" />
            </div>
          </div>

          <!-- Export CSV Button (Desktop Only) -->
          <button type="button" id="btnExportDailyReport" class="saas-pill-btn desktop-only-btn" title="Export report to CSV">
            ${getIcon('download')} <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Unified Interactive Daily Check-In Command Hub -->
      <div class="daily-checkin-hub" id="dailyCheckinHub">
        <!-- Rendered dynamically below -->
      </div>

      <!-- Modern Notion/Linear Filter Engine -->
      <div id="dailyProgressFilterBar"></div>

      <!-- Modern Table Container for Floating SaaS Rows -->
      <div class="saas-roster-container">
        <div id="dailyCandidatesRoster" class="saas-roster-list">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    // Attach Mode Switchers
    const btnModeCand = container.querySelector('#btnModeCandidates');
    const btnModeTrn = container.querySelector('#btnModeTrainers');
    if (btnModeCand) {
      btnModeCand.onclick = () => {
        if (viewMode !== 'candidates') {
          viewMode = 'candidates';
          statusTabFilter = 'ALL';
          activeFilters = {};
          renderView();
        }
      };
    }
    if (btnModeTrn) {
      btnModeTrn.onclick = () => {
        if (viewMode !== 'trainers') {
          viewMode = 'trainers';
          statusTabFilter = 'ALL';
          activeFilters = {};
          renderView();
        }
      };
    }

    // Attach Date Switchers
    const btnToday = container.querySelector('#btnDateToday');
    const btnYesterday = container.querySelector('#btnDateYesterday');
    const datePicker = container.querySelector('#dailyDatePicker');

    if (btnToday) {
      btnToday.onclick = () => {
        selectedDate = todayStr;
        renderView();
      };
    }
    if (btnYesterday) {
      btnYesterday.onclick = () => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        selectedDate = y.toISOString().split('T')[0];
        renderView();
      };
    }
    if (datePicker) {
      datePicker.onchange = (e) => {
        selectedDate = e.target.value;
        renderView();
      };
    }

    // Attach CSV Export
    const btnExport = container.querySelector('#btnExportDailyReport');
    if (btnExport) {
      btnExport.onclick = () => exportReportCsv();
    }

    // Render Hub
    renderCommandHub();

    // Render Filter Bar
    renderFilterEngine();

    // Render Roster Content
    renderRosterOnly();
  }

  function renderCommandHub() {
    const hub = container.querySelector('#dailyCheckinHub');
    if (!hub) return;

    if (viewMode === 'candidates') {
      const summary = state.getDailySummary(selectedDate);
      const total = summary.totalScheduled || 0;
      const met = summary.metCount || 0;
      const partial = summary.partialCount || 0;
      const pending = summary.pendingCount || 0;
      const missed = summary.missedCount || 0;
      const metPct = total > 0 ? Math.round(((met + partial * 0.5) / total) * 100) : 0;
      const readiness = summary.avgScore || 0;
      const readinessStatus = readiness > 0 ? getProgressStatus(readiness) : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

      hub.innerHTML = `
        <div class="dch-top-row">
          <div class="dch-progress-wrap">
            <div class="dch-progress-meta">
              <span class="dch-progress-title">
                <strong>${met}</strong> Fully Met ${partial > 0 ? `• <strong>${partial}</strong> Partial` : ''} of <strong>${total}</strong> Candidates
              </span>
              <span class="dch-progress-pct">${metPct}% Complete</span>
            </div>
            <div class="dch-progress-track">
              <div class="dch-progress-bar-fill" style="width: ${metPct}%;"></div>
            </div>
          </div>

          <div class="dch-readiness-wrap">
            <div class="dch-readiness-val" style="color: ${readinessStatus.color || '#3b82f6'};">${readiness}%</div>
            <div class="dch-readiness-info">
              <span class="dch-readiness-label">Average Score</span>
              <span class="badge ${readinessStatus.badgeClass} dch-readiness-badge">${readinessStatus.label}</span>
            </div>
          </div>
        </div>

        <div class="dch-filter-tabs">
          <button type="button" class="dch-tab-btn ${statusTabFilter === 'ALL' ? 'active' : ''}" data-status="ALL">
            <span>All Candidates</span>
            <span class="dch-tab-badge">${total}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-met ${statusTabFilter === 'MET' ? 'active' : ''}" data-status="MET">
            <span class="dch-tab-icon text-emerald">${getIcon('checkCircle')}</span>
            <span>Fully Met</span>
            <span class="dch-tab-badge badge-emerald">${met}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-partial ${statusTabFilter === 'PARTIAL' ? 'active' : ''}" data-status="PARTIAL">
            <span class="dch-tab-icon text-orange">${getIcon('halfCircle')}</span>
            <span>Partially Met</span>
            <span class="dch-tab-badge badge-orange">${partial}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-pending ${statusTabFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING">
            <span class="dch-tab-icon text-amber">${getIcon('clock')}</span>
            <span>Pending</span>
            <span class="dch-tab-badge badge-amber">${pending}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-missed ${statusTabFilter === 'MISSED' ? 'active' : ''}" data-status="MISSED">
            <span class="dch-tab-icon text-danger">${getIcon('xCircle')}</span>
            <span>Missed</span>
            <span class="dch-tab-badge badge-danger">${missed}</span>
          </button>
        </div>
      `;
    } else {
      // TRAINER REPORT HUB
      const trData = state.getTrainersDailyReport(selectedDate);
      const total = trData.totalTrainers || 0;
      const met = trData.fullyMetCount || 0;
      const partial = trData.partiallyMetCount || 0;
      const pending = trData.pendingCount || 0;
      const missed = trData.missedCount || 0;
      const withMentees = trData.trainersWithMenteesCount || 0;

      hub.innerHTML = `
        <div class="dch-top-row">
          <div class="dch-progress-wrap">
            <div class="dch-progress-meta">
              <span class="dch-progress-title">
                <strong>${met}</strong> Fully Met ${partial > 0 ? `• <strong>${partial}</strong> Partial` : ''} of <strong>${withMentees}</strong> Mentors with Assigned Mentees
              </span>
              <span class="dch-progress-pct">${trData.compliancePct}% Active</span>
            </div>
            <div class="dch-progress-track">
              <div class="dch-progress-bar-fill" style="width: ${trData.compliancePct}%; background: linear-gradient(90deg, #10b981 0%, #059669 100%);"></div>
            </div>
          </div>

          <div class="dch-readiness-wrap">
            <div class="dch-readiness-val" style="color: #4f46e5;">${trData.totalMeetsLogged}</div>
            <div class="dch-readiness-info">
              <span class="dch-readiness-label">Sessions Logged</span>
              <span class="badge badge-primary-subtle dch-readiness-badge">On ${selectedDate}</span>
            </div>
          </div>
        </div>

        <div class="dch-filter-tabs">
          <button type="button" class="dch-tab-btn ${statusTabFilter === 'ALL' ? 'active' : ''}" data-status="ALL">
            <span>All Mentors</span>
            <span class="dch-tab-badge">${total}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-met ${statusTabFilter === 'MET' ? 'active' : ''}" data-status="MET">
            <span class="dch-tab-icon text-emerald">${getIcon('checkCircle')}</span>
            <span>Fully Met</span>
            <span class="dch-tab-badge badge-emerald">${met}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-partial ${statusTabFilter === 'PARTIAL' ? 'active' : ''}" data-status="PARTIAL">
            <span class="dch-tab-icon text-orange">${getIcon('halfCircle')}</span>
            <span>Partially Met</span>
            <span class="dch-tab-badge badge-orange">${partial}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-pending ${statusTabFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING">
            <span class="dch-tab-icon text-amber">${getIcon('clock')}</span>
            <span>Pending</span>
            <span class="dch-tab-badge badge-amber">${pending}</span>
          </button>
          <button type="button" class="dch-tab-btn dch-tab-missed ${statusTabFilter === 'MISSED' ? 'active' : ''}" data-status="MISSED">
            <span class="dch-tab-icon text-danger">${getIcon('xCircle')}</span>
            <span>Missed</span>
            <span class="dch-tab-badge badge-danger">${missed}</span>
          </button>
        </div>
      `;
    }

    hub.querySelectorAll('.dch-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        statusTabFilter = btn.getAttribute('data-status');
        hub.querySelectorAll('.dch-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderRosterOnly();
      });
    });
  }

  function renderFilterEngine() {
    const filterContainer = container.querySelector('#dailyProgressFilterBar');
    if (!filterContainer) return;
    filterContainer.innerHTML = '';

    if (viewMode === 'candidates') {
      createFilterBar({
        container: filterContainer,
        searchPlaceholder: 'Search student name, admission no, class, or program...',
        filterConfig: [
          {
            key: 'status',
            label: 'Evaluation Status',
            icon: 'chart',
            getOptions: () => {
              const summary = state.getDailySummary(selectedDate);
              return [
                { value: 'MET', label: 'Fully Met (All Programs)', count: summary.metCount },
                { value: 'PARTIAL', label: 'Partially Met (1+ Remaining)', count: summary.partialCount },
                { value: 'PENDING', label: 'Pending Check-in (0 Met)', count: summary.pendingCount },
                { value: 'MISSED', label: 'Missed (Past Cutoff)', count: summary.missedCount }
              ];
            }
          },
          {
            key: 'program',
            label: 'Program',
            icon: 'programs',
            getOptions: () => {
              const progs = state.getPrograms();
              return progs.map(p => ({
                value: p.id,
                label: `[${p.code}] ${p.name}`,
                count: (p.candidateIds || []).length
              }));
            }
          },
          {
            key: 'trainer',
            label: 'Trainer',
            icon: 'trainers',
            getOptions: () => {
              const trainers = state.getTrainers();
              return trainers.map(t => ({
                value: t.id,
                label: t.name,
                count: state.getTrainerMentees(t.id).length
              }));
            }
          },
          {
            key: 'category',
            label: 'Category',
            icon: 'tag',
            getOptions: () => {
              const cands = state.getCandidates();
              const counts = {};
              cands.forEach(c => {
                const cat = c.category || 'General';
                counts[cat] = (counts[cat] || 0) + 1;
              });
              return Object.keys(counts).sort().map(cat => ({
                value: cat,
                label: cat,
                count: counts[cat]
              }));
            }
          }
        ],
        onFilterChange: (filters, search) => {
          activeFilters = filters;
          currentSearchQuery = search;
          renderRosterOnly();
        }
      });
    } else {
      // TRAINER REPORT FILTER CONFIG
      createFilterBar({
        container: filterContainer,
        searchPlaceholder: 'Search mentor name, username, phone, or mentee name...',
        filterConfig: [
          {
            key: 'status',
            label: 'Activity Status',
            icon: 'chart',
            getOptions: () => {
              const trData = state.getTrainersDailyReport(selectedDate);
              return [
                { value: 'MET', label: 'Fully Met (All Mentees)', count: trData.fullyMetCount },
                { value: 'PARTIAL', label: 'Partially Met (1+ Remaining)', count: trData.partiallyMetCount },
                { value: 'PENDING', label: 'Pending Check-in (Today)', count: trData.pendingCount },
                { value: 'MISSED', label: 'Missed (Past 11:59 PM)', count: trData.missedCount },
                { value: 'NO_MENTEES', label: 'No Mentees Assigned', count: trData.noMenteesCount }
              ];
            }
          },
          {
            key: 'expertise',
            label: 'Domain / Subject',
            icon: 'award',
            getOptions: () => {
              const trainers = state.getTrainers();
              const counts = {};
              trainers.forEach(t => {
                const exp = t.expertise || 'General Coaching';
                counts[exp] = (counts[exp] || 0) + 1;
              });
              return Object.keys(counts).sort().map(exp => ({
                value: exp,
                label: exp,
                count: counts[exp]
              }));
            }
          }
        ],
        onFilterChange: (filters, search) => {
          activeFilters = filters;
          currentSearchQuery = search;
          renderRosterOnly();
        }
      });
    }
  }

  function renderRosterOnly() {
    const rosterGrid = container.querySelector('#dailyCandidatesRoster');
    if (!rosterGrid) return;
    rosterGrid.innerHTML = '';

    if (viewMode === 'candidates') {
      renderCandidatesRoster(rosterGrid);
    } else {
      renderTrainersRoster(rosterGrid);
    }
  }

  // ==========================================
  // CANDIDATE ROSTER RENDERER
  // ==========================================
  function renderCandidatesRoster(rosterGrid) {
    const summary = state.getDailySummary(selectedDate);

    const filtered = summary.candidateStatuses.filter(item => {
      const c = item.candidate;
      const q = currentSearchQuery.toLowerCase().trim();

      // Quick tab filter
      if (statusTabFilter === 'MET' && !item.isMet) return false;
      if (statusTabFilter === 'PARTIAL' && !item.isPartiallyMet) return false;
      if (statusTabFilter === 'PENDING' && !item.isPending) return false;
      if (statusTabFilter === 'MISSED' && !item.isMissed) return false;

      // Filter engine: Status
      if (activeFilters.status) {
        if (activeFilters.status === 'MET' && !item.isMet) return false;
        if (activeFilters.status === 'PARTIAL' && !item.isPartiallyMet) return false;
        if (activeFilters.status === 'PENDING' && !item.isPending) return false;
        if (activeFilters.status === 'MISSED' && !item.isMissed) return false;
      }

      // Filter engine: Program
      if (activeFilters.program) {
        const hasProg = item.programs.some(p => p.id === activeFilters.program);
        if (!hasProg) return false;
      }

      // Filter engine: Trainer
      if (activeFilters.trainer) {
        const hasTrn = item.trainers.some(t => t.id === activeFilters.trainer);
        if (!hasTrn) return false;
      }

      // Filter engine: Category
      if (activeFilters.category) {
        if (c.category !== activeFilters.category) return false;
      }

      // Search query
      if (q) {
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesAd = (c.adNo || '').toLowerCase().includes(q);
        const matchesChest = (c.chestNo || '').toLowerCase().includes(q);
        const matchesClass = (c.class || '').toLowerCase().includes(q);
        const matchesProg = item.programs.some(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        const matchesTrn = item.trainers.some(t => t.name.toLowerCase().includes(q));
        if (!matchesName && !matchesAd && !matchesChest && !matchesClass && !matchesProg && !matchesTrn) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      rosterGrid.innerHTML = `
        <div class="saas-empty-card" style="text-align: center; padding: 36px 16px;">
          <div class="empty-icon">${getIcon('trendingUp')}</div>
          <h4 style="margin: 8px 0 4px; font-size: 15px;">No matching candidates</h4>
          <p class="text-muted text-xs">Try selecting a different status filter, clearing search, or changing date.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const c = item.candidate;
      const meets = item.meets;
      const latestMeet = item.latestMeet;
      const isExpanded = expandedRows.has(c.id);

      const firstPendingPb = item.programBreakdown.find(pb => !pb.isMet);
      const targetProgForMeet = firstPendingPb ? firstPendingPb.program : (item.programs[0] || null);
      const targetTrainerForMeet = firstPendingPb && firstPendingPb.trainer ? firstPendingPb.trainer : (item.trainers[0] || null);
      const primaryProgram = item.programs[0] || null;
      const primaryTrainer = item.trainers[0] || null;
      const nextMeetNum = meets.length + 1;

      // Card wrapper with status-colored border
      const rowCard = document.createElement('div');
      rowCard.className = `saas-candidate-row ${
        item.isMissed 
          ? 'row-missed' 
          : (item.isMet 
              ? 'row-met' 
              : (item.isPartiallyMet ? 'row-partial' : 'row-pending'))
      }`;

      // Status pill HTML: "all meet, partial meet with bracket(2/5)"
      let statusCapsuleHtml = '';
      if (item.isMet) {
        const pStatus = latestMeet ? getProgressStatus(latestMeet.percentage) : { label: 'Met' };
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-met">
            <span class="saas-status-icon text-emerald">${getIcon('checkCircle')}</span>
            <span class="saas-meet-pill">${item.totalPrograms > 0 ? `All Meet (${item.metProgramsCount}/${item.totalPrograms})` : `Meet #${meets.length}`}</span>
            ${latestMeet ? `<span class="saas-score-num"><strong>${latestMeet.percentage}%</strong></span>` : ''}
            <span class="saas-score-label">${pStatus.label}</span>
          </div>
        `;
      } else if (item.isPartiallyMet) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-partial">
            <span class="saas-status-icon text-orange">${getIcon('halfCircle')}</span>
            <span class="saas-meet-pill" style="color: #c2410c; background: #fff; font-weight: 700;">Partial Meet (${item.metProgramsCount}/${item.totalPrograms})</span>
            ${latestMeet ? `<span class="saas-score-num"><strong>${latestMeet.percentage}%</strong></span>` : ''}
          </div>
        `;
      } else if (item.isMissed) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-missed">
            <span class="saas-status-icon text-danger">${getIcon('xCircle')}</span>
            <span class="saas-score-label">Missed</span>
            <span class="text-muted text-xs desktop-only-btn">${item.totalPrograms > 0 ? `(0/${item.totalPrograms})` : '(Cutoff)'}</span>
          </div>
        `;
      } else {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-pending">
            <span class="saas-status-icon text-amber">${getIcon('clock')}</span>
            <span class="saas-score-label">${item.totalPrograms > 1 ? `Pending (0/${item.totalPrograms})` : 'Pending'}</span>
            <span class="text-muted text-xs desktop-only-btn">Due today</span>
          </div>
        `;
      }

      // Drawer program content generator
      const defaultDrawerPid = item.programs.length > 0 ? item.programs[0].id : 'ALL';
      let activeDrawerPid = defaultDrawerPid;

      const renderDrawerProgramContent = (targetPid) => {
        activeDrawerPid = targetPid;
        const isAll = targetPid === 'ALL';
        const prog = !isAll ? state.getProgramById(targetPid) : null;
        const progMeets = (isAll 
          ? meets 
          : meets.filter(m => m.programId === targetPid)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const progTrainer = prog && prog.trainerId ? state.getTrainerById(prog.trainerId) : null;

        if (progMeets.length === 0) {
          return `
            <div class="compact-empty-strip status-red-strip" style="background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="prog-code-rect rect-red" style="pointer-events: none; cursor: default; padding: 3px 8px;">${prog ? prog.code : 'PRG'}</span>
                <span class="ces-text" style="font-size: 12px; color: #991b1b; line-height: 1.4;">
                  <strong>Pending Check-in:</strong> No check-ins recorded today (${selectedDate}) ${prog ? `for <strong>${prog.name}</strong>` : ''}.
                  ${prog ? (progTrainer ? `<br><span class="text-xs text-muted" style="color: #64748b;">Mentor: <strong>${progTrainer.name}</strong></span>` : '<br><span class="text-xs text-danger">Mentor: <strong>Unassigned</strong></span>') : ''}
                </span>
              </div>
              <div class="drawer-bottom-action-wrap" style="display: flex; justify-content: flex-end; margin-top: 4px;">
                <button type="button" class="btn-compact-add btn-drawer-record-meet btn-saas-primary" data-cid="${c.id}" data-pid="${prog ? prog.id : ''}" data-tid="${progTrainer ? progTrainer.id : ''}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 8px;">
                  ${getIcon('plus')} Record Meet 1 for ${prog ? prog.code : 'Program'}
                </button>
              </div>
            </div>
          `;
        }

        return `
          <div class="compact-sessions-scroll">
            ${prog ? `
              <div class="drawer-prog-completed-banner" style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 9px 12px;">
                <span class="prog-code-rect rect-green" style="pointer-events: none; cursor: default; padding: 2px 7px;">${prog.code}</span>
                <span style="font-size: 12px; font-weight: 700; color: #166534;">
                  Completed Today • ${progMeets.length} session(s) recorded for ${prog.name}
                </span>
              </div>
            ` : ''}

            ${progMeets.map((m, idx) => {
              const mStatus = getProgressStatus(m.percentage);
              const mTrn = m.trainerId ? state.getTrainerById(m.trainerId) : null;
              const mProg = m.programId ? state.getProgramById(m.programId) : null;
              const progSessionIdx = idx + 1;

              return `
                <div class="compact-session-strip status-border-${mStatus.key}" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                  <div class="css-head-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                    <div class="css-head-left" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span class="css-meet-pill" style="font-weight: 700; font-size: 11px; background: #eef2ff; color: #4338ca; padding: 2px 7px; border-radius: 5px;">${!isAll && prog ? `Meet #${progSessionIdx}` : `Meet #${m.meetNumber}`}</span>
                      <span class="css-time font-mono text-xs text-muted">${m.time || ''}</span>
                      ${isAll && mProg ? `<span class="saas-prog-capsule p-stage font-bold" style="font-size: 10px; padding: 1px 6px;">${mProg.code}</span>` : ''}
                      <span class="css-mentor text-xs text-muted">Mentor: <strong>${mTrn ? mTrn.name : 'Unassigned'}</strong></span>
                    </div>

                    <div class="css-head-right" style="display: flex; align-items: center; gap: 6px;">
                      <span class="css-score-capsule ${mStatus.badgeClass}">
                        <strong>${m.percentage}%</strong> ${m.status}
                      </span>
                    </div>
                  </div>

                  <div class="css-remark-row" style="margin-top: 4px;">
                    <span class="css-remark-text text-xs text-main" style="display: block; font-style: italic; color: #334155;">"${m.remark || 'No remark entered.'}"</span>
                  </div>
                </div>
              `;
            }).join('')}

            <div class="drawer-bottom-action-wrap" style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button type="button" class="btn-compact-add btn-drawer-record-meet btn-saas-primary" data-cid="${c.id}" data-pid="${prog ? prog.id : (item.programs[0]?.id || '')}" data-tid="${progTrainer ? progTrainer.id : (item.trainers[0]?.id || '')}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 8px;">
                ${getIcon('plus')} ${prog ? `Add Another Session for ${prog.code}` : 'Record New Session'}
              </button>
            </div>
          </div>
        `;
      };

      // Col 2: Program & Designated Mentor (Previous Clean Layout)
      const programColHtml = `
        <div class="src-prog-top">
          ${primaryProgram ? `
            <span class="saas-prog-capsule ${primaryProgram.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
              ${primaryProgram.code}
            </span>
            <span class="saas-prog-name truncate" title="${primaryProgram.name}">
              ${primaryProgram.name}
            </span>
            ${item.programs.length > 1 ? `
              <span class="saas-count-pill">+${item.programs.length - 1}</span>
            ` : ''}
          ` : `
            <span class="text-muted text-xs">No program enrolled</span>
          `}
        </div>

        <div class="src-prog-bottom">
          ${primaryTrainer ? `
            <span class="saas-mentor-pill">
              <span class="saas-dot" style="background: ${primaryTrainer.color || '#6366f1'};"></span>
              <span class="saas-mentor-name">${primaryTrainer.name}</span>
            </span>
          ` : `
            <span class="text-danger text-xs font-semibold">Unassigned Trainer</span>
          `}
        </div>
      `;

      // Action button text and target program
      const actionBtnText = item.isMet 
        ? `${getIcon('plus')} Meet #${nextMeetNum}` 
        : `${getIcon('plus')} Record Meet`;

      rowCard.innerHTML = `
        <div class="saas-row-master">
          <!-- Col 1: Student Identity -->
          <div class="src-col src-student">
            <div class="saas-avatar-soft">
              ${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div class="src-student-info">
              <button type="button" class="saas-student-name btn-open-profile-dialog" data-cid="${c.id}" title="View profile">
                ${c.name}
              </button>
              <div class="saas-meta-strip">
                <span class="saas-code-badge">${c.adNo}</span>
                <span class="saas-bullet">•</span>
                <span class="saas-meta-txt">${c.class || 'No Class'}</span>
                <span class="saas-bullet desktop-only-btn">•</span>
                <span class="saas-meta-txt desktop-only-btn">${c.category}</span>
              </div>
            </div>
          </div>

          <!-- Col 2: Program & Mentor (Clean Previous Layout) -->
          <div class="src-col src-program">
            ${programColHtml}
          </div>

          <!-- Col 3: Evaluation Status -->
          <div class="src-col src-status">
            ${statusCapsuleHtml}
          </div>

          <!-- Col 4: Action & Reports Toggle -->
          <div class="src-col src-action">
            <button type="button" class="saas-action-btn ${item.isMet ? 'saas-btn-accent' : 'saas-btn-primary'} btn-record-meet" data-cid="${c.id}" data-pid="${targetProgForMeet?.id || ''}" data-tid="${targetTrainerForMeet?.id || ''}">
              ${actionBtnText}
            </button>

            <button type="button" class="saas-report-toggle-pill btn-toggle-drawer ${isExpanded ? 'active' : ''}" data-cid="${c.id}" title="${isExpanded ? 'Hide reports' : 'View program meeting reports'}">
              <span class="srt-text">${isExpanded ? 'Hide' : `Reports (${meets.length})`}</span>
              <span class="saas-chevron ${isExpanded ? 'open' : ''}">▼</span>
            </button>
          </div>
        </div>

        <!-- Expandable Drawer for Meeting Sessions -->
        <div class="saas-row-drawer" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="drawer-compact-tray">
            <div class="drawer-compact-nav" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div class="dcn-rects-group" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span class="dcn-label text-xs text-muted" style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Programs:</span>
                ${item.programBreakdown.map(pb => {
                  const p = pb.program;
                  const isSelected = p.id === activeDrawerPid;
                  const isComplete = pb.isMet;
                  return `
                    <button 
                      type="button" 
                      class="prog-code-rect ${isComplete ? 'rect-green' : 'rect-red'} ${isSelected ? 'active-rect' : ''}" 
                      data-pid="${p.id}" 
                      title="${p.name} • ${isComplete ? `Complete (${pb.meetCount} meet today)` : 'Pending / Not met today'}"
                    >
                      <span class="pcr-code">${p.code}</span>
                      <span class="pcr-icon">${isComplete ? getIcon('checkCircle') : getIcon('clock')}</span>
                      <span class="pcr-status">${isComplete ? 'Complete' : 'Pending'}</span>
                    </button>
                  `;
                }).join('')}

                ${item.programs.length > 1 ? `
                  <button type="button" class="prog-code-rect rect-all ${activeDrawerPid === 'ALL' ? 'active-rect' : ''}" data-pid="ALL" title="All programs combined">
                    <span class="pcr-code">ALL</span>
                    <span class="pcr-status">${meets.length} Meets</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Compact Sessions Content Container -->
            <div class="drawer-compact-content">
              ${renderDrawerProgramContent(activeDrawerPid)}
            </div>
          </div>
        </div>
      `;

      if (isExpanded) {
        rowCard.classList.add('row-expanded');
      }

      // Drawer toggle handler
      const toggleBtn = rowCard.querySelector('.btn-toggle-drawer');
      const drawer = rowCard.querySelector('.saas-row-drawer');
      const chevron = rowCard.querySelector('.saas-chevron');

      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        const srtText = toggleBtn.querySelector('.srt-text');
        if (expandedRows.has(c.id)) {
          expandedRows.delete(c.id);
          drawer.style.display = 'none';
          rowCard.classList.remove('row-expanded');
          toggleBtn.classList.remove('active');
          chevron.classList.remove('open');
          if (srtText) srtText.textContent = `Reports (${meets.length})`;
        } else {
          expandedRows.add(c.id);
          drawer.style.display = 'block';
          rowCard.classList.add('row-expanded');
          toggleBtn.classList.add('active');
          chevron.classList.add('open');
          if (srtText) srtText.textContent = 'Hide';
        }
      };

      // Wire program tab buttons inside drawer
      const tabBtns = drawer.querySelectorAll('.prog-code-rect');
      const drawerContent = drawer.querySelector('.drawer-compact-content');

      const wireRecordButtons = () => {
        drawer.querySelectorAll('.btn-drawer-record-meet').forEach(btn => {
          btn.onclick = (ev) => {
            ev.stopPropagation();
            const cid = btn.getAttribute('data-cid');
            const pId = btn.getAttribute('data-pid');
            const tId = btn.getAttribute('data-tid');
            openRecordMeetModal({
              candidateId: cid,
              programId: pId || null,
              trainerId: tId || null,
              dateStr: selectedDate,
              onSave: renderView
            });
          };
        });
      };

      wireRecordButtons();

      tabBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          tabBtns.forEach(b => b.classList.remove('active-rect'));
          btn.classList.add('active-rect');
          const pid = btn.getAttribute('data-pid');
          drawerContent.innerHTML = renderDrawerProgramContent(pid);
          wireRecordButtons();
        };
      });

      // Record meet button
      rowCard.querySelector('.btn-record-meet').onclick = (e) => {
        e.stopPropagation();
        openRecordMeetModal({
          candidateId: c.id,
          programId: targetProgForMeet?.id || null,
          trainerId: targetTrainerForMeet?.id || null,
          dateStr: selectedDate,
          onSave: renderView
        });
      };

      // Profile modal button
      rowCard.querySelector('.btn-open-profile-dialog').onclick = (e) => {
        e.stopPropagation();
        openCandidateProfileModal({ candidateId: c.id, onUpdate: renderView });
      };

      rosterGrid.appendChild(rowCard);
    });
  }

  // ==========================================
  // TRAINER ROSTER RENDERER (DAILY ACCOUNTABILITY)
  // ==========================================
  function renderTrainersRoster(rosterGrid) {
    const trData = state.getTrainersDailyReport(selectedDate);

    const filtered = trData.trainerReports.filter(tr => {
      // Tab filter
      if (statusTabFilter === 'MET' && !tr.isMet) return false;
      if (statusTabFilter === 'PARTIAL' && !tr.isPartial) return false;
      if (statusTabFilter === 'PENDING' && !tr.isPending) return false;
      if (statusTabFilter === 'MISSED' && !tr.isMissed) return false;

      // Filter engine: Status
      if (activeFilters.status) {
        if (activeFilters.status === 'MET' && !tr.isMet) return false;
        if (activeFilters.status === 'PARTIAL' && !tr.isPartial) return false;
        if (activeFilters.status === 'PENDING' && !tr.isPending) return false;
        if (activeFilters.status === 'MISSED' && !tr.isMissed) return false;
        if (activeFilters.status === 'NO_MENTEES' && !tr.hasNoMentees) return false;
      }

      // Filter engine: Expertise
      if (activeFilters.expertise) {
        const exp = tr.trainer.expertise || 'General Coaching';
        if (exp !== activeFilters.expertise) return false;
      }

      // Search query
      if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase().trim();
        const nameMatch = tr.trainer.name.toLowerCase().includes(q);
        const userMatch = (tr.trainer.username || '').toLowerCase().includes(q);
        const phoneMatch = (tr.trainer.phone || '').toLowerCase().includes(q);
        const expMatch = (tr.trainer.expertise || '').toLowerCase().includes(q);
        const menteeMatch = tr.menteeBreakdown.some(m => 
          m.candidate.name.toLowerCase().includes(q) || 
          (m.candidate.adNo || '').toLowerCase().includes(q) ||
          (m.candidate.chestNo || '').toLowerCase().includes(q)
        );
        if (!nameMatch && !userMatch && !phoneMatch && !expMatch && !menteeMatch) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      rosterGrid.innerHTML = `
        <div class="saas-empty-card" style="text-align: center; padding: 36px 16px;">
          <div class="empty-icon">${getIcon('trainers')}</div>
          <h4 style="margin: 8px 0 4px; font-size: 15px;">No matching trainers found</h4>
          <p class="text-muted text-xs">Try selecting a different status filter, clearing search, or picking another date.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(tr => {
      const trainer = tr.trainer;
      const isExpanded = expandedTrainers.has(trainer.id);
      const coveragePct = tr.totalMentees > 0 
        ? Math.round((tr.metMenteesCount / tr.totalMentees) * 100) 
        : (tr.totalMeetsLogged > 0 ? 100 : 0);

      const barColor = tr.isMet ? '#10b981' : (tr.isPartial ? '#f59e0b' : (tr.isMissed ? '#ef4444' : '#94a3b8'));

      const rowCard = document.createElement('div');
      rowCard.className = `saas-candidate-row trainer-daily-card ${
        tr.isMissed 
          ? 'row-missed' 
          : (tr.isMet 
              ? 'row-met' 
              : (tr.isPartial ? 'row-partial' : (tr.hasNoMentees ? 'row-neutral' : 'row-pending')))
      }`;

      // Status pill HTML
      let statusCapsuleHtml = '';
      if (tr.isMet) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-met">
            <span class="saas-status-icon text-emerald">${getIcon('checkCircle')}</span>
            <span class="saas-meet-pill" style="font-weight: 800;">${tr.statusLabel}</span>
            ${tr.avgScore > 0 ? `<span class="saas-score-num"><strong>${tr.avgScore}%</strong></span>` : ''}
          </div>
          <span class="text-emerald text-xs desktop-only-btn" style="font-weight: 700; margin-top: 3px;">All check-ins verified</span>
        `;
      } else if (tr.isPartial) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-partial">
            <span class="saas-status-icon text-orange">${getIcon('halfCircle')}</span>
            <span class="saas-meet-pill" style="color: #c2410c; background: #fff; font-weight: 800;">${tr.statusLabel}</span>
            ${tr.avgScore > 0 ? `<span class="saas-score-num"><strong>${tr.avgScore}%</strong></span>` : ''}
          </div>
          <span class="text-orange text-xs desktop-only-btn" style="font-weight: 700; margin-top: 3px;">${tr.pendingMenteesCount} mentee(s) remaining</span>
        `;
      } else if (tr.isMissed) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-missed">
            <span class="saas-status-icon text-danger">${getIcon('xCircle')}</span>
            <span class="saas-meet-pill" style="color: #991b1b; background: #fff; font-weight: 800;">${tr.statusLabel}</span>
          </div>
          <span class="text-danger text-xs" style="font-weight: 700; margin-top: 3px;">⚠️ 11:59 PM cutoff passed</span>
        `;
      } else if (tr.hasNoMentees) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-pending" style="background: #f1f5f9; border-color: #e2e8f0;">
            <span class="saas-status-icon text-muted">${getIcon('info')}</span>
            <span class="saas-meet-pill" style="color: #64748b; background: #fff; font-weight: 700;">No Mentees</span>
          </div>
          <span class="text-muted text-xs desktop-only-btn" style="margin-top: 3px;">Unassigned</span>
        `;
      } else {
        // PENDING (Today, before cutoff)
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-pending">
            <span class="saas-status-icon text-amber">${getIcon('clock')}</span>
            <span class="saas-meet-pill" style="color: #92400e; background: #fff; font-weight: 800;">${tr.statusLabel}</span>
          </div>
          <span class="text-amber text-xs desktop-only-btn" style="font-weight: 700; margin-top: 3px;">Awaiting meet before 11:59 PM</span>
        `;
      }

      const cleanPhone = (trainer.phone || '').replace(/[^0-9+]/g, '');

      rowCard.innerHTML = `
        <div class="saas-row-master trainer-master-row">
          <!-- Col 1: Mentor Identity -->
          <div class="src-trainer">
            <div class="saas-avatar-soft tdc-avatar" style="background: ${trainer.color || '#059669'};">
              ${trainer.photo 
                ? `<img src="${trainer.photo}" alt="${trainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                : trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div class="src-meta-wrap">
              <div class="src-name-row">
                <span class="saas-cand-name btn-open-trainer-profile" data-tid="${trainer.id}" title="Click to view mentor profile">${trainer.name}</span>
                ${trainer.username ? `<span class="badge badge-neutral-xs">@${trainer.username}</span>` : ''}
              </div>
              <div class="src-sub-row" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="badge badge-category-subtle">${trainer.expertise || 'General Mentor'}</span>
                ${trainer.phone ? `
                  <a href="tel:${cleanPhone}" class="trainer-phone-chip" title="Call ${trainer.name}">
                    ${getIcon('phone')}
                    <span>${trainer.phone}</span>
                  </a>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Col 2: Assigned Mentees Progress -->
          <div class="src-trainer-mentees">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="font-weight: 800; color: #1e293b;">
                <strong>${tr.metMenteesCount} of ${tr.totalMentees}</strong> Mentees Met
              </span>
              <span style="font-weight: 800; color: ${barColor};">${coveragePct}%</span>
            </div>
            <div style="width: 100%; height: 7px; background: #f1f5f9; border-radius: 9999px; overflow: hidden;">
              <div style="width: ${coveragePct}%; height: 100%; background: ${barColor}; border-radius: 9999px; transition: width 0.4s ease;"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #64748b; flex-wrap: wrap;">
              <span>📅 <strong>${tr.totalMeetsLogged}</strong> ${tr.totalMeetsLogged === 1 ? 'meet' : 'meets'} logged</span>
              <span>&bull;</span>
              <span><strong>${tr.totalPrograms}</strong> ${tr.totalPrograms === 1 ? 'program' : 'programs'}</span>
              ${tr.avgScore > 0 ? `<span>&bull;</span><span style="color: #059669; font-weight: 700;">⭐ ${tr.avgScore}% avg</span>` : ''}
            </div>
          </div>

          <!-- Col 3: Evaluation Status -->
          <div class="src-trainer-status">
            ${statusCapsuleHtml}
          </div>

          <!-- Col 4: Action -->
          <div class="src-trainer-action">
            <button type="button" class="saas-report-toggle-pill btn-toggle-trainer-accordion ${isExpanded ? 'active' : ''}" data-tid="${trainer.id}">
              <span class="srt-text">${isExpanded ? 'Hide' : `Mentees (${tr.totalMentees})`}</span>
              <span class="saas-chevron ${isExpanded ? 'open' : ''}">▼</span>
            </button>
          </div>
        </div>

        <!-- Expandable Drawer for Mentee Checklist -->
        <div class="saas-row-drawer" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="trainer-mentee-drawer-content">
            <div class="tmd-header">
              <h4 class="tmd-title">
                ${getIcon('award')}
                <span>Assigned Mentees Checklist for ${selectedDate}</span>
              </h4>
              <span class="badge badge-neutral-xs">${tr.metMenteesCount}/${tr.totalMentees} Verified Met</span>
            </div>

            ${tr.menteeBreakdown.length > 0 ? `
              <div class="trainer-mentee-checklist-grid">
                ${tr.menteeBreakdown.map(mb => {
                  const c = mb.candidate;
                  const meet = mb.latestMeet;
                  const prog = mb.programs[0] || null;

                  return `
                    <div class="tmc-card ${mb.isMet ? 'is-met' : (selectedDate < todayStr ? 'is-missed' : 'is-pending')}">
                      <div class="tmc-top-row" style="display: flex; gap: 10px; align-items: center;">
                        <div class="saas-avatar-soft" style="width: 32px; height: 32px; font-size: 11px; flex-shrink: 0; border-radius: 8px;">
                          ${c.photo ? `<img src="${c.photo}" alt="${c.name}" class="saas-avatar-img" />` : c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div class="tmc-cand-info" style="flex: 1; min-width: 0;">
                          <span class="tmc-cand-name">${c.name}</span>
                          <span class="tmc-cand-meta">AD: ${c.adNo || c.chestNo || 'N/A'} &bull; ${c.category || 'General'}</span>
                        </div>
                        <div class="tmc-status-pill">
                          ${mb.isMet ? `
                            <span class="badge badge-stage">🟢 Met (${meet?.percentage || 0}%)</span>
                          ` : (selectedDate < todayStr ? `
                            <span class="badge badge-danger">🔴 Missed</span>
                          ` : `
                            <span class="badge badge-warning">🟡 Pending</span>
                          `)}
                        </div>
                      </div>

                      ${prog ? `
                        <div class="tmc-prog-badge">
                          [${prog.code}] ${prog.name}
                        </div>
                      ` : ''}

                      ${mb.isMet && meet ? `
                        <div class="tmc-remark-box">
                          "${meet.remark || 'Mentorship drill conducted.'}"
                          ${meet.time ? `<span style="display: block; font-size: 10.5px; color: #64748b; font-style: normal; margin-top: 2px;">Logged at ${meet.time}</span>` : ''}
                        </div>
                      ` : ''}

                      <div class="tmc-action-row">
                        <span style="font-size: 11px; color: #64748b;">
                          ${mb.isMet ? `Meet #${mb.meetCount} Logged` : (selectedDate < todayStr ? '11:59 PM Passed' : 'Awaiting Check-in')}
                        </span>
                        <button type="button" class="btn btn-outline btn-xs btn-record-for-trainer" data-cid="${c.id}" data-tid="${trainer.id}" data-pid="${prog?.id || ''}">
                          ${mb.isMet ? '+ Add Another' : '+ Record Meet'}
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="saas-empty-card" style="padding: 16px; text-align: center; background: #fff; border-radius: 8px;">
                <p class="text-muted text-xs" style="margin: 0;">No candidates are assigned to this mentor yet.</p>
              </div>
            `}
          </div>
        </div>
      `;

      // Accordion toggle
      const toggleBtn = rowCard.querySelector('.btn-toggle-trainer-accordion');
      const drawer = rowCard.querySelector('.saas-row-drawer');
      const chevron = rowCard.querySelector('.saas-chevron');

      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        const srtText = toggleBtn.querySelector('.srt-text');
        if (expandedTrainers.has(trainer.id)) {
          expandedTrainers.delete(trainer.id);
          drawer.style.display = 'none';
          rowCard.classList.remove('row-expanded');
          toggleBtn.classList.remove('active');
          chevron.classList.remove('open');
          if (srtText) srtText.textContent = `Mentees (${tr.totalMentees})`;
        } else {
          expandedTrainers.add(trainer.id);
          drawer.style.display = 'block';
          rowCard.classList.add('row-expanded');
          toggleBtn.classList.add('active');
          chevron.classList.add('open');
          if (srtText) srtText.textContent = 'Hide';
        }
      };

      // Open trainer profile
      rowCard.querySelector('.btn-open-trainer-profile').onclick = (e) => {
        e.stopPropagation();
        openTrainerProfileModal({ trainerId: trainer.id, onUpdate: renderView });
      };

      // Record meet button inside accordion
      rowCard.querySelectorAll('.btn-record-for-trainer').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const cid = btn.getAttribute('data-cid');
          const tid = btn.getAttribute('data-tid');
          const pid = btn.getAttribute('data-pid');
          openRecordMeetModal({
            candidateId: cid,
            trainerId: tid,
            programId: pid || null,
            dateStr: selectedDate,
            onSave: renderView
          });
        };
      });

      rosterGrid.appendChild(rowCard);
    });
  }

  // ==========================================
  // CSV EXPORT LOGIC
  // ==========================================
  function exportReportCsv() {
    if (viewMode === 'candidates') {
      const meets = state.getDailyMeets(selectedDate);
      if (meets.length === 0) {
        toast.info(`No progress records logged for ${selectedDate} to export.`);
        return;
      }

      let csv = 'Candidate Name,Admission No,Class,Category,Program Code,Program Name,Trainer Name,Meet Number,Time,Percentage,Status,Remark\n';
      meets.forEach(m => {
        const c = state.getCandidateById(m.candidateId);
        const p = m.programId ? state.getProgramById(m.programId) : null;
        const t = m.trainerId ? state.getTrainerById(m.trainerId) : null;

        const row = [
          `"${c ? c.name : ''}"`,
          `"${c ? c.adNo : ''}"`,
          `"${c ? c.class : ''}"`,
          `"${c ? c.category : ''}"`,
          `"${p ? p.code : ''}"`,
          `"${p ? p.name : ''}"`,
          `"${t ? t.name : ''}"`,
          `"Meet #${m.meetNumber}"`,
          `"${m.time || ''}"`,
          `"${m.percentage}%"`,
          `"${m.status}"`,
          `"${(m.remark || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(',') + '\n';
      });

      downloadCsv(csv, `Candidate_DailyProgress_${selectedDate}.csv`);
      toast.success(`Exported ${meets.length} daily progress records.`);
    } else {
      // Export Trainer Report
      const trData = state.getTrainersDailyReport(selectedDate);
      let csv = 'Trainer Name,Username,Phone,Expertise,Total Mentees,Mentees Met,Pending Mentees,Total Sessions Logged,Average Score Given,Status,Report Date\n';
      trData.trainerReports.forEach(tr => {
        const row = [
          `"${tr.trainer.name}"`,
          `"${tr.trainer.username || ''}"`,
          `"${tr.trainer.phone || ''}"`,
          `"${tr.trainer.expertise || 'General'}"`,
          `"${tr.totalMentees}"`,
          `"${tr.metMenteesCount}"`,
          `"${tr.pendingMenteesCount}"`,
          `"${tr.totalMeetsLogged}"`,
          `"${tr.avgScore}%"`,
          `"${tr.statusLabel}"`,
          `"${selectedDate}"`
        ];
        csv += row.join(',') + '\n';
      });

      downloadCsv(csv, `Trainer_DailyReport_${selectedDate}.csv`);
      toast.success(`Exported ${trData.trainerReports.length} trainer daily records.`);
    }
  }

  function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Initial render
  renderView();

  // Cross-device sync
  const unsubscribeState = state.subscribe(() => {
    if (!document.body.contains(container)) {
      unsubscribeState();
      return;
    }
    renderView();
  });
}
