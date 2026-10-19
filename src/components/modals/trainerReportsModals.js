import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from './candidateDossierModal.js';
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
 * Modal to display ALL assigned programs for a trainer.
 * Opens when clicking '+X more' next to trainer assigned programs.
 */
export function openTrainerAllProgramsModal({ trainer, assignedPrograms }) {
  if (!trainer || !assignedPrograms) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  let filterQuery = '';

  const renderContent = () => {
    const filteredProgs = assignedPrograms.filter(p => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });

    overlay.innerHTML = `
      <div class="modal-dialog modal-lg" style="max-width: 680px; width: 95%; max-height: 88vh; display: flex; flex-direction: column;">
        
        <!-- Header -->
        <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 16px 20px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <div class="trainer-avatar-mini" style="background: ${trainer.color || '#6366f1'}; overflow: hidden; width: 44px; height: 44px; border-radius: 12px; font-size: 14px; flex-shrink: 0;">
              ${trainer.photo ? `<img src="${trainer.photo}" alt="${trainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div style="min-width: 0;">
              <div class="modal-badge" style="font-size: 11px;">
                <span>Mentor Programs Directory</span>
              </div>
              <h2 class="modal-title" style="font-size: 18px; margin: 2px 0 0 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                All Assigned Programs (${assignedPrograms.length})
              </h2>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                Trainer: <strong style="color: #0f172a;">${trainer.name}</strong> • ${trainer.expertise}
              </div>
            </div>
          </div>

          <button class="modal-close-btn" id="btnAllProgsClose" aria-label="Close">${getIcon('x')}</button>
        </div>

        <!-- Filter Search Bar -->
        ${assignedPrograms.length > 5 ? `
          <div style="padding: 10px 20px; background: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <div class="reports-search-box" style="width: 100%;">
              <span class="search-icon">${getIcon('search')}</span>
              <input 
                type="text" 
                id="inpSearchTrainerProgs" 
                class="search-input" 
                placeholder="Search programs by code, name, or category..." 
                value="${filterQuery}"
                style="height: 38px; font-size: 13px;"
              />
            </div>
          </div>
        ` : ''}

        <!-- Body: Programs Grid -->
        <div class="modal-body" style="overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; background: #f8fafc;">
          ${filteredProgs.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; color: #64748b; font-size: 13px;">
              No assigned programs match your search.
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px;">
              ${filteredProgs.map(p => {
                const candCount = p.candidateIds ? p.candidateIds.length : 0;
                const typeClass = p.type === 'Stage' ? 'p-stage' : 'p-nonstage';

                return `
                  <div class="trainer-prog-card-item" data-action="open-prog-detail" data-pid="${p.id}" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 5px;">
                        <span class="badge ${typeClass}" style="font-size: 11px; font-weight: 800; padding: 2px 7px;">
                          [${p.code}]
                        </span>
                        <span class="badge badge-primary-subtle" style="font-size: 10px; font-weight: 700;">
                          ${candCount} cand
                        </span>
                      </div>
                      <strong style="font-size: 13px; color: #0f172a; line-height: 1.3; display: block;">
                        ${p.name}
                      </strong>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #f8fafc; padding-top: 6px;">
                      <span>${p.category || 'General'}</span>
                      <span style="font-weight: 700; color: #4338ca; display: flex; align-items: center; gap: 2px;">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Footer -->
        <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
          <span class="text-xs text-muted">Click any program card to view complete roster & readiness</span>
          <button type="button" id="btnCloseAllProgsBottom" class="btn btn-secondary btn-sm" style="font-weight: 700; height: 34px; padding: 0 16px;">
            Close
          </button>
        </div>

      </div>
    `;

    // Bind events
    overlay.querySelector('#btnAllProgsClose').addEventListener('click', closeModal);
    overlay.querySelector('#btnCloseAllProgsBottom').addEventListener('click', closeModal);

    const inpSearch = overlay.querySelector('#inpSearchTrainerProgs');
    if (inpSearch) {
      inpSearch.addEventListener('input', e => {
        filterQuery = e.target.value.trim();
        renderContent();
        // Restore focus to search
        const nextInp = overlay.querySelector('#inpSearchTrainerProgs');
        if (nextInp) {
          nextInp.focus();
          nextInp.selectionStart = nextInp.selectionEnd = nextInp.value.length;
        }
      });
    }

    overlay.querySelectorAll('[data-action="open-prog-detail"]').forEach(card => {
      card.addEventListener('click', () => {
        const pid = card.getAttribute('data-pid');
        if (pid) {
          closeModal();
          openProgramQuickViewModal(pid);
        }
      });
    });
  };

  const closeModal = () => {
    overlay.remove();
  };

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

  document.body.appendChild(overlay);
  renderContent();
}

/**
 * Modal to display mentees breakdown by score status (Ready or Lagging).
 * Opens when clicking '0 Ready' / 'X Ready' or '2 Lagging' / 'Y Lagging'.
 */
export function openTrainerMenteesBreakdownModal({ trainer, filterType, candidates, totalMentees }) {
  if (!trainer) return;

  const isReady = filterType === 'READY';
  const title = isReady ? 'Stage Ready Mentees (80%+)' : 'Needs Attention / Lagging Mentees (<60%)';
  const themeColor = isReady ? '#059669' : '#dc2626';
  const themeBg = isReady ? '#ecfdf5' : '#fef2f2';
  const themeBorder = isReady ? '#a7f3d0' : '#fecaca';

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg" style="max-width: 720px; width: 95%; max-height: 88vh; display: flex; flex-direction: column;">
      
      <!-- Header -->
      <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 16px 20px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: ${themeBg}; color: ${themeColor}; border: 1.5px solid ${themeBorder}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            ${getIcon(isReady ? 'check' : 'alertCircle')}
          </div>
          <div style="min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span class="badge ${isReady ? 'badge-stage' : 'badge-danger'}" style="font-size: 10.5px; font-weight: 800; padding: 2px 7px;">
                ${candidates.length} ${isReady ? 'Ready' : 'Lagging'} Mentees
              </span>
              <span class="badge badge-neutral" style="font-size: 10px;">
                of ${totalMentees} Assigned Mentees
              </span>
            </div>
            <h2 class="modal-title" style="font-size: 18px; margin: 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${title}
            </h2>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Evaluated by Mentor: <strong style="color: #0f172a;">${trainer.name}</strong> (${trainer.expertise})
            </div>
          </div>
        </div>

        <button class="modal-close-btn" id="btnBreakdownClose" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Body -->
      <div class="modal-body" style="overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; background: #f8fafc;">
        ${candidates.length === 0 ? `
          <div style="text-align: center; padding: 42px 20px; background: #ffffff; border-radius: 12px; border: 1.5px dashed #cbd5e1;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              ${getIcon('award')}
            </div>
            <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">
              No mentees in ${isReady ? 'Stage Ready' : 'Lagging'} status
            </h3>
            <p style="font-size: 12.5px; color: #64748b; margin: 0;">
              ${isReady 
                ? 'All evaluated candidates are currently progressing through foundational and active training phases.'
                : 'Great news! No candidates under this mentor are currently lagging or flagged at risk.'}
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${candidates.map(item => {
              const cand = item.candidate;
              const cleanChest = formatChestNo(cand);
              const score = item.latestScore;
              const status = item.status;
              const meet = item.latestMeet;

              return `
                <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;">
                  
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 180px;">
                      <span class="badge badge-neutral" style="font-weight: 800; font-size: 11.5px; padding: 4px 8px; border-radius: 6px;">
                        ${cleanChest}
                      </span>
                      <div>
                        <strong style="font-size: 14px; color: #0f172a;">${cand.name}</strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 1px;">
                          ${cand.category} ${cand.phone ? `• ${cand.phone}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 14px;">
                      <div style="text-align: right;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                          <strong style="font-size: 16px; font-weight: 900; color: ${status.color};">
                            ${score !== null ? `${score}%` : 'Pending'}
                          </strong>
                          <span class="badge ${status.badgeClass}" style="font-size: 10px; font-weight: 700;">
                            ${status.label}
                          </span>
                        </div>
                        <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">
                          ${item.meetsCount} session${item.meetsCount === 1 ? '' : 's'} logged
                        </div>
                      </div>

                      <button type="button" class="btn btn-sm btn-primary btn-open-mentee-dossier" data-cid="${cand.id}" style="font-size: 11px; height: 32px; padding: 0 12px; font-weight: 700; gap: 5px;">
                        ${getIcon('award')} <span>Dossier</span>
                      </button>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  ${score !== null ? `
                    <div class="progress-bar-bg" style="height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                      <div style="width: ${score}%; height: 100%; background: ${status.color}; border-radius: 999px;"></div>
                    </div>
                  ` : ''}

                  <!-- Shared Programs & Last Remark -->
                  <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748b; flex-wrap: wrap; gap: 6px; border-top: 1px dashed #f1f5f9; padding-top: 6px;">
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                      <span style="font-weight: 600;">Shared Programs:</span>
                      ${item.sharedPrograms.map(p => `
                        <span class="badge badge-neutral" style="font-size: 10px; font-weight: 700;">
                          [${p.code}] ${p.name.slice(0, 16)}
                        </span>
                      `).join('')}
                    </div>

                    ${meet && meet.date ? `
                      <div style="font-size: 10.5px; color: #64748b;">
                        Last session: <strong>${meet.date}</strong>
                      </div>
                    ` : ''}
                  </div>

                  ${meet && meet.remark ? `
                    <div style="background: #f8fafc; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; color: #334155; border-left: 3px solid ${themeColor};">
                      <em>"${meet.remark}"</em>
                    </div>
                  ` : ''}

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Footer -->
      <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
        <span class="text-xs text-muted">Click Dossier to view complete scoring rubric and multi-session trajectory</span>
        <button type="button" id="btnCloseBreakdownBottom" class="btn btn-secondary btn-sm" style="font-weight: 700; height: 34px; padding: 0 16px;">
          Close
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnBreakdownClose').addEventListener('click', closeModal);
  overlay.querySelector('#btnCloseBreakdownBottom').addEventListener('click', closeModal);

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
  overlay.querySelectorAll('.btn-open-mentee-dossier').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid');
      if (cid) {
        closeModal();
        openCandidateDossierModal(cid);
      }
    });
  });
}
