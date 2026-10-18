import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';
import { openRecordMeetModal } from './recordMeetModal.js';
import { openTrainerProfileModal } from './trainerProfileModal.js';

/**
 * Candidate Profile Modal
 * Shows candidate details, all assigned programs, and the designated trainers for each program.
 */
export function openCandidateProfileModal({ candidateId, onUpdate = () => {} }) {
  const candidate = state.getCandidateById(candidateId);
  if (!candidate) {
    toast.error('Candidate not found.');
    return;
  }

  const assignedPrograms = state.getCandidatePrograms(candidate.id);

  // Collect unique trainers across assigned programs
  const trainersMap = new Map();
  assignedPrograms.forEach(p => {
    if (p.trainerId) {
      const trn = state.getTrainerById(p.trainerId);
      if (trn) trainersMap.set(trn.id, trn);
    }
  });
  const uniqueTrainers = Array.from(trainersMap.values());

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg candidate-profile-dialog">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="profile-header-meta">
          <div class="modal-badge">${getIcon('candidates')} Candidate Profile</div>
          <div class="profile-name-row">
            <h2 class="modal-title">${candidate.name}</h2>
            <code class="ad-badge">${candidate.adNo}</code>
          </div>
          <div class="profile-badges-row">
            <span class="badge ${
              candidate.category === 'Senior'
                ? 'badge-violet'
                : candidate.category === 'Junior'
                ? 'badge-cyan'
                : candidate.category === 'Sub-Junior'
                ? 'badge-pink'
                : 'badge-neutral'
            }">${candidate.category} Category</span>
            <span class="badge badge-neutral">${candidate.class || 'No Class Specified'}</span>
          </div>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body profile-modal-body">
        <!-- Quick Stats Strip -->
        <div class="profile-stats-strip">
          <div class="profile-stat-card">
            <span class="p-stat-number">${assignedPrograms.length}</span>
            <span class="p-stat-label">Assigned Programs</span>
          </div>
          <div class="profile-stat-card">
            <span class="p-stat-number">${assignedPrograms.filter(p => p.type === 'Stage').length}</span>
            <span class="p-stat-label">Stage Items</span>
          </div>
          <div class="profile-stat-card">
            <span class="p-stat-number">${assignedPrograms.filter(p => p.type === 'Non-Stage').length}</span>
            <span class="p-stat-label">Non-Stage Items</span>
          </div>
          <div class="profile-stat-card">
            <span class="p-stat-number">${uniqueTrainers.length}</span>
            <span class="p-stat-label">Assigned Mentors</span>
          </div>
        </div>

        <!-- Assigned Programs & Mentors List -->
        <div class="profile-section">
          <div class="profile-section-title">
            <span>${getIcon('programs')} Assigned Programs & Designated Trainers</span>
            <span class="badge badge-primary-subtle text-xs">${assignedPrograms.length} Active</span>
          </div>

          <div class="assigned-programs-roster">
            ${
              assignedPrograms.length === 0
                ? `
                <div class="empty-state-box py-4">
                  <div class="empty-icon">${getIcon('programs')}</div>
                  <h4>No Programs Assigned Yet</h4>
                  <p class="text-muted text-xs">This candidate is not currently enrolled in any stage or non-stage programs.</p>
                </div>
              `
                : assignedPrograms
                    .map(prog => {
                      const trainer = prog.trainerId ? state.getTrainerById(prog.trainerId) : null;
                      const isStage = prog.type === 'Stage';
                      const todayStr = new Date().toISOString().split('T')[0];
                      const progMeetsToday = state.getDailyMeets(todayStr).filter(m => m.candidateId === candidate.id && m.programId === prog.id);
                      const isMetToday = progMeetsToday.length > 0;
                      const latestMeetToday = isMetToday ? progMeetsToday[progMeetsToday.length - 1] : null;

                      return `
                  <div class="profile-program-card ${isStage ? 'border-stage' : 'border-nonstage'}">
                    <div class="profile-prog-left">
                      <div class="profile-prog-header">
                        <span class="program-code-pill">${prog.code}</span>
                        <span class="badge ${isStage ? 'badge-stage' : 'badge-nonstage'}">
                          ${isStage ? getIcon('stage') : getIcon('nonStage')} ${prog.type}
                        </span>
                        <span class="badge badge-neutral-xs">${prog.category}</span>
                        ${isMetToday ? `
                          <span class="badge badge-stage text-xs font-semibold" title="Met today: ${latestMeetToday.percentage}%">
                            ✓ Met Today (${latestMeetToday.percentage}%)
                          </span>
                        ` : `
                          <span class="badge badge-warning text-xs font-semibold" title="Pending check-in today">
                            ○ Pending Today
                          </span>
                        `}
                      </div>
                      <h4 class="profile-prog-title">${prog.name}</h4>
                    </div>

                    <!-- Designated Trainer for this Program -->
                    <div class="profile-prog-right">
                      <div class="trainer-assignment-box">
                        <div class="tab-label text-xs font-semibold text-muted">Program Mentor</div>
                        ${
                          trainer
                            ? `
                          <div class="trainer-chip-full clickable-trainer-profile" data-tid="${trainer.id}" style="cursor: pointer;" title="Click to view ${trainer.name}'s profile">
                            <div class="trainer-avatar-mini" style="background: ${trainer.color || '#6366f1'}">
                              ${trainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div class="trainer-chip-info">
                              <strong class="trainer-chip-name">${trainer.name}</strong>
                              <span class="trainer-chip-expertise text-xs text-muted">${trainer.expertise}</span>
                            </div>
                          </div>
                        `
                            : `
                          <div class="trainer-unassigned-badge">
                            <span class="text-warning text-xs font-semibold">No Trainer Assigned Yet</span>
                          </div>
                        `
                        }
                      </div>

                      <div class="profile-prog-actions-strip" style="display: flex; align-items: center; gap: 6px;">
                        ${!isMetToday ? `
                          <button type="button" class="btn btn-outline btn-xs btn-profile-meet-prog" data-pid="${prog.id}" data-tid="${trainer ? trainer.id : ''}" title="Record today's meet for ${prog.code}" style="font-weight: 700;">
                            ${getIcon('plus')} Meet
                          </button>
                        ` : ''}
                        <button class="btn btn-text btn-xs text-danger btn-unenroll-from-prog" data-pid="${prog.id}" title="Remove candidate from this program">
                          ${getIcon('trash')} Unenroll
                        </button>
                      </div>
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>
        </div>

        <!-- Mentors Overview if multiple -->
        ${
          uniqueTrainers.length > 0
            ? `
          <div class="profile-section mt-3">
            <div class="profile-section-title">
              <span>${getIcon('trainers')} Trainers & Mentors Guiding ${candidate.name}</span>
            </div>
            <div class="mentors-summary-grid">
              ${uniqueTrainers
                .map(
                  trn => {
                    const r = state.getTrainerReadiness(trn.id);
                    return `
                <div class="mentor-summary-pill clickable-trainer-profile" data-tid="${trn.id}" style="cursor: pointer;" title="Click to view ${trn.name}'s profile">
                  <div class="trainer-avatar-mini" style="background: ${trn.color || '#6366f1'}">
                    ${trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <strong>${trn.name}</strong>
                    <div class="text-xs text-muted">${trn.expertise} • ${r.hasData ? `${r.percentage}% Readiness` : '0% Readiness'}</div>
                  </div>
                </div>
              `;
                  }
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Daily Mentorship & Progress History -->
        <div class="profile-section mt-3">
          <div class="profile-section-title">
            <div class="pst-title-wrap">
              <span>${getIcon('trendingUp')} Daily Mentorship & Check-in History</span>
              <span class="badge badge-primary-subtle text-xs">${state.getCandidateMeets(candidate.id).length} Logged Meets</span>
            </div>
            <button id="btnProfileRecordMeet" class="btn btn-sm btn-primary btn-record-meet-profile">
              ${getIcon('plus')} Record Today's Meet
            </button>
          </div>

          <div class="profile-meets-history-list">
            ${(() => {
              const meets = state.getCandidateMeets(candidate.id).reverse();
              if (meets.length === 0) {
                return `
                  <div class="empty-state-box py-3">
                    <p class="text-muted text-xs">No daily mentorship check-ins recorded yet for this student.</p>
                  </div>
                `;
              }
              return meets.map(m => {
                const status = getProgressStatus(m.percentage);
                const trn = m.trainerId ? state.getTrainerById(m.trainerId) : null;
                const prg = m.programId ? state.getProgramById(m.programId) : null;
                return `
                  <div class="profile-meet-card">
                    <div class="pmc-header">
                      <div class="pmc-meta">
                        <span class="font-semibold text-primary">Meet #${m.meetNumber}</span>
                        <span class="text-xs text-muted font-mono">${m.date} (${m.time || ''})</span>
                        ${prg ? `<span class="program-code-pill">${prg.code}</span>` : ''}
                        ${trn ? `<span class="badge badge-neutral-xs">${trn.name}</span>` : ''}
                        <span class="saas-locked-pill-sm">${getIcon('lock')} Locked</span>
                      </div>
                      <div class="score-pill-readout ${status.badgeClass}">
                        <strong>${m.percentage}%</strong>
                        <span>${m.status}</span>
                      </div>
                    </div>
                    <div class="pmc-remark">
                      <strong class="text-xs text-muted">Trainer Observation:</strong>
                      <p class="text-sm">"${m.remark}"</p>
                    </div>
                  </div>
                `;
              }).join('');
            })()}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <button id="btnCloseProfile" class="btn btn-primary">Close Profile</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCloseProfile').addEventListener('click', close);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  // Record meet from profile
  const btnProfileRecordMeet = overlay.querySelector('#btnProfileRecordMeet');
  if (btnProfileRecordMeet) {
    btnProfileRecordMeet.addEventListener('click', () => {
      openRecordMeetModal({
        candidateId: candidate.id,
        onSave: () => {
          close();
          onUpdate();
          // reopen updated profile modal
          openCandidateProfileModal({ candidateId: candidate.id, onUpdate });
        }
      });
    });
  }

  // Quick record meet for a specific program
  overlay.querySelectorAll('.btn-profile-meet-prog').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.getAttribute('data-pid');
      const tid = btn.getAttribute('data-tid');
      openRecordMeetModal({
        candidateId: candidate.id,
        programId: pid,
        trainerId: tid,
        onSave: () => {
          close();
          onUpdate();
          openCandidateProfileModal({ candidateId: candidate.id, onUpdate });
        }
      });
    });
  });

  // Unenroll button
  overlay.querySelectorAll('.btn-unenroll-from-prog').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-pid');
      const prog = state.getProgramById(pid);
      if (confirm(`Remove ${candidate.name} from [${prog?.code}] "${prog?.name}"?`)) {
        state.removeCandidateFromProgram(pid, candidate.id);
        toast.info(`Removed ${candidate.name} from ${prog?.name}`);
        close();
        onUpdate();
      }
    });
  });

  // Click on trainer to open Trainer Profile
  overlay.querySelectorAll('.clickable-trainer-profile').forEach(el => {
    el.addEventListener('click', () => {
      const tid = el.getAttribute('data-tid');
      if (tid) {
        openTrainerProfileModal({ trainerId: tid });
      }
    });
  });
}

