import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';
import { openCandidateDossierModal } from './modals/candidateDossierModal.js';

export function renderAppealsView(container, navigateTo) {
  let searchQuery = '';
  let filterStatus = 'ALL'; // 'ALL' | 'pending' | 'in-review' | 'resolved' | 'dismissed'
  let filterUrgency = 'ALL'; // 'ALL' | 'critical' | 'high' | 'normal'
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

  function getUrgencyBadge(urgency) {
    if (urgency === 'critical') {
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:#fee2e2; color:#b91c1c; font-size:11.5px; font-weight:800; border:1px solid #fca5a5;">
        <span style="width:7px; height:7px; border-radius:50%; background:#ef4444; box-shadow:0 0 0 2px rgba(239,68,68,0.3); animation:pulse 1.5s infinite;"></span> Critical / Urgent
      </span>`;
    }
    if (urgency === 'high') {
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:#ffedd5; color:#c2410c; font-size:11.5px; font-weight:700; border:1px solid #fdba74;">
        <span style="width:7px; height:7px; border-radius:50%; background:#f97316;"></span> High Priority
      </span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:#f1f5f9; color:#475569; font-size:11.5px; font-weight:600; border:1px solid #e2e8f0;">
      <span style="width:7px; height:7px; border-radius:50%; background:#94a3b8;"></span> Normal Notice
    </span>`;
  }

  function getStatusBadge(status) {
    if (status === 'resolved') {
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; background:#ecfdf5; color:#047857; font-size:12px; font-weight:800; border:1px solid #a7f3d0;">
        ${getIcon('check')} Action Taken / Resolved
      </span>`;
    }
    if (status === 'in-review') {
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px; font-weight:800; border:1px solid #bfdbfe;">
        ${getIcon('clock')} Under Controller Review
      </span>`;
    }
    if (status === 'dismissed') {
      return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; background:#f8fafc; color:#64748b; font-size:12px; font-weight:700; border:1px solid #e2e8f0;">
        Closed / Dismissed
      </span>`;
    }
    return `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:12px; font-weight:800; border:1px solid #fde68a;">
      <span style="width:7px; height:7px; border-radius:50%; background:#f59e0b;"></span> Pending Action
    </span>`;
  }

  function render() {
    const allAppeals = state.getAppeals();

    const totalCount = allAppeals.length;
    const criticalCount = allAppeals.filter(a => a.urgency === 'critical' && a.status !== 'resolved' && a.status !== 'dismissed').length;
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

      // 2. Urgency Filter
      if (filterUrgency !== 'ALL' && a.urgency !== filterUrgency) return false;

      // 3. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const candName = (a.candidateName || '').toLowerCase();
        const candChest = (a.candidateChestNo || '').toLowerCase();
        const candCat = (a.candidateCategory || '').toLowerCase();
        const trnName = (a.trainerName || '').toLowerCase();
        const reason = (a.reasonCategory || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const notes = (a.controllerNotes || '').toLowerCase();

        const matches = candName.includes(q) ||
          candChest.includes(q) ||
          candCat.includes(q) ||
          trnName.includes(q) ||
          reason.includes(q) ||
          desc.includes(q) ||
          notes.includes(q);

        if (!matches) return false;
      }

      return true;
    });

    container.innerHTML = `
      <div class="appeals-page-container" style="max-width: 1200px; margin: 0 auto; padding-bottom: 50px;">
        
        <!-- 1. EXECUTIVE CONTROLLER BANNER -->
        <div style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #312e81 100%); border-radius: 20px; padding: 22px 24px; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3); margin-bottom: 20px; color: #ffffff; position: relative; overflow: hidden;">
          <div style="position: absolute; right: -30px; top: -30px; width: 170px; height: 170px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%); pointer-events: none;"></div>
          <div style="position: absolute; left: 35%; bottom: -45px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%); pointer-events: none;"></div>

          <div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); font-size: 11px; font-weight: 700; color: #fecaca; margin-bottom: 8px;">
                ${getIcon('appeal')} <span>CENTRAL ESCALATION & APPEALS DESK</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 6px 0; letter-spacing: -0.01em; color: #ffffff;">
                Trainer Appeals & Mentee Escalations
              </h1>
              <p style="margin: 0; font-size: 13.5px; color: #e0e7ff; max-width: 680px; line-height: 1.45;">
                Direct escalation feed from trainers regarding mentee attendance non-compliance, incomplete assignments, or contact failures. Review and log resolution actions.
              </p>
            </div>

            <!-- Urgent Callout Pill -->
            ${criticalCount > 0 ? `
              <div style="background: rgba(239, 68, 68, 0.2); border: 1.5px solid #ef4444; border-radius: 14px; padding: 10px 16px; display: flex; align-items: center; gap: 10px; backdrop-filter: blur(8px);">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: pulse 1.5s infinite;"></span>
                <div>
                  <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${criticalCount} Critical Escalation(s)</div>
                  <div style="font-size: 11px; color: #fca5a5;">Requires immediate intervention</div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Executive KPI Counters Grid -->
          <div style="position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 18px;">
            <div style="background: rgba(0, 0, 0, 0.28); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase;">Total Received</div>
              <div style="font-size: 22px; font-weight: 900; color: #ffffff; margin-top: 2px;">${totalCount}</div>
            </div>

            <div style="background: rgba(239, 68, 68, 0.18); backdrop-filter: blur(10px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 11px; font-weight: 700; color: #fca5a5; text-transform: uppercase;">Pending Action</div>
              <div style="font-size: 22px; font-weight: 900; color: #fca5a5; margin-top: 2px;">${pendingCount}</div>
            </div>

            <div style="background: rgba(59, 130, 246, 0.18); backdrop-filter: blur(10px); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 11px; font-weight: 700; color: #93c5fd; text-transform: uppercase;">Under Review</div>
              <div style="font-size: 22px; font-weight: 900; color: #93c5fd; margin-top: 2px;">${inReviewCount}</div>
            </div>

            <div style="background: rgba(16, 185, 129, 0.18); backdrop-filter: blur(10px); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 11px; font-weight: 700; color: #a7f3d0; text-transform: uppercase;">Resolved</div>
              <div style="font-size: 22px; font-weight: 900; color: #a7f3d0; margin-top: 2px;">${resolvedCount}</div>
            </div>
          </div>
        </div>

        <!-- 2. FILTER & SEARCH CONTROL BAR -->
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 14px 18px; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03); display: flex; flex-direction: column; gap: 12px;">
          
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <!-- Search Bar -->
            <div style="position: relative; flex: 1; min-width: 220px;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; display: flex;">
                ${getIcon('search')}
              </span>
              <input 
                type="text" 
                id="inputAppealSearch" 
                placeholder="Search by mentee name, chest #, trainer, or keywords..." 
                value="${searchQuery}" 
                style="width: 100%; height: 42px; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 0 12px 0 38px; font-size: 13.5px; font-family: inherit; background: #f8fafc; transition: all 0.15s ease;"
              />
              ${searchQuery ? `
                <button type="button" id="btnClearSearch" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;">
                  ✕
                </button>
              ` : ''}
            </div>

            <!-- Urgency Quick Filter Dropdown -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #64748b; white-space: nowrap;">Severity:</span>
              <select id="selectUrgencyFilter" style="height: 42px; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 0 10px; font-size: 13px; font-weight: 700; background: #f8fafc; color: #334155;">
                <option value="ALL" ${filterUrgency === 'ALL' ? 'selected' : ''}>All Severities</option>
                <option value="critical" ${filterUrgency === 'critical' ? 'selected' : ''}>🔴 Critical / Urgent</option>
                <option value="high" ${filterUrgency === 'high' ? 'selected' : ''}>🟠 High Priority</option>
                <option value="normal" ${filterUrgency === 'normal' ? 'selected' : ''}>⚪ Normal Notice</option>
              </select>
            </div>
          </div>

          <!-- Status Filter Tabs -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px solid #f1f5f9; padding-top: 10px;">
            <button type="button" class="btn-ctrl-filter ${filterStatus === 'ALL' ? 'active' : ''}" data-status="ALL" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'ALL' ? '#4f46e5' : '#e2e8f0'}; background: ${filterStatus === 'ALL' ? '#eef2ff' : '#ffffff'}; color: ${filterStatus === 'ALL' ? '#4f46e5' : '#64748b'}; cursor: pointer;">
              All (${totalCount})
            </button>
            <button type="button" class="btn-ctrl-filter ${filterStatus === 'pending' ? 'active' : ''}" data-status="pending" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'pending' ? '#f59e0b' : '#e2e8f0'}; background: ${filterStatus === 'pending' ? '#fef3c7' : '#ffffff'}; color: ${filterStatus === 'pending' ? '#92400e' : '#64748b'}; cursor: pointer;">
              Pending Action (${pendingCount})
            </button>
            <button type="button" class="btn-ctrl-filter ${filterStatus === 'in-review' ? 'active' : ''}" data-status="in-review" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'in-review' ? '#3b82f6' : '#e2e8f0'}; background: ${filterStatus === 'in-review' ? '#eff6ff' : '#ffffff'}; color: ${filterStatus === 'in-review' ? '#1d4ed8' : '#64748b'}; cursor: pointer;">
              Under Review (${inReviewCount})
            </button>
            <button type="button" class="btn-ctrl-filter ${filterStatus === 'resolved' ? 'active' : ''}" data-status="resolved" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1.5px solid ${filterStatus === 'resolved' ? '#10b981' : '#e2e8f0'}; background: ${filterStatus === 'resolved' ? '#ecfdf5' : '#ffffff'}; color: ${filterStatus === 'resolved' ? '#047857' : '#64748b'}; cursor: pointer;">
              Resolved (${resolvedCount})
            </button>
          </div>
        </div>

        <!-- 3. APPEALS CARDS FEED -->
        ${filteredAppeals.length === 0 ? `
          <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 18px; padding: 48px 16px; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">🛡️</div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;">No Appeals in this Category</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
              ${searchQuery ? 'No appeals match your search keyword.' : 'All clear! No pending mentee appeals or issues require attention.'}
            </p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${filteredAppeals.map(appeal => {
              const cand = state.getCandidateById(appeal.candidateId);
              const trainer = state.getTrainerById(appeal.trainerId);
              const isEditingResolution = activeResolutionAppealId === appeal.id;
              const hasResponse = Boolean(appeal.controllerNotes && appeal.controllerNotes.trim());

              return `
                <div class="controller-appeal-card" style="background: #ffffff; border: 1.5px solid ${appeal.urgency === 'critical' ? '#fca5a5' : '#e2e8f0'}; border-radius: 18px; padding: 20px 22px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative;">
                  
                  <!-- Top Bar: Badges & Timestamp -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      ${getUrgencyBadge(appeal.urgency)}
                      ${getStatusBadge(appeal.status)}
                    </div>
                    <div style="font-size: 12px; color: #64748b; font-weight: 600;">
                      Submitted ${formatRelativeTime(appeal.createdAt)} • ${new Date(appeal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <!-- Mentee & Trainer Details Grid -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                    
                    <!-- Mentee Information -->
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 48px; height: 48px; border-radius: 50%; background: #4f46e5; color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        ${cand && cand.photo ? `<img src="${cand.photo}" alt="${appeal.candidateName}" style="width: 100%; height: 100%; object-fit: cover;" />` : appeal.candidateName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 15px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${appeal.candidateName}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #64748b; margin-top: 2px; flex-wrap: wrap;">
                          <span style="font-weight: 800; background: #e0e7ff; color: #4338ca; padding: 2px 7px; border-radius: 6px;">
                            #${appeal.candidateChestNo}
                          </span>
                          <span style="font-weight: 700;">${appeal.candidateCategory}</span>
                          ${cand && cand.phone ? `<span style="color: #059669; font-weight: 700;">• 📞 ${cand.phone}</span>` : ''}
                        </div>
                      </div>
                      <button type="button" class="btn btn-sm btn-outline btn-open-dossier" data-candidate-id="${appeal.candidateId}" style="flex-shrink: 0; font-size: 11.5px; font-weight: 700; height: 32px; border-color: #cbd5e1; color: #4338ca; padding: 0 10px; border-radius: 8px;">
                        ${getIcon('award')} Dossier
                      </button>
                    </div>

                    <!-- Trainer Information -->
                    <div style="display: flex; align-items: center; gap: 10px; border-left: 1px solid #e2e8f0; padding-left: 16px;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: ${trainer && trainer.color ? trainer.color : '#6366f1'}; color: #fff; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                        ${trainer && trainer.photo ? `<img src="${trainer.photo}" alt="${appeal.trainerName}" style="width: 100%; height: 100%; object-fit: cover;" />` : appeal.trainerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.03em;">
                          Escalated by Trainer
                        </div>
                        <div style="font-size: 13.5px; font-weight: 800; color: #1e293b;">
                          ${appeal.trainerName}
                        </div>
                        <div style="font-size: 11px; color: #64748b;">
                          Domain: <strong style="color: #475569;">${appeal.trainerSpecialization}</strong>
                        </div>
                      </div>
                    </div>

                  </div>

                  <!-- Issue Reason & Remarks -->
                  <div style="margin-top: 14px;">
                    <div style="font-size: 14px; font-weight: 800; color: #b91c1c; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                      ${getIcon('alertTriangle')}
                      <span>${appeal.reasonCategory}</span>
                    </div>

                    <div style="background: #ffffff; border: 1.5px solid #f1f5f9; border-left: 4px solid ${appeal.urgency === 'critical' ? '#ef4444' : '#6366f1'}; border-radius: 0 12px 12px 0; padding: 12px 16px; font-size: 13.5px; color: #334155; line-height: 1.5;">
                      ${appeal.description || '<em>No additional details provided.</em>'}
                    </div>
                  </div>

                  <!-- Controller Resolution Note (If already logged) -->
                  ${hasResponse ? `
                    <div style="margin-top: 14px; background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 16px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; color: #065f46;">
                          <span style="width: 18px; height: 18px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10.5px;">✓</span>
                          <span>Official Controller Resolution & Action:</span>
                        </div>
                        ${appeal.resolvedAt ? `
                          <span style="font-size: 11.5px; color: #047857; font-weight: 600;">
                            Resolved ${formatRelativeTime(appeal.resolvedAt)} by ${appeal.resolvedBy || 'Controller'}
                          </span>
                        ` : ''}
                      </div>
                      <div style="font-size: 13px; font-weight: 600; color: #064e3b; line-height: 1.45; padding-left: 24px;">
                        ${appeal.controllerNotes}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Controller Inline Action & Resolution Editor -->
                  ${isEditingResolution ? `
                    <div style="margin-top: 16px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 14px; padding: 16px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 13px; font-weight: 800; color: #0f172a;">
                          Log Action & Resolution for ${appeal.candidateName}
                        </span>
                        <button type="button" class="btn-cancel-edit btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #cbd5e1; color: #64748b; font-size: 11px;">
                          Cancel
                        </button>
                      </div>

                      <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                          Set Status:
                        </label>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'in-review' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="in-review" style="font-size: 12px; font-weight: 700; border-radius: 8px;">
                            ${getIcon('clock')} Mark Under Review
                          </button>
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'resolved' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="resolved" style="background: ${appeal.status === 'resolved' ? '#10b981' : 'transparent'}; border-color: #10b981; color: ${appeal.status === 'resolved' ? '#fff' : '#047857'}; font-size: 12px; font-weight: 700; border-radius: 8px;">
                            ${getIcon('check')} Mark Resolved / Action Taken
                          </button>
                          <button type="button" class="btn-set-status btn btn-sm ${appeal.status === 'dismissed' ? 'btn-primary' : 'btn-outline'}" data-appeal-id="${appeal.id}" data-new-status="dismissed" style="font-size: 12px; font-weight: 700; border-radius: 8px; color: #64748b;">
                            Dismiss / Close
                          </button>
                        </div>
                      </div>

                      <div style="margin-bottom: 12px;">
                        <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">
                          Resolution Notes & Action Taken:
                        </label>
                        <textarea 
                          id="txtResolution_${appeal.id}" 
                          rows="3" 
                          placeholder="e.g., Called guardian directly, student confirmed illness, granted 2-day leave; mentor informed to resume Thursday..." 
                          style="width: 100%; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 10px 12px; font-size: 13px; font-family: inherit; line-height: 1.4;"
                        >${resolutionNotesInput || appeal.controllerNotes || ''}</textarea>
                      </div>

                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                        <button type="button" class="btn-save-resolution btn btn-primary btn-sm" data-appeal-id="${appeal.id}" style="font-weight: 800; font-size: 12.5px; border-radius: 8px; padding: 8px 16px;">
                          Save & Update Appeal
                        </button>
                      </div>
                    </div>
                  ` : `
                    <!-- Bottom Quick Actions Bar -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; border-top: 1px solid #f1f5f9; padding-top: 12px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn-open-action btn btn-sm btn-primary" data-appeal-id="${appeal.id}" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); border: none; font-weight: 800; font-size: 12px; border-radius: 8px; padding: 6px 14px; display: flex; align-items: center; gap: 6px;">
                          ${getIcon('edit')}
                          <span>${hasResponse ? 'Update Resolution' : 'Take Action / Log Note'}</span>
                        </button>

                        ${appeal.status === 'pending' ? `
                          <button type="button" class="btn-quick-in-review btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #bfdbfe; color: #1d4ed8; font-weight: 700; font-size: 12px; border-radius: 8px;">
                            ${getIcon('clock')} Mark In Review
                          </button>
                        ` : ''}

                        ${appeal.status !== 'resolved' ? `
                          <button type="button" class="btn-quick-resolve btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #a7f3d0; color: #047857; font-weight: 700; font-size: 12px; border-radius: 8px;">
                            ${getIcon('check')} Quick Resolve
                          </button>
                        ` : ''}
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <button type="button" class="btn-delete-ctrl-appeal btn btn-sm btn-outline" data-appeal-id="${appeal.id}" style="border-color: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px;" title="Delete this appeal record">
                          ${getIcon('trash')} Delete
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

    // 2. Urgency Filter Dropdown
    const selUrg = container.querySelector('#selectUrgencyFilter');
    if (selUrg) {
      selUrg.onchange = (e) => {
        filterUrgency = e.target.value;
        render();
      };
    }

    // 3. Status Filter Buttons
    container.querySelectorAll('.btn-ctrl-filter').forEach(btn => {
      btn.onclick = () => {
        filterStatus = btn.getAttribute('data-status') || 'ALL';
        render();
      };
    });

    // 4. Open Candidate Dossier
    container.querySelectorAll('.btn-open-dossier').forEach(btn => {
      btn.onclick = () => {
        const cid = btn.getAttribute('data-candidate-id');
        if (cid) {
          openCandidateDossierModal(cid);
        }
      };
    });

    // 5. Open Resolution Action Box
    container.querySelectorAll('.btn-open-action').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-appeal-id');
        activeResolutionAppealId = id;
        const currentAppeal = state.getAppeals().find(a => a.id === id);
        resolutionNotesInput = currentAppeal ? (currentAppeal.controllerNotes || '') : '';
        render();
      };
    });

    // 6. Cancel Edit Action
    container.querySelectorAll('.btn-cancel-edit').forEach(btn => {
      btn.onclick = () => {
        activeResolutionAppealId = null;
        resolutionNotesInput = '';
        render();
      };
    });

    // 7. Change Status button inside editor
    container.querySelectorAll('.btn-set-status').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        const newStatus = btn.getAttribute('data-new-status');
        const txtNotes = container.querySelector(`#txtResolution_${appealId}`);
        const notes = txtNotes ? txtNotes.value.trim() : resolutionNotesInput;

        try {
          await state.updateAppeal(appealId, {
            status: newStatus,
            controllerNotes: notes
          });
          toast.success(`Appeal status updated to "${newStatus}".`);
          activeResolutionAppealId = null;
          render();
        } catch (e) {
          toast.error('Failed to update appeal status.');
        }
      };
    });

    // 8. Save Resolution Note
    container.querySelectorAll('.btn-save-resolution').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        const txtNotes = container.querySelector(`#txtResolution_${appealId}`);
        const notes = txtNotes ? txtNotes.value.trim() : '';

        try {
          await state.updateAppeal(appealId, {
            controllerNotes: notes,
            status: notes ? 'resolved' : undefined
          });
          toast.success('Controller resolution saved successfully!');
          activeResolutionAppealId = null;
          render();
        } catch (e) {
          toast.error('Failed to save resolution.');
        }
      };
    });

    // 9. Quick In-Review
    container.querySelectorAll('.btn-quick-in-review').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        try {
          await state.updateAppeal(appealId, { status: 'in-review' });
          toast.info('Appeal marked as Under Review.');
          render();
        } catch (e) {
          toast.error('Failed to update appeal.');
        }
      };
    });

    // 10. Quick Resolve
    container.querySelectorAll('.btn-quick-resolve').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        const promptNote = prompt('Enter brief resolution / action taken note (optional):', 'Reviewed and handled with candidate.');
        if (promptNote === null) return; // User cancelled prompt

        try {
          await state.updateAppeal(appealId, {
            status: 'resolved',
            controllerNotes: promptNote.trim() || 'Resolved by Controller Desk.'
          });
          toast.success('Appeal marked as Resolved.');
          render();
        } catch (e) {
          toast.error('Failed to resolve appeal.');
        }
      };
    });

    // 11. Delete Appeal
    container.querySelectorAll('.btn-delete-ctrl-appeal').forEach(btn => {
      btn.onclick = async () => {
        const appealId = btn.getAttribute('data-appeal-id');
        if (!appealId) return;

        if (confirm('Are you sure you want to delete this appeal record?')) {
          try {
            await state.deleteAppeal(appealId);
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
