import { state, getProgressStatus } from '../../services/state.js';
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

  const { candidate, dossier, todayStatus, daysHistory, streak, totalPastDays = 0, pastMetCount = 0, pastMissedCount = 0, launchDateStr = '2026-10-19' } = data;
  const programs = dossier?.programs || [];
  const programReports = dossier?.programReports || [];
  const allMeets = dossier?.allMeets || [];

  const overallReadiness = dossier?.overallReadiness ?? 0;
  const overallStatus = dossier?.overallStatus || { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };
  const stageProgramsCount = programs.filter(p => p.type === 'Stage').length;
  const nonStageProgramsCount = programs.filter(p => p.type !== 'Stage').length;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

  const todayFormatted = now.toLocaleDateString('en-US', {
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

      <!-- ================= 🎯 SECTION: MY PRACTICE (DYNAMIC DATE DRILLDOWN) ================= -->
      <div class="mentee-section-card mentee-practice-section" id="myPracticeSection">
        <div class="practice-section-header">
          <div class="psh-title-wrap">
            <div class="icon-circle-sm" style="background: #eef2ff; color: #4f46e5;">
              ${getIcon('calendar')}
            </div>
            <div>
              <h3 class="sch-title" style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">
                My Practice &bull; Daily Activity &amp; Remarks
              </h3>
              <p class="sch-desc" style="margin: 2px 0 0 0; font-size: 12.5px; color: #64748b;">
                Switch dates below to review daily rehearsals, program scores, and assigned mentors' reviews.
              </p>
            </div>
          </div>

          <!-- Interactive Date Switcher Controls -->
          <div class="practice-date-bar">
            <button type="button" class="pdb-btn" id="btnPracticePrevDay" title="Previous day">&larr;</button>
            <div class="pdb-quick-pills">
              <button type="button" class="pdb-pill active" id="btnPracticeToday" data-day="today">Today</button>
              <button type="button" class="pdb-pill" id="btnPracticeYesterday" data-day="yesterday">Yesterday</button>
            </div>
            <div class="practice-date-input-wrap">
              <span style="font-size: 11px; color: #64748b;">📅</span>
              <input type="date" id="practiceDatePicker" min="${launchDateStr}" max="${todayStr}" value="${todayStr}" title="Select specific date" />
            </div>
            <button type="button" class="pdb-btn" id="btnPracticeNextDay" title="Next day">&rarr;</button>
          </div>
        </div>

        <!-- Dynamic Day Container populated via renderPracticeDay(dateStr) -->
        <div id="practiceDayContainer" class="practice-day-container">
          <!-- Dynamically populated -->
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
              <div class="day-log-row ${isToday ? 'is-today' : ''} ${isMet ? 'row-met' : isMissed ? 'row-missed' : 'row-pending'}" data-date="${day.dateStr}" style="cursor: pointer;" title="Click to view detailed activity for ${day.displayDate} in My Practice">
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

  // ================= 🎯 MY PRACTICE DATE SWITCHING CONTROLS =================
  let currentPracticeDate = todayStr;
  const practiceDayContainer = container.querySelector('#practiceDayContainer');
  const datePicker = container.querySelector('#practiceDatePicker');
  const btnToday = container.querySelector('#btnPracticeToday');
  const btnYesterday = container.querySelector('#btnPracticeYesterday');
  const btnPrev = container.querySelector('#btnPracticePrevDay');
  const btnNext = container.querySelector('#btnPracticeNextDay');

  function renderPracticeDay(dateStr) {
    if (!practiceDayContainer) return;
    const dayStatus = state.getCandidateDailyStatus(candidateId, dateStr);
    if (!dayStatus) {
      practiceDayContainer.innerHTML = `
        <div class="empty-state-card" style="padding: 24px; text-align: center;">
          <p class="text-muted">No practice records available for ${dateStr}.</p>
        </div>
      `;
      return;
    }

    const parts = dateStr.split('-');
    const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const fullDisplayDate = dObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const isToday = dateStr === todayStr;
    const isYesterday = dateStr === yesterdayStr;
    const relLabel = isToday ? 'Today' : (isYesterday ? 'Yesterday' : 'Archived Drill');

    const bannerClass = dayStatus.isMet ? 'banner-met' : (dayStatus.isMissed ? 'banner-missed' : 'banner-pending');

    // Overall score calculation for this day
    let avgScore = null;
    let scoreStatus = null;
    if (dayStatus.meets && dayStatus.meets.length > 0) {
      const sumPct = dayStatus.meets.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
      avgScore = Math.round(sumPct / dayStatus.meets.length);
      scoreStatus = getProgressStatus(avgScore);
    }

    // All remarks from mentors on this day
    const dayRemarks = (dayStatus.meets || []).filter(m => m.remark && m.remark.trim());

    practiceDayContainer.innerHTML = `
      <!-- Date Banner -->
      <div class="practice-date-banner ${bannerClass}">
        <div class="pdb-date-row">
          <span style="font-size: 22px;">📅</span>
          <div>
            <div class="pdb-full-date">${fullDisplayDate}</div>
            <div style="font-size: 12px; color: #64748b; font-weight: 600;">
              ${relLabel} &bull; ${dateStr}
            </div>
          </div>
        </div>

        <div class="pdb-right">
          ${dayStatus.isMet ? `
            <span class="status-chip chip-met">
              🟢 Fully Met &bull; Rehearsals Completed
            </span>
          ` : dayStatus.isPartiallyMet ? `
            <span class="status-chip chip-pending">
              🟡 Partially Met (${dayStatus.metProgramsCount}/${dayStatus.totalPrograms} Programs)
            </span>
          ` : dayStatus.isMissed ? `
            <span class="status-chip chip-missed">
              🔴 Missed &bull; No Rehearsal Logged
            </span>
          ` : `
            <span class="status-chip chip-pending">
              ⏳ Pending Today &bull; Action Required
            </span>
          `}
        </div>
      </div>

      <!-- 3 Overall Day Stats Grid -->
      <div class="practice-day-stats-grid">
        <!-- Tile 1: Status / Completion -->
        <div class="pds-card">
          <span class="pds-label">Day Status</span>
          <div class="pds-val-row">
            <span class="pds-val" style="color: ${dayStatus.isMet ? '#059669' : (dayStatus.isMissed ? '#dc2626' : '#d97706')};">
              ${dayStatus.isMet ? 'Completed' : (dayStatus.isPartiallyMet ? `${dayStatus.metProgramsCount}/${dayStatus.totalPrograms}` : (dayStatus.isMissed ? 'Missed' : 'Pending'))}
            </span>
            <span class="badge ${dayStatus.isMet ? 'badge-stage' : (dayStatus.isMissed ? 'badge-danger' : 'badge-amber')}" style="font-size: 10px;">
              ${dayStatus.isMet ? '100% Met' : (dayStatus.isMissed ? '0%' : 'In Progress')}
            </span>
          </div>
          <span class="pds-sub">
            ${dayStatus.totalPrograms > 0 ? `${dayStatus.metProgramsCount} of ${dayStatus.totalPrograms} program${dayStatus.totalPrograms > 1 ? 's' : ''} met` : `${dayStatus.meetCount} meet logged`}
          </span>
        </div>

        <!-- Tile 2: Overall Score -->
        <div class="pds-card">
          <span class="pds-label">Daily Evaluation</span>
          <div class="pds-val-row">
            <span class="pds-val" style="color: ${scoreStatus ? scoreStatus.color : '#64748b'};">
              ${avgScore !== null ? `${avgScore}%` : '—'}
            </span>
            ${scoreStatus ? `
              <span class="badge ${scoreStatus.badgeClass}" style="font-size: 10px;">
                ${scoreStatus.label}
              </span>
            ` : ''}
          </div>
          <span class="pds-sub">
            ${avgScore !== null ? `Average across ${dayStatus.meetCount} session${dayStatus.meetCount > 1 ? 's' : ''}` : (dayStatus.isMissed ? 'No score logged' : 'Awaiting evaluation')}
          </span>
        </div>

        <!-- Tile 3: Sessions Logged -->
        <div class="pds-card">
          <span class="pds-label">Drills Clocked</span>
          <div class="pds-val-row">
            <span class="pds-val" style="color: #4f46e5;">
              ${dayStatus.meetCount}
            </span>
            <span class="badge badge-neutral" style="font-size: 10px;">
              ${dayStatus.meetCount === 1 ? '1 Session' : `${dayStatus.meetCount} Sessions`}
            </span>
          </div>
          <span class="pds-sub">
            ${dayStatus.latestMeet ? `Latest at ${dayStatus.latestMeet.time || 'Today'}` : (dayStatus.isMissed ? 'Session missed' : 'Open session')}
          </span>
        </div>
      </div>

      <!-- Program-by-Program Breakdown -->
      <div class="practice-programs-section">
        <div class="pps-header">
          <h4 class="pps-title">Programs Practiced on this Date</h4>
          <span class="badge badge-neutral-xs">${dayStatus.programBreakdown ? dayStatus.programBreakdown.length : programs.length} Enrolled</span>
        </div>

        <div class="practice-programs-list">
          ${dayStatus.programBreakdown && dayStatus.programBreakdown.length > 0 ? dayStatus.programBreakdown.map(pb => {
            const prog = pb.program;
            const trn = pb.trainer;
            const isStage = prog.type === 'Stage';
            const isProgMet = pb.isMet;
            const latest = pb.latestMeet;
            const prScoreStatus = latest ? getProgressStatus(latest.percentage) : null;
            const progRemarks = pb.meets ? pb.meets.filter(m => m.remark && m.remark.trim()) : [];

            return `
              <div class="practice-prog-row ${isProgMet ? 'row-met' : (dayStatus.isMissed ? 'row-missed' : 'row-pending')}">
                <div class="ppr-top">
                  <div class="ppr-info">
                    <div class="ppr-badges">
                      <span class="badge badge-code-pill">${prog.code}</span>
                      <span class="badge ${isStage ? 'badge-stage' : 'badge-neutral'}">${isStage ? '🎭 Stage' : '📝 Non-Stage'}</span>
                      <span class="badge badge-category-subtle">${prog.category}</span>
                    </div>
                    <span class="ppr-title">${prog.name}</span>
                  </div>

                  <div class="ppr-score-wrap">
                    ${isProgMet && latest ? `
                      <span class="ppr-score-badge" style="background: ${prScoreStatus.bg}; color: ${prScoreStatus.color}; border: 1px solid ${prScoreStatus.border};">
                        Score: ${latest.percentage}% &bull; ${prScoreStatus.label}
                      </span>
                      <span class="ppr-clock-time">Clocked at ${latest.time || 'Logged'}</span>
                    ` : dayStatus.isMissed ? `
                      <span class="badge badge-danger">Missed Rehearsal</span>
                      <span class="ppr-clock-time">No session logged</span>
                    ` : `
                      <span class="badge badge-warning">Pending Today</span>
                      <span class="ppr-clock-time">Rehearsal required</span>
                    `}
                  </div>
                </div>

                <!-- Assigned Mentor Strip -->
                <div class="ppr-mentor-strip">
                  <div class="mcc-avatar" style="width: 28px; height: 28px; background: ${trn?.color || '#4f46e5'}; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #ffffff; font-weight: 700; font-size: 11px;">
                    ${trn && trn.photo 
                      ? `<img src="${trn.photo}" alt="${trn.name}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                      : (trn ? trn.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'M')}
                  </div>
                  <div class="ppr-mentor-info">
                    <span class="ppr-mentor-role">Assigned Mentor:</span>
                    <span class="ppr-mentor-name">${trn ? trn.name : 'Mentor to be assigned'}</span>
                    ${trn?.expertise ? `<span class="ppr-mentor-exp">(${trn.expertise})</span>` : ''}
                  </div>
                </div>

                <!-- Mentor's Program Remarks -->
                ${progRemarks.length > 0 ? progRemarks.map(m => `
                  <div class="ppr-remark-box">
                    <span class="ppr-remark-label">💬 Mentor's Practice Note (${m.time || 'Session'}):</span>
                    <p class="ppr-remark-text">&ldquo;${m.remark.trim()}&rdquo;</p>
                  </div>
                `).join('') : isProgMet ? `
                  <div class="ppr-remark-box" style="background: #f8fafc; border: 1px dashed #e2e8f0;">
                    <p class="ppr-remark-text text-muted" style="font-size: 12px;">Drill recorded with evaluation score of ${latest?.percentage}%. Continue working on speed and stage precision.</p>
                  </div>
                ` : dayStatus.isMissed ? `
                  <div class="ppr-remark-box" style="background: #fef2f2; border: 1px solid #fee2e2;">
                    <p class="ppr-remark-text" style="color: #991b1b; font-size: 12px;">⚠️ Missed: Candidate did not attend rehearsals for this program on this date.</p>
                  </div>
                ` : `
                  <div class="ppr-remark-box" style="background: #fffbeb; border: 1px solid #fef3c7;">
                    <p class="ppr-remark-text" style="color: #92400e; font-size: 12px;">⏳ Practice drill pending with ${trn ? trn.name : 'assigned mentor'}. Connect before end of day!</p>
                  </div>
                `}
              </div>
            `;
          }).join('') : `
            <div class="empty-state-card" style="padding: 18px; text-align: center;">
              <p class="text-muted">No programs enrolled yet.</p>
            </div>
          `}
        </div>
      </div>

      <!-- Mentors' Guidance & Remarks Feed -->
      <div class="practice-remarks-feed-section">
        <div class="prfs-header">
          <h4 class="prfs-title">Mentors' Remarks &amp; Feedback Feed</h4>
          <span class="badge badge-neutral-xs">${dayRemarks.length} Note${dayRemarks.length === 1 ? '' : 's'}</span>
        </div>

        <div class="practice-remarks-feed-list">
          ${dayRemarks.length > 0 ? dayRemarks.map(m => {
            const trn = state.getTrainerById(m.trainerId);
            const prog = programs.find(p => p.id === m.programId);
            const scoreStatus = getProgressStatus(m.percentage);

            return `
              <div class="practice-remark-feed-card">
                <div class="prfc-header">
                  <div class="prfc-mentor">
                    <div class="mcc-avatar" style="width: 28px; height: 28px; background: ${trn?.color || '#4f46e5'}; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 11px; font-weight: 700;">
                      ${trn && trn.photo 
                        ? `<img src="${trn.photo}" alt="${trn.name}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                        : (trn ? trn.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'M')}
                    </div>
                    <div>
                      <span class="prfc-name">${trn ? trn.name : 'Assigned Mentor'}</span>
                      <span class="prfc-prog">${prog ? `[${prog.code}] ${prog.name}` : 'Competition Practice'}</span>
                    </div>
                  </div>

                  <div class="prfc-meta">
                    <span class="badge ${scoreStatus.badgeClass}" style="font-size: 10.5px;">${m.percentage}% &bull; ${scoreStatus.label}</span>
                    <span class="prfc-time">${m.time || 'Clocked'}</span>
                  </div>
                </div>

                <div class="prfc-quote">
                  &ldquo;${m.remark.trim()}&rdquo;
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty-feedback-box">
              <p class="efb-text">
                ${dayStatus.isMet 
                  ? 'No detailed written critique recorded for this date. Numerical scores were recorded in program logs.' 
                  : dayStatus.isMissed 
                    ? 'No mentor feedback recorded because no practice session took place on this date.' 
                    : 'Today\'s practice session is still pending. Meet your mentor to receive personalized critique & guidance.'}
              </p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function setPracticeDate(dateStr) {
    if (!dateStr) return;
    let target = dateStr;
    if (target < launchDateStr) target = launchDateStr;
    if (target > todayStr) target = todayStr;

    currentPracticeDate = target;

    if (datePicker) {
      datePicker.value = currentPracticeDate;
      datePicker.min = launchDateStr;
      datePicker.max = todayStr;
    }

    if (btnToday) {
      btnToday.classList.toggle('active', currentPracticeDate === todayStr);
    }
    if (btnYesterday) {
      btnYesterday.classList.toggle('active', currentPracticeDate === yesterdayStr);
    }

    if (btnPrev) {
      const pParts = currentPracticeDate.split('-');
      const pDate = new Date(parseInt(pParts[0], 10), parseInt(pParts[1], 10) - 1, parseInt(pParts[2], 10));
      pDate.setDate(pDate.getDate() - 1);
      const prevStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
      btnPrev.disabled = prevStr < launchDateStr;
    }

    if (btnNext) {
      const nParts = currentPracticeDate.split('-');
      const nDate = new Date(parseInt(nParts[0], 10), parseInt(nParts[1], 10) - 1, parseInt(nParts[2], 10));
      nDate.setDate(nDate.getDate() + 1);
      const nextStr = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, '0')}-${String(nDate.getDate()).padStart(2, '0')}`;
      btnNext.disabled = nextStr > todayStr;
    }

    renderPracticeDay(currentPracticeDate);
  }

  // Attach date control events
  if (btnToday) {
    btnToday.addEventListener('click', () => setPracticeDate(todayStr));
  }
  if (btnYesterday) {
    btnYesterday.addEventListener('click', () => setPracticeDate(yesterdayStr));
  }
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) setPracticeDate(e.target.value);
    });
  }
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      const parts = currentPracticeDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() - 1);
      const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setPracticeDate(newStr);
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const parts = currentPracticeDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setPracticeDate(newStr);
    });
  }

  // Row clicks on consistency log
  container.querySelectorAll('.day-log-row[data-date]').forEach(row => {
    row.addEventListener('click', () => {
      const dateVal = row.getAttribute('data-date');
      if (dateVal) {
        setPracticeDate(dateVal);
        const practiceSection = container.querySelector('#myPracticeSection');
        if (practiceSection) {
          practiceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Initial render on today
  setPracticeDate(todayStr);

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
