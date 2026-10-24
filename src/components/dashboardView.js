import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { openExcelUploadModal } from './modals/excelUploadModal.js';
import { openAssignCandidatesModal } from './modals/assignCandidatesModal.js';

export function renderDashboardView(container, navigateTo) {
  const metrics = state.getMetrics();
  const programs = state.getPrograms();
  const trainers = state.getTrainers();
  const dailySummary = state.getDailySummary();
  const deviceMetrics = state.getDeviceMetrics ? state.getDeviceMetrics() : { totalPermits: 0, checkedOutCount: 0, overdueCount: 0 };

  const unassignedTrainerPrograms = programs.filter(p => !p.trainerId || !state.getTrainerById(p.trainerId));
  const unassignedCandidatePrograms = programs.filter(p => !p.candidateIds || p.candidateIds.length === 0);

  container.innerHTML = `
    <div class="view-header">
      <div>
        <div class="view-tag">${getIcon('sparkles')} Operations Central</div>
        <h1 class="view-title">Controllers Dashboard</h1>
        <p class="view-desc">High-level overview of candidates, programs, stage items, and trainer assignments.</p>
      </div>

      <div class="view-actions">
        <button id="btnQuickUploadCandidates" class="btn btn-secondary">
          ${getIcon('upload')} Bulk Upload Candidates
        </button>
        <button id="btnQuickUploadPrograms" class="btn btn-primary">
          ${getIcon('upload')} Bulk Upload Programs
        </button>
      </div>
    </div>

    <!-- Metrics Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card" data-nav="candidates">
        <div class="stat-icon-wrap icon-cyan">${getIcon('candidates')}</div>
        <div class="stat-content">
          <div class="stat-label">Total Candidates</div>
          <div class="stat-value">${metrics.totalCandidates}</div>
          <div class="stat-foot text-cyan">
            ${metrics.uniqueEnrolledCandidates} enrolled in programs (${Math.round((metrics.uniqueEnrolledCandidates / (metrics.totalCandidates || 1)) * 100)}%)
          </div>
        </div>
      </div>

      <div class="stat-card" data-nav="programs">
        <div class="stat-icon-wrap icon-violet">${getIcon('programs')}</div>
        <div class="stat-content">
          <div class="stat-label">Total Programs</div>
          <div class="stat-value">${metrics.totalPrograms}</div>
          <div class="stat-foot text-violet">
            <span class="dot-stage"></span> ${metrics.stagePrograms} Stage • <span class="dot-nonstage"></span> ${metrics.nonStagePrograms} Non-Stage
          </div>
        </div>
      </div>

      <div class="stat-card" data-nav="trainers">
        <div class="stat-icon-wrap icon-pink">${getIcon('trainers')}</div>
        <div class="stat-content">
          <div class="stat-label">Active Trainers</div>
          <div class="stat-value">${metrics.totalTrainers}</div>
          <div class="stat-foot text-pink">
            ${metrics.assignedProgramCount} programs covered (${metrics.unassignedProgramCount} unassigned)
          </div>
        </div>
      </div>

      <div class="stat-card" data-nav="daily-progress">
        <div class="stat-icon-wrap icon-emerald">${getIcon('trendingUp')}</div>
        <div class="stat-content">
          <div class="stat-label">Daily Progress Meets</div>
          <div class="stat-value">${dailySummary.metCount} / ${dailySummary.totalScheduled}</div>
          <div class="stat-foot text-emerald">
            ${dailySummary.partialCount > 0 ? `<span style="color: #ea580c; font-weight: 700;">${dailySummary.partialCount} partial</span> • ` : ''}${dailySummary.pendingCount} pending • Avg ${dailySummary.avgScore}% &rarr;
          </div>
        </div>
      </div>

      <div class="stat-card" data-nav="devices">
        <div class="stat-icon-wrap" style="background: #eef2ff; color: #4f46e5;">${getIcon('smartphone')}</div>
        <div class="stat-content">
          <div class="stat-label">Permitted Phones &amp; QR</div>
          <div class="stat-value">${deviceMetrics.totalPermits}</div>
          <div class="stat-foot" style="color: ${deviceMetrics.overdueCount > 0 ? '#dc2626' : '#4f46e5'}; font-weight: 700;">
            ${deviceMetrics.overdueCount > 0 ? `🚨 ${deviceMetrics.overdueCount} overdue` : `${deviceMetrics.checkedOutCount} active in hand`} (09 AM – 10 PM) &rarr;
          </div>
        </div>
      </div>
    </div>

    <!-- Two-column visual layout -->
    <div class="dashboard-grid-2col">
      <!-- Left: Program Breakdown & Attention Needs -->
      <div class="dash-card">
        <div class="dash-card-header">
          <div class="dash-card-title">${getIcon('stage')} Program Distribution & Stage Types</div>
          <span class="badge badge-neutral">${programs.length} Events</span>
        </div>

        <div class="stage-ratio-bar-wrapper">
          <div class="ratio-labels">
            <span>Stage Programs (${metrics.stagePrograms})</span>
            <span>Non-Stage Programs (${metrics.nonStagePrograms})</span>
          </div>
          <div class="ratio-bar">
            <div class="bar-stage" style="width: ${(metrics.stagePrograms / (metrics.totalPrograms || 1)) * 100}%"></div>
            <div class="bar-nonstage" style="width: ${(metrics.nonStagePrograms / (metrics.totalPrograms || 1)) * 100}%"></div>
          </div>
        </div>

        <div class="category-pills-list">
          <div class="card-mini-title mb-2">Candidates by Category</div>
          <div class="category-chips">
            ${Object.entries(metrics.categoriesMap)
              .map(
                ([cat, count]) => `
              <div class="cat-pill">
                <span class="cat-name">${cat}</span>
                <span class="cat-count">${count}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Attention Banner if unassigned programs exist -->
        ${
          unassignedTrainerPrograms.length > 0 || unassignedCandidatePrograms.length > 0
            ? `
          <div class="attention-box mt-4">
            <div class="attention-title">${getIcon('info')} Action Needed: Unassigned Programs</div>
            <div class="attention-list">
              ${unassignedTrainerPrograms.slice(0, 3).map(p => `
                <div class="attention-item">
                  <div class="attention-text">
                    <strong>[${p.code}] ${p.name}</strong> has no trainer assigned.
                  </div>
                  <button class="btn btn-xs btn-primary btn-assign-direct" data-id="${p.id}">
                    Assign
                  </button>
                </div>
              `).join('')}
              ${unassignedTrainerPrograms.length > 3 ? `<div class="text-xs text-muted">+${unassignedTrainerPrograms.length - 3} more programs need trainer assignment.</div>` : ''}
            </div>
          </div>
        `
            : `
          <div class="good-status-box mt-4">
            ${getIcon('check')} All programs currently have trainers assigned!
          </div>
        `
        }
      </div>

      <!-- Right: Trainers Workload Overview -->
      <div class="dash-card">
        <div class="dash-card-header">
          <div class="dash-card-title">${getIcon('trainers')} Trainer Workload & Programs</div>
          <button id="btnViewAllTrainers" class="btn btn-text btn-xs">View All &rarr;</button>
        </div>

        <div class="trainer-workload-list">
          ${trainers.map(t => {
            const assignedPrograms = state.getTrainerPrograms(t.id);
            const mentees = state.getTrainerMentees(t.id);

            return `
              <div class="trainer-workload-row">
                <div class="trainer-avatar-mini" style="background: ${t.color || '#6366f1'}; overflow: hidden;">
                  ${t.photo 
                    ? `<img src="${t.photo}" alt="${t.name}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                    : t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div class="trainer-workload-info">
                  <div class="trainer-wl-name">
                    <strong>${t.name}</strong>
                    <span class="text-muted text-xs">• ${t.expertise}</span>
                  </div>
                  <div class="trainer-wl-stats">
                    <span class="badge badge-primary-subtle text-xs">${assignedPrograms.length} Programs</span>
                    <span class="badge badge-neutral-xs">${mentees.length} Mentees</span>
                    <span class="text-muted text-xs">
                      ${assignedPrograms.map(p => `[${p.code}]`).join(' ')}
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach navigation listeners
  container.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-nav');
      navigateTo(target);
    });
  });

  // Action listeners
  container.querySelector('#btnQuickUploadCandidates').addEventListener('click', () => {
    openExcelUploadModal({ type: 'candidates', onComplete: () => renderDashboardView(container, navigateTo) });
  });

  container.querySelector('#btnQuickUploadPrograms').addEventListener('click', () => {
    openExcelUploadModal({ type: 'programs', onComplete: () => renderDashboardView(container, navigateTo) });
  });


  const btnViewAllTrainers = container.querySelector('#btnViewAllTrainers');
  if (btnViewAllTrainers) {
    btnViewAllTrainers.addEventListener('click', () => navigateTo('trainers'));
  }

  // Direct assign buttons
  container.querySelectorAll('.btn-assign-direct').forEach(btn => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-id');
      openAssignCandidatesModal({
        programId: pId,
        onSave: () => renderDashboardView(container, navigateTo)
      });
    });
  });
}
