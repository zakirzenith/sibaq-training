import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openProgramQuickViewModal } from './programQuickViewModal.js';

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

/**
 * Enhanced Candidate Performance Dossier Modal
 * Executive summary, program-by-program trajectory, mentor avatars,
 * multi-session scoring logs, and high-contrast printable document.
 */
export function openCandidateDossierModal(candidateId) {
  const dossier = state.getCandidatePerformanceDossier(candidateId);
  if (!dossier) return;

  const {
    candidate,
    programs,
    programReports,
    allMeets,
    totalMeets,
    overallReadiness,
    hasEvaluation,
    overallStatus,
    meetingRatePct,
    meetingRateLabel,
    daysSinceLastMeet,
    momentumLabel,
    momentumColor,
    momentumBadgeClass,
    momentumDesc,
    allRemarks
  } = dossier;

  const cleanChest = formatChestNo(candidate);
  const initials = (candidate.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop dossier-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-xl candidate-dossier-dialog" style="max-width: 900px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header (Screen Only) -->
      <div class="modal-header dossier-screen-header" style="border-bottom: 1px solid #e2e8f0; padding: 14px 18px; flex-shrink: 0; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25); overflow: hidden; border: 2px solid #ffffff;">
            ${candidate.photo 
              ? `<img src="${candidate.photo}" alt="${candidate.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
              : initials}
          </div>
          <div style="min-width: 0;">
            <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px;">
              <span style="color: #6366f1;">${getIcon('award')}</span>
              <span>Candidate Performance Dossier</span>
            </div>
            <h2 class="modal-title" style="font-size: 19px; margin: 2px 0 0 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${candidate.name}
            </h2>
            <p class="modal-subtitle" style="font-size: 12px; margin-top: 2px; color: #64748b;">
              Chest: <strong style="color: #0f172a;">${cleanChest}</strong> • Category: <strong>${candidate.category}</strong> • ${candidate.institution || 'DH BENGAL'}
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <button type="button" id="btnDossierPrint" class="btn btn-sm btn-outline" style="gap: 6px; font-weight: 700; border-color: #cbd5e1; height: 34px; padding: 0 12px;" title="Print Official Candidate Dossier">
            ${getIcon('printer')} <span>Print Dossier</span>
          </button>
          <button class="modal-close-btn" id="btnDossierClose" aria-label="Close">${getIcon('x')}</button>
        </div>
      </div>

      <!-- Scrollable Dossier Content -->
      <div class="modal-body dossier-printable-content" id="dossierPrintArea" style="overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: #f8fafc;">
        
        <!-- Official Printable Banner (Displayed on printout) -->
        <div class="dossier-print-banner" style="display: none; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 14px;">
              ${candidate.photo ? `<img src="${candidate.photo}" alt="${candidate.name}" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #0f172a; flex-shrink: 0;" />` : ''}
              <div>
                <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DH BENGAL • SIBAQ TRAINING ACADEMY</h1>
                <div style="font-size: 13px; font-weight: 700; color: #4338ca; margin-top: 2px;">Official Candidate Performance Dossier</div>
                <div style="font-size: 12px; margin-top: 4px;">Candidate: <strong>${candidate.name}</strong> (${cleanChest}) • Category: <strong>${candidate.category}</strong></div>
              </div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Date: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              <div>Report Reference: #DOS-${cleanChest.replace('#', '')}-${candidate.category.slice(0, 3).toUpperCase()}</div>
            </div>
          </div>
        </div>

        <!-- 1. Executive Summary Cards -->
        <div class="dossier-summary-grid">
          
          <!-- Overall Readiness Card -->
          <div class="dossier-kpi-card">
            <div class="dossier-kpi-label">Overall Readiness</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span class="dossier-kpi-val" style="color: ${hasEvaluation ? overallStatus.color : '#64748b'};">
                ${hasEvaluation ? `${overallReadiness}%` : 'N/A'}
              </span>
              <span class="badge ${overallStatus.badgeClass}" style="font-size: 10.5px; font-weight: 700;">
                ${overallStatus.label}
              </span>
            </div>
            <div class="progress-bar-bg" style="height: 6px; border-radius: 999px; background: #e2e8f0; margin-top: 10px; overflow: hidden;">
              <div style="width: ${overallReadiness}%; height: 100%; background: ${hasEvaluation ? overallStatus.color : '#94a3b8'}; border-radius: 999px;"></div>
            </div>
          </div>

          <!-- Meeting Compliance Card -->
          <div class="dossier-kpi-card">
            <div class="dossier-kpi-label">Meeting Compliance</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span class="dossier-kpi-val" style="color: #0f172a;">
                ${meetingRatePct}%
              </span>
              <span class="badge ${meetingRatePct === 100 ? 'badge-stage' : (meetingRatePct > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 10.5px; font-weight: 700;">
                ${meetingRateLabel}
              </span>
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 8px;">
              Total Sessions: <strong style="color: #0f172a;">${totalMeets} check-ins</strong>
            </div>
          </div>

          <!-- Momentum & Preparation Trajectory -->
          <div class="dossier-kpi-card">
            <div class="dossier-kpi-label">Preparation Trajectory</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${momentumColor};"></span>
              <strong style="font-size: 13.5px; color: #0f172a;">${momentumLabel}</strong>
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.35;">
              ${momentumDesc}
            </div>
          </div>

          <!-- Activity Recency -->
          <div class="dossier-kpi-card">
            <div class="dossier-kpi-label">Last Active Session</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
              ${dossier.latestMeetEver ? `${dossier.latestMeetEver.date} • ${dossier.latestMeetEver.time || ''}` : 'No Sessions Yet'}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              ${daysSinceLastMeet !== null ? (daysSinceLastMeet === 0 ? 'Active today' : `${daysSinceLastMeet} days ago`) : 'Awaiting check-in'}
            </div>
          </div>
        </div>

        <!-- 2. Program-by-Program Readiness & Evaluation Breakdown -->
        <div class="dossier-section-box">
          <div class="dossier-section-header">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="color: #4f46e5;">${getIcon('programs')}</span>
              <strong style="font-size: 14px; color: #0f172a;">Assigned Programs & Readiness Breakdown</strong>
              <span class="badge badge-primary-subtle" style="font-size: 11px;">${programs.length} Programs</span>
            </div>
          </div>

          ${programs.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">
              No programs assigned to this candidate yet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${programReports.map(pr => {
                const progTypeClass = pr.program.type === 'Stage' ? 'p-stage' : 'p-nonstage';
                const deltaFormatted = pr.scoreDelta > 0 ? `+${pr.scoreDelta}%` : `${pr.scoreDelta}%`;
                const deltaColor = pr.scoreDelta > 0 ? '#10b981' : (pr.scoreDelta < 0 ? '#ef4444' : '#64748b');

                return `
                  <div class="dossier-program-row">
                    <div class="dpr-header-wrap">
                      
                      <!-- Left: Program info & Mentor -->
                      <div class="dpr-meta-group">
                        <span class="badge ${progTypeClass} prog-report-chip" data-action="view-program" data-pid="${pr.program.id}" style="font-size: 11.5px; font-weight: 800; padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;" title="Click to view [${pr.program.code}] ${pr.program.name} program details & roster">
                          ${pr.program.code}
                        </span>
                        <div>
                          <strong style="font-size: 13.5px; color: #0f172a;">${pr.program.name}</strong>
                          <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span>${pr.program.type}</span>
                            <span>•</span>
                            ${pr.trainer ? `
                              <div style="display: inline-flex; align-items: center; gap: 4px;">
                                <div class="trainer-avatar-mini" style="background: ${pr.trainer.color || '#6366f1'}; overflow: hidden; width: 20px; height: 20px; font-size: 9px; border-radius: 50%;">
                                  ${pr.trainer.photo ? `<img src="${pr.trainer.photo}" alt="${pr.trainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : pr.trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <span>Mentor: <strong>${pr.trainer.name}</strong></span>
                              </div>
                            ` : `<span class="text-warning">No Mentor Assigned</span>`}
                          </div>
                        </div>
                      </div>

                      <!-- Middle: Program Readiness -->
                      <div class="dpr-score-group">
                        <div class="dpr-score-col">
                          <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Readiness</div>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 16px; font-weight: 900; color: ${pr.isMet ? pr.status.color : '#64748b'};">
                              ${pr.isMet ? `${pr.latestScore}%` : 'N/A'}
                            </span>
                            <span class="badge ${pr.status.badgeClass}" style="font-size: 10px;">
                              ${pr.status.label}
                            </span>
                          </div>
                        </div>

                        <!-- Check-ins badge -->
                        <div class="dpr-count-col">
                          <span class="badge ${pr.isMet ? 'badge-stage' : 'badge-danger'}" style="font-size: 10.5px; font-weight: 700;">
                            ${pr.isMet ? `${pr.meetCount} Meets Logged` : '0 Meets • Not Met'}
                          </span>
                          ${pr.meetCount > 1 ? `
                            <div style="font-size: 10.5px; color: ${deltaColor}; font-weight: 700; margin-top: 2px;">
                              Trajectory: ${deltaFormatted}
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Program check-ins timeline pills -->
                    ${pr.meets.length > 0 ? `
                      <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #f1f5f9;">
                        ${pr.meets.map(m => `
                          <span class="badge badge-neutral" style="font-size: 10px; padding: 2px 6px;" title="${m.date} ${m.time || ''} • ${m.remark ? m.remark : 'No remark'}">
                            Meet #${m.meetNumber}: <strong>${m.percentage}%</strong> (${m.date})
                          </span>
                        `).join('')}
                      </div>
                    ` : ''}

                    <!-- Latest Trainer Remark for this Program -->
                    ${pr.remarks.length > 0 ? `
                      <div style="margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #f1f5f9; font-size: 11.5px; color: #334155; display: flex; align-items: flex-start; gap: 6px;">
                        <span style="color: #6366f1; flex-shrink: 0; margin-top: 1px;">${getIcon('quote')}</span>
                        <div style="flex: 1;">
                          <strong>"${pr.remarks[0].text}"</strong>
                          <span style="font-size: 10px; color: #64748b; margin-left: 6px;">— ${pr.remarks[0].trainerName} (${pr.remarks[0].date})</span>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 3. Comprehensive Trainer Remarks & Evaluation Log -->
        <div class="dossier-section-box">
          <div class="dossier-section-header">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="color: #4f46e5;">${getIcon('quote')}</span>
              <strong style="font-size: 14px; color: #0f172a;">Trainers' Mentorship Feedback & Evaluation Log</strong>
              <span class="badge badge-neutral" style="font-size: 11px;">${allRemarks.length} Feedback Notes</span>
            </div>
          </div>

          ${allRemarks.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12.5px;">
              No detailed mentor remarks recorded for this candidate yet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allRemarks.map(rm => `
                <div class="dossier-feedback-item">
                  <div class="dfi-header">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <div class="trainer-avatar-mini" style="width: 22px; height: 22px; font-size: 10px; background: #6366f1; overflow: hidden; border-radius: 50%;">
                        ${rm.trainerPhoto ? `<img src="${rm.trainerPhoto}" alt="${rm.trainerName}" style="width: 100%; height: 100%; object-fit: cover;" />` : rm.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <strong style="font-size: 12.5px; color: #0f172a;">${rm.trainerName}</strong>
                      ${rm.programCode ? `<span class="badge badge-primary-subtle" style="font-size: 10px;">[${rm.programCode}]</span>` : ''}
                      <span class="badge badge-success-subtle" style="font-size: 10px; font-weight: 700;">Score: ${rm.percentage}%</span>
                    </div>
                    <span style="font-size: 10.5px; color: #64748b;">${rm.date} • ${rm.time || ''}</span>
                  </div>
                  <div class="dfi-text">
                    "${rm.text}"
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 4. Printable Signature Footer -->
        <div class="dossier-print-footer" style="display: none; margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1; justify-content: space-between; font-size: 11px; color: #475569;">
          <div>
            <div>Evaluating Mentor Signature: _______________________</div>
            <div style="margin-top: 3px; font-size: 10px; color: #64748b;">Specialized Trainer Sign-off</div>
          </div>
          <div style="text-align: right;">
            <div>Controller Hub Authorized Signature: _______________________</div>
            <div style="margin-top: 3px; font-size: 10px; color: #64748b;">Sibaq Mentoring Central Board</div>
          </div>
        </div>

      </div>

      <!-- Modal Footer (Screen Only) -->
      <div class="modal-footer dossier-screen-footer" style="border-top: 1px solid #e2e8f0; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: #ffffff;">
        <span class="text-xs text-muted">
          Sibaq Mentoring • Official Performance Dossier
        </span>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="btnDossierCloseBottom" class="btn btn-secondary" style="padding: 0 16px; height: 36px; font-size: 13px;">
            Close
          </button>
          <button type="button" id="btnDossierPrintBottom" class="btn btn-primary" style="padding: 0 16px; height: 36px; font-size: 13px; font-weight: 700; gap: 6px;">
            ${getIcon('printer')} <span>Print Official Dossier</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnDossierClose').addEventListener('click', close);
  overlay.querySelector('#btnDossierCloseBottom').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  const printDossier = () => {
    printCandidateSingleDossierDocument(dossier);
  };

  overlay.querySelector('#btnDossierPrint').addEventListener('click', printDossier);
  overlay.querySelector('#btnDossierPrintBottom').addEventListener('click', printDossier);

  // Wire click on program code rectangle
  overlay.querySelectorAll('[data-action="view-program"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const pid = el.getAttribute('data-pid');
      if (pid) {
        openProgramQuickViewModal(pid, candidate.id);
      }
    });
  });
}

/**
 * Dedicated, pristine A4 Portrait printable sheet for a single candidate dossier.
 * Fits the PDF frame without clipping, dark backdrops, or overlapping content.
 */
function printCandidateSingleDossierDocument(dossier) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups in your browser to print the candidate dossier.');
    return;
  }

  const {
    candidate,
    programs,
    programReports,
    allMeets,
    totalMeets,
    overallReadiness,
    hasEvaluation,
    overallStatus,
    meetingRateLabel,
    momentumLabel,
    allRemarks
  } = dossier;

  const cleanChest = formatChestNo(candidate);
  const now = new Date();
  const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const docRef = `DHB-DOS-${cleanChest.replace('#', '')}-${candidate.category.slice(0, 3).toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>DH BENGAL - Candidate Dossier [${cleanChest} ${candidate.name}]</title>
      <style>
        @page {
          size: portrait;
          margin: 7mm 9mm 7mm 9mm;
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
          font-size: 10.5px;
          line-height: 1.35;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Screen Control Bar (Hidden on actual print) */
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
        .np-btn {
          cursor: pointer;
          border: none;
          border-radius: 4px;
          padding: 6px 14px;
          font-size: 11.5px;
          font-weight: 700;
        }

        .sheet-container {
          width: 100%;
          max-width: 100%;
        }

        /* Executive Header */
        .header-box {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 8px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 10px;
        }
        .brand-org {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #64748b;
          text-transform: uppercase;
        }
        .brand-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin: 1px 0 2px 0;
        }
        .brand-sub {
          font-size: 11px;
          font-weight: 700;
          color: #4338ca;
        }

        /* Candidate Profile Card */
        .profile-strip {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .cand-chest-pill {
          background: #0f172a;
          color: #ffffff;
          font-family: ui-monospace, monospace;
          font-size: 13px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .cand-name-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        /* KPI Grid */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        .kpi-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 10px;
          text-align: center;
        }
        .kpi-k {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 3px;
        }
        .kpi-v {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        /* Section Headings */
        .sec-head {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 4px;
          margin: 12px 0 6px 0;
        }

        /* Tables */
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 9.5px;
          margin-bottom: 10px;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 5px 6px;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e293b;
          text-align: left;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 4.5px 6px;
          vertical-align: top;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        tbody tr:nth-child(even) { background: #f8fafc; }

        .score-pill {
          display: inline-block;
          padding: 1.5px 6px;
          border-radius: 3px;
          font-weight: 700;
          font-size: 9px;
        }
        .score-met { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .score-pending { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }

        /* Sign-off Footer */
        .doc-footer {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1.5px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 8.5px;
          color: #64748b;
        }
        .sign-line {
          width: 160px;
          border-bottom: 1px solid #0f172a;
          margin-bottom: 3px;
        }

        @media print {
          .no-print { display: none !important; }
          html, body, .sheet-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <div>
          <strong>🖨️ Print Preview: Candidate Dossier</strong>
          <span style="font-size: 11px; margin-left: 10px; color: #cbd5e1;">Paper size is pre-set to <strong>A4 Portrait</strong></span>
        </div>
        <div>
          <button class="np-btn" onclick="window.print()" style="background: #4f46e5; color: #fff;">Print / Save as PDF</button>
          <button class="np-btn" onclick="window.close()" style="background: #334155; color: #fff; margin-left: 6px;">Close</button>
        </div>
      </div>

      <div class="sheet-container">
        <!-- Letterhead -->
        <div class="header-box">
          <div>
            <div class="brand-org">DARUL HUDA BENGAL • SIBAQ TRAINING ACADEMY</div>
            <div class="brand-title">OFFICIAL CANDIDATE PERFORMANCE DOSSIER</div>
            <div class="brand-sub">Comprehensive Mentorship & Continuous Evaluation Record</div>
          </div>
          <div style="text-align: right; font-size: 9.5px; color: #475569;">
            <div>Date: <strong>${todayFormatted} • ${timeFormatted}</strong></div>
            <div>Ref: <strong>${docRef}</strong></div>
          </div>
        </div>

        <!-- Candidate Profile -->
        <div class="profile-strip">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="cand-chest-pill">${cleanChest}</span>
            <div>
              <div class="cand-name-title">${candidate.name}</div>
              <div style="font-size: 11px; color: #64748b;">
                Category: <strong>${candidate.category}</strong>
                ${candidate.institution ? ` • Institution: <strong>${candidate.institution}</strong>` : ''}
              </div>
            </div>
          </div>
          <div style="text-align: right; font-size: 10.5px; color: #475569;">
            <div>Enrolled Programs: <strong>${programs.length}</strong></div>
            ${candidate.phone ? `<div>Contact: <strong>${candidate.phone}</strong></div>` : ''}
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-k">Overall Readiness</div>
            <div class="kpi-v" style="color: ${overallReadiness >= 80 ? '#047857' : (overallReadiness >= 60 ? '#1d4ed8' : '#b91c1c')};">
              ${hasEvaluation ? `${overallReadiness}%` : 'N/A'}
            </div>
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b;">${hasEvaluation ? overallStatus.label : 'Pending'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-k">Meeting Compliance</div>
            <div class="kpi-v">${meetingRateLabel}</div>
            <div style="font-size: 8.5px; color: #64748b;">Programs Met</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-k">Preparation Momentum</div>
            <div class="kpi-v" style="font-size: 14px; margin-top: 2px;">${momentumLabel}</div>
            <div style="font-size: 8.5px; color: #64748b;">${totalMeets} Sessions Logged</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-k">Mentor Coverage</div>
            <div class="kpi-v" style="font-size: 14px; margin-top: 2px;">${programReports.filter(pr => pr.isMet).length}/${programReports.length}</div>
            <div style="font-size: 8.5px; color: #64748b;">Evaluated Modules</div>
          </div>
        </div>

        <!-- Section 1: Assigned Programs Table -->
        <div class="sec-head">1. Assigned Training Programs & Module Performance</div>
        <table>
          <thead>
            <tr>
              <th style="width: 14%;">Code</th>
              <th style="width: 44%;">Program Title & Domain</th>
              <th style="width: 24%;">Assigned Mentor</th>
              <th style="width: 18%; text-align: right;">Latest Score & Status</th>
            </tr>
          </thead>
          <tbody>
            ${programReports.map(pr => `
              <tr>
                <td style="font-weight: 800; font-family: ui-monospace, monospace; color: #0f172a;">${pr.program.code}</td>
                <td>
                  <strong style="color: #0f172a;">${pr.program.name}</strong>
                  <div style="font-size: 8.5px; color: #64748b;">${pr.program.category || 'General'}</div>
                </td>
                <td style="color: #334155;">${pr.trainerName || 'Assigned Mentor'}</td>
                <td style="text-align: right;">
                  <span class="score-pill ${pr.isMet ? 'score-met' : 'score-pending'}">
                    ${pr.isMet ? `${pr.latestScore}% • ${pr.scoreStatus.label}` : 'Pending Check-in'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Section 2: Mentoring Check-ins & Evaluation Log -->
        <div class="sec-head">2. Mentoring Check-ins & Mentor Remarks Log</div>
        ${allRemarks.length === 0 ? `
          <div style="padding: 16px; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center; color: #64748b; font-size: 10px;">
            Candidate enrolled in Sibaq Academy; first formal evaluation check-in is pending.
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th style="width: 16%;">Date & Time</th>
                <th style="width: 22%;">Mentor Evaluator</th>
                <th style="width: 18%;">Module / Program</th>
                <th style="width: 12%; text-align: center;">Score</th>
                <th style="width: 32%;">Evaluator Observations & Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${allRemarks.map(r => `
                <tr>
                  <td>
                    <strong>${r.date}</strong>
                    <div style="font-size: 8px; color: #64748b;">${r.time || ''}</div>
                  </td>
                  <td style="font-weight: 600; color: #0f172a;">${r.trainerName}</td>
                  <td>${r.programCode ? `[${r.programCode}] ${r.programName}` : 'General Session'}</td>
                  <td style="text-align: center; font-weight: 800; color: #0f172a;">${r.percentage}%</td>
                  <td style="font-style: italic; color: #1e293b; line-height: 1.25;">"${r.text}"</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- Document Sign-off -->
        <div class="doc-footer">
          <div>
            <div style="font-weight: 800; color: #0f172a;">DARUL HUDA BENGAL • SIBAQ HUB</div>
            <div>Official Candidate Performance Dossier • Ref: ${cleanChest}</div>
          </div>
          <div style="text-align: center;">
            <div>Confidential Academic Evaluation</div>
            <div style="font-size: 8px; color: #94a3b8;">Sibaq Candidate Management System</div>
          </div>
          <div style="text-align: right;">
            <div class="sign-line"></div>
            <div style="font-weight: 700; color: #0f172a;">Authorized Controller / Sign-Off</div>
          </div>
        </div>
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

