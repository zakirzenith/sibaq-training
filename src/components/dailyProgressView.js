import { state, getProgressStatus } from '../services/state.js';
import { getIcon } from './icons.js';
import { openRecordMeetModal } from './modals/recordMeetModal.js';
import { openCandidateProfileModal } from './modals/candidateProfileModal.js';
import { createFilterBar } from './filterEngine.js';
import { toast } from './toast.js';

/**
 * Daily Progress & Mentorship Tracker View
 * Modern SaaS rounded interface with Notion/Linear filter engine and phone-responsive cards.
 */
export function renderDailyProgressView(container, navigateTo) {
  const todayStr = new Date().toISOString().split('T')[0];
  let selectedDate = todayStr;
  let activeFilters = {};
  let currentSearchQuery = '';
  let statusTabFilter = 'ALL'; // Tab shortcut: ALL, MET, PENDING, MISSED
  const expandedRows = new Set(); // tracks expanded candidate IDs

  container.innerHTML = `
    <!-- Top Hero / Header Area -->
    <div class="saas-view-header daily-progress-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Daily Mentorship & Progress</h1>
        <p class="svh-desc">
          Daily trainer check-ins, dynamic skill ratings, and multi-session tracking. Every candidate must complete at least 1 meet daily.
        </p>
      </div>

      <div class="saas-header-actions">
        <!-- Segmented Date Control Capsule -->
        <div class="saas-date-segmented">
          <button class="saas-date-btn" id="btnDateYesterday">Yesterday</button>
          <button class="saas-date-btn active" id="btnDateToday">Today</button>
          <div class="saas-date-input-wrap" title="Select specific date">
            <span class="sdi-icon">${getIcon('calendar')}</span>
            <input type="date" id="dailyDatePicker" value="${selectedDate}" class="saas-date-input" />
          </div>
        </div>

        <!-- Export CSV Button (Desktop Only) -->
        <button id="btnExportDailyReport" class="saas-pill-btn desktop-only-btn" title="Export daily report to CSV">
          ${getIcon('download')} Export CSV
        </button>
      </div>
    </div>

    <!-- Unified Interactive Daily Check-In Command Hub -->
    <div class="daily-checkin-hub" id="dailyCheckinHub">
      <!-- Injected dynamically with progress ring, stats capsule, and interactive status tabs -->
    </div>

    <!-- Modern Notion/Linear Filter Engine -->
    <div id="dailyProgressFilterBar"></div>

    <!-- Modern Table Container for Floating SaaS Rows -->
    <div class="saas-roster-container">
      <div class="saas-table-head desktop-table-view">
        <div class="sth-col sth-candidate">Student & Identity</div>
        <div class="sth-col sth-program">Program & Designated Mentor</div>
        <div class="sth-col sth-status">Daily Evaluation & Score</div>
        <div class="sth-col sth-action">Action</div>
      </div>

      <div id="dailyCandidatesRoster" class="saas-roster-list">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  const datePicker = container.querySelector('#dailyDatePicker');
  const dailyCheckinHub = container.querySelector('#dailyCheckinHub');
  const rosterGrid = container.querySelector('#dailyCandidatesRoster');
  const btnToday = container.querySelector('#btnDateToday');
  const btnYesterday = container.querySelector('#btnDateYesterday');
  const filterBarContainer = container.querySelector('#dailyProgressFilterBar');

  // Modern Notion/Linear Filter Engine
  createFilterBar({
    container: filterBarContainer,
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

  function renderView() {
    const summary = state.getDailySummary(selectedDate);
    const isToday = selectedDate === todayStr;
    const isYesterday = (() => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return selectedDate === y.toISOString().split('T')[0];
    })();

    // Update segmented date buttons active state
    btnToday.classList.toggle('active', isToday);
    btnYesterday.classList.toggle('active', isYesterday);
    datePicker.value = selectedDate;

    // Render Unified Interactive Daily Check-In Command Hub
    const total = summary.totalScheduled || 0;
    const met = summary.metCount || 0;
    const partial = summary.partialCount || 0;
    const pending = summary.pendingCount || 0;
    const missed = summary.missedCount || 0;
    const metPct = total > 0 ? Math.round(((met + partial * 0.5) / total) * 100) : 0;
    const readiness = summary.avgScore || 0;
    const readinessStatus = readiness > 0 ? getProgressStatus(readiness) : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

    dailyCheckinHub.innerHTML = `
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
          <span>All</span>
          <span class="dch-tab-badge">${total}</span>
        </button>
        <button type="button" class="dch-tab-btn dch-tab-met ${statusTabFilter === 'MET' ? 'active' : ''}" data-status="MET">
          <span class="saas-dot dot-emerald"></span>
          <span>Fully Met</span>
          <span class="dch-tab-badge badge-emerald">${met}</span>
        </button>
        <button type="button" class="dch-tab-btn dch-tab-partial ${statusTabFilter === 'PARTIAL' ? 'active' : ''}" data-status="PARTIAL">
          <span class="saas-dot dot-orange"></span>
          <span>Partially Met</span>
          <span class="dch-tab-badge badge-orange">${partial}</span>
        </button>
        <button type="button" class="dch-tab-btn dch-tab-pending ${statusTabFilter === 'PENDING' ? 'active' : ''}" data-status="PENDING">
          <span class="saas-dot dot-amber"></span>
          <span>Pending</span>
          <span class="dch-tab-badge badge-amber">${pending}</span>
        </button>
        <button type="button" class="dch-tab-btn dch-tab-missed ${statusTabFilter === 'MISSED' ? 'active' : ''}" data-status="MISSED">
          <span class="saas-dot dot-danger"></span>
          <span>Missed</span>
          <span class="dch-tab-badge badge-danger">${missed}</span>
        </button>
      </div>
    `;

    dailyCheckinHub.querySelectorAll('.dch-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        statusTabFilter = btn.getAttribute('data-status');
        renderView();
      });
    });

    renderRosterOnly();
  }

  function renderRosterOnly() {
    const summary = state.getDailySummary(selectedDate);

    // Filter candidate statuses
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
        const matchesAd = c.adNo.toLowerCase().includes(q);
        const matchesClass = (c.class || '').toLowerCase().includes(q);
        const matchesProg = item.programs.some(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        const matchesTrn = item.trainers.some(t => t.name.toLowerCase().includes(q));
        if (!matchesName && !matchesAd && !matchesClass && !matchesProg && !matchesTrn) return false;
      }

      return true;
    });

    rosterGrid.innerHTML = '';

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
      const nextMeetNum = meets.length + 1;
      const primaryProgram = item.programs[0] || null;
      const primaryTrainer = item.trainers[0] || null;
      const isExpanded = expandedRows.has(c.id);

      // Identify first pending program for quick-action button
      const firstPendingPb = item.programBreakdown.find(pb => !pb.isMet);
      const targetProgForMeet = firstPendingPb ? firstPendingPb.program : primaryProgram;
      const targetTrainerForMeet = firstPendingPb && firstPendingPb.trainer ? firstPendingPb.trainer : primaryTrainer;

      // Card wrapper with status-colored border
      const rowCard = document.createElement('div');
      rowCard.className = `saas-candidate-row ${
        item.isMissed 
          ? 'row-missed' 
          : (item.isMet 
              ? 'row-met' 
              : (item.isPartiallyMet ? 'row-partial' : 'row-pending'))
      }`;

      // Status pill HTML
      let statusCapsuleHtml = '';
      if (item.isMet) {
        const pStatus = latestMeet ? getProgressStatus(latestMeet.percentage) : { label: 'Met' };
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-met">
            <span class="saas-dot dot-emerald"></span>
            <span class="saas-meet-pill">${item.totalPrograms > 1 ? `All Met (${item.metProgramsCount}/${item.totalPrograms})` : `Meet #${meets.length}`}</span>
            ${latestMeet ? `<span class="saas-score-num"><strong>${latestMeet.percentage}%</strong></span>` : ''}
            <span class="saas-score-label">${pStatus.label}</span>
          </div>
        `;
      } else if (item.isPartiallyMet) {
        statusCapsuleHtml = `
          <div class="saas-status-capsule saas-status-partial">
            <span class="saas-dot dot-orange"></span>
            <span class="saas-meet-pill">${item.metProgramsCount}/${item.totalPrograms} Met</span>
            <span class="saas-score-label" style="font-weight: 700;">${item.pendingProgramsCount} Pending</span>
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
            <div class="compact-empty-strip">
              <span class="ces-text">
                ⏳ No check-ins recorded ${prog ? `for <strong>[${prog.code}] ${prog.name}</strong>` : ''} today (${selectedDate}).
                ${prog ? (progTrainer ? `<br><span class="text-xs text-muted">• Mentor: <strong>${progTrainer.name}</strong></span>` : '<br><span class="text-xs text-muted">• Mentor: <span class="font-semibold">Unassigned</span></span>') : ''}
              </span>
              <button type="button" class="btn-compact-add btn-drawer-record-meet btn-saas-primary btn-sm" data-cid="${c.id}" data-pid="${prog ? prog.id : ''}" data-tid="${progTrainer ? progTrainer.id : ''}">
                ${getIcon('plus')} Record Meet 1 for ${prog ? prog.code : 'Program'}
              </button>
            </div>
          `;
        }

        return `
          <div class="compact-sessions-scroll">
            ${progMeets.map((m, idx) => {
              const mStatus = getProgressStatus(m.percentage);
              const mTrn = m.trainerId ? state.getTrainerById(m.trainerId) : null;
              const mProg = m.programId ? state.getProgramById(m.programId) : null;
              const progSessionIdx = idx + 1;

              return `
                <div class="compact-session-strip status-border-${mStatus.key}" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
                  <div class="css-head-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
                    <div class="css-head-left" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span class="css-meet-pill" style="font-weight: 700; font-size: 11px; background: #eef2ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">${!isAll && prog ? `Meet #${progSessionIdx}` : `Meet #${m.meetNumber}`}</span>
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
          </div>
        `;
      };

      // Generate Col 2 Program & Mentor HTML
      let programColHtml = '';
      if (item.programs.length === 0) {
        programColHtml = `<span class="text-muted text-xs">No program enrolled</span>`;
      } else if (item.programs.length === 1) {
        const pb = item.programBreakdown[0];
        programColHtml = `
          <div class="src-prog-top">
            <span class="saas-prog-capsule ${primaryProgram.type === 'Stage' ? 'p-stage' : 'p-nonstage'}">
              ${primaryProgram.code}
            </span>
            <span class="saas-prog-name truncate" title="${primaryProgram.name}">
              ${primaryProgram.name}
            </span>
            ${pb && pb.isMet ? `
              <span class="prog-chip-single-tag met" title="Met today: ${pb.latestMeet ? `${pb.latestMeet.percentage}%` : 'Done'}">
                ✓ Met (${pb.latestMeet ? `${pb.latestMeet.percentage}%` : 'Done'})
              </span>
            ` : `
              <span class="prog-chip-single-tag pending" title="Pending check-in today">
                ○ Pending
              </span>
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
      } else {
        // Multi-program candidate: render interactive per-program status checklist chips
        programColHtml = `
          <div class="src-prog-multiple-wrap">
            <div class="prog-checklist-strip">
              ${item.programBreakdown.map(pb => {
                const prog = pb.program;
                const trn = pb.trainer;
                if (pb.isMet) {
                  return `
                    <div class="prog-chip prog-chip-met" title="Met today: [${prog.code}] ${prog.name} (Mentor: ${trn ? trn.name : 'Unassigned'})">
                      <span class="chip-status-icon">✓</span>
                      <span class="chip-code">${prog.code}</span>
                      <span class="chip-name truncate" style="max-width: 90px;">${prog.name}</span>
                      <span class="chip-score">${pb.latestMeet ? `${pb.latestMeet.percentage}%` : 'Met'}</span>
                    </div>
                  `;
                } else {
                  return `
                    <div class="prog-chip prog-chip-pending" title="Pending check-in: [${prog.code}] ${prog.name} (Mentor: ${trn ? trn.name : 'Unassigned'})">
                      <span class="chip-status-icon">○</span>
                      <span class="chip-code">${prog.code}</span>
                      <span class="chip-name truncate" style="max-width: 80px;">${prog.name}</span>
                      <button type="button" class="btn-prog-chip-action btn-prog-meet-trigger" data-cid="${c.id}" data-pid="${prog.id}" data-tid="${trn ? trn.id : ''}" title="Record meeting for ${prog.code}">
                        + Meet
                      </button>
                    </div>
                  `;
                }
              }).join('')}
            </div>

            <div class="src-prog-mentors-summary">
              <span class="spm-label">Mentors:</span>
              ${item.trainers.length > 0 
                ? item.trainers.map(t => `<span class="spm-mentor-name" style="color: ${t.color || '#4f46e5'}; font-weight: 600;">${t.name}</span>`).join('<span class="spm-sep">•</span>')
                : '<span class="text-danger font-semibold text-xs">Unassigned</span>'}
            </div>
          </div>
        `;
      }

      // Action button text and target program
      let actionBtnText = `${getIcon('plus')} Meet #1`;
      if (item.isMet) {
        actionBtnText = `${getIcon('plus')} Meet #${nextMeetNum}`;
      } else if (item.isPartiallyMet && firstPendingPb) {
        actionBtnText = `${getIcon('plus')} Meet ${firstPendingPb.program.code}`;
      }

      rowCard.innerHTML = `
        <div class="saas-row-master">
          <!-- Col 1: Student Identity -->
          <div class="src-col src-student">
            <div class="saas-avatar-soft">
              ${c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div class="src-student-info">
              <button class="saas-student-name btn-open-profile-dialog" data-cid="${c.id}" title="View profile">
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

          <!-- Col 2: Program & Mentor (With Per-Program Status Chips) -->
          <div class="src-col src-program">
            ${programColHtml}
          </div>

          <!-- Col 3: Evaluation Status -->
          <div class="src-col src-status">
            ${statusCapsuleHtml}
          </div>

          <!-- Col 4: Action & Reports Toggle -->
          <div class="src-col src-action">
            <button class="saas-action-btn ${item.isMet ? 'saas-btn-accent' : 'saas-btn-primary'} btn-record-meet" data-cid="${c.id}" data-pid="${targetProgForMeet?.id || ''}" data-tid="${targetTrainerForMeet?.id || ''}">
              ${actionBtnText}
            </button>

            <button class="saas-report-toggle-pill btn-toggle-drawer ${isExpanded ? 'active' : ''}" data-cid="${c.id}" title="${isExpanded ? 'Hide reports' : 'View program meeting reports'}">
              <span class="srt-text">${isExpanded ? 'Hide' : `Reports (${meets.length})`}</span>
              <span class="saas-chevron ${isExpanded ? 'open' : ''}">▼</span>
            </button>
          </div>
        </div>

        <!-- Expandable Drawer for Meeting Sessions -->
        <div class="saas-row-drawer" style="display: ${isExpanded ? 'block' : 'none'};">
          <div class="drawer-compact-tray">
            <div class="drawer-compact-nav" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div class="dcn-tabs-group" style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                <span class="dcn-label text-xs text-muted" style="font-weight: 600;">Program:</span>
                ${item.programBreakdown.map(pb => {
                  const p = pb.program;
                  const isSelected = p.id === activeDrawerPid;
                  return `
                    <button type="button" class="dcn-tab-btn saas-pill-btn ${isSelected ? 'active' : ''}" data-pid="${p.id}" title="${p.name} - ${pb.isMet ? 'Met' : 'Pending'}" style="padding: 3px 8px; font-size: 11px;">
                      <span class="saas-dot ${pb.isMet ? 'dot-emerald' : 'dot-amber'}"></span>
                      <span class="dcn-code font-bold">${p.code}</span>
                      <span class="dcn-badge ${pb.isMet ? 'badge-met' : 'badge-zero'}">${pb.isMet ? `${pb.meetCount} Met` : 'Pending'}</span>
                    </button>
                  `;
                }).join('')}

                ${item.programs.length > 1 ? `
                  <button type="button" class="dcn-tab-btn saas-pill-btn ${activeDrawerPid === 'ALL' ? 'active' : ''}" data-pid="ALL" title="All programs combined" style="padding: 3px 8px; font-size: 11px;">
                    <span class="dcn-code font-bold">ALL</span>
                    <span class="dcn-badge ${meets.length > 0 ? 'badge-met' : 'badge-zero'}">${meets.length}</span>
                  </button>
                ` : ''}
              </div>

              ${meets.length > 0 ? `
                <div class="dcn-action-group">
                  <button type="button" class="btn-compact-record btn-drawer-record-meet btn-saas-primary btn-xs" data-cid="${c.id}" data-pid="${defaultDrawerPid !== 'ALL' ? defaultDrawerPid : (item.programs[0]?.id || '')}" data-tid="${item.trainers[0]?.id || ''}">
                    ${getIcon('plus')} Record Meet
                  </button>
                </div>
              ` : ''}
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

      // Quick-action meet buttons from individual program chips
      rowCard.querySelectorAll('.btn-prog-meet-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cid = btn.getAttribute('data-cid');
          const pid = btn.getAttribute('data-pid');
          const tid = btn.getAttribute('data-tid');
          openRecordMeetModal({
            candidateId: cid,
            programId: pid,
            trainerId: tid,
            dateStr: selectedDate,
            onSave: renderView
          });
        });
      });

      // Drawer toggle
      const toggleBtn = rowCard.querySelector('.btn-toggle-drawer');
      const drawer = rowCard.querySelector('.saas-row-drawer');
      const chevron = rowCard.querySelector('.saas-chevron');

      toggleBtn.addEventListener('click', (e) => {
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
      });

      // Wire program tab buttons inside drawer
      const tabBtns = drawer.querySelectorAll('.dcn-tab-btn');
      const drawerContent = drawer.querySelector('.drawer-compact-content');
      const mainRecordBtn = drawer.querySelector('.dcn-action-group .btn-drawer-record-meet');

      const updateRecordButtonTarget = (pid) => {
        if (!mainRecordBtn) return;
        const targetProg = pid !== 'ALL' ? state.getProgramById(pid) : item.programs[0];
        const targetTrn = targetProg && targetProg.trainerId ? state.getTrainerById(targetProg.trainerId) : null;
        mainRecordBtn.setAttribute('data-pid', targetProg ? targetProg.id : '');
        mainRecordBtn.setAttribute('data-tid', targetTrn ? targetTrn.id : '');
        mainRecordBtn.innerHTML = `${getIcon('plus')} Record Meet ${targetProg ? `for ${targetProg.code}` : ''}`;
      };

      const wireRecordButtons = () => {
        drawer.querySelectorAll('.btn-drawer-record-meet').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const cid = btn.getAttribute('data-cid');
            const pId = btn.getAttribute('data-pid');
            const tId = btn.getAttribute('data-tid');
            openRecordMeetModal({
              candidateId: cid,
              programId: pId,
              trainerId: tId,
              dateStr: selectedDate,
              onSave: renderView
            });
          });
        });
      };
      wireRecordButtons();
      updateRecordButtonTarget(activeDrawerPid);

      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const pid = btn.getAttribute('data-pid');
          drawerContent.innerHTML = renderDrawerProgramContent(pid);
          updateRecordButtonTarget(pid);
          wireRecordButtons();
        });
      });

      // Profile modal button
      rowCard.querySelectorAll('.btn-open-profile-dialog').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cid = btn.getAttribute('data-cid');
          openCandidateProfileModal({ candidateId: cid, onUpdate: renderView });
        });
      });

      // Record meet button
      rowCard.querySelectorAll('.btn-record-meet').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cid = btn.getAttribute('data-cid');
          const pid = btn.getAttribute('data-pid');
          const tid = btn.getAttribute('data-tid');
          openRecordMeetModal({
            candidateId: cid,
            programId: pid,
            trainerId: tid,
            dateStr: selectedDate,
            onSave: renderView
          });
        });
      });

      rosterGrid.appendChild(rowCard);
    });
  }

  // Date handlers
  btnToday.addEventListener('click', () => {
    selectedDate = todayStr;
    renderView();
  });

  btnYesterday.addEventListener('click', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    selectedDate = y.toISOString().split('T')[0];
    renderView();
  });

  datePicker.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    renderView();
  });

  // Export Daily Report
  container.querySelector('#btnExportDailyReport').addEventListener('click', () => {
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

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MentorFlow_DailyProgress_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${meets.length} daily progress records to CSV.`);
  });

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
