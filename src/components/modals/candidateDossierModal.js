import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';

/**
 * Candidate Performance Dossier Modal
 * Comprehensive in-depth performance analysis, program-by-program readiness,
 * attendance & meeting rate, trajectory momentum, and trainers' remarks log.
 * Includes instant clean printing.
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

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop dossier-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-xl candidate-dossier-dialog" style="max-width: 920px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header (Screen Only) -->
      <div class="modal-header dossier-screen-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; flex-shrink: 0;">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="color: #6366f1;">${getIcon('award')}</span>
            <span>Comprehensive Candidate Dossier</span>
          </div>
          <h2 class="modal-title" style="font-size: 20px; margin: 4px 0 0 0;">${candidate.name}</h2>
          <p class="modal-subtitle" style="font-size: 12.5px; margin-top: 2px;">
            Chest No: <strong>#${candidate.chestNo || candidate.id}</strong> • Category: <strong>${candidate.category}</strong> • ${candidate.institution || 'DH BENGAL'}
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btnDossierPrint" class="btn btn-sm btn-outline" style="gap: 6px; font-weight: 700; border-color: #cbd5e1; height: 34px; padding: 0 12px;" title="Print Official Candidate Dossier">
            ${getIcon('printer')} <span>Print Dossier</span>
          </button>
          <button class="modal-close-btn" id="btnDossierClose" aria-label="Close">${getIcon('x')}</button>
        </div>
      </div>

      <!-- Scrollable Dossier Content -->
      <div class="modal-body dossier-printable-content" id="dossierPrintArea" style="overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px;">
        
        <!-- Official Printable Banner (Always included, formatted for print) -->
        <div class="dossier-print-banner" style="display: none; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DH BENGAL • SIBAQ TRAINING ACADEMY</h1>
              <div style="font-size: 13px; font-weight: 700; color: #4338ca; margin-top: 2px;">Candidate Performance Dossier & Readiness Report</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Generated: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              <div>Report ID: #DOS-${candidate.chestNo || candidate.id}-${Date.now().toString().slice(-4)}</div>
            </div>
          </div>
        </div>

        <!-- 1. Executive Summary Cards -->
        <div class="dossier-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          
          <!-- Overall Readiness Card -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Overall Readiness</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 28px; font-weight: 900; color: ${hasEvaluation ? overallStatus.color : '#64748b'}; line-height: 1;">
                ${hasEvaluation ? `${overallReadiness}%` : 'N/A'}
              </span>
              <span class="badge ${overallStatus.badgeClass}" style="font-size: 11px; font-weight: 700;">
                ${overallStatus.label}
              </span>
            </div>
            <div class="progress-bar-bg" style="height: 6px; border-radius: 999px; background: #e2e8f0; margin-top: 10px; overflow: hidden;">
              <div style="width: ${overallReadiness}%; height: 100%; background: ${hasEvaluation ? overallStatus.color : '#94a3b8'}; border-radius: 999px; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <!-- Meeting Compliance Card -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Meeting Compliance</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1;">
                ${meetingRatePct}%
              </span>
              <span class="badge ${meetingRatePct === 100 ? 'badge-stage' : (meetingRatePct > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 11px; font-weight: 700;">
                ${meetingRateLabel}
              </span>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Total Sessions Logged: <strong style="color: #0f172a;">${totalMeets} check-ins</strong>
            </div>
          </div>

          <!-- Momentum & Preparation Trajectory -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Preparation Trajectory</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: ${momentumColor};"></span>
              <strong style="font-size: 15px; color: #0f172a;">${momentumLabel}</strong>
            </div>
            <div style="font-size: 11.5px; color: #64748b; line-height: 1.35;">
              ${momentumDesc}
            </div>
          </div>

          <!-- Activity Recency -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Last Active Session</div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
              ${dossier.latestMeetEver ? `${dossier.latestMeetEver.date} • ${dossier.latestMeetEver.time || ''}` : 'No Sessions Yet'}
            </div>
            <div style="font-size: 11.5px; color: #64748b;">
              ${daysSinceLastMeet !== null ? (daysSinceLastMeet === 0 ? 'Checked in today' : `${daysSinceLastMeet} days ago`) : 'Awaiting initial check-in'}
            </div>
          </div>
        </div>

        <!-- 2. Program-by-Program Readiness & Evaluation Grid -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="color: #4f46e5;">${getIcon('programs')}</span>
              <strong style="font-size: 14.5px; color: #0f172a;">Assigned Programs & Readiness Breakdown</strong>
              <span class="badge badge-primary-subtle" style="font-size: 11px;">${programs.length} Programs</span>
            </div>
          </div>

          ${programs.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">
              No programs assigned to this candidate.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${programReports.map((pr, idx) => {
                const progTypeClass = pr.program.type === 'Stage' ? 'p-stage' : 'p-nonstage';
                const deltaFormatted = pr.scoreDelta > 0 ? `+${pr.scoreDelta}%` : `${pr.scoreDelta}%`;
                const deltaColor = pr.scoreDelta > 0 ? '#10b981' : (pr.scoreDelta < 0 ? '#ef4444' : '#64748b');

                return `
                  <div class="dossier-program-row" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #f8fafc;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                      
                      <!-- Left: Program Info & Mentor -->
                      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 240px;">
                        <span class="badge ${progTypeClass}" style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
                          ${pr.program.code}
                        </span>
                        <div>
                          <strong style="font-size: 13.5px; color: #0f172a;">${pr.program.name}</strong>
                          <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span>${pr.program.type}</span>
                            <span>•</span>
                            <span>Mentor: <strong>${pr.trainer ? pr.trainer.name : 'Unassigned'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <!-- Middle: Program Readiness & Progress -->
                      <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="text-align: right;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 600;">Program Readiness</div>
                          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                            <span style="font-size: 16px; font-weight: 900; color: ${pr.isMet ? pr.status.color : '#64748b'};">
                              ${pr.isMet ? `${pr.latestScore}%` : 'N/A'}
                            </span>
                            <span class="badge ${pr.status.badgeClass}" style="font-size: 10.5px;">
                              ${pr.status.label}
                            </span>
                          </div>
                        </div>

                        <!-- Check-ins badge -->
                        <div style="min-width: 100px; text-align: right;">
                          <span class="badge ${pr.isMet ? 'badge-stage' : 'badge-danger'}" style="font-size: 11px; font-weight: 700;">
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

                    <!-- Latest Trainer Remark for this Program -->
                    ${pr.remarks.length > 0 ? `
                      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #334155; display: flex; align-items: flex-start; gap: 6px;">
                        <span style="color: #6366f1; flex-shrink: 0;">${getIcon('quote')}</span>
                        <div style="flex: 1;">
                          <strong>"${pr.remarks[0].text}"</strong>
                          <span style="font-size: 10.5px; color: #64748b; margin-left: 6px;">— ${pr.remarks[0].trainerName} (${pr.remarks[0].date})</span>
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
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="color: #4f46e5;">${getIcon('quote')}</span>
              <strong style="font-size: 14.5px; color: #0f172a;">Trainers' Mentorship Feedback & Evaluation Log</strong>
              <span class="badge badge-neutral" style="font-size: 11px;">${allRemarks.length} Remarks</span>
            </div>
          </div>

          ${allRemarks.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12.5px;">
              No detailed trainer remarks recorded for this candidate yet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allRemarks.map(rm => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong style="font-size: 12.5px; color: #0f172a;">${rm.trainerName}</strong>
                      ${rm.programCode ? `<span class="badge badge-primary-subtle" style="font-size: 10px;">[${rm.programCode}]</span>` : ''}
                      <span class="badge badge-success-subtle" style="font-size: 10px; font-weight: 700;">Score: ${rm.percentage}%</span>
                    </div>
                    <span style="font-size: 11px; color: #64748b;">${rm.date} • ${rm.time || ''}</span>
                  </div>
                  <div style="font-size: 12.5px; color: #1e293b; line-height: 1.4; padding-left: 2px;">
                    "${rm.text}"
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- 4. Printable Signature Footer (Appears on printout) -->
        <div class="dossier-print-footer" style="display: none; margin-top: 24px; padding-top: 14px; border-top: 1px solid #cbd5e1; justify-content: space-between; font-size: 11px; color: #475569;">
          <div>
            <div>Evaluating Trainer Signature: _______________________</div>
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Trainer Verification</div>
          </div>
          <div style="text-align: right;">
            <div>Controller Hub Authorized Signature: _______________________</div>
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Sibaq Mentoring Central Board</div>
          </div>
        </div>

      </div>

      <!-- Modal Footer (Screen Only) -->
      <div class="modal-footer dossier-screen-footer" style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
        <span class="text-xs text-muted">
          Sibaq Mentoring • Official Candidate Dossier
        </span>
        <div style="display: flex; gap: 10px;">
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
    // Add print trigger class to body
    document.body.classList.add('printing-dossier');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-dossier');
    }, 1000);
  };

  overlay.querySelector('#btnDossierPrint').addEventListener('click', printDossier);
  overlay.querySelector('#btnDossierPrintBottom').addEventListener('click', printDossier);
}
