import { state, isStageProgram } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';

/**
 * Format chest number cleanly with fallback to Admission or ID
 */
export function formatChestNo(cand) {
  if (!cand) return '—';
  if (cand.chestNo && cand.chestNo.trim()) return `#${cand.chestNo.trim()}`;
  const idStr = String(cand.id || '');
  if (idStr.includes('-')) {
    const parts = idStr.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) return `#${lastPart}`;
  }
  if (cand.adNo && cand.adNo.trim()) return `#${cand.adNo.trim()}`;
  return `#C-${idStr.slice(-4).toUpperCase()}`;
}

/**
 * Generate dates array from 8 NOV to 20 NOV 2026 (13 Days)
 */
export function getTrainerTrackerDates() {
  const dates = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const year = 2026;
  const month = 10; // November (0-indexed)

  for (let d = 8; d <= 20; d++) {
    const dt = new Date(year, month, d);
    const dayStr = String(d).padStart(2, '0');
    dates.push({
      dayNumber: d,
      dateStr: `${dayStr} Nov 2026`,
      fullDateStr: `${dayStr} NOVEMBER 2026`,
      dayName: days[dt.getDay()],
      dayShort: daysShort[dt.getDay()],
      iso: `${year}-11-${dayStr}`
    });
  }
  return dates;
}

/**
 * Get trainer enriched data with assigned programs and candidate rosters
 */
export function getTrainerEnrichedData(trainerId) {
  const trainer = state.getTrainerById(trainerId);
  if (!trainer) return null;

  const assignedPrograms = state.getTrainerPrograms(trainer.id);
  const mentees = state.getTrainerMentees(trainer.id);
  const readiness = state.getTrainerReadiness(trainer.id);

  // Map each program with its resolved candidates
  const programsWithCandidates = assignedPrograms.map(prg => {
    const candidateIds = Array.isArray(prg.candidateIds) ? prg.candidateIds : [];
    const candidates = candidateIds
      .map(cid => state.getCandidateById(cid))
      .filter(Boolean);

    return {
      ...prg,
      resolvedCandidates: candidates
    };
  });

  // Flat list of all (program, candidate) pairings for the daily meeting log
  const trackingRoster = [];
  programsWithCandidates.forEach(p => {
    if (p.resolvedCandidates.length > 0) {
      p.resolvedCandidates.forEach(c => {
        trackingRoster.push({
          program: p,
          candidate: c
        });
      });
    } else {
      // Program assigned with no digital candidates enrolled yet
      trackingRoster.push({
        program: p,
        candidate: null
      });
    }
  });

  return {
    trainer,
    assignedPrograms,
    mentees,
    readiness,
    programsWithCandidates,
    trackingRoster
  };
}

/**
 * Generate HTML snippet for one trainer's offline progress tracker
 */
