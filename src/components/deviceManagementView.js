import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';
import { openDevicePermitModal } from './modals/devicePermitModal.js';
import { openDeviceStickerModal } from './modals/deviceStickerModal.js';
import { openDeviceScannerModal } from './modals/deviceScannerModal.js';
import { openDeviceActionModal } from './modals/deviceActionModal.js';
import { openDeviceReportModal } from './modals/deviceReportModal.js';

/**
 * Dedicated Student Device & Phone Management Desk
 * Strict role-based access:
 * - Controllers: Full registration, issue/checkout, return/locker, temporary suspension & permanent revocation, and reviewing teacher violation reports.
 * - Teachers / Mentors: Scan-only access to inspect practice progress and file structured irregularity reports (no phone issuance/submission authority).
 * 100% SVG icons (zero raw emojis) and responsive mobile touch cards.
 */
export function renderDeviceManagementView(container, navigateTo) {
  let searchTerm = '';
  let categoryFilter = 'ALL';
  let statusFilter = 'ALL';

  const session = state.getAuthSession();
  const isController = !session || session.role === 'controller';

  // 1. Render Static Shell
  container.innerHTML = `
    <div class="view-header" style="flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
      <div>
        <div class="view-tag" style="font-size: 11px; padding: 2px 7px;">
          ${getIcon('smartphone')} Hardware &amp; Asset Security
        </div>
        <h1 class="view-title" style="margin: 2px 0 0 0; font-size: 22px;">Student Device Desk</h1>
        <p class="view-desc" style="font-size: 12px; margin-top: 2px; color: #64748b;">
          ${isController 
            ? 'Regulated competition smartphones (09:00 AM – 10:00 PM). Desk checkout, QR verification &amp; disciplinary control.' 
            : 'Teacher Inspection Radar: Scan QR codes, verify academic progress, and submit campus violation reports to Controller.'}
        </p>
      </div>

      <div class="view-actions" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
        <button id="btnDeviceScanQr" class="btn btn-secondary btn-sm" title="Scan phone QR with camera" style="height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
          ${getIcon('qrCode')} <span>Scan QR</span>
        </button>

        ${isController ? `
          <button id="btnDeviceBatchStickers" class="btn btn-outline btn-sm" title="Print all phone stickers" style="border-color: #cbd5e1; background: #ffffff; height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
            ${getIcon('printer')} <span>Batch Stickers</span>
          </button>
          <button id="btnDeviceIssuePermit" class="btn btn-primary btn-sm" title="Issue new phone pass" style="height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
            ${getIcon('plus')} <span>Issue Phone Permit</span>
          </button>
        ` : ''}
      </div>
    </div>

    <!-- COMPACT RADAR REPORT STRIP (Low profile, 100% SVG icons) -->
    <div id="deviceMetricsContainer" class="compact-device-stats-bar">
      <!-- Injected dynamically -->
    </div>

    <!-- CONTROLLER INCIDENT REPORTS FEED CONTAINER (Rendered if pending reports exist) -->
    <div id="controllerIncidentReportsContainer">
      <!-- Injected dynamically for Controller -->
    </div>

    <!-- SEARCH & FILTER BAR -->
    <div class="saas-filter-bar" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; margin: 10px 0 16px 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
      <div style="display: flex; gap: 8px; flex: 1; min-width: 220px;">
        <div class="search-input-wrapper" style="position: relative; flex: 1; width: 100%;">
          <span class="search-icon" style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex;">
            ${getIcon('search')}
          </span>
          <input type="text" id="inputDeviceSearch" class="form-input" placeholder="Search student name, chest #, or DEV tag..." 
                 value="${searchTerm}" style="padding-left: 34px; height: 36px; width: 100%; font-size: 12.5px;" />
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <!-- Status Filter -->
        <select id="selectDeviceStatusFilter" class="form-select" style="height: 36px; min-width: 150px; font-size: 12.5px;">
          <option value="ALL">All Statuses</option>
          <option value="CHECKED_OUT">Checked Out (In Hand)</option>
          <option value="SUBMITTED">Submitted to Locker</option>
          <option value="OVERDUE">Overdue (&gt; 10 PM)</option>
          <option value="SUSPENDED">Temporarily Suspended</option>
          <option value="REVOKED">Permanently Revoked</option>
        </select>

        <!-- Category Filter -->
        <select id="selectDeviceCatFilter" class="form-select" style="height: 36px; min-width: 130px; font-size: 12.5px;">
          <option value="ALL">All Categories</option>
          <option value="BIDĀYA">BIDĀYA</option>
          <option value="ŪLĀ">ŪLĀ</option>
          <option value="THĀNAWIYYAH">THĀNAWIYYAH</option>
          <option value="ʿĀLIYAH">ʿĀLIYAH</option>
        </select>
      </div>
    </div>

    <!-- DYNAMIC DEVICE LISTING CONTAINER -->
    <div id="devicesListContainer">
      <!-- Injected dynamically -->
    </div>
  `;

  // 2. Metrics Updater (Compact, 100% SVG Icons, Zero Emojis)
  const updateMetrics = () => {
    const metricsContainer = container.querySelector('#deviceMetricsContainer');
    if (!metricsContainer) return;
    const metrics = state.getDeviceMetrics();

    metricsContainer.innerHTML = `
      <div class="mini-stat-capsule" title="Total permitted phones in registry">
        <span class="msc-icon" style="color: #4f46e5;">${getIcon('smartphone')}</span>
        <div class="msc-info">
          <span class="msc-label">Permits</span>
          <strong class="msc-val">${metrics.totalPermits}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule ${metrics.checkedOutCount > 0 ? 'active' : ''}" title="Currently in student hand for competition practice">
        <span class="msc-icon" style="color: #059669;">${getIcon('checkCircle')}</span>
        <div class="msc-info">
          <span class="msc-label">In Hand</span>
          <strong class="msc-val" style="color: #059669;">${metrics.checkedOutCount}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule" title="Safely returned to supervisor locker">
        <span class="msc-icon" style="color: #6366f1;">${getIcon('lock')}</span>
        <div class="msc-info">
          <span class="msc-label">In Locker</span>
          <strong class="msc-val" style="color: #6366f1;">${metrics.submittedCount}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule ${metrics.overdueCount > 0 ? 'danger' : ''}" title="Past 10:00 PM cutoff time without return">
        <span class="msc-icon" style="${metrics.overdueCount > 0 ? 'color: #dc2626;' : 'color: #64748b;'}">
          ${metrics.overdueCount > 0 ? getIcon('alertTriangle') : getIcon('shieldCheck')}
        </span>
        <div class="msc-info">
          <span class="msc-label">Overdue</span>
          <strong class="msc-val" style="${metrics.overdueCount > 0 ? 'color: #dc2626;' : 'color: #64748b;'}">${metrics.overdueCount}</strong>
        </div>
      </div>
    `;

    // 2b. Render Controller Violation Feed
    const reportsContainer = container.querySelector('#controllerIncidentReportsContainer');
    if (reportsContainer && isController) {
      const allIrregularities = state.getAllDeviceIrregularities();
      const pending = allIrregularities.filter(i => i.status === 'pending');

      if (pending.length === 0) {
        reportsContainer.innerHTML = '';
      } else {
        reportsContainer.innerHTML = `
          <div style="background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 12px; padding: 12px 16px; margin: 0 0 14px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; color: #b91c1c; font-weight: 800; font-size: 13px;">
                <span style="display: flex;">${getIcon('shieldAlert')}</span>
                <span>Teacher Incident Reports (${pending.length} Action Required)</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${pending.slice(0, 3).map(irr => `
                <div style="background: #ffffff; border: 1px solid #fee2e2; border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="mdc-tag-capsule" style="font-size: 11px; padding: 1px 6px;">${irr.deviceTag}</span>
                      <strong style="font-size: 13px; color: #0f172a;">${irr.candidate.name}</strong>
                      <span style="font-size: 11px; color: #64748b;">(CHEST: ${irr.candidate.chestNo || irr.candidate.adNo})</span>
                    </div>
                    <div style="font-size: 12px; color: #991b1b; margin-top: 3px;">
                      <strong>${irr.category.replace(/_/g, ' ')}:</strong> "${irr.notes}"
                    </div>
                    <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">
                      Reported by: <strong>${irr.reportedBy}</strong> • ${new Date(irr.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button type="button" class="btn btn-sm btn-outline btn-dismiss-feed-report" data-pid="${irr.permitId}" data-iid="${irr.id}" style="height: 30px; font-size: 11.5px; border-color: #cbd5e1;">
                      Dismiss
                    </button>
                    <button type="button" class="btn btn-sm btn-primary btn-action-feed-report" data-pid="${irr.permitId}" style="height: 30px; font-size: 11.5px; background: #dc2626; border-color: #dc2626; gap: 4px;">
                      ${getIcon('shieldAlert')} <span>Take Action</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        reportsContainer.querySelectorAll('.btn-dismiss-feed-report').forEach(b => {
          b.onclick = () => {
            const pid = b.getAttribute('data-pid');
            const iid = b.getAttribute('data-iid');
            state.resolveDeviceIrregularity(pid, iid, { action: 'dismissed' });
            toast.info('Incident report dismissed.');
            updateMetrics();
            updateList();
          };
        });

        reportsContainer.querySelectorAll('.btn-action-feed-report').forEach(b => {
          b.onclick = () => {
            const pid = b.getAttribute('data-pid');
            openDeviceActionModal({
              permitId: pid,
              onActionComplete: () => {
                updateMetrics();
                updateList();
              }
            });
          };
        });
      }
    }
  };

  // 3. Dynamic Device List Updater
  const updateList = () => {
    const listContainer = container.querySelector('#devicesListContainer');
    if (!listContainer) return;

    const permits = state.getDevicePermits();
    const now = new Date();

    const filteredPermits = permits.filter(p => {
      const cand = state.getCandidateById(p.candidateId) || { name: '', category: '', chestNo: '', adNo: '' };
      const status = state.getDevicePermitStatus(p, now);

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = String(cand.name || '').toLowerCase().includes(q);
        const matchChest = String(cand.chestNo || '').toLowerCase().includes(q);
        const matchAd = String(cand.adNo || '').toLowerCase().includes(q);
        const matchTag = String(p.deviceTag || '').toLowerCase().includes(q);
        const matchModel = String(p.deviceModel || '').toLowerCase().includes(q);
        if (!matchName && !matchChest && !matchAd && !matchTag && !matchModel) {
          return false;
        }
      }

      if (categoryFilter !== 'ALL' && cand.category !== categoryFilter) {
        return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHECKED_OUT' && status.code !== 'LEGAL') return false;
        if (statusFilter === 'SUBMITTED' && status.code !== 'SUBMITTED') return false;
        if (statusFilter === 'OVERDUE' && status.code !== 'ILLEGAL_OVERDUE') return false;
        if (statusFilter === 'SUSPENDED' && status.code !== 'SUSPENDED') return false;
        if (statusFilter === 'REVOKED' && status.code !== 'REVOKED') return false;
      }

      return true;
    });

    if (filteredPermits.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card" style="padding: 42px 20px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
          <div style="display: flex; justify-content: center; margin-bottom: 12px; color: #94a3b8;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
          </div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">No Device Permits Found</h3>
          <p class="text-muted" style="max-width: 420px; margin: 0 auto 16px auto; font-size: 12.5px;">
            ${permits.length === 0 
              ? (isController ? 'No smartphone permits have been issued yet. Click "Issue Phone Permit" to authorize candidates.' : 'No active candidate phone permits in the registry.')
              : 'No devices match your current search and filter criteria.'}
          </p>
          ${isController ? `
            <button class="btn btn-primary" id="btnEmptyIssuePermit" style="gap: 6px; font-weight: 700;">
              ${getIcon('plus')} Issue First Permit
            </button>
          ` : ''}
        </div>
      `;

      const btnEmpty = listContainer.querySelector('#btnEmptyIssuePermit');
      if (btnEmpty) {
        btnEmpty.onclick = () => {
          openDevicePermitModal({
            onSaved: () => {
              updateMetrics();
              updateList();
            }
          });
        };
      }
      return;
    }

    // 3a. Generate Desktop Table HTML
    const desktopTableHtml = `
      <div class="desktop-device-table">
        <div class="saas-table-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div class="table-responsive">
            <table class="saas-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; color: #64748b; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 12px 16px;">Device Tag</th>
                  <th style="padding: 12px 16px;">Candidate / Student</th>
                  <th style="padding: 12px 16px;">Compliance Status (9 AM – 10 PM)</th>
                  <th style="padding: 12px 16px;">Practice Indicator</th>
                  <th style="padding: 12px 16px; text-align: right;">${isController ? 'Controller Operations' : 'Teacher Inspection'}</th>
                </tr>
              </thead>
              <tbody>
                ${filteredPermits.map(p => {
                  const cand = state.getCandidateById(p.candidateId) || { name: 'Unknown', category: 'GENERAL', chestNo: 'N/A' };
                  const candInitials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const status = state.getDevicePermitStatus(p, now);
                  const isCheckedOut = status.code === 'LEGAL';

                  const dossierData = state.getCandidateMenteeDashboardData(cand.id);
                  const meetsToday = dossierData?.todayStatus?.meets?.length || 0;
                  const progCount = dossierData?.dossier?.programs?.length || 0;

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                      <!-- Device Tag -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: #eef2ff; color: #4f46e5; font-weight: 800; font-family: monospace; font-size: 13px;">
                            ${getIcon('smartphone')}
                          </span>
                          <div>
                            <strong style="color: #0f172a; font-family: monospace; font-size: 13.5px;">${p.deviceTag}</strong>
                            <div style="font-size: 11px; color: #64748b;">${p.deviceModel || 'Smartphone'}</div>
                          </div>
                        </div>
                      </td>

                      <!-- Candidate -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                          <div style="width: 34px; height: 34px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; overflow: hidden; flex-shrink: 0;">
                            ${cand.photo 
                              ? `<img src="${cand.photo}" alt="${cand.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
                              : candInitials}
                          </div>
                          <div>
                            <div style="font-weight: 700; color: #0f172a;">${cand.name}</div>
                            <div style="font-size: 11.5px; color: #64748b; display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                              <span class="badge badge-category-pill" style="font-size: 10px; padding: 1px 6px;">${cand.category}</span>
                              <span>CHEST: ${cand.chestNo || cand.adNo || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Live Compliance Status -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
                        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor};">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${status.color};"></span>
                          <span>${status.badge}</span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                          ${status.remainingMinutes !== null ? `Time Left: ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m` : ''}
                          ${status.overdueMinutes !== null ? `Overdue by ${status.overdueMinutes}m` : ''}
                          ${status.code === 'SUBMITTED' ? `Safe in locker` : ''}
                          ${status.code === 'NOT_CHECKED_OUT' ? `Desk checkout pending` : ''}
                          ${status.code === 'SUSPENDED' ? `Suspended until ${p.suspendedUntil || 'further notice'}` : ''}
                          ${status.code === 'REVOKED' ? `Access cancelled` : ''}
                        </div>
                      </td>

                      <!-- Practice Progress Indicator -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-size: 12px; font-weight: 700; color: ${meetsToday > 0 ? '#059669' : '#d97706'};">
                            ${meetsToday > 0 ? `${meetsToday} Meets Today` : `0 Meets Logged Today`}
                          </span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                          ${progCount} program(s) enrolled • ${p.reason}
                        </div>
                      </td>

                      <!-- Actions -->
                      <td style="padding: 12px 16px; vertical-align: middle; text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          ${isController ? `
                            <!-- Controller: Professional Desk & Revocation Actions -->
                            <button type="button" class="btn btn-sm btn-primary btn-open-device-action" data-id="${p.id}" title="Manage Desk &amp; Revocation" style="height: 32px; font-size: 11.5px; font-weight: 700; gap: 5px;">
                              ${getIcon('slider')} <span>Manage</span>
                            </button>

                            <button type="button" class="btn btn-sm btn-outline btn-inspect-phone" data-tag="${p.deviceTag}" title="Live QR &amp; Progress Inspection" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                              ${getIcon('eye')}
                            </button>

                            <button type="button" class="btn btn-sm btn-outline btn-sticker-phone" data-id="${p.id}" title="Print Physical Phone Sticker" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                              ${getIcon('printer')}
                            </button>

                            <button type="button" class="btn btn-sm btn-outline btn-edit-permit" data-id="${p.id}" title="Edit Permit" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                              ${getIcon('edit')}
                            </button>

                            <button type="button" class="btn btn-sm btn-outline text-danger btn-delete-permit" data-id="${p.id}" title="Delete Permit" style="border-color: #fecaca; height: 32px; padding: 0 8px;">
                              ${getIcon('trash')}
                            </button>
                          ` : `
                            <!-- Teachers / Mentors: Scan, Inspect & Report Irregularity ONLY -->
                            <button type="button" class="btn btn-sm btn-secondary btn-inspect-phone" data-tag="${p.deviceTag}" title="Inspect Progress" style="height: 32px; font-size: 12px; font-weight: 700; gap: 5px;">
                              ${getIcon('eye')} <span>Inspect</span>
                            </button>

                            <button type="button" class="btn btn-sm btn-outline btn-report-violation" data-id="${p.id}" title="Report Violation" style="border-color: #fca5a5; color: #dc2626; height: 32px; font-size: 11.5px; font-weight: 700; gap: 4px;">
                              ${getIcon('flag')} <span>Report</span>
                            </button>
                          `}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // 3b. Generate Mobile Touch Cards HTML (< 768px)
    const mobileCardsHtml = `
      <div class="mobile-devices-list">
        ${filteredPermits.map(p => {
          const cand = state.getCandidateById(p.candidateId) || { name: 'Unknown', category: 'GENERAL', chestNo: 'N/A' };
          const candInitials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          const status = state.getDevicePermitStatus(p, now);
          const isCheckedOut = status.code === 'LEGAL';

          const dossierData = state.getCandidateMenteeDashboardData(cand.id);
          const meetsToday = dossierData?.todayStatus?.meets?.length || 0;
          const progCount = dossierData?.dossier?.programs?.length || 0;

          return `
            <div class="mobile-device-card" data-id="${p.id}">
              <!-- Header Row: Tag & Status Badge -->
              <div class="mdc-header-row">
                <span class="mdc-tag-capsule">
                  <span>${getIcon('smartphone')}</span>
                  <span>${p.deviceTag}</span>
                </span>
                <div style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor};">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: ${status.color};"></span>
                  <span>${status.badge}</span>
                </div>
              </div>

              <!-- Student Profile Row -->
              <div class="mdc-student-row">
                <div class="mdc-student-avatar">
                  ${cand.photo 
                    ? `<img src="${cand.photo}" alt="${cand.name}" />`
                    : candInitials}
                </div>
                <div class="mdc-student-meta">
                  <h4 class="mdc-student-name">${cand.name}</h4>
                  <div class="mdc-student-tags">
                    <span class="badge badge-category-pill" style="font-size: 10px; padding: 1px 6px;">${cand.category}</span>
                    <span>CHEST: <strong>${cand.chestNo || cand.adNo || 'N/A'}</strong></span>
                    <span>• ${p.deviceModel || 'Smartphone'}</span>
                  </div>
                </div>
              </div>

              <!-- Permitted Time & Remaining Countdown Bar -->
              <div class="mdc-rule-strip">
                <div>
                  <span style="color: #64748b;">Allowed Hours:</span>
                  <strong>09:00 AM – 10:00 PM</strong>
                </div>
                <div style="font-weight: 800; color: ${status.code === 'ILLEGAL_OVERDUE' ? '#dc2626' : (isCheckedOut ? '#059669' : '#64748b')};">
                  ${status.remainingMinutes !== null ? `Time Left: ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m` : ''}
                  ${status.overdueMinutes !== null ? `OVERDUE by ${status.overdueMinutes}m` : ''}
                  ${status.code === 'SUBMITTED' ? `In Locker` : ''}
                  ${status.code === 'NOT_CHECKED_OUT' ? `Desk Checkout Pending` : ''}
                  ${status.code === 'SUSPENDED' ? `Suspended` : ''}
                  ${status.code === 'REVOKED' ? `Revoked` : ''}
                </div>
              </div>

              <!-- Practice Progress Activity Strip -->
              <div class="mdc-practice-strip">
                <div>
                  <span style="color: #64748b;">Practice Today:</span>
                  <strong style="color: ${meetsToday > 0 ? '#059669' : '#d97706'};">
                    ${meetsToday > 0 ? `${meetsToday} Meets Done` : `0 Meets Logged`}
                  </strong>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                  ${progCount} program(s) enrolled
                </div>
              </div>

              <!-- Actions Area (Touch Buttons) -->
              <div class="mdc-actions-grid">
                ${isController ? `
                  <!-- Controller Mobile Touch Controls -->
                  <button type="button" class="btn btn-primary mdc-primary-btn btn-open-device-action" data-id="${p.id}" style="font-weight: 800; gap: 6px;">
                    ${getIcon('slider')} Manage Desk &amp; Disciplinary Actions
                  </button>

                  <div class="mdc-sub-actions-row">
                    <button type="button" class="mdc-sub-btn btn-inspect-phone" data-tag="${p.deviceTag}" title="Inspect Progress">
                      ${getIcon('eye')} <span>Inspect</span>
                    </button>
                    <button type="button" class="mdc-sub-btn btn-sticker-phone" data-id="${p.id}" title="Print QR Sticker">
                      ${getIcon('printer')} <span>Sticker</span>
                    </button>
                    <button type="button" class="mdc-sub-btn btn-edit-permit" data-id="${p.id}" title="Edit">
                      ${getIcon('edit')} <span>Edit</span>
                    </button>
                    <button type="button" class="mdc-sub-btn text-danger btn-delete-permit" data-id="${p.id}" title="Delete">
                      ${getIcon('trash')}
                    </button>
                  </div>
                ` : `
                  <!-- Teacher Mobile Touch Controls (Scan & Report Only) -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button type="button" class="btn btn-secondary btn-inspect-phone" data-tag="${p.deviceTag}" style="height: 38px; font-weight: 700; gap: 5px;">
                      ${getIcon('eye')} <span>Inspect</span>
                    </button>
                    <button type="button" class="btn btn-outline btn-report-violation" data-id="${p.id}" style="border-color: #fca5a5; color: #dc2626; height: 38px; font-weight: 700; gap: 5px;">
                      ${getIcon('flag')} <span>Report</span>
                    </button>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    listContainer.innerHTML = desktopTableHtml + mobileCardsHtml;
  };

  // 4. Robust Event Delegation on listContainer
  const listContainer = container.querySelector('#devicesListContainer');
  if (listContainer) {
    listContainer.onclick = (e) => {
      // Controller: Open Professional Action Modal (Issue, Return, Suspend, Revoke)
      const btnAction = e.target.closest('.btn-open-device-action');
      if (btnAction) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnAction.getAttribute('data-id');
        openDeviceActionModal({
          permitId: id,
          onActionComplete: () => {
            updateMetrics();
            updateList();
          }
        });
        return;
      }

      // Teacher / Controller: Report Violation Modal
      const btnReport = e.target.closest('.btn-report-violation');
      if (btnReport) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnReport.getAttribute('data-id');
        openDeviceReportModal({
          permitId: id,
          onSubmitted: () => {
            updateMetrics();
            updateList();
          }
        });
        return;
      }

      // Inspect QR & Progress
      const btnInspect = e.target.closest('.btn-inspect-phone');
      if (btnInspect) {
        e.preventDefault();
        e.stopPropagation();
        const tag = btnInspect.getAttribute('data-tag');
        navigateTo(`device-verify:${tag}`);
        return;
      }

      // Print Phone Sticker
      const btnSticker = e.target.closest('.btn-sticker-phone');
      if (btnSticker) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnSticker.getAttribute('data-id');
        openDeviceStickerModal({ permitId: id });
        return;
      }

      // Edit Permit (Controller Only)
      const btnEdit = e.target.closest('.btn-edit-permit');
      if (btnEdit && isController) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnEdit.getAttribute('data-id');
        openDevicePermitModal({
          permitId: id,
          onSaved: () => {
            updateMetrics();
            updateList();
          }
        });
        return;
      }

      // Delete Permit (Controller Only)
      const btnDelete = e.target.closest('.btn-delete-permit');
      if (btnDelete && isController) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnDelete.getAttribute('data-id');
        if (confirm('Are you sure you want to delete / remove this student device permit?')) {
          state.deleteDevicePermit(id);
          toast.info('Device permit removed.');
          updateMetrics();
          updateList();
        }
        return;
      }
    };
  }

  // 5. Wire Static Search & Filter Handlers
  const inputSearch = container.querySelector('#inputDeviceSearch');
  if (inputSearch) {
    inputSearch.oninput = (e) => {
      searchTerm = e.target.value.trim();
      updateList();
    };
  }

  const selectStatus = container.querySelector('#selectDeviceStatusFilter');
  if (selectStatus) {
    selectStatus.onchange = (e) => {
      statusFilter = e.target.value;
      updateList();
    };
  }

  const selectCat = container.querySelector('#selectDeviceCatFilter');
  if (selectCat) {
    selectCat.onchange = (e) => {
      categoryFilter = e.target.value;
      updateList();
    };
  }

  // 6. Wire Global Actions
  const btnScanQr = container.querySelector('#btnDeviceScanQr');
  if (btnScanQr) {
    btnScanQr.onclick = () => {
      openDeviceScannerModal({
        onVerified: (tag) => {
          navigateTo(`device-verify:${tag}`);
        }
      });
    };
  }

  const btnBatchStickers = container.querySelector('#btnDeviceBatchStickers');
  if (btnBatchStickers) {
    btnBatchStickers.onclick = () => {
      openDeviceStickerModal({ batchAll: true });
    };
  }

  const btnIssuePermit = container.querySelector('#btnDeviceIssuePermit');
  if (btnIssuePermit) {
    btnIssuePermit.onclick = () => {
      openDevicePermitModal({
        onSaved: () => {
          updateMetrics();
          updateList();
        }
      });
    };
  }

  // 7. Subscribe to real-time state changes
  state.subscribe(() => {
    if (document.body.contains(container)) {
      updateMetrics();
      updateList();
    }
  });

  // Initial Load
  updateMetrics();
  updateList();
}
