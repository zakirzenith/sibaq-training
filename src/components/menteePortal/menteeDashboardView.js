import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from '../modals/candidateDossierModal.js';

export function renderMenteeDashboardView(container, navigate) {
  const session = state.getAuthSession();
  if (!session || session.role !== 'mentee' || !session.candidate) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
        <h3>Mentee Access Required</h3>
        <p class="text-muted text-sm">Please log in to your candidate account with your Admission / Chest Number and Category.</p>
        <button class="btn btn-primary" id="btnMenteeGoLogin" style="margin-top: 14px;">Return to Sign In</button>
      </div>
    `;
    const btn = container.querySelector('#btnMenteeGoLogin');
    if (btn) btn.onclick = () => window.location.reload();
    return;
  }

  const candidateId = session.candidate.id;
  const data = state.getCandidateMenteeDashboardData(candidateId);
  if (!data) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px; text-align: center;">
        <h3>Candidate record not found</h3>
        <p class="text-muted">Unable to load candidate details for ID: ${candidateId}</p>
      </div>
    `;
    return;
  }

  const { candidate, dossier, todayStatus, daysHistory, streak, totalPastDays = 0, pastMetCount = 0, pastMissedCount = 0 } = data;
  const programs = dossier?.programs || [];
  const programReports = dossier?.programReports || [];
  const allMeets = dossier?.allMeets || [];

  const overallReadiness = dossier?.overallReadiness ?? 0;
  const overallStatus = dossier?.overallStatus || { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };
  const stageProgramsCount = programs.filter(p => p.type === 'Stage').length;
  const nonStageProgramsCount = programs.filter(p => p.type !== 'Stage').length;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  container.innerHTML = `
    <div class="mentee-portal-wrapper">

      <!-- ================= HERO PROFILE BANNER ================= -->
      <div class="mentee-hero-card">
        <div class="mentee-hero-left">
          <div class="mentee-avatar-wrap">
            <span class="mentee-avatar-initials">${candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
          </div>
          <div class="mentee-hero-info">
            <div class="mentee-pill-row">
              <span class="badge badge-category-pill">${candidate.category}</span>
              <span class="badge badge-adno-pill">AD: ${candidate.adNo || candidate.chestNo || 'N/A'}</span>
              ${candidate.class ? `<span class="badge badge-class-pill">${candidate.class}</span>` : ''}
              <span class="badge badge-portal-active">🟢 Active Mentee</span>
            </div>
            <h1 class="mentee-name-title">${candidate.name}</h1>
            <p class="mentee-hero-desc">
              Sibaq 2026 Preparation Portal &bull; Daily Mandatory Check-in &amp; Progress Dashboard
            </p>
          </div>
        </div>

        <div class="mentee-hero-actions">
          <button type="button" class="btn btn-primary mentee-btn-dossier" id="btnOpenMyDossier">
            ${getIcon('award')}
            <span>Official Dossier</span>
          </button>
          <button type="button" class="btn btn-outline mentee-btn-logout" data-action="logout" title="Sign out of candidate portal">
            ${getIcon('logout')}
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <!-- ================= 🎯 SECTION: DAILY MANDATORY TASK ================= -->
      <div class="mentee-daily-task-section">
        <div class="daily-task-header-row">
          <div class="daily-task-title-group">
            <div class="icon-circle-sm" style="background: #ecfdf5; color: #059669;">
              ${getIcon('calendar')}
            </div>
            <div>
              <h2 class="section-title" style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                Daily Mandatory Task &bull; Mentor Check-in
              </h2>
              <p class="section-subtitle" style="margin: 2px 0 0 0; font-size: 12.5px; color: #64748b;">
                Every candidate is required to meet their assigned mentor at least once daily for rehearsal &amp; evaluation.
              </p>
            </div>
          </div>
          <div class="today-date-badge">
            📅 ${todayFormatted}
          </div>
        </div>

        ${todayStatus && todayStatus.isMet ? `
          <!-- TODAY MET: SUCCESS HERO CARD -->
          <div class="daily-task-status-card status-met">
            <div class="dtsc-header">
              <div class="dtsc-badge-wrap">
                <span class="dtsc-status-pill badge-met">
                  <span class="status-dot-pulse"></span> ✅ Met Today &bull; Completed
                </span>
                <span class="dtsc-time-tag">Clocked at ${todayStatus.latestMeet?.time || 'Today'}</span>
              </div>
              <div class="dtsc-score-badge" style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 14px;">
                Score: ${todayStatus.latestMeet?.percentage || 0}% &bull; ${todayStatus.latestMeet?.status || 'Evaluated'}
              </div>
            </div>

            <div class="dtsc-body">
              <div class="dtsc-details-grid">
                <div class="dtsc-detail-item">
                  <span class="dtsc-label">Program Practiced</span>
                  <span class="dtsc-value">
                    ${(() => {
                      const prog = programs.find(p => p.id === todayStatus.latestMeet?.programId);
                      return prog ? `[${prog.code}] ${prog.name}` : (programs[0] ? `[${programs[0].code}] ${programs[0].name}` : 'Assigned Program');
                    })()}
                  </span>
                </div>

                <div class="dtsc-detail-item">
                  <span class="dtsc-label">Evaluating Mentor</span>
                  ${(() => {
                    const trn = state.getTrainerById(todayStatus.latestMeet?.trainerId);
                    if (!trn) return `<span class="dtsc-value">Assigned Mentor</span>`;
                    return `
                      <div class="dtsc-mentor-evaluator-row">
                        <div class="mcc-avatar" style="width: 26px; height: 26px; background: ${trn.color || '#4f46e5'};">
                          ${trn.photo 
                            ? `<img src="${trn.photo}" alt="${trn.name}" />` 
                            : trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span class="dtsc-value">${trn.name} <span class="dtsc-mentor-sub">(${trn.expertise || 'Mentor'})</span></span>
                      </div>
                    `;
                  })()}
                </div>
              </div>

              <!-- Today's Mentor Review / Feedback -->
              <div class="dtsc-review-box">
                <div class="dtsc-review-header">
                  <span class="dtsc-review-title">💬 Mentor's Review &amp; Guidance for Today:</span>
                </div>
                <div class="dtsc-review-text">
                  ${todayStatus.latestMeet?.remark && todayStatus.latestMeet.remark.trim()
                    ? `&ldquo;${todayStatus.latestMeet.remark.trim()}&rdquo;`
                    : `&ldquo;Daily practice completed successfully. Continue drilling execution and timing.&rdquo;`}
                </div>
              </div>

              ${todayStatus.meets && todayStatus.meets.length > 1 ? `
                <div class="dtsc-multiple-meets-note" style="margin-top: 10px; font-size: 12px; color: #059669; font-weight: 600;">
                  ✨ Excellent dedication! You attended ${todayStatus.meets.length} practice sessions today.
                </div>
              ` : ''}
            </div>
          </div>
        ` : `
          <!-- TODAY PENDING: ACTION REQUIRED HERO CARD -->
          <div class="daily-task-status-card status-pending">
            <div class="dtsc-header">
              <div class="dtsc-badge-wrap">
                <span class="dtsc-status-pill badge-pending">
                  <span class="status-dot-pulse amber"></span> ⚠️ Pending Today's Check-in
                </span>
                <span class="dtsc-time-tag">Action Required Today</span>
              </div>
              <div class="dtsc-alert-tag">Not Checked In Yet</div>
            </div>

            <div class="dtsc-body">
              <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #92400e;">
                You haven't met your mentor yet today.
              </h3>
              <p style="margin: 0 0 14px 0; font-size: 13.5px; color: #78350f; line-height: 1.5;">
                Please schedule your daily practice drill with your assigned mentor today to review your performance and maintain your practice consistency.
              </p>

              <!-- Who to meet today -->
              <div class="mentors-to-meet-grid">
                <span style="font-size: 12px; font-weight: 800; color: #78350f; text-transform: uppercase; margin-bottom: 6px; display: block;">
                  Your Assigned Mentors for Today:
                </span>
                <div class="mentors-chips-grid">
                  ${programs.length > 0 ? programs.map(p => {
                    const trn = p.trainerId ? state.getTrainerById(p.trainerId) : null;
                    return `
                      <div class="mentor-contact-chip">
                        <div class="mcc-avatar" style="background: ${trn?.color || '#4f46e5'};">
                          ${trn && trn.photo 
                            ? `<img src="${trn.photo}" alt="${trn.name}" />` 
                            : (trn ? trn.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'M')}
                        </div>
                        <div class="mcc-info">
                          <div class="mcc-name">${trn ? trn.name : 'Mentor to be assigned'}</div>
                          <div class="mcc-prog">[${p.code}] ${p.name}</div>
                        </div>
                      </div>
                    `;
                  }).join('') : `
                    <div style="font-size: 12.5px; color: #92400e;">No programs enrolled yet. Please contact the Controller to register your programs.</div>
                  `}
                </div>
              </div>
            </div>
          </div>
        `}
      </div>

      <!-- ================= KPI METRIC CARDS ================= -->
      <div class="mentee-kpi-grid">
        <!-- KPI 1: Overall Readiness -->
        <div class="mentee-kpi-card">
          <div class="mkc-icon-wrap" style="background: #eef2ff; color: #4f46e5;">
            ${getIcon('chart')}
          </div>
          <div class="mkc-data">
            <span class="mkc-label">Overall Readiness</span>
            <div class="mkc-value-row">
              <span class="mkc-value" style="color: ${overallStatus.color || '#4f46e5'};">${overallReadiness}%</span>
              <span class="badge ${overallStatus.badgeClass || 'badge-neutral'}" style="font-size: 11px;">
                ${overallStatus.label}
              </span>
            </div>
            <div class="mkc-progress-bar">
              <div class="mkc-progress-fill" style="width: ${overallReadiness}%; background: ${overallStatus.color || '#4f46e5'};"></div>
            </div>
          </div>
        </div>

        <!-- KPI 2: Active Practice Streak -->
        <div class="mentee-kpi-card">
          <div class="mkc-icon-wrap" style="background: #fff7ed; color: #ea580c;">
            🔥
          </div>
          <div class="mkc-data">
            <span class="mkc-label">Practice Streak</span>
            <div class="mkc-value-row">
              <span class="mkc-value" style="color: #ea580c;">${streak} ${streak === 1 ? 'Day' : 'Days'}</span>
              <span class="badge badge-warning" style="font-size: 11px;">
                ${streak > 2 ? 'On Fire 🔥' : streak > 0 ? 'Active' : 'Start Today'}
              </span>
            </div>
            <span class="mkc-subtext">Consecutive daily mentor meetings</span>
          </div>
        </div>

        <!-- KPI 3: Enrolled Programs -->
        <div class="mentee-kpi-card">
          <div class="mkc-icon-wrap" style="background: #ecfeff; color: #0891b2;">
            ${getIcon('award')}
          </div>
          <div class="mkc-data">
            <span class="mkc-label">Enrolled Programs</span>
            <div class="mkc-value-row">
              <span class="mkc-value">${programs.length}</span>
              <span class="badge badge-neutral" style="font-size: 11px;">
                ${stageProgramsCount} Stage &bull; ${nonStageProgramsCount} Non
              </span>
            </div>
            <span class="mkc-subtext">Registered competition items</span>
          </div>
        </div>

        <!-- KPI 4: Attendance Rate -->
        <div class="mentee-kpi-card">
          <div class="mkc-icon-wrap" style="background: #fdf2f8; color: #db2777;">
            ${getIcon('check')}
          </div>
          <div class="mkc-data">
            <span class="mkc-label">Practice Consistency</span>
            <div class="mkc-value-row">
              <span class="mkc-value">${totalPastDays > 0 ? `${pastMetCount}/${totalPastDays}` : (todayStatus?.isMet ? '1/1' : 'Pending')}</span>
              <span class="badge ${pastMissedCount === 0 ? 'badge-stage' : 'badge-amber'}" style="font-size: 11px;">
                ${totalPastDays === 0 ? (todayStatus?.isMet ? 'Met Today' : 'Day 1 Today') : (pastMissedCount === 0 ? '100% Perfect' : `${pastMissedCount} Missed`)}
              </span>
            </div>
            <span class="mkc-subtext">${totalPastDays > 0 ? `Compliance since launch (${totalPastDays} day${totalPastDays > 1 ? 's' : ''})` : 'First operational day'}</span>
          </div>
        </div>
      </div>

      <!-- ================= 📅 SECTION: CONSISTENCY & CHECK-INS LOG ================= -->
      <div class="mentee-section-card">
        <div class="section-card-header">
          <div>
            <h3 class="sch-title">Recent Consistency &amp; Check-ins Log</h3>
            <p class="sch-desc">Detailed tracking of practice sessions attended versus sessions missed since website launch.</p>
          </div>
          <span class="badge badge-neutral-xs">${daysHistory.length <= 1 ? 'Day 1 (Today)' : `Since Launch (${daysHistory.length} Days)`}</span>
        </div>

        <div class="days-history-list">
          ${daysHistory.map(day => {
            const isMet = day.statusObj?.isMet;
            const isMissed = day.statusObj?.isMissed;
            const isToday = day.isToday;
            const latestMeet = day.statusObj?.latestMeet;
            const prog = latestMeet ? programs.find(p => p.id === latestMeet.programId) : null;
            const trn = latestMeet ? state.getTrainerById(latestMeet.trainerId) : null;

            return `
              <div class="day-log-row ${isToday ? 'is-today' : ''} ${isMet ? 'row-met' : isMissed ? 'row-missed' : 'row-pending'}">
                <div class="dlr-main-header">
                  <div class="dlr-date-col">
                    <span class="dlr-day-label">${day.displayDate}</span>
                    <span class="dlr-date-sub">${day.dateStr}</span>
                  </div>

                  <div class="dlr-status-col">
                    ${isMet ? `
                      <span class="status-chip chip-met">
                        🟢 Met (${latestMeet?.time || 'Recorded'})
                      </span>
                    ` : isMissed ? `
                      <span class="status-chip chip-missed">
                        🔴 MISSED
                      </span>
                    ` : `
                      <span class="status-chip chip-pending">
                        ⏳ Pending Today
                      </span>
                    `}
                  </div>
                </div>

                <div class="dlr-details-col">
                  ${isMet ? `
                    <div class="dlr-met-info">
                      <span class="dlr-program-tag">${prog ? `[${prog.code}] ${prog.name}` : 'Practice Session'}</span>
                      <span class="dlr-mentor-tag">
                        ${trn && trn.photo ? `<img src="${trn.photo}" alt="${trn.name}" class="dlr-mentor-photo-mini" />` : ''}
                        <span>Mentor: <strong>${trn ? trn.name : 'Assigned Mentor'}</strong></span>
                      </span>
                      <span class="dlr-score-tag">Score: <strong>${latestMeet?.percentage || 0}%</strong></span>
                    </div>
                    ${latestMeet?.remark ? `
                      <div class="dlr-remark-snippet">
                        &ldquo;${latestMeet.remark}&rdquo;
                      </div>
                    ` : ''}
                  ` : isMissed ? `
                    <div class="dlr-missed-desc">
                      ⚠️ No practice meet logged with mentor on this date.
                    </div>
                  ` : `
                    <div class="dlr-pending-desc">
                      Today's session is open. Meet your mentor before day end!
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ================= 🎭 SECTION: MY ENROLLED PROGRAMS & MENTORS ================= -->
      <div class="mentee-section-card">
        <div class="section-card-header">
          <div>
            <h3 class="sch-title">My Enrolled Competition Programs</h3>
            <p class="sch-desc">Your assigned stage and non-stage programs with designated mentors and readiness scores.</p>
          </div>
          <span class="badge badge-neutral-xs">${programs.length} Programs</span>
        </div>

        ${programReports.length > 0 ? `
          <div class="mentee-programs-grid">
            ${programReports.map(pr => {
              const prog = pr.program;
              const trn = pr.trainer;
              const status = pr.status;
              const isStage = prog.type === 'Stage';

              return `
                <div class="mentee-program-card ${isStage ? 'card-stage' : 'card-nonstage'}">
                  <div class="mpc-top">
                    <div class="mpc-badge-row">
                      <span class="badge ${isStage ? 'badge-stage' : 'badge-neutral'}">
                        ${isStage ? '🎭 Stage' : '📝 Non-Stage'}
                      </span>
                      <span class="badge badge-code-pill">${prog.code}</span>
                      <span class="badge badge-category-subtle">${prog.category}</span>
                    </div>
                    <h4 class="mpc-title">${prog.name}</h4>
                  </div>

                  <!-- Assigned Mentor Details -->
                  <div class="mpc-mentor-box">
                    <div class="mpc-mentor-avatar" style="background: ${trn?.color || '#6366f1'};">
                      ${trn && trn.photo 
                        ? `<img src="${trn.photo}" alt="${trn.name}" />` 
                        : (trn ? trn.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'M')}
                    </div>
                    <div class="mpc-mentor-info">
                      <span class="mpc-mentor-label">Assigned Mentor</span>
                      <span class="mpc-mentor-name">${trn ? trn.name : 'Mentor to be assigned'}</span>
                      <span class="mpc-mentor-exp">${trn?.expertise || 'Competition Coach'}</span>
                    </div>
                  </div>

                  <!-- Program Performance & Readiness -->
                  <div class="mpc-score-section">
                    <div class="mpc-score-row">
                      <span class="mpc-score-label">Program Readiness</span>
                      <div class="mpc-score-pill" style="color: ${status.color || '#4f46e5'}; font-weight: 800;">
                        ${pr.latestScore}% &bull; ${status.label}
                      </div>
                    </div>

                    <div class="mkc-progress-bar" style="margin-top: 6px;">
                      <div class="mkc-progress-fill" style="width: ${pr.latestScore}%; background: ${status.color || '#4f46e5'};"></div>
                    </div>

                    <div class="mpc-meet-counter">
                      <span>Total Sessions Logged: <strong>${pr.meetCount}</strong></span>
                      ${pr.scoreDelta > 0 ? `
                        <span class="delta-positive">+${pr.scoreDelta}% Growth</span>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Latest Remarks -->
                  ${pr.remarks && pr.remarks.length > 0 ? `
                    <div class="mpc-latest-feedback">
                      <span class="mpc-lf-title">Latest Feedback:</span>
                      <p class="mpc-lf-text">&ldquo;${pr.remarks[pr.remarks.length - 1].text}&rdquo;</p>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state-card" style="padding: 24px; text-align: center;">
            <p class="text-muted">You are not currently enrolled in any programs. Please contact the Controller to register your programs.</p>
          </div>
        `}
      </div>

      <!-- ================= 💡 SECTION: SIBAQ READINESS BENCHMARKS ================= -->
      <div class="mentee-benchmark-card">
        <div class="mbc-header">
          <span class="mbc-icon">🏆</span>
          <div>
            <h4 class="mbc-title">Sibaq Performance Benchmarks Guide</h4>
            <p class="mbc-desc">Understand what your readiness score means and aim for peak execution:</p>
          </div>
        </div>

        <div class="mbc-tiers-grid">
          <div class="mbc-tier-item tier-ready">
            <span class="mbc-tier-pct">90% – 100%</span>
            <span class="mbc-tier-label">Event Ready</span>
            <span class="mbc-tier-desc">Peak stage execution. Ready for competition.</span>
          </div>

          <div class="mbc-tier-item tier-proficient">
            <span class="mbc-tier-pct">75% – 89%</span>
            <span class="mbc-tier-label">Proficient</span>
            <span class="mbc-tier-desc">Solid delivery and strong confidence. Minor polish needed.</span>
          </div>

          <div class="mbc-tier-item tier-progressing">
            <span class="mbc-tier-pct">60% – 74%</span>
            <span class="mbc-tier-label">Progressing</span>
            <span class="mbc-tier-desc">Good rhythm and developing skill. Requires regular drills.</span>
          </div>

          <div class="mbc-tier-item tier-focus">
            <span class="mbc-tier-pct">0% – 59%</span>
            <span class="mbc-tier-label">Need Focus</span>
            <span class="mbc-tier-desc">Critical guidance needed. Attend all daily sessions.</span>
          </div>
        </div>
      </div>

    </div>
  `;

  // Attach interactive events
  const btnDossier = container.querySelector('#btnOpenMyDossier');
  if (btnDossier) {
    btnDossier.addEventListener('click', () => {
      openCandidateDossierModal(candidate.id);
    });
  }

  // Handle logout buttons
  container.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.appInstance && typeof window.appInstance.logout === 'function') {
        window.appInstance.logout();
      } else {
        state.logout();
        window.location.reload();
      }
    });
  });
}
