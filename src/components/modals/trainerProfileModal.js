import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';
import { openTrainerFormModal } from './trainerFormModal.js';
import { openCandidateProfileModal } from './candidateProfileModal.js';
import { openRecordMeetModal } from './recordMeetModal.js';

/**
 * Trainer Profile Modal
 * Shows trainer details, overall candidate readiness percentage,
 * all assigned programs, and the specific candidates enrolled under each program.
 */
export function openTrainerProfileModal({ trainerId, onUpdate = () => {} }) {
  const trainer = state.getTrainerById(trainerId);
  if (!trainer) {
    toast.error('Trainer not found.');
    return;
  }

  const assignedPrograms = state.getTrainerPrograms(trainer.id);
  const mentees = state.getTrainerMentees(trainer.id);
  const readiness = state.getTrainerReadiness(trainer.id);
  const readinessStatus = readiness.hasData
    ? getProgressStatus(readiness.percentage)
    : { label: 'Not Evaluated', badgeClass: 'badge-neutral', color: '#64748b' };

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg trainer-profile-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="profile-header-meta">
          <div class="modal-badge">${getIcon('trainers')} Trainer & Mentor Profile</div>
          <div class="profile-name-row">
            <div class="tpm-avatar-lg" style="background: ${trainer.color || '#6366f1'}">
              ${(trainer.name || 'T').split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 class="modal-title" style="margin: 0; line-height: 1.2;">${trainer.name}</h2>
              <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap;">
                <span class="saas-tag-pill p-stage">${trainer.expertise}</span>
                <span class="badge ${readiness.hasData ? readinessStatus.badgeClass : 'badge-neutral'}">
                  ${readiness.hasData ? `${readiness.percentage}% Readiness` : '0% Readiness'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btnEditTrainerInProfile" class="btn btn-secondary btn-sm" title="Edit Trainer details">
            ${getIcon('edit')} <span>Edit</span>
          </button>
          <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="modal-body profile-modal-body">
        <!-- Quick Stats Strip -->
        <div class="profile-stats-strip">
          <div class="profile-stat-card" style="border-top: 3px solid ${readinessStatus.color};">
            <span class="p-stat-number" style="color: ${readiness.hasData ? readinessStatus.color : 'inherit'};">
              ${readiness.hasData ? `${readiness.percentage}%` : '0%'}
            </span>
            <span class="p-stat-label">Overall Readiness</span>
            <span class="text-xs text-muted" style="margin-top: 2px;">
              ${readiness.hasData ? `${readiness.evaluatedCount} of ${readiness.totalCount} evaluated` : 'No scores logged yet'}
            </span>
          </div>

          <div class="profile-stat-card">
            <span class="p-stat-number">${assignedPrograms.length}</span>
            <span class="p-stat-label">Assigned Programs</span>
            <span class="text-xs text-muted" style="margin-top: 2px;">
              ${assignedPrograms.filter(p => p.type === 'Stage').length} Stage • ${assignedPrograms.filter(p => p.type === 'Non-Stage').length} Non-Stage
            </span>
          </div>

          <div class="profile-stat-card">
            <span class="p-stat-number">${mentees.length}</span>
            <span class="p-stat-label">Total Mentees</span>
            <span class="text-xs text-muted" style="margin-top: 2px;">Coached candidates</span>
          </div>

          <div class="profile-stat-card">
            <span class="p-stat-number" style="color: ${readinessStatus.color};">
              ${readinessStatus.label}
            </span>
            <span class="p-stat-label">Performance Cohort</span>
            <span class="text-xs text-muted" style="margin-top: 2px;">Readiness rating</span>
          </div>
        </div>

        <!-- Assigned Programs and Their Enrolled Candidates -->
        <div class="profile-section">
          <div class="profile-section-title">
            <span>${getIcon('programs')} Assigned Programs & Enrolled Candidates</span>
            <span class="badge badge-primary-subtle text-xs">${assignedPrograms.length} Programs</span>
          </div>

          <div class="trainer-programs-accordion">
            ${
              assignedPrograms.length === 0
                ? `
                <div class="empty-state-box py-4" style="text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px;">
                  <div class="empty-icon-sm mb-1">${getIcon('programs')}</div>
                  <strong class="text-sm text-main" style="display: block;">No Programs Assigned Yet</strong>
                  <p class="text-xs text-muted" style="margin: 4px 0 0;">This trainer is not currently designated as mentor for any program.</p>
                </div>
              `
                : assignedPrograms
                    .map(prog => {
                      const isStage = prog.type === 'Stage';
                      const candIds = prog.candidateIds || [];
                      const progCandidates = candIds.map(id => state.getCandidateById(id)).filter(Boolean);

                      return `
                  <div class="tpm-program-group-card">
                    <div class="tpm-program-header">
                      <div class="tpm-ph-left">
                        <span class="program-code-pill">${prog.code}</span>
                        <strong class="tpm-prog-title">${prog.name}</strong>
                      </div>
                      <div class="tpm-ph-right">
                        <span class="badge ${isStage ? 'badge-stage' : 'badge-nonstage'}">
                          ${isStage ? getIcon('stage') : getIcon('nonStage')} ${prog.type}
                        </span>
                        <span class="badge badge-neutral-xs">${prog.category}</span>
                        <span class="tpm-enrolled-count-pill">
                          ${progCandidates.length} Candidate${progCandidates.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <!-- Candidates List inside this Program -->
                    <div class="tpm-program-candidates-list">
                      ${
                        progCandidates.length === 0
                          ? `
                        <div class="tpm-empty-cands-notice">
                          <span class="text-xs text-muted">No candidates enrolled in this program yet.</span>
                        </div>
                      `
                          : progCandidates
                              .map(cand => {
                                const meets = state.getCandidateMeets(cand.id);
                                const trainerMeet = meets.slice().reverse().find(m => String(m.trainerId || '').trim() === String(trainer.id).trim());
                                const latestMeet = trainerMeet || (meets.length > 0 ? meets[meets.length - 1] : null);
                                const score = latestMeet ? latestMeet.percentage : 0;
                                const status = latestMeet ? getProgressStatus(score) : { label: 'Pending', badgeClass: 'badge-neutral', color: '#64748b' };

                                return `
                            <div class="tpm-cand-row">
                              <div class="tpm-cand-identity" data-cid="${cand.id}" title="Click to view candidate profile">
                                <code class="ad-badge">${cand.adNo}</code>
                                <div class="tpm-cand-names">
                                  <strong class="tpm-cand-name">${cand.name}</strong>
                                  <span class="tpm-cand-sub text-xs text-muted">${cand.category} • ${cand.class || 'No Class'}</span>
                                </div>
                              </div>

                              <div class="tpm-cand-actions-wrap">
                                <div class="score-pill-readout ${status.badgeClass}" style="padding: 3px 8px; font-size: 11px;">
                                  <strong>${latestMeet ? `${score}%` : 'Pending'}</strong>
                                  <span>${status.label}</span>
                                </div>

                                <button type="button" class="btn btn-secondary btn-xs btn-quick-record-meet" data-cid="${cand.id}" data-pid="${prog.id}" title="Record Evaluation Meet">
                                  ${getIcon('plus')} <span>Check-in</span>
                                </button>
                              </div>
                            </div>
                          `;
                              })
                              .join('')
                      }
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button id="btnCloseTrainerProfile" class="btn btn-primary">Close Profile</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCloseTrainerProfile').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Edit trainer
  overlay.querySelector('#btnEditTrainerInProfile').addEventListener('click', () => {
    openTrainerFormModal({
      trainer,
      onSave: () => {
        close();
        onUpdate();
        openTrainerProfileModal({ trainerId: trainer.id, onUpdate });
      }
    });
  });

  // Click on candidate to open candidate profile
  overlay.querySelectorAll('.tpm-cand-identity').forEach(el => {
    el.addEventListener('click', () => {
      const cid = el.getAttribute('data-cid');
      if (cid) {
        openCandidateProfileModal({ candidateId: cid });
      }
    });
  });

  // Quick record meet for a candidate under this program & trainer
  overlay.querySelectorAll('.btn-quick-record-meet').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid');
      const pid = btn.getAttribute('data-pid');
      if (cid) {
        openRecordMeetModal({
          candidateId: cid,
          programId: pid,
          trainerId: trainer.id,
          onSave: () => {
            close();
            onUpdate();
            openTrainerProfileModal({ trainerId: trainer.id, onUpdate });
          }
        });
      }
    });
  });
}
