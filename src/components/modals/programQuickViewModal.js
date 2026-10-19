import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from './candidateDossierModal.js';
import { openProgramFormModal } from './programFormModal.js';
import { openCandidateSelectModal } from './candidateSelectModal.js';

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
 * Program Quick View Modal
 * Opens when any program code rectangle is clicked.
 * Shows complete program details, assigned mentor,
 * and roster of enrolled candidates with readiness scores and dossier links.
 */
export function openProgramQuickViewModal(programId, contextCandidateId = null) {
  const program = state.getProgramById(programId);
  if (!program) return;

  const trainer = program.trainerId ? state.getTrainerById(program.trainerId) : null;
  const enrolledCandidateIds = program.candidateIds || [];
  const enrolledCandidates = enrolledCandidateIds
    .map(cid => state.getCandidateById(cid))
    .filter(Boolean);

  // Calculate program performance metrics
  const allMeets = state.getDailyMeets();
  const programMeets = allMeets.filter(m => String(m.programId || '').trim() === String(program.id).trim());

  const candidateReports = enrolledCandidates.map(cand => {
    const candProgMeets = programMeets.filter(m => String(m.candidateId).trim() === String(cand.id).trim());
    const isMet = candProgMeets.length > 0;
    const latestMeet = isMet ? candProgMeets[candProgMeets.length - 1] : null;
    const latestScore = isMet ? (Number(latestMeet.percentage) || 0) : 0;
    const status = isMet ? getProgressStatus(latestScore) : { label: 'Pending Check-in', color: '#64748b', badgeClass: 'badge-neutral' };

    return {
      candidate: cand,
      isMet,
      meetCount: candProgMeets.length,
      latestMeet,
      latestScore,
      status
    };
  });

  const evaluatedCount = candidateReports.filter(cr => cr.isMet).length;
  const avgScore = evaluatedCount > 0
    ? Math.round(candidateReports.filter(cr => cr.isMet).reduce((sum, cr) => sum + cr.latestScore, 0) / evaluatedCount)
    : 0;
  const avgStatus = getProgressStatus(avgScore);

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  const typeClass = program.type === 'Stage' ? 'p-stage' : 'p-nonstage';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg" style="max-width: 720px; width: 95%; max-height: 90vh; display: flex; flex-direction: column;">
      
      <!-- Modal Header -->
      <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 16px 20px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #eef2ff; color: #4f46e5; border: 1.5px solid #c7d2fe; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            ${getIcon('programs')}
          </div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px;">
              <span class="badge ${typeClass}" style="font-weight: 800; font-size: 11px; padding: 2px 7px;">
                ${program.code}
              </span>
              <span class="badge badge-neutral" style="font-size: 10px; font-weight: 700;">
                ${program.category || 'General'}
              </span>
              <span class="badge ${program.type === 'Stage' ? 'badge-stage' : 'badge-neutral'}" style="font-size: 10px; font-weight: 700;">
                ${program.type}
              </span>
            </div>
            <h2 class="modal-title" style="font-size: 18px; margin: 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${program.name}
            </h2>
          </div>
        </div>

        <button class="modal-close-btn" id="btnProgModalClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body" style="overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; background: #f8fafc;">
        
        <!-- Assigned Mentor & Summary Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          
          <!-- Mentor Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;">
            <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.04em;">
              Assigned Mentor
            </div>
            ${trainer ? `
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="trainer-avatar-mini" style="background: ${trainer.color || '#6366f1'}; overflow: hidden; width: 40px; height: 40px; border-radius: 10px; font-size: 13px; flex-shrink: 0;">
                  ${trainer.photo ? `<img src="${trainer.photo}" alt="${trainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div style="min-width: 0;">
                  <strong style="font-size: 14px; color: #0f172a; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${trainer.name}
                  </strong>
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    ${trainer.expertise || 'Specialized Mentor'}
                  </div>
                </div>
              </div>
            ` : `
              <div style="display: flex; align-items: center; gap: 8px; color: #d97706; font-size: 13px; font-weight: 600;">
                ${getIcon('alertCircle')}
                <span>No Mentor Assigned</span>
              </div>
            `}
          </div>

          <!-- Quick Metrics Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b;">Enrolled</div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px;">${enrolledCandidates.length}</div>
              <div style="font-size: 10.5px; color: #64748b;">${evaluatedCount} Evaluated</div>
            </div>
            <div>
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: #64748b;">Avg Readiness</div>
              <div style="font-size: 20px; font-weight: 800; color: ${evaluatedCount > 0 ? avgStatus.color : '#64748b'}; margin-top: 2px;">
                ${evaluatedCount > 0 ? `${avgScore}%` : 'N/A'}
              </div>
              <div style="font-size: 10.5px; color: #64748b;">${programMeets.length} Total Meets</div>
            </div>
          </div>
        </div>

        <!-- Enrolled Candidates Roster -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span style="color: #4f46e5;">${getIcon('candidates')}</span>
              <strong style="font-size: 14px; color: #0f172a;">Assigned Candidates (${enrolledCandidates.length})</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="btnProgQuickAddCand" class="btn btn-sm btn-primary" style="height: 30px; padding: 0 10px; font-size: 11.5px; font-weight: 700; gap: 4px;">
                ${getIcon('plus')} <span>Enroll Candidate</span>
              </button>
            </div>
          </div>

          ${enrolledCandidates.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; color: #64748b; font-size: 13px;">
              No candidates enrolled in this program yet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${candidateReports.map(cr => {
                const cand = cr.candidate;
                const cleanChest = formatChestNo(cand);
                const isCurrentContext = contextCandidateId && String(contextCandidateId).trim() === String(cand.id).trim();

                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid ${isCurrentContext ? '#a5b4fc' : '#f1f5f9'}; background: ${isCurrentContext ? '#eef2ff' : '#ffffff'}; flex-wrap: wrap;">
                    
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 180px;">
                      <span class="badge badge-neutral" style="font-weight: 800; font-size: 11px; padding: 3px 7px;">
                        ${cleanChest}
                      </span>
                      <div>
                        <strong style="font-size: 13.5px; color: #0f172a; display: block;">
                          ${cand.name}
                        </strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
                          ${cand.category} ${cand.phone ? `• ${cand.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 16px;">
                      <div style="text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                          <strong style="font-size: 14px; color: ${cr.isMet ? cr.status.color : '#64748b'};">
                            ${cr.isMet ? `${cr.latestScore}%` : 'Pending'}
                          </strong>
                          <span class="badge ${cr.status.badgeClass}" style="font-size: 9.5px; padding: 1px 6px;">
                            ${cr.status.label}
                          </span>
                        </div>
                        <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                          ${cr.meetCount} meet${cr.meetCount === 1 ? '' : 's'} logged
                        </div>
                      </div>

                      <button type="button" class="btn btn-sm btn-primary btn-open-cand-dossier" data-cid="${cand.id}" style="font-size: 11px; height: 30px; padding: 0 10px; font-weight: 700; gap: 4px;">
                        ${getIcon('award')} <span>Dossier</span>
                      </button>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
        <span class="text-xs text-muted">Competition Reference: [${program.code}] ${program.type}</span>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="btnEditProgFromModal" class="btn btn-outline btn-sm" style="font-weight: 700; height: 34px; padding: 0 12px;">
            ${getIcon('edit')} <span>Edit Program</span>
          </button>
          <button type="button" id="btnCloseProgModalBottom" class="btn btn-secondary btn-sm" style="font-weight: 700; height: 34px; padding: 0 16px;">
            Close
          </button>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnProgModalClose').addEventListener('click', closeModal);
  overlay.querySelector('#btnCloseProgModalBottom').addEventListener('click', closeModal);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  const onKeydown = e => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKeydown);
    }
  };
  document.addEventListener('keydown', onKeydown);

  // Wire candidate dossier buttons
  overlay.querySelectorAll('.btn-open-cand-dossier').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid');
      if (cid) {
        closeModal();
        openCandidateDossierModal(cid);
      }
    });
  });

  // Wire edit program
  const btnEdit = overlay.querySelector('#btnEditProgFromModal');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      closeModal();
      openProgramFormModal({ program });
    });
  }

  // Wire enroll candidate
  const btnAddCand = overlay.querySelector('#btnProgQuickAddCand');
  if (btnAddCand) {
    btnAddCand.addEventListener('click', () => {
      closeModal();
      openCandidateSelectModal({
        program,
        onAdd: () => {
          openProgramQuickViewModal(program.id, contextCandidateId);
        }
      });
    });
  }
}
