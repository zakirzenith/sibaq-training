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
 * Get enriched program data with resolved candidates and assigned mentor
 */
export function getProgramEnrichedData(programOrId) {
  const program = typeof programOrId === 'object' ? programOrId : state.getProgramById(programOrId);
  if (!program) return null;

  const isStage = isStageProgram(program);
  const mentor = program.trainerId ? state.getTrainerById(program.trainerId) : null;
  const candidates = state.getProgramCandidates(program.id) || [];
  const trainerReadiness = mentor ? state.getTrainerReadiness(mentor.id) : null;

  return {
    program,
    isStage,
    mentor,
    candidates,
    trainerReadiness
  };
}

/**
 * Render single program detailed dossier / roster sheet (A4 Print-Ready)
 */
export function renderSingleProgramSheet(programOrId) {
  const data = getProgramEnrichedData(programOrId);
  if (!data) return '';

  const { program, isStage, mentor, candidates } = data;
  const totalCandidates = candidates.length;

  // Ensure at least 6-8 rows so sheet looks complete and mentors can write notes/walk-in candidates
  const minimumRows = 6;
  const extraRowsNeeded = Math.max(0, minimumRows - totalCandidates);
  const emptyRows = Array.from({ length: extraRowsNeeded }, (_, i) => ({
    sl: totalCandidates + i + 1,
    isEmpty: true
  }));

  const printDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `
    <div class="program-sheet-page">
      
      <!-- Top Running Header -->
      <div class="sheet-running-header">
        <span class="srh-left">Darul Huda Bengal • Sibaq '26</span>
        <span class="srh-center">Program: <strong>[${program.code || 'PRG'}] ${program.name || 'Untitled'}</strong></span>
        <span class="srh-right">Roster &amp; Mentorship Record</span>
      </div>

      <!-- Main Black Header Box -->
      <div class="program-header-box">
        <div class="program-title-black-bg">
          <h1 class="ptb-title">Darul Huda Bengal • Sibaq '26</h1>
          <div class="ptb-sub">OFFICIAL PROGRAM ASSIGNMENT &amp; CANDIDATE ROSTER</div>
        </div>
      </div>

      <!-- Program & Assigned Mentor Overview Card (High-Contrast Black & White) -->
      <div class="prog-meta-summary-box">
        <div class="pm-col pm-col-left">
          <div class="pm-row pm-code-title-row">
            <span class="pm-label">PROGRAM CODE &amp; TITLE:</span>
            <div class="pm-title-line">
              <span class="pm-code-badge">[${program.code || 'PRG'}]</span>
              <strong class="pm-name-text">${program.name || 'Untitled Program'}</strong>
            </div>
          </div>

          <div class="pm-split-row">
            <div class="pm-split-cell">
              <span class="pm-label">CATEGORY:</span>
              <span class="pm-val pm-val-bold">${program.category || 'General'}</span>
            </div>
            <div class="pm-split-cell">
              <span class="pm-label">CLASSIFICATION:</span>
              <span class="pm-val ${isStage ? 'pm-val-stage' : 'pm-val-nonstage'}">
                ${isStage ? 'STAGE (Active)' : 'NON-STAGE (Completed)'}
              </span>
            </div>
          </div>
        </div>

        <div class="pm-col pm-col-right">
          <div class="pm-row pm-mentor-header-row">
            <span class="pm-label">ASSIGNED MENTOR:</span>
            <div class="pm-mentor-name-line">
              ${mentor ? `
                <strong class="pm-mentor-name">${mentor.name}</strong>
              ` : `
                <span class="pm-unassigned-tag">NOT ASSIGNED YET</span>
              `}
            </div>
          </div>

          <div class="pm-split-row">
            <div class="pm-split-cell">
              <span class="pm-label">DOMAIN / EXPERTISE:</span>
              <span class="pm-val">${mentor ? (mentor.expertise || 'Specialized Mentor') : '—'}</span>
            </div>
            <div class="pm-split-cell">
              <span class="pm-label">TOTAL ENROLLED:</span>
              <span class="pm-val pm-val-bold"><strong>${totalCandidates}</strong> Candidates</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Enrolled Candidates Table -->
      <div class="candidates-table-box">
        <div class="ctb-header">
          <span>ENROLLED CANDIDATES (MENTEES) DIRECTORY</span>
          <span class="ctb-count-badge">${totalCandidates} Enrolled</span>
        </div>

        <table class="candidates-master-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">SL</th>
              <th style="width: 13%;">Chest No</th>
              <th style="width: 32%;">Candidate Name</th>
              <th style="width: 12%;">Class</th>
              <th style="width: 12%;">Ad No</th>
              <th style="width: 11%; text-align: center;">Readiness %</th>
              <th style="width: 15%; text-align: center;">Mentor Remarks / Sign</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map((cand, idx) => `
              <tr class="cand-row">
                <td style="text-align: center; font-weight: 800;">${idx + 1}</td>
                <td>
                  <span class="chest-mono-pill">${formatChestNo(cand)}</span>
                </td>
                <td>
                  <strong class="cand-full-name">${cand.name}</strong>
                </td>
                <td>
                  <span class="class-text">${cand.class || '—'}</span>
                </td>
                <td>
                  <span class="adno-text">${cand.adNo || '—'}</span>
                </td>
                <td style="text-align: center;">
                  <div class="readiness-fill-box">
                    <span class="rfb-line"></span>
                    <span class="rfb-unit">%</span>
                  </div>
                </td>
                <td>
                  <div class="remarks-ruled-line"></div>
                </td>
              </tr>
            `).join('')}

            ${emptyRows.map(row => `
              <tr class="cand-row cand-row-blank">
                <td style="text-align: center; color: #888888;">${row.sl}</td>
                <td><span class="chest-blank-line"></span></td>
                <td><span class="name-blank-line"></span></td>
                <td></td>
                <td></td>
                <td style="text-align: center;">
                  <div class="readiness-fill-box">
                    <span class="rfb-line"></span>
                    <span class="rfb-unit">%</span>
                  </div>
                </td>
                <td>
                  <div class="remarks-ruled-line"></div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Bottom Important Notice & Directive (NB) -->
      <div class="program-footer-strip">
        <div class="pfs-nb-box">
          <div class="pfs-nb-header">
            <span class="pfs-nb-pill">IMPORTANT (NB)</span>
            <span class="pfs-nb-title">MANDATORY ESCALATION DIRECTIVE</span>
          </div>
          <div class="pfs-nb-content">
            If any candidate is <strong>not practicing</strong>, <strong>refuses your orders/instructions</strong>, or is performing <strong>very low</strong>, take actions and inform immediately to these respective coordinators:
            <div class="pfs-nb-contacts">
              <span class="pfs-contact">📞 <strong>+91 88917 17639</strong> (Rashid Ustad)</span>
              <span class="pfs-contact-sep">•</span>
              <span class="pfs-contact">📞 <strong>+91 83899 41063</strong> (Mehboob Ustad)</span>
            </div>
          </div>
        </div>

        <div class="pfs-sign-box">
          <div class="pfs-sign-role">MENTOR</div>
          <div class="pfs-sign-name">${mentor ? mentor.name : '________________________'}</div>
          <div class="pfs-sign-line"></div>
          <div class="pfs-sign-label">(Your Signature &amp; Date)</div>
        </div>
      </div>

      <!-- Running Page Bottom Note -->
      <div class="sheet-bottom-note">
        <span>Darul Huda Bengal • Sibaq '26 Official Program Roster</span>
        <span>Program: <strong>${program.code} • ${program.name}</strong> • Ref: SIB26-PRG-${(program.code || '').replace(/[^a-zA-Z0-9]/g, '')} • ${printDateStr}</span>
      </div>

    </div>
  `;
}

/**
 * Render consolidated master directory table of all programs (multi-program compact table)
 */
export function renderProgramsDirectoryTable(programsList) {
  const printDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `
    <div class="program-directory-page">
      <!-- Top Running Header -->
      <div class="sheet-running-header">
        <span class="srh-left">Darul Huda Bengal • Sibaq '26</span>
        <span class="srh-center">Official Programs &amp; Assignments Master Directory</span>
        <span class="srh-right">Total: ${programsList.length} Programs</span>
      </div>

      <!-- Main Black Header Box -->
      <div class="program-header-box">
        <div class="program-title-black-bg">
          <h1 class="ptb-title">Darul Huda Bengal • Sibaq '26</h1>
          <div class="ptb-sub">CONSOLIDATED PROGRAMS &amp; MENTORSHIP MASTER DIRECTORY</div>
        </div>
      </div>

      <!-- Master Directory Table -->
      <div class="directory-table-box">
        <table class="directory-master-table">
          <thead>
            <tr>
              <th style="width: 4%; text-align: center;">SL</th>
              <th style="width: 10%;">Code</th>
              <th style="width: 25%;">Program Title</th>
              <th style="width: 12%;">Category</th>
              <th style="width: 8%; text-align: center;">Type</th>
              <th style="width: 17%;">Assigned Mentor</th>
              <th style="width: 24%;">Enrolled Candidates (Chest No &amp; Name)</th>
            </tr>
          </thead>
          <tbody>
            ${programsList.map((p, idx) => {
              const mentor = p.trainerId ? state.getTrainerById(p.trainerId) : null;
              const candidates = state.getProgramCandidates(p.id) || [];
              const isStage = isStageProgram(p);

              return `
                <tr class="dir-row">
                  <td style="text-align: center; font-weight: 800;">${idx + 1}</td>
                  <td>
                    <span class="chest-mono-pill">[${p.code || 'PRG'}]</span>
                  </td>
                  <td>
                    <strong class="dir-prog-name">${p.name || 'Untitled'}</strong>
                  </td>
                  <td>
                    <span class="dir-cat-badge">${p.category || 'General'}</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="dir-type-pill ${isStage ? 'dtp-stage' : 'dtp-nonstage'}">
                      ${isStage ? 'Stage' : 'Non-Stage'}
                    </span>
                  </td>
                  <td>
                    ${mentor ? `
                      <div class="dir-mentor-line">
                        <strong class="dir-mentor-name">${mentor.name}</strong>
                        ${mentor.phone ? `<div class="dir-mentor-phone">📞 ${mentor.phone}</div>` : ''}
                      </div>
                    ` : `
                      <span class="dir-unassigned">Not Assigned</span>
                    `}
                  </td>
                  <td>
                    ${candidates.length > 0 ? `
                      <div class="dir-cands-wrap">
                        ${candidates.map(c => `
                          <span class="dir-cand-chip">
                            <strong>${formatChestNo(c)}</strong> ${c.name}
                          </span>
                        `).join(', ')}
                      </div>
                    ` : `
                      <span class="dir-no-cands">No candidates enrolled yet</span>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Bottom Important Directive (NB) -->
      <div class="program-footer-strip" style="margin-top: 10px;">
        <div class="pfs-nb-box" style="border-right: none;">
          <div class="pfs-nb-header">
            <span class="pfs-nb-pill">IMPORTANT (NB)</span>
            <span class="pfs-nb-title">CENTRAL COORDINATION DIRECTIVE</span>
          </div>
          <div class="pfs-nb-content">
            If any candidate is <strong>not practicing</strong>, <strong>refuses your orders/instructions</strong>, or is performing <strong>very low</strong>, take actions and inform immediately to these respective coordinators:
            <div class="pfs-nb-contacts">
              <span class="pfs-contact">📞 <strong>+91 88917 17639</strong> (Rashid Ustad)</span>
              <span class="pfs-contact-sep">•</span>
              <span class="pfs-contact">📞 <strong>+91 83899 41063</strong> (Mehboob Ustad)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Running Page Bottom Note -->
      <div class="sheet-bottom-note">
        <span>Darul Huda Bengal • Sibaq '26 Programs Master Directory</span>
        <span>Total: ${programsList.length} Programs • Printed: ${printDateStr}</span>
      </div>
    </div>
  `;
}

/**
 * Print Program Roster (opens print window with screen preview and automated print)
 * @param {Object|Array} programOrPrograms Single program or array of programs
 * @param {Object} options { mode: 'dossier' | 'directory' }
 */
export function printProgramRoster(programOrPrograms, options = { mode: 'dossier' }) {
  const list = Array.isArray(programOrPrograms) ? programOrPrograms : [programOrPrograms];
  if (!list || list.length === 0) {
    toast.error('No program selected to print.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups in your browser to print the program roster.');
    return;
  }

  const isSingle = list.length === 1;
  const singleProg = isSingle ? list[0] : null;
  const isDirectoryMode = options.mode === 'directory' && list.length > 1;

  const pageTitle = isSingle
    ? `Sibaq '26 - [${singleProg.code}] ${singleProg.name} Roster`
    : (isDirectoryMode 
        ? `Sibaq '26 - Programs Master Directory (${list.length} Programs)`
        : `Sibaq '26 - Program Rosters (${list.length} Programs Bulk)`);

  const contentHtml = isDirectoryMode
    ? renderProgramsDirectoryTable(list)
    : list.map(p => renderSingleProgramSheet(p)).join('');

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

        /* Screen Preview Control Bar */
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
        .program-sheet-page, .program-directory-page {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          page-break-after: always;
          break-after: page;
        }
        .program-sheet-page:last-child, .program-directory-page:last-child {
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

        /* Main Black Heading Box */
        .program-header-box {
          margin-bottom: 6px;
        }
        .program-title-black-bg {
          background: #000000 !important;
          color: #ffffff !important;
          text-align: center;
          padding: 8px 12px;
          border-radius: 4px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ptb-title {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          line-height: 1.1;
          color: #ffffff !important;
        }
        .ptb-sub {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-top: 3px;
          color: #eeeeee !important;
        }
        .ptb-quote {
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

        /* Program Summary Card */
        .prog-meta-summary-box {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          border: 1.5px solid #000000;
          border-radius: 4px;
          margin-bottom: 8px;
          background: #ffffff;
          overflow: hidden;
        }
        .pm-col {
          display: flex;
          flex-direction: column;
        }
        .pm-col-left {
          border-right: 1.5px solid #000000;
        }
        .pm-row {
          padding: 6px 10px;
          border-bottom: 1px solid #000000;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pm-code-title-row {
          background: #fafafa;
        }
        .pm-mentor-header-row {
          background: #fafafa;
        }
        .pm-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          color: #333333;
          letter-spacing: 0.04em;
        }
        .pm-title-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .pm-code-badge {
          font-family: monospace;
          font-size: 11px;
          font-weight: 900;
          background: #000000;
          color: #ffffff;
          padding: 1px 6px;
          border-radius: 3px;
          letter-spacing: 0.04em;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pm-name-text {
          font-size: 13px;
          font-weight: 900;
          color: #000000;
          letter-spacing: -0.01em;
        }
        .pm-split-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          flex: 1;
        }
        .pm-split-cell {
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pm-split-cell:first-child {
          border-right: 1px solid #000000;
        }
        .pm-val {
          font-size: 10px;
          color: #000000;
        }
        .pm-val-bold {
          font-weight: 800;
        }
        .pm-val-stage {
          font-weight: 900;
          color: #000000;
          text-transform: uppercase;
        }
        .pm-val-nonstage {
          font-weight: 700;
          color: #444444;
          text-transform: uppercase;
        }
        .pm-mentor-name {
          font-size: 12px;
          font-weight: 900;
          color: #000000;
        }
        .pm-unassigned-tag {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          color: #555555;
          font-style: italic;
        }

        /* Enrolled Candidates Table */
        .candidates-table-box {
          border: 1.5px solid #000000;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .ctb-header {
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
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .ctb-count-badge {
          background: #ffffff;
          color: #000000;
          font-size: 8px;
          font-weight: 900;
          padding: 1px 6px;
          border-radius: 3px;
        }

        .candidates-master-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        .candidates-master-table thead th {
          background: #f0f0f0 !important;
          color: #000000;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 8.5px;
          padding: 6px 8px;
          border-bottom: 1.5px solid #000000;
          border-right: 1px solid #000000;
          text-align: left;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .candidates-master-table thead th:last-child {
          border-right: none;
        }
        .cand-row td {
          border-bottom: 1px solid #000000;
          border-right: 1px solid #000000;
          padding: 6px 8px;
          vertical-align: middle;
        }
        .cand-row:last-child td {
          border-bottom: none;
        }
        .cand-row td:last-child {
          border-right: none;
        }
        .chest-mono-pill {
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
        .cand-full-name {
          font-size: 10px;
          font-weight: 800;
          color: #000000;
        }
        .class-text, .adno-text {
          font-size: 9px;
          color: #000000;
        }
        .readiness-fill-box {
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
        .rfb-line {
          flex: 1;
        }
        .rfb-unit {
          font-size: 9px;
          font-weight: 800;
          color: #000000;
        }
        .remarks-ruled-line {
          width: 100%;
          min-height: 18px;
        }

        /* Blank placeholder lines for empty rows */
        .chest-blank-line {
          display: block;
          width: 50px;
          border-bottom: 1px dotted #888888;
          height: 12px;
        }
        .name-blank-line {
          display: block;
          width: 120px;
          border-bottom: 1px dotted #888888;
          height: 12px;
        }

        /* Bottom Directive and Signature Strip */
        .program-footer-strip {
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
        .pfs-nb-box {
          flex: 1;
          padding: 6px 10px;
          border-right: 1.5px solid #000000;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .pfs-nb-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
        }
        .pfs-nb-pill {
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
        .pfs-nb-title {
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #000000;
        }
        .pfs-nb-content {
          font-size: 8.5px;
          color: #000000;
          line-height: 1.35;
        }
        .pfs-nb-contacts {
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          font-weight: 700;
        }
        .pfs-contact-sep {
          color: #888888;
        }
        .pfs-sign-box {
          width: 180px;
          min-width: 180px;
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          background: #fdfdfd;
        }
        .pfs-sign-role {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #000000;
        }
        .pfs-sign-name {
          font-size: 10px;
          font-weight: 800;
          color: #000000;
          margin-top: 1px;
        }
        .pfs-sign-line {
          border-bottom: 1.5px solid #000000;
          margin: 18px 4px 3px;
        }
        .pfs-sign-label {
          font-size: 8px;
          font-weight: 700;
          color: #333333;
          text-transform: uppercase;
        }

        /* Directory Master Table Styles */
        .directory-table-box {
          border: 1.5px solid #000000;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .directory-master-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
        }
        .directory-master-table thead th {
          background: #f0f0f0 !important;
          color: #000000;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 8px;
          padding: 5px 6px;
          border-bottom: 1.5px solid #000000;
          border-right: 1px solid #000000;
          text-align: left;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .directory-master-table thead th:last-child {
          border-right: none;
        }
        .dir-row td {
          border-bottom: 1px solid #000000;
          border-right: 1px solid #000000;
          padding: 5px 6px;
          vertical-align: top;
        }
        .dir-row:last-child td {
          border-bottom: none;
        }
        .dir-row td:last-child {
          border-right: none;
        }
        .dir-prog-name {
          font-size: 9.5px;
          color: #000000;
        }
        .dir-cat-badge {
          font-size: 8.5px;
          font-weight: 700;
        }
        .dir-type-pill {
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 2px;
          display: inline-block;
          text-transform: uppercase;
        }
        .dtp-stage {
          background: #000000;
          color: #ffffff;
        }
        .dtp-nonstage {
          background: #eeeeee;
          color: #333333;
          border: 1px solid #999999;
        }
        .dir-mentor-name {
          font-size: 9.5px;
          color: #000000;
        }
        .dir-mentor-phone {
          font-size: 8px;
          color: #555555;
        }
        .dir-unassigned {
          font-size: 8px;
          color: #666666;
          font-style: italic;
        }
        .dir-cand-chip {
          display: inline-block;
          margin-right: 3px;
          white-space: nowrap;
          font-size: 8.5px;
        }
        .dir-no-cands {
          font-size: 8px;
          color: #666666;
          font-style: italic;
        }

        /* Running Page Bottom Note */
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

        @media print {
          .no-print {
            display: none !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Screen Controls Bar (Screen Only) -->
      <div class="screen-control-bar no-print">
        <div class="scb-left">
          <span class="scb-badge">PRINT PREVIEW</span>
          <div>
            <div class="scb-title">${pageTitle}</div>
            <div class="scb-hint">Black &amp; white print-ready layout • Formatted for standard A4 paper</div>
          </div>
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

      <!-- Main Rendered Content -->
      <div class="print-wrapper">
        ${contentHtml}
      </div>

      <script>
        // Auto-launch system print dialog on window load
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullPrintHtml);
  printWindow.document.close();
}

/**
 * Interactive Modal for Printing Programs (Bulk, Filtered, or Individual)
 */
export function openProgramPrintModal({ programs = [], allPrograms = [], defaultProgramId = null }) {
  const baseCurrent = programs.length > 0 ? programs : state.getPrograms();
  const baseAll = allPrograms.length > 0 ? allPrograms : state.getPrograms();

  if (baseAll.length === 0) {
    toast.error('No programs found in the database to print.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md" style="max-width: 540px; background: #ffffff; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.22); overflow: hidden; border: 1.5px solid #0f172a;">
      <div class="modal-header" style="background: #0f172a; color: #ffffff; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-flex; width: 28px; height: 28px; border-radius: 6px; background: rgba(255,255,255,0.15); align-items: center; justify-content: center;">
            ${getIcon('printer')}
          </span>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Print Program Rosters &amp; Directory</h3>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Black &amp; white print-ready • A4 sheets with assigned mentors and candidates</p>
          </div>
        </div>
        <button type="button" class="modal-close-btn" id="btnProgramPrintModalClose" style="color: #ffffff; background: transparent; border: none; font-size: 18px; cursor: pointer;">
          ${getIcon('x')}
        </button>
      </div>

      <div class="modal-body" style="padding: 16px 20px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- Option 1: Print All as Detailed Individual Rosters (1 per A4 page) -->
        <div style="border: 1.5px solid #0f172a; border-radius: 8px; padding: 12px 14px; background: #fafafa;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
                  Individual Program Rosters (Bulk)
                </span>
                <span style="background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px;">
                  ${baseAll.length} Sheets
                </span>
              </div>
              <p style="margin: 3px 0 0; font-size: 11px; color: #475569;">
                Prints each program on its own dedicated A4 page with full candidate list, assigned mentor, and sign-off.
              </p>
            </div>
            <button type="button" id="btnPrintAllProgramDossiers" class="btn btn-primary" style="height: 36px; padding: 0 14px; font-weight: 800; font-size: 12px; gap: 6px; background: #0f172a; border-color: #0f172a; color: #ffffff; white-space: nowrap;">
              ${getIcon('printer')} Print Sheets
            </button>
          </div>
        </div>

        <!-- Option 2: Print Consolidated Master Directory Table (All programs in 1 high-density table) -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
                  Consolidated Master Directory
                </span>
                <span style="background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px;">
                  1 Master Table
                </span>
              </div>
              <p style="margin: 3px 0 0; font-size: 11px; color: #475569;">
                Compact overview table listing all programs with code, category, type, mentor, and enrolled candidates.
              </p>
            </div>
            <button type="button" id="btnPrintDirectoryTable" class="btn btn-outline" style="height: 36px; padding: 0 14px; font-weight: 800; font-size: 12px; gap: 6px; border-color: #0f172a; color: #0f172a; white-space: nowrap;">
              ${getIcon('fileSpreadsheet')} Print Directory
            </button>
          </div>
        </div>

        <!-- Option 3: Print Current Filtered Selection (If active filter is applied) -->
        ${baseCurrent.length !== baseAll.length ? `
          <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; background: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <div>
                <span style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
                  Print Current Filtered Selection (${baseCurrent.length} Programs)
                </span>
                <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">
                  Matches your active category, type, or search filter.
                </p>
              </div>
              <button type="button" id="btnPrintFilteredPrograms" class="btn btn-outline" style="height: 36px; padding: 0 14px; font-weight: 800; font-size: 12px; gap: 6px; border-color: #0f172a; color: #0f172a; white-space: nowrap;">
                ${getIcon('filter')} Print Filtered (${baseCurrent.length})
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Option 4: Print for an Individual Program -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; background: #ffffff;">
          <label style="display: block; font-size: 11px; font-weight: 900; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;">
            Print for an Individual Program
          </label>
          <div style="display: flex; gap: 8px;">
            <select id="selPrintProgram" class="form-control" style="flex: 1; height: 38px; font-size: 12px; font-weight: 600; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 0 10px;">
              <option value="">-- Choose Program --</option>
              ${baseAll.map(p => {
                const trn = p.trainerId ? state.getTrainerById(p.trainerId) : null;
                const cCount = p.candidateIds ? p.candidateIds.length : 0;
                return `
                  <option value="${p.id}" ${p.id === defaultProgramId ? 'selected' : ''}>
                    [${p.code}] ${p.name} • ${p.category} (${cCount} cands${trn ? ` • Mentor: ${trn.name}` : ''})
                  </option>
                `;
              }).join('')}
            </select>
            <button type="button" id="btnPrintSelectedProgram" class="btn btn-outline" style="height: 38px; padding: 0 14px; font-weight: 800; gap: 6px; border-color: #000000; color: #000000; white-space: nowrap;">
              ${getIcon('printer')} Print Sheet
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" id="btnProgramPrintCancel" style="height: 34px; padding: 0 16px; font-weight: 700;">
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

  overlay.querySelector('#btnProgramPrintModalClose').addEventListener('click', close);
  overlay.querySelector('#btnProgramPrintCancel').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Action: Print All Program Dossiers
  overlay.querySelector('#btnPrintAllProgramDossiers').addEventListener('click', () => {
    close();
    printProgramRoster(baseAll, { mode: 'dossier' });
  });

  // Action: Print Consolidated Master Directory
  overlay.querySelector('#btnPrintDirectoryTable').addEventListener('click', () => {
    close();
    printProgramRoster(baseAll, { mode: 'directory' });
  });

  // Action: Print Filtered
  const btnFiltered = overlay.querySelector('#btnPrintFilteredPrograms');
  if (btnFiltered) {
    btnFiltered.addEventListener('click', () => {
      close();
      printProgramRoster(baseCurrent, { mode: 'dossier' });
    });
  }

  // Action: Print Selected Single Program
  overlay.querySelector('#btnPrintSelectedProgram').addEventListener('click', () => {
    const sel = overlay.querySelector('#selPrintProgram');
    const pid = sel.value;
    if (!pid) {
      toast.warning('Please select a program from the dropdown to print.');
      return;
    }
    const p = state.getProgramById(pid);
    if (!p) {
      toast.error('Selected program not found.');
      return;
    }
    close();
    printProgramRoster(p, { mode: 'dossier' });
  });
}

