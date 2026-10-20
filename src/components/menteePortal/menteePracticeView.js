import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from '../modals/candidateDossierModal.js';

/**
 * Dedicated "My Practice" View for Mentee Portal
 * Interactive day-by-day practice tracker, date switcher, program rehearsal breakdown,
 * mentor scores & photos, and direct mentorship guidance critiques.
 */
export function renderMenteePracticeView(container, navigate) {
  const session = state.getAuthSession();
  if (!session || session.role !== 'mentee' || !session.candidate) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
        <h3>Mentee Access Required</h3>
        <p class="text-muted text-sm">Please log in to your candidate account with your Admission / Chest Number and Category.</p>
        <button class="btn btn-primary" id="btnMenteePracticeLogin" style="margin-top: 14px;">Return to Sign In</button>
      </div>
    `;
    const btn = container.querySelector('#btnMenteePracticeLogin');
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

  const { candidate, dossier, todayStatus, daysHistory, launchDateStr = '2026-10-19' } = data;
  const programs = dossier?.programs || [];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

  container.innerHTML = `
    <div class="mentee-portal-wrapper">

      <!-- ================= TOP NAV HEADER ================= -->
      <div class="mentee-page-header">
        <div class="mph-left">
          <div class="icon-circle" style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff;">
            ${getIcon('calendar')}
          </div>
          <div>
            <div class="mph-badge-row">
              <span class="badge badge-category-pill">${candidate.category}</span>
              <span class="badge badge-adno-pill">AD: ${candidate.adNo || candidate.chestNo || 'N/A'}</span>
              <span class="badge badge-portal-active">🟢 My Practice Tracker</span>
            </div>
            <h1 class="mph-title">Daily Practice Drills &amp; Mentor Remarks</h1>
          </div>
        </div>
      </div>

      <!-- ================= 🎯 SECTION: MY PRACTICE DATE CONTROLS ================= -->
      <div class="mentee-section-card mentee-practice-section" id="myPracticeMainCard">
        <div class="practice-section-header">
          <div class="psh-title-wrap">
            <div class="icon-circle-sm" style="background: #eef2ff; color: #4f46e5;">
              ${getIcon('calendar')}
            </div>
            <div>
              <h3 class="sch-title" style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a;">
                Select Practice Date
              </h3>
              <p class="sch-desc" style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                Switch between days to review specific rehearsal scores and critiques.
              </p>
            </div>
          </div>

          <!-- Interactive Date Switcher Controls -->
          <div class="practice-date-bar">
            <div class="pdb-quick-pills">
              <button type="button" class="pdb-pill active" id="btnPracticeToday" data-day="today">Today</button>
              <button type="button" class="pdb-pill" id="btnPracticeYesterday" data-day="yesterday">Yesterday</button>
            </div>
            <div class="practice-date-input-wrap">
              <span style="font-size: 12px; color: #64748b;">📅</span>
              <input type="date" id="practiceDatePicker" min="${launchDateStr}" max="${todayStr}" value="${todayStr}" title="Select specific date" />
            </div>
            <div class="pdb-nav-arrows">
              <button type="button" class="pdb-btn" id="btnPracticePrevDay" title="Previous operational day">&larr;</button>
              <button type="button" class="pdb-btn" id="btnPracticeNextDay" title="Next day">&rarr;</button>
            </div>
          </div>
        </div>

        <!-- Quick Days History Navigation Chips (Since Launch) -->
        <div class="practice-quick-days-strip">
          <span class="pqds-label">Operational Days:</span>
          <div class="pqds-chips">
            ${daysHistory.map(day => `
              <button type="button" class="pqds-chip ${day.dateStr === todayStr ? 'active' : ''}" data-date="${day.dateStr}">
                <span class="pqds-dot ${day.statusObj?.isMet ? 'met' : day.statusObj?.isMissed ? 'missed' : 'pending'}"></span>
                <span>${day.displayDate}</span>
                <span class="pqds-sub">${day.dateStr.slice(5)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Dynamic Day Container populated via renderPracticeDay(dateStr) -->
        <div id="practiceDayContainer" class="practice-day-container">
          <!-- Dynamically populated -->
        </div>
      </div>

    </div>
  `;

  // Attach Top Actions
  const btnDashboard = container.querySelector('#btnBackToDashboard');
  if (btnDashboard) {
    btnDashboard.onclick = () => {
      if (typeof navigate === 'function') navigate('mentee-dashboard');
    };
  }

  const btnCompare = container.querySelector('#btnGoToCompare');
  if (btnCompare) {
    btnCompare.onclick = () => {
      if (typeof navigate === 'function') navigate('mentee-compare');
    };
  }

  const btnDossier = container.querySelector('#btnOpenPracticeDossier');
  if (btnDossier) {
    btnDossier.onclick = () => {
      openCandidateDossierModal(candidate.id);
    };
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

    // Update quick day chips
    container.querySelectorAll('.pqds-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-date') === currentPracticeDate);
    });

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

  // Quick chips click
  container.querySelectorAll('.pqds-chip[data-date]').forEach(chip => {
    chip.addEventListener('click', () => {
      const d = chip.getAttribute('data-date');
      if (d) setPracticeDate(d);
    });
  });

  // Initial render on today
  setPracticeDate(todayStr);
}
