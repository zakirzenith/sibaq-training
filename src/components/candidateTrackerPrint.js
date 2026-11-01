import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';

/**
 * Format chest number cleanly with fallback to Admission or ID
 */
export function formatChestNo(cand) {
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
 * Generate dates array from 1 NOV to 20 NOV 2026
 */
export function getTrackerDates() {
  const dates = [];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const year = 2026;
  const month = 10; // November (0-indexed)

  for (let d = 1; d <= 20; d++) {
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
 * Get assigned programs enriched with designated mentor details for a candidate
 */
export function getEnrichedCandidatePrograms(candidateId) {
  const candidatePrograms = state.getCandidatePrograms(candidateId) || [];
  return candidatePrograms.map(p => {
    const trn = p.trainerId ? state.getTrainerById(p.trainerId) : null;
    return {
      id: p.id,
      code: p.code || 'PRG',
      name: p.name || 'Untitled Program',
      category: p.category || 'General',
      type: p.type || 'Stage',
      trainerId: p.trainerId || '',
      mentorName: trn ? trn.name : 'Unassigned Mentor',
      mentorPhone: trn ? (trn.phone || '') : ''
    };
  });
}

/**
 * Generate HTML snippet for one candidate's offline progress tracker
 */
function renderSingleCandidateTracker(candidate) {
  const cleanChest = formatChestNo(candidate);
  const programs = getEnrichedCandidatePrograms(candidate.id);
  const trackerDates = getTrackerDates();

  const programList = programs.length > 0 ? programs : [
    { code: 'PROG 1', name: '____________________________________', category: 'General', type: 'Stage', mentorName: '____________________________', mentorPhone: '' },
    { code: 'PROG 2', name: '____________________________________', category: 'General', type: 'Non-Stage', mentorName: '____________________________', mentorPhone: '' }
  ];

  return `
    <div class="candidate-tracker-page-set">
      
      <!-- Top Running Header (Visible on print) -->
      <div class="sheet-running-header">
        <span class="srh-left">Sibaq '26 • Offline Progress Tracker</span>
        <span class="srh-center">Candidate: <strong>${candidate.name}</strong> (Ad No: ${candidate.adNo || candidate.chestNo || '—'})</span>
        <span class="srh-right">Daily Mentorship Log (1 Nov – 20 Nov 2026)</span>
      </div>

      <!-- Main Center Heading: Black Background -->
      <div class="tracker-header-box">
        <div class="tracker-title-black-bg">
          <h1 class="ttb-title">Sibaq '26</h1>
          <div class="ttb-sub">offline progress tracker</div>
        </div>
      </div>

      <!-- Candidate Details Card (Black and White) -->
      <div class="candidate-summary-box">
        <div class="cand-photo-wrap">
          ${candidate.photo 
            ? `<img src="${candidate.photo}" alt="${candidate.name}" class="cand-photo-img" />`
            : `<div class="cand-photo-placeholder"><span>PHOTO</span></div>`}
        </div>
        <div class="cand-details-grid">
          <div class="cd-row cd-name-row">
            <span class="cd-label">CANDIDATE NAME:</span>
            <span class="cd-value cd-cand-name">${candidate.name}</span>
          </div>
          <div class="cd-row-split">
            <div class="cd-cell">
              <span class="cd-label">ADMISSION NO:</span>
              <span class="cd-value cd-chest-badge">${candidate.adNo || candidate.chestNo || '—'}</span>
            </div>
            <div class="cd-cell">
              <span class="cd-label">CLASS / GRADE:</span>
              <span class="cd-value">${candidate.class || '—'}</span>
            </div>
          </div>
          <div class="cd-row cd-cat-row">
            <span class="cd-label">CATEGORY:</span>
            <span class="cd-value">${candidate.category || 'General'}</span>
          </div>
        </div>
      </div>

      <!-- Top of Page Information: Assigned Programs with Designated Mentors -->
      <div class="programs-ref-box">
        <div class="ref-box-title">
          <span>ASSIGNED PROGRAMS &amp; DESIGNATED MENTORS DIRECTORY</span>
          <span class="ref-count-pill">${programs.length} Programs</span>
        </div>
        <table class="ref-table">
          <thead>
            <tr>
              <th style="width: 7%; text-align: center;">SL</th>
              <th style="width: 15%;">Program Code</th>
              <th style="width: 40%;">Program Title</th>
              <th style="width: 16%;">Category</th>
              <th style="width: 22%;">Designated Mentor</th>
            </tr>
          </thead>
          <tbody>
            ${programs.length > 0 ? programs.map((p, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                <td class="cd-mono font-bold">${p.code}</td>
                <td class="font-bold">${p.name}</td>
                <td>${p.category} (${p.type})</td>
                <td>
                  <strong>${p.mentorName}</strong>
                  ${p.mentorPhone ? `<span class="mentor-phone-sub">(${p.mentorPhone})</span>` : ''}
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align: center; color: #555; padding: 6px; font-style: italic;">
                  No digital programs registered. Mentors can write assigned programs manually below.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Clean Unified Daily Progress Log: 1 NOV to 20 NOV -->
      <div class="daily-tracker-container">
        <table class="daily-master-table">
          <thead>
            <tr>
              <th style="width: 14%;">Date</th>
              <th style="width: 34%;">Program Assigned</th>
              <th style="width: 38%;">Mentor Remarks</th>
              <th style="width: 14%; text-align: center;">Mentor Sign</th>
            </tr>
          </thead>
          ${trackerDates.map(d => `
            <tbody class="date-group">
              ${programList.map((p, idx) => `
                <tr class="prog-row ${idx === 0 ? 'date-first-row' : ''}">
                  ${idx === 0 ? `
                    <td rowspan="${programList.length}" class="date-col">
                      <div class="d-date">${d.dateStr}</div>
                      <div class="d-day">${d.dayName}</div>
                    </td>
                  ` : ''}
                  <td class="prog-col">
                    <span class="p-code font-bold">[${p.code}]</span>
                    <span class="p-name font-bold">${p.name}</span>
                  </td>
                  <td class="remarks-col"></td>
                  <td class="sign-col"></td>
                </tr>
              `).join('')}
            </tbody>
          `).join('')}
        </table>
      </div>

      <!-- Final Official Sign-Off Box -->
      <div class="final-signoff-box">
        <div class="fsb-grid">
          <div class="fsb-cell">
            <div class="fsb-lbl">Candidate Signature:</div>
            <div class="fsb-sign-line"></div>
          </div>
          <div class="fsb-cell">
            <div class="fsb-lbl">Controller Signature:</div>
            <div class="fsb-sign-line"></div>
          </div>
          <div class="fsb-cell">
            <div class="fsb-lbl">Mentor Signature:</div>
            <div class="fsb-sign-line"></div>
          </div>
        </div>
      </div>

      <!-- Running Page Footer -->
      <div class="sheet-bottom-note">
        <span>Darul Huda Bengal • Sibaq '26 Official Candidate Mentorship Record</span>
        <span>Candidate: ${candidate.name} (Ad No: ${candidate.adNo || candidate.chestNo || '—'}) • Ref: SIB26-OPT-${(candidate.adNo || candidate.id || '').replace(/[^a-zA-Z0-9]/g, '')}</span>
      </div>

    </div>
  `;
}

/**
 * Print Offline Progress Tracker (opens clean print window)
 * Supports single candidate or array of candidates (bulk)
 */
export function printCandidateOfflineTracker(candidateOrCandidates) {
  const candidates = Array.isArray(candidateOrCandidates) ? candidateOrCandidates : [candidateOrCandidates];

  if (!candidates || candidates.length === 0) {
    toast.error('No candidate selected to print.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups in your browser to print the offline progress tracker.');
    return;
  }

  const isSingle = candidates.length === 1;
  const singleCand = isSingle ? candidates[0] : null;
  const pageTitle = isSingle 
    ? `Sibaq '26 Offline Tracker - ${singleCand.name} (Ad No: ${singleCand.adNo || singleCand.chestNo || '—'})`
    : `Sibaq '26 Offline Trackers (${candidates.length} Candidates Bulk)`;

  const allTrackersHtml = candidates.map(c => renderSingleCandidateTracker(c)).join('');

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
        .candidate-tracker-page-set {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          page-break-after: always;
          break-after: page;
        }
        .candidate-tracker-page-set:last-child {
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
          font-size: 21px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          line-height: 1.1;
          color: #ffffff !important;
        }
        .ttb-sub {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-top: 3px;
          color: #eeeeee !important;
        }

        /* Candidate Details Card (Black & White) */
        .candidate-summary-box {
          display: flex;
          border: 1.5px solid #000000;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
          background: #ffffff;
        }
        .cand-photo-wrap {
          width: 78px;
          min-width: 78px;
          border-right: 1.5px solid #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          padding: 4px;
        }
        .cand-photo-img {
          width: 70px;
          height: 82px;
          object-fit: cover;
          border: 1px solid #000000;
          border-radius: 2px;
          filter: grayscale(100%);
        }
        .cand-photo-placeholder {
          width: 70px;
          height: 82px;
          border: 1.5px dashed #000000;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 9px;
          letter-spacing: 0.08em;
          color: #333333;
          background: #f4f4f4;
        }
        .cand-details-grid {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 6px 10px;
          gap: 3px;
        }
        .cd-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .cd-row-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .cd-cell {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .cd-label {
          font-size: 8.5px;
          font-weight: 800;
          color: #333333;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .cd-value {
          font-size: 9.5px;
          font-weight: 700;
          color: #000000;
        }
        .cd-cand-name {
          font-size: 13.5px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }
        .cd-chest-badge {
          display: inline-block;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
          font-size: 11px;
          font-weight: 900;
          color: #000000;
          border: 1px solid #000000;
          padding: 1px 6px;
          border-radius: 2px;
        }
        .cd-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
          font-weight: 800;
        }

        /* Assigned Programs Reference Box (Top of Page Information) */
        .programs-ref-box {
          border: 1.5px solid #000000;
          border-radius: 4px;
          margin-bottom: 10px;
          overflow: hidden;
        }
        .ref-box-title {
          background: #000000 !important;
          color: #ffffff !important;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ref-count-pill {
          background: #ffffff;
          color: #000000;
          padding: 1px 6px;
          border-radius: 2px;
          font-size: 8px;
          font-weight: 900;
        }
        .ref-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        .ref-table th {
          background: #f2f2f2 !important;
          color: #000000;
          border-bottom: 1.5px solid #000000;
          border-right: 1px solid #000000;
          padding: 4px 6px;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          text-align: left;
          letter-spacing: 0.04em;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ref-table th:last-child {
          border-right: none;
        }
        .ref-table td {
          border-bottom: 1px solid #cccccc;
          border-right: 1px solid #cccccc;
          padding: 4px 6px;
          vertical-align: middle;
        }
        .ref-table td:last-child {
          border-right: none;
        }
        .ref-table tbody tr:last-child td {
          border-bottom: none;
        }
        .mentor-phone-sub {
          font-size: 7.5px;
          color: #444444;
          margin-left: 2px;
        }

        /* Daily Progress Section: Master Unified Table */
        .daily-tracker-container {
          width: 100%;
          margin-bottom: 8px;
        }

        .daily-master-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1.5px solid #000000;
          background: #ffffff;
        }

        .daily-master-table thead {
          display: table-header-group;
        }

        .daily-master-table th {
          background: #000000 !important;
          color: #ffffff !important;
          border-right: 1px solid #444444;
          border-bottom: 1.5px solid #000000;
          padding: 6px 8px;
          font-size: 8.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .daily-master-table th:last-child {
          border-right: none;
        }

        .date-group {
          page-break-inside: avoid;
          break-inside: avoid;
          border-top: 1.5px solid #000000;
        }
        .date-group:first-of-type {
          border-top: none;
        }

        .daily-master-table td {
          vertical-align: middle;
          border-right: 1px solid #000000;
          padding: 5px 8px;
          font-size: 8.5px;
        }
        .daily-master-table td:last-child {
          border-right: none;
        }

        .prog-row {
          border-bottom: 1px solid #d4d4d4;
        }
        .date-group tr:last-child {
          border-bottom: none;
        }

        .date-col {
          background: #f7f7f7 !important;
          text-align: center;
          vertical-align: middle !important;
          padding: 4px 6px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .d-date {
          font-size: 9px;
          font-weight: 900;
          color: #000000;
          white-space: nowrap;
        }
        .d-day {
          font-size: 7.5px;
          font-weight: 700;
          color: #444444;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 1px;
        }

        .prog-col {
          font-size: 8.5px;
          line-height: 1.25;
        }
        .p-code {
          color: #000000;
          margin-right: 3px;
        }
        .p-name {
          color: #000000;
        }

        .remarks-col {
          height: 30px;
          min-height: 30px;
          background: #ffffff;
        }

        .sign-col {
          height: 30px;
          min-height: 30px;
          background: #ffffff;
          text-align: center;
        }

        /* Final Sign-off Box */
        .final-signoff-box {
          border: 1.5px solid #000000;
          border-radius: 4px;
          margin-top: 10px;
          margin-bottom: 6px;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #ffffff;
        }
        .fsb-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          padding: 8px 12px;
          gap: 16px;
        }
        .fsb-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .fsb-lbl {
          font-size: 8px;
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .fsb-sign-line {
          border-bottom: 1px solid #000000;
          height: 20px;
          margin-top: 2px;
        }

        /* Bottom Running Footer */
        .sheet-bottom-note {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #000000;
          padding-top: 4px;
          margin-top: 4px;
          font-size: 8px;
          color: #444444;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .font-bold {
          font-weight: 800;
        }
        .text-center {
          text-align: center;
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
          .candidate-tracker-page-set {
            page-break-after: always !important;
            break-after: page !important;
          }
          .candidate-tracker-page-set:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Screen Toolbar -->
      <div class="screen-control-bar no-print">
        <div class="scb-left">
          <span class="scb-badge">A4 Black & White Print</span>
          <span class="scb-title">Sibaq '26 Offline Progress Tracker</span>
          <span class="scb-hint">
            ${isSingle 
              ? `Candidate: <strong>${singleCand.name}</strong> (Ad No: ${singleCand.adNo || singleCand.chestNo || '—'}) • 20 Days (1 Nov – 20 Nov)`
              : `Bulk Batch: <strong>${candidates.length} candidates</strong> loaded. Click "Print / Save as PDF" to download the complete file at once.`}
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
 * Interactive Modal for Controller to select candidate or bulk print offline progress trackers
 */
export function openCandidateTrackerModal({ candidates = [], allCandidates = [], defaultCandidateId = null }) {
  const currentList = candidates.length > 0 ? candidates : state.getCandidates();
  const masterList = allCandidates.length > 0 ? allCandidates : state.getCandidates();

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md" style="max-width: 580px;">
      <div class="modal-header" style="border-bottom: 2px solid #0f172a;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center;">
            ${getIcon('printer')}
          </div>
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 16px; font-weight: 800;">
              Offline Progress Tracker Sheets
            </h3>
            <p class="modal-subtitle" style="font-size: 11.5px; color: #64748b; margin-top: 1px;">
              Print official black & white 1 Nov – 20 Nov daily meeting & signature sheets
            </p>
          </div>
        </div>
        <button class="modal-close-btn" id="btnTrackerModalClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 16px;">
        <!-- Info Banner -->
        <div style="background: #f8fafc; border: 1.5px solid #000000; border-radius: 6px; padding: 12px 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="background: #000000; color: #ffffff; font-size: 10px; font-weight: 900; letter-spacing: 0.08em; padding: 2px 7px; border-radius: 3px;">
              SIBAQ '26
            </div>
            <span style="font-size: 10px; font-weight: 800; color: #334155;">1 NOV TO 20 NOV 2026</span>
          </div>
          <div style="font-size: 11px; line-height: 1.45; color: #1e293b;">
            Generates high-contrast black & white multi-page printable sheets. Includes candidate details, photo, top mentor reference directory, and daily rows with mentor signature and remark spaces for each assigned program.
          </div>
        </div>

        <!-- Option 1: Primary Bulk Download/Print All Students at Once -->
        <div style="border: 2px solid #000000; border-radius: 8px; padding: 16px; background: #000000; color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: #ffffff;">
                  Bulk Download / Print All Students PDF
                </span>
                <span style="background: #ffffff; color: #000000; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 4px;">
                  RECOMMENDED
                </span>
              </div>
              <p style="margin: 4px 0 0; font-size: 11.5px; color: #d4d4d4; line-height: 1.4;">
                Download or print all <strong>${masterList.length} students'</strong> 1 Nov – 20 Nov daily progress tracker sheets in a single combined PDF with clean page-breaks.
              </p>
            </div>
          </div>
          <button type="button" id="btnPrintAllCandidates" class="btn btn-saas-primary" style="width: 100%; height: 42px; font-size: 13px; font-weight: 800; background: #ffffff; color: #000000; border-color: #ffffff; justify-content: center; gap: 8px;">
            ${getIcon('printer')} Download / Print All Students at Once (${masterList.length} Candidates)
          </button>
        </div>

        <!-- Option 2: Print Filtered List -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                Print Current Filtered Selection (${currentList.length} Students)
              </span>
              <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">Matches your active filters on the candidates page.</p>
            </div>
            <button type="button" id="btnPrintFilteredCandidates" class="btn btn-outline" style="height: 36px; padding: 0 14px; font-weight: 700; font-size: 12px; gap: 6px; border-color: #0f172a; color: #0f172a;">
              ${getIcon('filter')} Print Filtered (${currentList.length})
            </button>
          </div>
        </div>

        <!-- Option 3: Print for Single Candidate -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; background: #ffffff;">
          <label style="display: block; font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
            Print for an Individual Student
          </label>
          <div style="display: flex; gap: 8px;">
            <select id="selTrackerCandidate" class="form-control" style="flex: 1; height: 38px; font-size: 12px; font-weight: 600;">
              <option value="">-- Choose Candidate --</option>
              ${masterList.map(c => `
                <option value="${c.id}" ${c.id === defaultCandidateId ? 'selected' : ''}>
                  ${c.name} (Ad No: ${c.adNo || c.chestNo || '—'}) • ${c.category || 'General'} (${(state.getCandidatePrograms(c.id) || []).length} programs)
                </option>
              `).join('')}
            </select>
            <button type="button" id="btnPrintSelectedCand" class="btn btn-outline" style="height: 38px; padding: 0 14px; font-weight: 800; gap: 6px; border-color: #000000; color: #000000;">
              ${getIcon('printer')} Print Sheet
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" id="btnTrackerCancel" style="height: 34px; padding: 0 16px; font-weight: 700;">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnTrackerModalClose').addEventListener('click', closeModal);
  overlay.querySelector('#btnTrackerCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  // Single Candidate Print
  overlay.querySelector('#btnPrintSelectedCand').addEventListener('click', () => {
    const cid = overlay.querySelector('#selTrackerCandidate').value;
    if (!cid) {
      toast.error('Please choose a candidate first.');
      return;
    }
    const cand = state.getCandidateById(cid);
    if (!cand) {
      toast.error('Candidate not found.');
      return;
    }
    printCandidateOfflineTracker(cand);
    closeModal();
  });

  // Bulk Print Current Filtered List
  overlay.querySelector('#btnPrintFilteredCandidates').addEventListener('click', () => {
    if (currentList.length === 0) {
      toast.error('No candidates in the filtered list.');
      return;
    }
    printCandidateOfflineTracker(currentList);
    closeModal();
  });

  // Bulk Print All Candidates
  overlay.querySelector('#btnPrintAllCandidates').addEventListener('click', () => {
    if (masterList.length === 0) {
      toast.error('Candidate master roster is empty.');
      return;
    }
    printCandidateOfflineTracker(masterList);
    closeModal();
  });
}
