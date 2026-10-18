import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';
import { openTrainerPickerModal } from './trainerPickerModal.js';

/**
 * Record Daily Meet Modal with Interactive Line Graph & Status Ranges
 */
export function openRecordMeetModal({ candidateId, programId = null, trainerId = null, dateStr = null, onSave = () => {} }) {
  const candidate = state.getCandidateById(candidateId);
  if (!candidate) {
    toast.error('Candidate not found.');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = dateStr || todayStr;

  const candidatePrograms = state.getCandidatePrograms(candidate.id);
  let selectedProgramId = programId || (candidatePrograms[0] ? candidatePrograms[0].id : null);
  
  const getProgramTrainer = (pid) => {
    const prg = state.getProgramById(pid);
    return prg && prg.trainerId ? state.getTrainerById(prg.trainerId) : null;
  };

  let selectedTrainerId = trainerId || (selectedProgramId ? (getProgramTrainer(selectedProgramId)?.id || null) : null);
  if (!selectedTrainerId && state.getTrainers().length > 0) {
    selectedTrainerId = state.getTrainers()[0].id;
  }

  // Calculate meeting number for target date
  const existingMeetsToday = state.getDailyMeets(targetDate).filter(m => m.candidateId === candidate.id);
  const nextMeetNumber = existingMeetsToday.length + 1;

  // Previous meets history (last 5 sessions) for trend line
  const allPastMeets = state.getCandidateMeets(candidate.id);
  const recentHistory = allPastMeets.slice(-4);

  // Initial score defaults to last meet score or 70%
  let currentPercentage = existingMeetsToday.length > 0 
    ? existingMeetsToday[existingMeetsToday.length - 1].percentage 
    : (allPastMeets.length > 0 ? allPastMeets[allPastMeets.length - 1].percentage : 70);

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg record-meet-dialog">
      <!-- Modal Header: Candidate Name Direct Title -->
      <div class="modal-header saas-meet-modal-header">
        <div class="smm-header-identity">
          <div class="smm-avatar-circle">
            ${candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="smm-header-info">
            <div class="smm-candidate-title-row">
              <h2 class="smm-candidate-name">${candidate.name}</h2>
              <span class="saas-adno-pill">${candidate.adNo}</span>
              <span class="saas-class-pill">${candidate.class || 'No Class'}</span>
              <span class="saas-cat-pill">${candidate.category}</span>
              <span class="saas-meet-badge" id="smmMeetBadge">Meet #${nextMeetNumber}</span>
            </div>
            <div class="smm-header-meta-row">
              <span class="smm-meta-item">Date: <strong>${targetDate === todayStr ? 'Today' : targetDate}</strong></span>
              <span class="smm-bullet">•</span>
              <span class="smm-meta-item" id="smmProgramMetaStatus">
                ${existingMeetsToday.length > 0 
                  ? `<span class="text-emerald font-semibold">Completed ${existingMeetsToday.length} check-in(s) today</span>` 
                  : `<span class="text-warning font-semibold">Pending check-in today</span>`}
              </span>
            </div>
          </div>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body record-meet-body" style="padding-top: 14px;">
        <!-- Compact Program & Trainer Context Bar -->
        <div class="smm-context-bar">
          <div class="smm-select-col">
            <label class="smm-select-label" for="meetProgramSelect">
              ${getIcon('programs')} Active Program
            </label>
            <select id="meetProgramSelect" class="saas-select-pill smm-select">
              ${candidatePrograms.length === 0 ? `<option value="">No enrolled programs</option>` : ''}
              ${candidatePrograms.map(p => {
                const pMeetsToday = existingMeetsToday.filter(m => m.programId === p.id);
                const isProgMetToday = pMeetsToday.length > 0;
                const latestPMeet = isProgMetToday ? pMeetsToday[pMeetsToday.length - 1] : null;
                const statusPrefix = isProgMetToday 
                  ? `🟢 [Met • ${latestPMeet.percentage}%]` 
                  : `🟡 [Pending Today]`;
                return `
                  <option value="${p.id}" ${p.id === selectedProgramId ? 'selected' : ''}>
                    ${statusPrefix} [${p.code}] ${p.name} (${p.type})
                  </option>
                `;
              }).join('')}
            </select>
          </div>

          <div class="smm-select-col">
            <label class="smm-select-label" for="btnChooseMeetTrainer">
              ${getIcon('trainers')} Evaluating Trainer
            </label>
            <input type="hidden" id="meetTrainerSelect" value="${selectedTrainerId || ''}" />
            <button type="button" id="btnChooseMeetTrainer" class="form-trainer-picker-trigger smm-select" title="Click to choose evaluating trainer">
              <span class="ftpt-icon">${getIcon('trainers')}</span>
              <span class="ftpt-text" id="lblMeetTrainerText">
                ${
                  selectedTrainerId && state.getTrainerById(selectedTrainerId)
                    ? `${state.getTrainerById(selectedTrainerId).name} (${state.getTrainerById(selectedTrainerId).expertise})`
                    : '-- Choose Trainer --'
                }
              </span>
              <span class="ftpt-chevron">${getIcon('chevronDown')}</span>
            </button>
          </div>
        </div>

        <!-- Interactive Line Graph & Percentage Controller Card -->
        <div class="progress-graph-card">
          <div class="graph-card-header">
            <div>
              <div class="graph-title-row">
                <span class="font-semibold">${getIcon('chart')} Progress & Overall Percentage Line Graph</span>
                <span class="text-xs text-muted">Drag slider or line to adjust student score</span>
              </div>
            </div>
            
            <div class="graph-score-badge-wrap">
              <span class="score-number-display" id="scoreNumDisplay">${currentPercentage}%</span>
              <span class="status-pill-dynamic" id="statusPillDisplay">Progressing</span>
            </div>
          </div>

          <!-- SVG Visual Line Graph with Gradient & Range Thresholds -->
          <div class="line-graph-viewport">
            <svg id="progressSvgGraph" viewBox="0 0 500 160" preserveAspectRatio="none" class="progress-svg-canvas">
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" id="gradStopTop"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02" id="gradStopBottom"/>
                </linearGradient>
              </defs>

              <!-- Range Background Zones & Text Labels (Hidden on mobile for sleek minimalist line) -->
              <g class="graph-zone-decorations">
                <!-- 90-100% Event Ready -->
                <rect x="0" y="0" width="500" height="24" fill="#10b981" fill-opacity="0.08"/>
                <!-- 75-89% Proficient -->
                <rect x="0" y="24" width="500" height="36" fill="#06b6d4" fill-opacity="0.07"/>
                <!-- 60-74% Progressing -->
                <rect x="0" y="60" width="500" height="36" fill="#3b82f6" fill-opacity="0.06"/>
                <!-- 40-59% Need Improvement -->
                <rect x="0" y="96" width="500" height="36" fill="#f59e0b" fill-opacity="0.07"/>
                <!-- 0-39% Need Focus -->
                <rect x="0" y="132" width="500" height="28" fill="#ef4444" fill-opacity="0.08"/>

                <!-- Grid reference lines -->
                <line x1="0" y1="24" x2="500" y2="24" stroke="rgba(16, 185, 129, 0.25)" stroke-dasharray="3,3" stroke-width="1"/>
                <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(6, 182, 212, 0.25)" stroke-dasharray="3,3" stroke-width="1"/>
                <line x1="0" y1="96" x2="500" y2="96" stroke="rgba(59, 130, 246, 0.25)" stroke-dasharray="3,3" stroke-width="1"/>
                <line x1="0" y1="132" x2="500" y2="132" stroke="rgba(245, 158, 11, 0.25)" stroke-dasharray="3,3" stroke-width="1"/>

                <!-- Zone Labels on Right -->
                <text x="495" y="16" text-anchor="end" fill="#059669" font-size="9" font-weight="600">Event Ready (90-100%)</text>
                <text x="495" y="46" text-anchor="end" fill="#0891b2" font-size="9" font-weight="600">Proficient (75-89%)</text>
                <text x="495" y="80" text-anchor="end" fill="#2563eb" font-size="9" font-weight="600">Progressing (60-74%)</text>
                <text x="495" y="116" text-anchor="end" fill="#d97706" font-size="9" font-weight="600">Need Improvement (40-59%)</text>
                <text x="495" y="148" text-anchor="end" fill="#dc2626" font-size="9" font-weight="600">Need Focus (0-39%)</text>
              </g>

              <!-- Dynamic Filled Area under Curve -->
              <path id="svgAreaPath" d="" fill="url(#curveGradient)"></path>

              <!-- Dynamic Curve Line -->
              <path id="svgLinePath" d="" fill="none" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round"></path>

              <!-- Interactive / Active Point Handle -->
              <circle id="svgActiveCircle" cx="420" cy="80" r="7" fill="#ffffff" stroke="#3b82f6" stroke-width="3.5"></circle>
              <circle id="svgActivePulse" cx="420" cy="80" r="14" fill="#3b82f6" fill-opacity="0.18"></circle>
            </svg>
          </div>

          <!-- Interactive Slider Track -->
          <div class="percentage-slider-wrap">
            <input 
              type="range" 
              id="percentageSlider" 
              class="percentage-range-slider" 
              min="0" 
              max="100" 
              value="${currentPercentage}"
            />
            <div class="slider-ticks-row">
              <span class="tick-label text-danger">0%<span class="desktop-only-inline"> (Focus)</span></span>
              <span class="tick-label text-amber">40%<span class="desktop-only-inline"> (Improvement)</span></span>
              <span class="tick-label text-blue">60%<span class="desktop-only-inline"> (Progressing)</span></span>
              <span class="tick-label text-cyan">75%<span class="desktop-only-inline"> (Proficient)</span></span>
              <span class="tick-label text-emerald">90%+<span class="desktop-only-inline"> (Event Ready)</span></span>
            </div>
          </div>

          <!-- Quick Preset Buttons -->
          <div class="preset-buttons-strip">
            <span class="text-xs text-muted font-medium">Quick Presets:</span>
            <button type="button" class="btn-preset-chip" data-pct="35" style="border-color: #fca5a5; color: #dc2626;">35% Need Focus</button>
            <button type="button" class="btn-preset-chip" data-pct="50" style="border-color: #fde68a; color: #d97706;">50% Need Improvement</button>
            <button type="button" class="btn-preset-chip" data-pct="68" style="border-color: #bfdbfe; color: #2563eb;">68% Progressing</button>
            <button type="button" class="btn-preset-chip" data-pct="82" style="border-color: #a5f3fc; color: #0891b2;">82% Proficient</button>
            <button type="button" class="btn-preset-chip" data-pct="95" style="border-color: #a7f3d0; color: #059669;">95% Event Ready</button>
          </div>
        </div>

        <!-- Mandatory Remark Section -->
        <div class="form-group mt-3">
          <div class="form-label-row">
            <label class="form-label font-semibold" for="meetRemarkText">
              Trainer Observation & Remarks <span class="text-danger font-bold">* (Required)</span>
            </label>
            <span class="text-xs text-muted" id="remarkCharCount">0 characters</span>
          </div>
          <textarea 
            id="meetRemarkText" 
            class="form-textarea" 
            rows="3" 
            placeholder="Document student's execution, key adjustments made, rhythm/timing progress, and guidance for next meet..."
            required
          ></textarea>
        </div>

        <!-- Previous Sessions History (Clean Summary) -->
        ${recentHistory.length > 0 ? `
          <div class="recent-meets-preview">
            <div class="rmp-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="rmp-title text-xs font-semibold text-muted uppercase">Recent Sessions Today</span>
              <span class="saas-locked-pill-sm">${getIcon('lock')} Logged</span>
            </div>
            <div class="rmp-list">
              ${recentHistory.map(m => `
                <div class="rmp-item">
                  <span class="rmp-meet font-semibold">Meet #${m.meetNumber}</span>
                  <span class="rmp-date font-mono text-xs text-muted">${m.time || m.date}</span>
                  <span class="saas-tag-pill ${getProgressStatus(m.percentage).badgeClass}"><strong>${m.percentage}%</strong> ${m.status}</span>
                  <span class="rmp-remark text-muted text-xs truncate flex-1" title="${m.remark}">"${m.remark}"</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 14px 20px;">
        <button id="btnCancelMeet" class="saas-pill-btn">Cancel</button>
        <button id="btnSubmitMeet" class="btn-saas-primary">
          ${getIcon('check')} Submit Meet #${nextMeetNumber}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Element handles
  const slider = overlay.querySelector('#percentageSlider');
  const scoreNumDisplay = overlay.querySelector('#scoreNumDisplay');
  const statusPillDisplay = overlay.querySelector('#statusPillDisplay');
  const svgLinePath = overlay.querySelector('#svgLinePath');
  const svgAreaPath = overlay.querySelector('#svgAreaPath');
  const svgActiveCircle = overlay.querySelector('#svgActiveCircle');
  const svgActivePulse = overlay.querySelector('#svgActivePulse');
  const gradStopTop = overlay.querySelector('#gradStopTop');
  const gradStopBottom = overlay.querySelector('#gradStopBottom');
  const remarkText = overlay.querySelector('#meetRemarkText');
  const remarkCharCount = overlay.querySelector('#remarkCharCount');
  const btnSubmitMeet = overlay.querySelector('#btnSubmitMeet');
  const progSelect = overlay.querySelector('#meetProgramSelect');
  const trnSelect = overlay.querySelector('#meetTrainerSelect');

  const lblMeetTrainerText = overlay.querySelector('#lblMeetTrainerText');
  const smmMeetBadge = overlay.querySelector('#smmMeetBadge');
  const smmProgramMetaStatus = overlay.querySelector('#smmProgramMetaStatus');

  const updateProgramContextMeta = (pid) => {
    const prog = pid ? state.getProgramById(pid) : null;
    const progMeets = existingMeetsToday.filter(m => m.programId === pid);
    if (smmProgramMetaStatus) {
      if (progMeets.length > 0) {
        smmProgramMetaStatus.innerHTML = `<span class="text-emerald font-semibold">🟢 ${prog ? `[${prog.code}]` : 'Program'}: Completed ${progMeets.length} meet(s) today</span>`;
      } else {
        smmProgramMetaStatus.innerHTML = `<span class="text-warning font-semibold">🟡 ${prog ? `[${prog.code}]` : 'Program'}: Pending check-in today</span>`;
      }
    }
    if (smmMeetBadge) {
      smmMeetBadge.textContent = prog ? `${prog.code} Meet #${progMeets.length + 1}` : `Meet #${nextMeetNumber}`;
    }
  };

  // When program changes, sync default assigned trainer and status headers
  progSelect.addEventListener('change', (e) => {
    const pid = e.target.value;
    updateProgramContextMeta(pid);
    const trn = getProgramTrainer(pid);
    if (trn) {
      trnSelect.value = trn.id;
      if (lblMeetTrainerText) lblMeetTrainerText.textContent = `${trn.name} (${trn.expertise})`;
    }
  });

  // Initial status sync
  updateProgramContextMeta(selectedProgramId);

  // Searchable Trainer Picker Trigger
  overlay.querySelector('#btnChooseMeetTrainer')?.addEventListener('click', () => {
    openTrainerPickerModal({
      currentTrainerId: trnSelect.value,
      title: 'Select Evaluating Trainer',
      subtitle: `Evaluating session for ${candidate.name}`,
      onSelect: (t) => {
        if (t) {
          trnSelect.value = t.id;
          if (lblMeetTrainerText) lblMeetTrainerText.textContent = `${t.name} (${t.expertise})`;
        } else {
          trnSelect.value = '';
          if (lblMeetTrainerText) lblMeetTrainerText.textContent = '-- Choose Trainer --';
        }
      }
    });
  });

  // Calculate SVG curve and update visuals based on percentage
  function updateGraphVisuals(pct) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    const status = getProgressStatus(p);

    // Percentage to SVG y-coordinate (160 is bottom 0%, 15 is top 100%)
    const targetY = 150 - (p / 100) * 135;
    const targetX = 420;

    // Build historical points if any
    let points = [];
    if (recentHistory.length >= 2) {
      const h1 = recentHistory[recentHistory.length - 2];
      const h2 = recentHistory[recentHistory.length - 1];
      points = [
        { x: 30, y: 150 - (h1.percentage / 100) * 135 },
        { x: 160, y: 150 - (h2.percentage / 100) * 135 },
        { x: 290, y: (150 - (h2.percentage / 100) * 135 + targetY) / 2 },
        { x: targetX, y: targetY },
        { x: 470, y: targetY }
      ];
    } else {
      // Single smooth upward or downward trend curve
      const startY = Math.min(150, Math.max(15, targetY + (p > 50 ? 35 : -25)));
      points = [
        { x: 20, y: startY },
        { x: 140, y: (startY * 2 + targetY) / 3 },
        { x: 280, y: (startY + targetY * 2) / 3 },
        { x: targetX, y: targetY },
        { x: 475, y: targetY }
      ];
    }

    // Generate smooth bezier curve path
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const pCurrent = points[i];
      const pNext = points[i + 1];
      const cpX = (pCurrent.x + pNext.x) / 2;
      pathD += ` C ${cpX} ${pCurrent.y}, ${cpX} ${pNext.y}, ${pNext.x} ${pNext.y}`;
    }

    // Line Path
    svgLinePath.setAttribute('d', pathD);
    svgLinePath.setAttribute('stroke', status.color);

    // Filled Area Path (closed along bottom)
    const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;
    svgAreaPath.setAttribute('d', areaD);

    // Active circle point
    svgActiveCircle.setAttribute('cx', targetX);
    svgActiveCircle.setAttribute('cy', targetY);
    svgActiveCircle.setAttribute('stroke', status.color);

    svgActivePulse.setAttribute('cx', targetX);
    svgActivePulse.setAttribute('cy', targetY);
    svgActivePulse.setAttribute('fill', status.color);

    // Gradient stops
    gradStopTop.setAttribute('stop-color', status.color);
    gradStopBottom.setAttribute('stop-color', status.color);

    // Score readout and badge
    scoreNumDisplay.textContent = `${p}%`;
    scoreNumDisplay.style.color = status.color;

    statusPillDisplay.textContent = `${status.label}`;
    statusPillDisplay.className = `status-pill-dynamic ${status.badgeClass}`;
    statusPillDisplay.style.borderColor = status.border;
  }

  // Update on slider movement
  slider.addEventListener('input', (e) => {
    currentPercentage = Number(e.target.value);
    updateGraphVisuals(currentPercentage);
  });

  // Preset chips
  overlay.querySelectorAll('.btn-preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = Number(btn.getAttribute('data-pct'));
      slider.value = val;
      currentPercentage = val;
      updateGraphVisuals(val);
    });
  });

  // Character counter and remark input
  remarkText.addEventListener('input', () => {
    const len = remarkText.value.trim().length;
    remarkCharCount.textContent = `${len} characters`;
    if (len > 0) {
      remarkText.classList.remove('input-error');
    }
  });

  // When selected program changes, auto-switch to its designated trainer
  progSelect.addEventListener('change', () => {
    const selectedPid = progSelect.value;
    const assignedTrn = getProgramTrainer(selectedPid);
    if (assignedTrn) {
      trnSelect.value = assignedTrn.id;
    }
  });

  // Initial draw
  updateGraphVisuals(currentPercentage);

  // Close helper
  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCancelMeet').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Submit check-in
  btnSubmitMeet.addEventListener('click', () => {
    const remark = remarkText.value.trim();
    if (!remark) {
      remarkText.classList.add('input-error');
      remarkText.focus();
      toast.warning('Trainer remark is required before submitting.');
      return;
    }

    const finalProgramId = progSelect.value || null;
    const finalTrainerId = trnSelect.value || null;

    const recorded = state.recordDailyMeet({
      candidateId: candidate.id,
      trainerId: finalTrainerId,
      programId: finalProgramId,
      percentage: currentPercentage,
      remark: remark,
      dateStr: targetDate
    });

    toast.success(`Logged Meet #${recorded.meetNumber} for ${candidate.name}: ${recorded.percentage}% (${recorded.status})`);
    close();
    onSave();
  });
}