export function renderSingleTrainerTracker(trainerOrId) {
  const trainerId = typeof trainerOrId === 'object' ? trainerOrId.id : trainerOrId;
  const data = getTrainerEnrichedData(trainerId);
  if (!data) return '';

  const { trainer, assignedPrograms, mentees, readiness, programsWithCandidates } = data;
  const totalProgramsCount = assignedPrograms.length;
  const totalMenteesCount = mentees.length;

  const printDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `
    <div class="trainer-tracker-page-set">
      
      <!-- Top Running Header (Visible on print) -->
      <div class="sheet-running-header">
        <span class="srh-left">Darul Huda Bengal • Sibaq '26</span>
        <span class="srh-center">Mentor: <strong>${trainer.name}</strong> • ${trainer.expertise || 'Mentor'}</span>
        <span class="srh-right">Assigned Programs &amp; Candidate Roster</span>
      </div>

      <!-- Main Center Heading: High-Contrast Black Background Header -->
      <div class="tracker-header-box">
        <div class="tracker-title-black-bg">
          <h1 class="ttb-title">Darul Huda Bengal • Sibaq '26</h1>
          <div class="ttb-sub">MENTOR PROGRAM ASSIGNMENTS &amp; CANDIDATE ROSTER</div>
          <div class="ttb-period">"Victory or defeat is in your hands. Take it seriously; imagine losing this competition and the entire event along with it."</div>
        </div>
      </div>

      <!-- Trainer Profile Box (Black & White Layout) -->
      <div class="trainer-summary-box">
        <div class="trn-photo-wrap">
          ${trainer.photo 
            ? `<img src="${trainer.photo}" alt="${trainer.name}" class="trn-photo-img" />`
            : `<div class="trn-photo-placeholder"><span>PHOTO</span></div>`}
        </div>

        <div class="trn-details-grid">
          <div class="td-row td-name-row">
            <span class="td-label">MENTOR:</span>
            <span class="td-value td-trainer-name">${trainer.name}</span>
          </div>
          
          <div class="td-row">
            <span class="td-label">DOMAIN / EXPERTISE:</span>
            <span class="td-value td-bold">${trainer.expertise || 'Specialized Mentor'}</span>
          </div>

          <div class="td-row-split">
            <div class="td-cell">
              <span class="td-label">TOTAL ASSIGNED MENTEES:</span>
              <span class="td-value td-badge-box"><strong>${totalMenteesCount}</strong> Candidates</span>
            </div>
            <div class="td-cell">
              <span class="td-label">TOTAL ASSIGNED PROGRAMS:</span>
              <span class="td-value td-badge-box"><strong>${totalProgramsCount}</strong> Programs</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Assigned Programs with Candidates Section -->
      <div class="trainer-programs-container">
        <div class="tpc-header">
          <span>ASSIGNED PROGRAMS &amp; CANDIDATE ROSTER</span>
          <span class="tpc-badge">${totalProgramsCount} Programs • ${totalMenteesCount} Candidates</span>
        </div>

        ${programsWithCandidates.length > 0 ? programsWithCandidates.map((p, pIdx) => {
          const isStage = isStageProgram(p);
          const candList = p.resolvedCandidates || [];

          return `
            <div class="trainer-program-card">
              <div class="tpc-prog-bar">
                <div class="tpc-prog-left">
                  <span class="prog-index-num">#${pIdx + 1}</span>
                  <span class="prog-code-pill">[${p.code || 'PRG'}]</span>
                  <strong class="prog-name-title">${p.name}</strong>
                </div>
                <div class="tpc-prog-right">
                  <span class="prog-cat-pill">${p.category || 'General'}</span>
                  <span class="prog-type-pill ${isStage ? 'ptp-stage' : 'ptp-nonstage'}">
                    ${isStage ? 'Stage' : 'Non-Stage'}
                  </span>
                  <span class="prog-cand-count">${candList.length} ${candList.length === 1 ? 'Candidate' : 'Candidates'}</span>
                </div>
              </div>

              <table class="trainer-cand-table">
                <thead>
                  <tr>
                    <th style="width: 5%; text-align: center;">SL</th>
                    <th style="width: 14%;">Chest No</th>
                    <th style="width: 33%;">Candidate Name</th>
                    <th style="width: 12%;">Class</th>
                    <th style="width: 12%;">Ad No</th>
                    <th style="width: 10%; text-align: center;">Readiness %</th>
                    <th style="width: 14%;">Remarks / Drills</th>
                  </tr>
                </thead>
                <tbody>
                  ${candList.length > 0 ? candList.map((c, cIdx) => `
                    <tr>
                      <td style="text-align: center; font-weight: 800;">${cIdx + 1}</td>
                      <td>
                        <span class="chest-mono-tag">${formatChestNo(c)}</span>
                      </td>
                      <td>
                        <strong class="cand-name-bold">${c.name}</strong>
                      </td>
                      <td>${c.class || '—'}</td>
                      <td>${c.adNo || '—'}</td>
                      <td style="text-align: center;">
                        <div class="readiness-box">
                          <span class="rb-input-line"></span>
                          <span class="rb-unit">%</span>
                        </div>
                      </td>
                      <td>
                        <div class="remarks-ruled-line"></div>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="7" class="empty-cand-cell">
                        <em>No candidates enrolled in this program yet. Mentors may write candidates manually below:</em>
                      </td>
                    </tr>
                    <tr class="blank-cand-row">
                      <td style="text-align: center; color: #888;">1</td>
                      <td><span class="chest-blank-line"></span></td>
                      <td><span class="name-blank-line"></span></td>
                      <td></td>
                      <td></td>
                      <td style="text-align: center;">
                        <div class="readiness-box"><span class="rb-input-line"></span><span class="rb-unit">%</span></div>
                      </td>
                      <td><div class="remarks-ruled-line"></div></td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          `;
        }).join('') : `
          <div class="empty-programs-card">
            <p style="font-size: 11px; font-weight: 700; margin: 0 0 8px; color: #333333;">No programs are currently assigned to this mentor in the system.</p>
            <table class="trainer-cand-table">
              <thead>
                <tr>
                  <th style="width: 5%; text-align: center;">SL</th>
                  <th style="width: 25%;">Assigned Program Code &amp; Title</th>
                  <th style="width: 14%;">Chest No</th>
                  <th style="width: 28%;">Candidate Name</th>
                  <th style="width: 12%; text-align: center;">Readiness %</th>
                  <th style="width: 16%;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${[1, 2, 3, 4, 5].map(n => `
                  <tr class="blank-cand-row">
                    <td style="text-align: center; color: #888;">${n}</td>
                    <td><span class="name-blank-line" style="width: 140px;"></span></td>
                    <td><span class="chest-blank-line"></span></td>
                    <td><span class="name-blank-line" style="width: 140px;"></span></td>
                    <td style="text-align: center;">
                      <div class="readiness-box"><span class="rb-input-line"></span><span class="rb-unit">%</span></div>
                    </td>
                    <td><div class="remarks-ruled-line"></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Bottom Action Strip: Important NB Notice & Single Trainer Signature -->
      <div class="tracker-footer-strip">
        <!-- NB Notice Box -->
        <div class="tfs-nb-box">
          <div class="tfs-nb-header">
            <span class="nb-pill">IMPORTANT (NB)</span>
            <span class="nb-title">MANDATORY ESCALATION DIRECTIVE</span>
          </div>
          <div class="tfs-nb-content">
            If any candidate is <strong>not practicing</strong>, <strong>refuses your orders/instructions</strong>, or is performing <strong>very low</strong>, take actions and inform immediately to these respective coordinators:
            <div class="tfs-nb-contacts">
              <span class="nb-contact">📞 <strong>+91 88917 17639</strong> (Rashid Ustad)</span>
              <span class="nb-contact-sep">•</span>
              <span class="nb-contact">📞 <strong>+91 83899 41063</strong> (Mehboob Ustad)</span>
            </div>
          </div>
        </div>

        <!-- Single Signature Box (Your Signature) -->
        <div class="tfs-sign-box">
          <div class="tfs-sign-role">MENTOR</div>
          <div class="tfs-sign-name">${trainer.name}</div>
          <div class="tfs-sign-line"></div>
          <div class="tfs-sign-label">(Your Signature &amp; Date)</div>
        </div>
      </div>

      <!-- Running Page Footer -->
      <div class="sheet-bottom-note">
        <span>Darul Huda Bengal • Sibaq '26 Mentor Assignments Roster</span>
        <span>Mentor: <strong>${trainer.name}</strong> • ${totalProgramsCount} Programs • ${totalMenteesCount} Mentees • Ref: SIB26-TRN-${(trainer.id || '').replace(/[^a-zA-Z0-9]/g, '')} • ${printDateStr}</span>
      </div>

    </div>
  `;
}

/**
 * Print Trainer Offline Progress Tracker (opens clean print window)
 * Supports single trainer or array of trainers (bulk)
 */
export function printTrainerOfflineTracker(trainerOrTrainers) {
  const rawTrainers = Array.isArray(trainerOrTrainers) ? trainerOrTrainers : [trainerOrTrainers];

  if (!rawTrainers || rawTrainers.length === 0) {
    toast.error('No trainer selected to print.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups in your browser to print the offline progress tracker.');
    return;
  }

  const isSingle = rawTrainers.length === 1;
  const singleTrainer = isSingle ? rawTrainers[0] : null;
  const pageTitle = isSingle 
    ? `Sibaq '26 Trainer Offline Tracker - ${singleTrainer.name} (${singleTrainer.expertise || 'Mentor'})`
    : `Sibaq '26 Trainer Offline Trackers (${rawTrainers.length} Trainers Bulk)`;

  const allTrackersHtml = rawTrainers.map(t => renderSingleTrainerTracker(t)).join('');

  const fullPrintHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${pageTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm 10mm 10mm;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          font-size: 9.5px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Screen Preview Controls Bar (Screen Only) */
        .screen-control-bar {
          position: sticky;
          top: 0;
          z-index: 99999;
          background: #000000;
          color: #ffffff;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          margin-bottom: 16px;
          border-bottom: 3px solid #333333;
        }
        .scb-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .scb-badge {
          background: #ffffff;
          color: #000000;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .scb-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #ffffff;
        }
        .scb-hint {
          font-size: 11px;
          color: #bbbbbb;
        }
        .scb-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .scb-btn {
          cursor: pointer;
          border: 1px solid #ffffff;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 11.5px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .scb-btn-print {
          background: #ffffff;
          color: #000000;
        }
        .scb-btn-close {
          background: #222222;
          color: #ffffff;
          border-color: #555555;
        }
        .scb-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* Printable Page Sets */
        .trainer-tracker-page-set {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          page-break-after: always;
          break-after: page;
        }
        .trainer-tracker-page-set:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        /* Top Running Header */
        .sheet-running-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #000000;
          padding-bottom: 3px;
          margin-bottom: 6px;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #333333;
        }

        /* Center Black Heading Banner */
        .tracker-header-box {
          margin-bottom: 8px;
        }
        .tracker-title-black-bg {
          background: #000000 !important;
          color: #ffffff !important;
          text-align: center;
          padding: 8px 14px;
          border-radius: 4px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ttb-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          line-height: 1.1;
          color: #ffffff !important;
        }
        .ttb-sub {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-top: 3px;
          color: #eeeeee !important;
        }
        .ttb-period {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.02em;
          font-style: italic;
          margin-top: 5px;
          line-height: 1.4;
          color: #ffffff !important;
          background: #111111;
          padding: 5px 10px;
          border-radius: 3px;
          border: 1px solid #444444;
        }

        /* Trainer Summary Box (Black & White) */
        .trainer-summary-box {
          display: flex;
          border: 1.5px solid #000000;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
          background: #ffffff;
        }
        .trn-photo-wrap {
          width: 80px;
          min-width: 80px;
          border-right: 1.5px solid #000000;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .trn-photo-img {
          width: 72px;
          height: 84px;
          object-fit: cover;
          display: block;
          border: 1px solid #000000;
          border-radius: 3px;
        }
        .trn-photo-placeholder {
          width: 72px;
          height: 84px;
          border: 1.5px dashed #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          color: #000000;
          letter-spacing: 0.08em;
          border-radius: 3px;
          background: #fbfbfb;
        }

        .trn-details-grid {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .td-row {
          padding: 5px 10px;
          border-bottom: 1px solid #000000;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .td-row:last-child {
          border-bottom: none;
        }
        .td-name-row {
          background: #f5f5f5;
        }
        .td-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #000000;
        }
        .td-row-split:last-child {
          border-bottom: none;
        }
        .td-cell {
          padding: 5px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .td-cell:first-child {
          border-right: 1px solid #000000;
        }

        .td-label {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #000000;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .td-value {
          font-size: 10px;
          color: #000000;
        }
        .td-trainer-name {
          font-size: 13.5px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .td-bold {
          font-weight: 800;
        }
        .td-badge-box {
          font-size: 10.5px;
        }

        /* Trainer Assigned Programs Container */
        .trainer-programs-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 8px;
        }
        .tpc-header {
          background: #000000 !important;
          color: #ffffff !important;
          padding: 5px 10px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 4px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .tpc-badge {
          background: #ffffff;
          color: #000000;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 3px;
        }

        .trainer-program-card {
          border: 1.5px solid #000000;
          border-radius: 4px;
          overflow: hidden;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .tpc-prog-bar {
          background: #f0f0f0;
          border-bottom: 1.5px solid #000000;
          padding: 5px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .tpc-prog-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prog-index-num {
          font-size: 9px;
          font-weight: 900;
          color: #555555;
        }
        .prog-code-pill {
          font-family: monospace;
          font-size: 9.5px;
          font-weight: 900;
          background: #000000;
          color: #ffffff;
          padding: 1px 5px;
          border-radius: 2px;
          letter-spacing: 0.04em;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .prog-name-title {
          font-size: 11px;
          font-weight: 900;
          color: #000000;
        }
        .tpc-prog-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prog-cat-pill {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #222222;
        }
        .prog-type-pill {
          font-size: 8px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 2px;
          text-transform: uppercase;
        }
        .ptp-stage {
          background: #000000;
          color: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ptp-nonstage {
          background: #e2e8f0;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .prog-cand-count {
          font-size: 8.5px;
          font-weight: 800;
          color: #000000;
        }

        .trainer-cand-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        .trainer-cand-table thead th {
          background: #fbfbfb !important;
          color: #000000;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 8px;
          padding: 5px 8px;
          border-bottom: 1.5px solid #000000;
          border-right: 1px solid #000000;
          text-align: left;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .trainer-cand-table thead th:last-child {
          border-right: none;
        }
        .trainer-cand-table tbody td {
          border-bottom: 1px solid #000000;
          border-right: 1px solid #000000;
          padding: 5px 8px;
          vertical-align: middle;
        }
        .trainer-cand-table tbody tr:last-child td {
          border-bottom: none;
        }
        .trainer-cand-table tbody td:last-child {
          border-right: none;
        }
        .chest-mono-tag {
          font-family: monospace;
          font-weight: 900;
          font-size: 9.5px;
          background: #f0f0f0;
          border: 1px solid #000000;
          padding: 1px 5px;
          border-radius: 2px;
          display: inline-block;
          white-space: nowrap;
        }
        .cand-name-bold {
          font-size: 9.5px;
          font-weight: 800;
          color: #000000;
        }
        .empty-cand-cell {
          text-align: center;
          color: #666666;
          padding: 6px !important;
        }
        .chest-blank-line {
          display: block;
          width: 50px;
          border-bottom: 1px dotted #888888;
          height: 12px;
        }
        .name-blank-line {
          display: block;
          width: 140px;
          border-bottom: 1px dotted #888888;
          height: 12px;
        }
        .empty-programs-card {
          border: 1.5px dashed #000000;
          border-radius: 4px;
          padding: 12px;
          text-align: center;
        }

        /* Overall Readiness % Option Column */
        .readiness-box {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          width: 48px;
          height: 19px;
          border: 1.5px solid #000000;
          border-radius: 3px;
          background: #ffffff;
          padding: 0 4px;
        }
        .rb-input-line {
          flex: 1;
        }
        .rb-unit {
          font-size: 9px;
          font-weight: 800;
          color: #000000;
          margin-left: 2px;
        }

        .remarks-ruled-line {
          width: 100%;
          min-height: 18px;
        }

        /* Bottom Action Strip: Important NB Notice & Single Trainer Signature */
        .tracker-footer-strip {
          display: flex;
          border: 1.5px solid #000000;
          border-radius: 4px;
          margin-top: 8px;
          margin-bottom: 6px;
          background: #ffffff;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .tfs-nb-box {
          flex: 1;
          padding: 6px 10px;
          border-right: 1.5px solid #000000;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .tfs-nb-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
        }
        .nb-pill {
          background: #000000 !important;
          color: #ffffff !important;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 5px;
          border-radius: 2px;
          letter-spacing: 0.05em;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .nb-title {
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #000000;
        }
        .tfs-nb-content {
          font-size: 8.5px;
          color: #000000;
          line-height: 1.35;
        }
        .tfs-nb-contacts {
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          font-weight: 700;
        }
        .nb-contact-sep {
          color: #888888;
        }
        .tfs-sign-box {
          width: 170px;
          min-width: 170px;
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          background: #fdfdfd;
        }
        .tfs-sign-role {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #000000;
        }
        .tfs-sign-name {
          font-size: 10px;
          font-weight: 800;
          color: #000000;
          margin-top: 1px;
        }
        .tfs-sign-line {
          border-bottom: 1.5px solid #000000;
          margin: 18px 4px 3px;
        }
        .tfs-sign-label {
          font-size: 8px;
          font-weight: 700;
          color: #333333;
          text-transform: uppercase;
        }

        /* Running Page Footer */
        .sheet-bottom-note {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #000000;
          padding-top: 3px;
          font-size: 7.5px;
          color: #444444;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .font-mono {
          font-family: monospace;
        }
        .font-bold {
          font-weight: 800;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .trainer-tracker-page-set {
            page-break-after: always !important;
            break-after: page !important;
          }
          .trainer-tracker-page-set:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Screen Toolbar (hidden in print) -->
      <div class="screen-control-bar no-print">
        <div class="scb-left">
          <span class="scb-badge">A4 Black &amp; White Print</span>
          <span class="scb-title">Sibaq '26 Trainer Offline Progress Tracker</span>
          <span class="scb-hint">
            ${isSingle 
              ? `Trainer: <strong>${singleTrainer.name}</strong> • ${singleTrainer.expertise || 'Mentor'} • 13 Days (8 Nov – 20 Nov)`
              : `Bulk Batch: <strong>${rawTrainers.length} Trainers</strong> loaded. Click "Print / Save as PDF" to download all sheets in a single file.`}
          </span>
        </div>
        <div class="scb-right">
          <button type="button" class="scb-btn scb-btn-print" onclick="window.print()">
            Print / Save as PDF
          </button>
          <button type="button" class="scb-btn scb-btn-close" onclick="window.close()">
            Close
          </button>
        </div>
      </div>

      <!-- Tracker Body (Single or Multiple) -->
      ${allTrackersHtml}

      <script>
        window.focus();
        setTimeout(function() {
          try {
            window.print();
          } catch(e) {
            console.warn(e);
          }
        }, 350);
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullPrintHtml);
  printWindow.document.close();
}

/**
 * Interactive Modal for Controller to select trainer or bulk print offline progress trackers
 */
export function openTrainerTrackerModal({ trainers = [], allTrainers = [], defaultTrainerId = null } = {}) {
  const baseAll = allTrainers.length > 0 ? allTrainers : state.getTrainers();
  const baseCurrent = trainers.length > 0 ? trainers : baseAll;

  if (baseAll.length === 0) {
    toast.error('No trainers registered yet.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md" style="max-width: 600px;">
      <div class="modal-header" style="border-bottom: 2px solid #0f172a;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center;">
            ${getIcon('printer')}
          </div>
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 800;">
              Mentor Program Assignments &amp; Candidate Sheets
            </h3>
            <p class="modal-subtitle" style="font-size: 11.5px; color: #64748b; margin-top: 1px;">
              Print official black &amp; white mentor sheets with assigned programs and candidate rosters
            </p>
          </div>
        </div>
        <button class="modal-close-btn" id="btnTrainerTrackerModalClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 16px;">
        <!-- Info Banner -->
        <div style="background: #f8fafc; border: 1.5px solid #000000; border-radius: 6px; padding: 12px 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="background: #000000; color: #ffffff; font-size: 10px; font-weight: 900; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 3px;">
              SIBAQ '26 • MENTOR ASSIGNMENTS
            </div>
            <span style="font-size: 10px; font-weight: 800; color: #334155;">PROGRAMS &amp; CANDIDATES ROSTER</span>
          </div>
          <div style="font-size: 11px; line-height: 1.45; color: #1e293b;">
            Includes mentor details, all assigned programs with their enrolled candidates, chest numbers, classes, admission numbers, readiness % evaluation box, and remarks space. Formatted for high-contrast A4 B&amp;W printing.
          </div>
        </div>

        <!-- Option 1: Primary Bulk Download/Print All Trainers at Once -->
        <div style="border: 2px solid #000000; border-radius: 8px; padding: 16px; background: #000000; color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: #ffffff;">
                  Bulk Download / Print All Mentors PDF
                </span>
                <span style="background: #ffffff; color: #000000; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 4px;">
                  RECOMMENDED
                </span>
              </div>
              <p style="margin: 4px 0 0; font-size: 11.5px; color: #d4d4d4; line-height: 1.4;">
                Download or print all <strong>${baseAll.length} mentors'</strong> complete assigned programs and candidate rosters in a single combined PDF with clean A4 page breaks.
              </p>
            </div>
          </div>
          <button type="button" id="btnPrintAllTrainers" class="btn btn-saas-primary" style="width: 100%; height: 42px; font-size: 13px; font-weight: 800; background: #ffffff; color: #000000; border-color: #ffffff; justify-content: center; gap: 8px;">
            ${getIcon('printer')} Download / Print All Mentors at Once (${baseAll.length} Mentors)
          </button>
        </div>

        <!-- Option 2: Print Current Filtered Trainers (if different) -->
        ${baseCurrent.length !== baseAll.length ? `
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                  Print Current Filtered Selection (${baseCurrent.length} Trainers)
                </span>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">Matches your active search and expertise filters.</p>
              </div>
              <button type="button" id="btnPrintFilteredTrainers" class="btn btn-outline" style="height: 36px; padding: 0 14px; font-weight: 700; font-size: 12px; gap: 6px; border-color: #0f172a; color: #0f172a;">
                ${getIcon('filter')} Print Filtered (${baseCurrent.length})
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Option 3: Print for Single Trainer -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; background: #ffffff;">
          <label style="display: block; font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
            Print for an Individual Trainer / Mentor
          </label>
          <div style="display: flex; gap: 8px;">
            <select id="selTrackerTrainer" class="form-control" style="flex: 1; height: 38px; font-size: 12px; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 0 10px;">
              <option value="">-- Choose Trainer --</option>
              ${baseAll.map(t => {
                const trnProgs = state.getTrainerPrograms(t.id);
                const trnMentees = state.getTrainerMentees(t.id);
                return `
                  <option value="${t.id}" ${t.id === defaultTrainerId ? 'selected' : ''}>
                    ${t.name} • ${t.expertise || 'Mentor'} (${trnProgs.length} programs, ${trnMentees.length} mentees)
                  </option>
                `;
              }).join('')}
            </select>
            <button type="button" id="btnPrintSelectedTrainer" class="btn btn-outline" style="height: 38px; padding: 0 14px; font-weight: 800; gap: 6px; border-color: #000000; color: #000000;">
              ${getIcon('printer')} Print Sheet
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" id="btnTrainerTrackerCancel" style="height: 34px; padding: 0 16px; font-weight: 700;">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnTrainerTrackerModalClose').addEventListener('click', close);
  overlay.querySelector('#btnTrainerTrackerCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Action: Print All
  overlay.querySelector('#btnPrintAllTrainers').addEventListener('click', () => {
    close();
    printTrainerOfflineTracker(baseAll);
  });

  // Action: Print Filtered
  const btnFiltered = overlay.querySelector('#btnPrintFilteredTrainers');
  if (btnFiltered) {
    btnFiltered.addEventListener('click', () => {
      close();
      printTrainerOfflineTracker(baseCurrent);
    });
  }

  // Action: Print Selected Trainer
  overlay.querySelector('#btnPrintSelectedTrainer').addEventListener('click', () => {
    const sel = overlay.querySelector('#selTrackerTrainer');
    const tid = sel.value;
    if (!tid) {
      toast.warning('Please select a trainer from the dropdown to print.');
      return;
    }
    const t = state.getTrainerById(tid);
    if (!t) {
      toast.error('Selected trainer not found.');
      return;
    }
    close();
    printTrainerOfflineTracker(t);
  });
}

