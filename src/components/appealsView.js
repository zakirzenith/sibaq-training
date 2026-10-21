import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';
import { openCandidateDossierModal } from './modals/candidateDossierModal.js';

export function renderAppealsView(container, navigateTo) {
  let searchQuery = '';
  let filterStatus = 'ALL'; // 'ALL' | 'pending' | 'in-review' | 'resolved' | 'dismissed'
  let activeResolutionAppealId = null; // ID of appeal currently being edited
  let resolutionNotesInput = '';

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function getStatusBadge(status) {
    if (status === 'resolved') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:11.5px; font-weight:800; border:1px solid #a7f3d0; white-space:nowrap;">
        ${getIcon('check')} Action Taken
      </span>`;
    }
    if (status === 'in-review') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:11.5px; font-weight:800; border:1px solid #bfdbfe; white-space:nowrap;">
        ${getIcon('clock')} Under Review
      </span>`;
    }
    if (status === 'dismissed') {
      return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:11.5px; font-weight:700; border:1px solid #e2e8f0; white-space:nowrap;">
        Dismissed
      </span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11.5px; font-weight:800; border:1px solid #fde68a; white-space:nowrap;">
      <span style="width:6px; height:6px; border-radius:50%; background:#f59e0b;"></span> Pending Action
    </span>`;
  }

  function render() {
    const allAppeals = state.getAppeals();

    const totalCount = allAppeals.length;
    const pendingCount = allAppeals.filter(a => a.status === 'pending').length;
    const inReviewCount = allAppeals.filter(a => a.status === 'in-review').length;
    const resolvedCount = allAppeals.filter(a => a.status === 'resolved').length;

    // Filter logic
    const filteredAppeals = allAppeals.filter(a => {
      // 1. Status Filter
      if (filterStatus === 'pending' && a.status !== 'pending') return false;
      if (filterStatus === 'in-review' && a.status !== 'in-review') return false;
      if (filterStatus === 'resolved' && a.status !== 'resolved') return false;
      if (filterStatus === 'dismissed' && a.status !== 'dismissed') return false;

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const candName = (a.candidateName || '').toLowerCase();
        const candChest = (a.candidateChestNo || '').toLowerCase();
        const candCat = (a.candidateCategory || '').toLowerCase();
        const trnName = (a.trainerName || '').toLowerCase();
        const reason = (a.reasonCategory || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const notes = (a.controllerNotes || '').toLowerCase();

        return candName.includes(q) ||
          candChest.includes(q) ||
          candCat.includes(q) ||
          trnName.includes(q) ||
          reason.includes(q) ||
          desc.includes(q) ||
          notes.includes(q);
      }

      return true;
    });

    container.innerHTML = `
      <div class="appeals-page-container appeals-view-root" style="max-width: 1200px; margin: 0 auto; padding-bottom: 50px;">
        
        <!-- 1. EXECUTIVE CONTROLLER BANNER -->
        <div class="appeals-hero-card" style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #312e81 100%); border-radius: 18px; padding: 18px 20px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); margin-bottom: 16px; color: #ffffff; position: relative; overflow: hidden;">
          <div style="position: absolute; right: -30px; top: -30px; width: 150px; height: 150px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); font-size: 10.5px; font-weight: 700; color: #fecaca; margin-bottom: 6px;">
                ${getIcon('appeal')} <span>CENTRAL ESCALATION DESK</span>
              </div>
              <h1 class="appeals-hero-title" style="font-size: 22px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: -0.01em; color: #ffffff;">
                Trainer Appeals & Mentee Escalations
              </h1>
              <p class="controller-appeals-hero-desc" style="margin: 0; font-size: 12.5px; color: #e0e7ff; max-width: 650px; line-height: 1.4;">
                Direct escalation feed from trainers regarding mentee attendance or missing assignments. Review and log resolution actions.
              </p>
            </div>
          </div>

          <!-- KPI Counters Row -->
          <div class="appeals-stats-row" style="position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.28); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 5px 10px; font-size: 11.5px;">
              <span style="color: #cbd5e1;">Total:</span>
              <strong style="color: #ffffff; font-weight: 800;">${totalCount}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 5px 10px; font-size: 11.5px;">
              <span style="color: #fca5a5;">Pending:</span>
              <strong style="color: #fca5a5; font-weight: 800;">${pendingCount}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(59, 130, 246, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 5px 10px; font-size: 11.5px;">
              <span style="color: #93c5fd;">In-Review:</span>
              <strong style="color: #93c5fd; font-weight: 800;">${inReviewCount}</strong>
            </div>
            <div class="stat-pill" style="display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 5px 10px; font-size: 11.5px;">
              <span style="color: #a7f3d0;">Resolved:</span>
              <strong style="color: #a7f3d0; font-weight: 800;">${resolvedCount}</strong>
            </div>
          </div>
        </div>

        <!-- 2. FILTER & SEARCH CONTROL BAR (IN A SINGLE ROW) -->
        <div class="ctrl-appeals-filter-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 10px 14px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);">
          
          <div class="ctrl-appeals-filter-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            
            <!-- Search Bar -->
            <div class="ctrl-appeals-search-wrap" style="position: relative; flex: 1; min-width: 170px;">
              <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex;">
                ${getIcon('search')}
              </span>
              <input 
                type="text" 
                id="inputAppealSearch" 
                placeholder="Search mentee, trainer, keyword..." 
                value="${searchQuery}" 
                style="width: 100%; height: 36px; border-radius: 999px; border: 1.5px solid #cbd5e1; padding: 0 10px 0 32px; font-size: 12px; font-family: inherit; background: #ffffff; box-sizing: border-box;"
              />
              ${searchQuery ? `
                <button type="button" id="btnClearSearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px;">
                  ✕
                </button>
              ` : ''}
            </div>

            <!-- Status Filter Tabs in the same row -->
            <div class="ctrl-appeals-status-tabs" style="display: flex; align-items: center; gap: 5px; flex-shrink: 0; overflow-x: auto;">
              <button type="button" class="btn-ctrl-filter ${filterStatus === 'ALL' ? 'active' : ''}" data-status="ALL" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'ALL' ? '#4f46e5' : '#e2e8f0'}; background: ${filterStatus === 'ALL' ? '#eef2ff' : '#ffffff'}; color: ${filterStatus === 'ALL' ? '#4f46e5' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                All (${totalCount})
              </button>
              <button type="button" class="btn-ctrl-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'pending' ? '#f59e0b' : '#e2e8f0'}; background: ${filterStatus === 'pending' ? '#fef3c7' : '#ffffff'}; color: ${filterStatus === 'pending' ? '#92400e' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                Pending (${pendingCount})
              </button>
              <button type="button" class="btn-ctrl-filter ${filterStatus === 'in-review' ? 'active' : ''}" data-status="in-review" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'in-review' ? '#3b82f6' : '#e2e8f0'}; background: ${filterStatus === 'in-review' ? '#eff6ff' : '#ffffff'}; color: ${filterStatus === 'in-review' ? '#1d4ed8' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                In-Review (${inReviewCount})
              </button>
              <button type="button" class="btn-ctrl-filter ${filterStatus === 'resolved' ? 'active' : ''}" data-status="resolved" style="padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1.5px solid ${filterStatus === 'resolved' ? '#10b981' : '#e2e8f0'}; background: ${filterStatus === 'resolved' ? '#ecfdf5' : '#ffffff'}; color: ${filterStatus === 'resolved' ? '#047857' : '#64748b'}; cursor: pointer; white-space: nowrap;">
                Resolved (${resolvedCount})
              </button>
            </div>

          </div>
        </div>

        <!-- 3. APPEALS CARDS FEED -->
        ${filteredAppeals.length === 0 ? `
          <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 36px 14px; text-align: center;">
            <div style="font-size: 32px; margin-bottom: 6px;">🛡️</div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">No Appeals Found</h3>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">
              ${searchQuery ? 'No appeals match your search keyword.' : 'All clear! No mentee appeals in this category.'}
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${filteredAppeals.map(appeal => {
              const cand = state.getCandidateById(appeal.candidateId);
              const trainer = state.getTrainerById(appeal.trainerId);
              const isEditingResolution = activeResolutionAppealId === appeal.id;
              const hasResponse = Boolean(appeal.controllerNotes && appeal.controllerNotes.trim());

              return `
                <div class="controller-appeal-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); transition: transform 0.15s ease, box-shadow 0.15s ease;">
                  
                  <!-- Top Bar: Status & Timestamp -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      ${getStatusBadge(appeal.status)}
                    </div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 600;">
                      ${formatRelativeTime(appeal.createdAt)}
                    </div>
                  </div>

                  <!-- Mentee & Trainer Details Grid -->
                  <div class="appeal-parties-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;">
                    
                    <!-- Mentee Information -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 40px; height: 40px; border-radius: 50%; background: #4f46e5; color: #fff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
                        ${cand && cand.photo ? `<img src="${cand.photo}" alt="${appeal.candidateName}" style="width: 100%; height: 100%; object-fit: cover;" />` : appeal.candidateName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${appeal.candidateName}
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; margin-top: 1px; flex-wrap: wrap;">
                          <span style="font-weight: 800; background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 4px;">
                            #${appeal.candidateChestNo}
                          </span>
                          <span style="font-weight: 700;">${appeal.candidateCategory}</span>
                          ${cand && cand.phone ? `<span style="color: #059669; font-weight: 700;">&bull; 📞 ${cand.phone}</span>` : ''}
                        </div>
                      </div>
                      <button type="button" class="btn btn-sm btn-outline btn-open-dossier" data-candidate-id="${appeal.candidateId}" style="flex-shrink: 0; font-size: 11px; font-weight: 700; height: 30px; border-color: #cbd5e1; color: #4338ca; padding: 0 8px; border-radius: 6px;">
                        Dossier
                      </button>
                    </div>

                    <!-- Trainer Information -->
                    <div class="appeal-trainer-box" style="display: flex; align-items: center; gap: 8px; border-left: 1px solid #e2e8f0; padding-left: 12px;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${trainer && trainer.color ? trainer.color : '#6366f1'}; color: #fff; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                        ${trainer && trainer.photo ? `<img src="${trainer.photo}" alt="${appeal.trainerName}" style="width: 100%; height: 100%; object-fit: cover;" />` : appeal.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">
                          From Trainer
                        </div>
                        <div style="font-size: 12.5px; font-weight: 800; color: #1e293b;">
                          ${appeal.trainerName}
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- Issue Reason & Remarks -->
                  <div style="margin-top: 10px;">
                    <div style="font-size: 12.5px; font-weight: 800; color: #b91c1c; display: flex; align-items: center; gap: 5px; margin-bottom: 4px;">
                      ${getIcon('alertTriangle')}
                      <span>${appeal.reasonCategory}</span>
                    </div>

                    <div style="background: #ffffff; border: 1px solid #f1f5f9; border-left: 3.5px solid #6366f1; border-radius: 0 8px 8px 0; padding: 8px 12px; font-size: 12.5px; color: #334155; line-height: 1.45;">
                      ${appeal.description || '<em>No additional details provided.</em>'}
                    </div>
                  </div>

                  <!-- Controller Resolution Note (If already logged) -->
                  ${hasResponse ? `
                    <div style="margin-top: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 12px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; color: #065f46;">
                          <span>✓ Resolution & Action Taken:</span>
                        </div>
                        ${appeal.resolvedAt ? `
                          <span style="font-size: 10.5px; color: #047857; font-weight: 600;">
                            ${formatRelativeTime(appeal.resolvedAt)} by ${appeal.resolvedBy || 'Controller'}
                          </span>
                        ` : ''}
                      </div>
                      <div style="font-size: 12px; font-weight: 600; color: #064e3b; line-height: 1.4;">
                        ${appeal.controllerNotes}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Controller Inline Action & Resolution Editor -->
                  ${isEditingResolution ? `
                    <div style="margin-top: 12px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 800; color: #0f172a;">
                          Log Action for ${appeal.candidateName}
                        </span>
                        <button type="button" class="btn-cancel-edit btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #cbd5e1; color: #64748b; font-size: 11px; padding: 2px 8px;">
                          Cancel
                        </button>
                      </div>

                      <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                          Set Status:
                        </label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'in-review' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="in-review" style="font-size: 11px; font-weight: 700; border-radius: 6px; padding: 4px 8px;">
                            ${getIcon('clock')} In-Review
                          </button>
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'resolved' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="resolved" style="background: ${appeal.status === 'resolved' ? '#10b981' : 'transparent'}; border-color: #10b981; color: ${appeal.status === 'resolved' ? '#fff' : '#047857'}; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 4px 8px;">
                            ${getIcon('check')} Resolved
                          </button>
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'dismissed' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="dismissed" style="font-size: 11px; font-weight: 700; border-radius: 6px; color: #64748b; padding: 4px 8px;">
                            Dismiss
                          </button>
                        </div>
                      </div>

                      <div style="margin-bottom: 10px;">
                        <textarea 
                          id="txtResolution_${appeal.id}" 
                          rows="2" 
                          placeholder="Log official notes (e.g., Contacted guardian, resolved)..." 
                          style="width: 100%; border-radius: 8px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 12px; font-family: inherit; line-height: 1.4; box-sizing: border-box;"
                        >${resolutionNotesInput || appeal.controllerNotes || ''}</textarea>
                      </div>

                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                        <button type="button" class="btn-save-resolution btn btn-primary btn-sm" data-appeal-id="${appeal.id}" style="font-weight: 800; font-size: 11.5px; border-radius: 6px; padding: 6px 12px;">
                          Save & Update
                        </button>
                      </div>
                    </div>
                  ` : `
                    <!-- Bottom Quick Actions Bar -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="btn-open-action btn btn-sm btn-primary" data-appeal-id="${appeal.id}" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none; font-weight: 800; font-size: 11px; border-radius: 6px; padding: 5px 10px; display: flex; align-items: center; gap: 5px;">
                          ${getIcon('edit')}
                          <span>${hasResponse ? 'Update Note' : 'Take Action'}</span>
                        </button>

                        ${appeal.status === 'pending' ? `
                          <button type="button" class="btn-quick-in-review btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #bfdbfe; color: #1d4ed8; font-weight: 700; font-size: 11px; border-radius: 6px; padding: 5px 8px;">
                            In-Review
                          </button>
                        ` : ''}

                        ${appeal.status !== 'resolved' ? `
                          <button type="button" class="btn-quick-resolve btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #a7f3d0; color: #047857; font-weight: 700; font-size: 11px; border-radius: 6px; padding: 5px 8px;">
                            Resolve
                          </button>
                        ` : ''}
                      </div>

                      <div>
                        <button type="button" class="btn-delete-ctrl-appeal" data-appeal-id="${appeal.id}" style="background: none; border: 1px solid #fee2e2; color: #ef4444; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; cursor: pointer;" title="Delete this appeal record">
                          Delete
                        </button>
                      </div>
                    </div>
                  `}

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // 1. Search Query
    const inputSearch = container.querySelector('#inputAppealSearch');
    if (inputSearch) {
      inputSearch.oninput = (e) => {
        searchQuery = e.target.value;
        render();
      };
    }

    const btnClear = container.querySelector('#btnClearSearch');
    if (btnClear) {
      btnClear.onclick = () => {
        searchQuery = '';
        render();
      };
    }

    // 2. Status Filter Buttons
    container.querySelectorAll('.btn-ctrl-filter').forEach(btn => {
      btn.onclick = () => {
        filterStatus = btn.getAttribute('data-status') || 'ALL';
        render();
      };
    });

    // 3. Open Candidate Dossier
    container.querySelectorAll('.btn-open-dossier').forEach(btn => {
      btn.onclick = () => {
        const cid = btn.getAttribute('data-candidate-id');
        if (cid) {
          openCandidateDossierModal(cid);
        }
      };
    });

    // 4. Open Resolution Action Box
    container.querySelectorAll('.btn-open-action').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-appeal-id');
        activeResolutionAppealId = id;
        const currentAppeal = state.getAppeals().find(a => a.id === id);
        resolutionNotesInput = currentAppeal ? (currentAppeal.controllerNotes || '') : '';
        render();
      };
    });

    // 5. Cancel Edit Action
    container.querySelectorAll('.btn-cancel-edit').forEach(btn => {
      btn.onclick = () => {
        activeResolutionAppealId = null;
        render();
      };
    });

    // 6. Set Status Button inside editor
    container.querySelectorAll('.btn-set-status').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-appeal-id');
        const newStatus = btn.getAttribute('data-new-status');
        const txtArea = container.querySelector(`#txtResolution_${id}`);
        const notes = txtArea ? txtArea.value.trim() : '';

        try {
          await state.updateAppeal(id, {
            status: newStatus,
            controllerNotes: notes,
            resolvedBy: 'Controller'
          });
          toast.success(`Appeal status updated to "${newStatus}".`);
          activeResolutionAppealId = null;
          render();
        } catch (e) {
          toast.error('Failed to update status.');
        }
      };
    });

    // 7. Save Resolution
    container.querySelectorAll('.btn-save-resolution').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-appeal-id');
        const txtArea = container.querySelector(`#txtResolution_${id}`);
        const notes = txtArea ? txtArea.value.trim() : '';

        const currentAppeal = state.getAppeals().find(a => a.id === id);
        const newStatus = (currentAppeal && currentAppeal.status === 'pending') ? 'in-review' : (currentAppeal ? currentAppeal.status : 'in-review');

        try {
          await state.updateAppeal(id, {
            controllerNotes: notes,
            status: newStatus,
            resolvedBy: 'Controller'
          });
          toast.success('Resolution notes saved.');
          activeResolutionAppealId = null;
          render();
        } catch (e) {
          toast.error('Failed to save resolution.');
        }
      };
    });

    // 8. Quick In-Review
    container.querySelectorAll('.btn-quick-in-review').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-appeal-id');
        try {
          await state.updateAppeal(id, {
            status: 'in-review',
            resolvedBy: 'Controller'
          });
          toast.info('Marked as Under Review.');
          render();
        } catch (e) {
          toast.error('Failed to update status.');
        }
      };
    });

    // 9. Quick Resolve
    container.querySelectorAll('.btn-quick-resolve').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-appeal-id');
        const currentAppeal = state.getAppeals().find(a => a.id === id);
        const defaultNotes = currentAppeal && currentAppeal.controllerNotes 
          ? currentAppeal.controllerNotes 
          : 'Issue reviewed and addressed directly by Controller.';

        try {
          await state.updateAppeal(id, {
            status: 'resolved',
            controllerNotes: defaultNotes,
            resolvedBy: 'Controller'
          });
          toast.success('Appeal marked as Resolved.');
          render();
        } catch (e) {
          toast.error('Failed to update appeal.');
        }
      };
    });

    // 10. Delete Appeal
    container.querySelectorAll('.btn-delete-ctrl-appeal').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-appeal-id');
        if (!id) return;

        if (confirm('Permanently delete this appeal record?')) {
          try {
            await state.deleteAppeal(id);
            toast.info('Appeal record deleted.');
            render();
          } catch (e) {
            toast.error('Failed to delete appeal.');
          }
        }
      };
    });
  }

  // Initial render
  render();
}
