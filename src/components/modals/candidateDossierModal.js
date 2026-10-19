import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';

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
          <div style="width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff; font-weight: 800; font-size: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);">
            ${initials}
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
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DH BENGAL • SIBAQ TRAINING ACADEMY</h1>
              <div style="font-size: 13px; font-weight: 700; color: #4338ca; margin-top: 2px;">Official Candidate Performance Dossier</div>
              <div style="font-size: 12px; margin-top: 4px;">Candidate: <strong>${candidate.name}</strong> (${cleanChest}) • Category: <strong>${candidate.category}</strong></div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Date: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              <div>Report Reference: #DOS-${cleanChest.replace('#', '')}-${candidate.category.slice(0, 3).toUpperCase()}</div>
            </div>
          </div>
        </div>

        <!-- 1. Executive Summary Cards -->
        <div class="dossier-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(195px, 1fr)); gap: 12px;">
          
          <!-- Overall Readiness Card -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Overall Readiness</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 26px; font-weight: 900; color: ${hasEvaluation ? overallStatus.color : '#64748b'}; line-height: 1;">
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
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Meeting Compliance</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1;">
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
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Preparation Trajectory</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${momentumColor};"></span>
              <strong style="font-size: 14px; color: #0f172a;">${momentumLabel}</strong>
            </div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.35;">
              ${momentumDesc}
            </div>
          </div>

          <!-- Activity Recency -->
          <div class="dossier-kpi-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Last Active Session</div>
            <div style="font-size: 14.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
              ${dossier.latestMeetEver ? `${dossier.latestMeetEver.date} • ${dossier.latestMeetEver.time || ''}` : 'No Sessions Yet'}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              ${daysSinceLastMeet !== null ? (daysSinceLastMeet === 0 ? 'Active today' : `${daysSinceLastMeet} days ago`) : 'Awaiting check-in'}
            </div>
          </div>
        </div>

        <!-- 2. Program-by-Program Readiness & Evaluation Breakdown -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
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
                  <div class="dossier-program-row" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #ffffff;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                      
                      <!-- Left: Program info & Mentor -->
                      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 250px;">
                        <span class="badge ${progTypeClass}" style="font-size: 11.5px; font-weight: 800; padding: 4px 8px; border-radius: 6px;">
                          ${pr.program.code}
                        </span>
                        <div>
                          <strong style="font-size: 13.5px; color: #0f172a;">${pr.program.name}</strong>
                          <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span>${pr.program.type}</span>
                            <span>•</span>
                            ${pr.trainer ? `
                              <div style="display: inline-flex; align-items: center; gap: 4px;">
                                <div class="trainer-avatar-mini" style="background: ${pr.trainer.color || '#6366f1'}; overflow: hidden; width: 20px; height: 20px; font-size: 9px;">
                                  ${pr.trainer.photo ? `<img src="${pr.trainer.photo}" alt="${pr.trainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : pr.trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <span>Mentor: <strong>${pr.trainer.name}</strong></span>
                              </div>
                            ` : `<span class="text-warning">No Mentor Assigned</span>`}
                          </div>
                        </div>
                      </div>

                      <!-- Middle: Program Readiness -->
                      <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="text-align: right;">
                          <div style="font-size: 10.5px; color: #64748b; font-weight: 600;">Program Readiness</div>
                          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                            <span style="font-size: 16px; font-weight: 900; color: ${pr.isMet ? pr.status.color : '#64748b'};">
                              ${pr.isMet ? `${pr.latestScore}%` : 'N/A'}
                            </span>
                            <span class="badge ${pr.status.badgeClass}" style="font-size: 10px;">
                              ${pr.status.label}
                            </span>
                          </div>
                        </div>

                        <!-- Check-ins badge -->
                        <div style="min-width: 110px; text-align: right;">
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
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
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
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="trainer-avatar-mini" style="width: 22px; height: 22px; font-size: 10px; background: #6366f1; overflow: hidden;">
                        ${rm.trainerPhoto ? `<img src="${rm.trainerPhoto}" alt="${rm.trainerName}" style="width: 100%; height: 100%; object-fit: cover;" />` : rm.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <strong style="font-size: 12.5px; color: #0f172a;">${rm.trainerName}</strong>
                      ${rm.programCode ? `<span class="badge badge-primary-subtle" style="font-size: 10px;">[${rm.programCode}]</span>` : ''}
                      <span class="badge badge-success-subtle" style="font-size: 10px; font-weight: 700;">Score: ${rm.percentage}%</span>
                    </div>
                    <span style="font-size: 10.5px; color: #64748b;">${rm.date} • ${rm.time || ''}</span>
                  </div>
                  <div style="font-size: 12px; color: #1e293b; line-height: 1.4; padding-left: 2px;">
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
    document.body.classList.add('printing-dossier');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-dossier');
    }, 1000);
  };

  overlay.querySelector('#btnDossierPrint').addEventListener('click', printDossier);
  overlay.querySelector('#btnDossierPrintBottom').addEventListener('click', printDossier);
}
