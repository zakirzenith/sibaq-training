import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';
import { openDevicePermitModal } from './modals/devicePermitModal.js';
import { openDeviceStickerModal } from './modals/deviceStickerModal.js';
import { openDeviceScannerModal } from './modals/deviceScannerModal.js';

/**
 * Dedicated Controller & Mentor View: Student Device & Phone Management Desk
 * Manages approved phones, daily checkout/return (9am - 10pm), QR pass generation, and progress tracking.
 */
export function renderDeviceManagementView(container, navigateTo) {
  let searchTerm = '';
  let categoryFilter = 'ALL';
  let statusFilter = 'ALL';

  const render = () => {
    const permits = state.getDevicePermits();
    const metrics = state.getDeviceMetrics();
    const now = new Date();

    // Filter permits
    const filteredPermits = permits.filter(p => {
      const cand = state.getCandidateById(p.candidateId) || { name: '', category: '', chestNo: '', adNo: '' };
      const status = state.getDevicePermitStatus(p, now);

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = (cand.name || '').toLowerCase().includes(q);
        const matchChest = (cand.chestNo || '').toLowerCase().includes(q);
        const matchAd = (cand.adNo || '').toLowerCase().includes(q);
        const matchTag = (p.deviceTag || '').toLowerCase().includes(q);
        const matchModel = (p.deviceModel || '').toLowerCase().includes(q);
        if (!matchName && !matchChest && !matchAd && !matchTag && !matchModel) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        if (cand.category !== categoryFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CHECKED_OUT' && status.code !== 'LEGAL') return false;
        if (statusFilter === 'SUBMITTED' && status.code !== 'SUBMITTED') return false;
        if (statusFilter === 'OVERDUE' && status.code !== 'ILLEGAL_OVERDUE') return false;
        if (statusFilter === 'REVOKED' && status.code !== 'REVOKED') return false;
      }

      return true;
    });

    container.innerHTML = `
      <div class="view-header" style="flex-wrap: wrap; gap: 14px;">
        <div>
          <div class="view-tag">${getIcon('smartphone')} Hardware &amp; Asset Security</div>
          <h1 class="view-title">Student Device &amp; Phone Desk</h1>
          <p class="view-desc">
            Regulated smartphone access for competition practice (09:00 AM – 10:00 PM). QR verification &amp; performance radar.
          </p>
        </div>

        <div class="view-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btnDeviceScanQr" class="btn btn-secondary" title="Scan phone QR with camera">
            ${getIcon('qrCode')} Scan Phone QR
          </button>
          <button id="btnDeviceBatchStickers" class="btn btn-outline" title="Print all phone stickers" style="border-color: #cbd5e1;">
            ${getIcon('printer')} Batch Print Stickers
          </button>
          <button id="btnDeviceIssuePermit" class="btn btn-primary" title="Issue new phone pass">
            ${getIcon('plus')} Issue Phone Permit
          </button>
        </div>
      </div>

      <!-- LIVE PHONE RADAR STATS GRID -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="stat-card">
          <div class="stat-icon-wrap icon-cyan">${getIcon('smartphone')}</div>
          <div class="stat-content">
            <div class="stat-label">Total Permitted Phones</div>
            <div class="stat-value">${metrics.totalPermits}</div>
            <div class="stat-foot text-cyan">
              ${metrics.activePermitsCount} authorized candidates
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap icon-emerald">${getIcon('checkCircle')}</div>
          <div class="stat-content">
            <div class="stat-label">Currently Checked Out</div>
            <div class="stat-value" style="color: #059669;">${metrics.checkedOutCount}</div>
            <div class="stat-foot text-emerald">
              In hand for practice (Must return by 10 PM)
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap icon-violet">${getIcon('shieldCheck')}</div>
          <div class="stat-content">
            <div class="stat-label">Submitted Today</div>
            <div class="stat-value" style="color: #6366f1;">${metrics.submittedCount}</div>
            <div class="stat-foot text-violet">
              Safely returned to supervisor locker
            </div>
          </div>
        </div>

        <div class="stat-card ${metrics.overdueCount > 0 ? 'stat-card-danger' : ''}">
          <div class="stat-icon-wrap ${metrics.overdueCount > 0 ? 'icon-red' : 'icon-slate'}">
            ${getIcon('alertTriangle')}
          </div>
          <div class="stat-content">
            <div class="stat-label">Overdue / Violation Alerts</div>
            <div class="stat-value" style="${metrics.overdueCount > 0 ? 'color: #dc2626;' : ''}">${metrics.overdueCount}</div>
            <div class="stat-foot ${metrics.overdueCount > 0 ? 'text-danger' : 'text-muted'}">
              ${metrics.overdueCount > 0 ? '🚨 Past 10:00 PM cutoff! Escalate now!' : 'All checked-in within rules'}
            </div>
          </div>
        </div>
      </div>

      <!-- SEARCH & FILTER BAR -->
      <div class="saas-filter-bar" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin: 20px 0; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
        <div style="display: flex; gap: 10px; flex: 1; min-width: 260px;">
          <div class="search-input-wrap" style="position: relative; flex: 1;">
            <input type="text" id="inputDeviceSearch" class="form-control" placeholder="Search by student name, chest #, or DEV tag..." 
                   value="${searchTerm}" style="padding-left: 36px; height: 38px;" />
            <span style="position: absolute; left: 12px; top: 11px; color: #94a3b8;">${getIcon('search')}</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <!-- Status Filter -->
          <select id="selectDeviceStatusFilter" class="form-select" style="height: 38px; width: 160px; font-size: 12.5px;">
            <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="CHECKED_OUT" ${statusFilter === 'CHECKED_OUT' ? 'selected' : ''}>Checked Out (In Hand)</option>
            <option value="SUBMITTED" ${statusFilter === 'SUBMITTED' ? 'selected' : ''}>Submitted to Locker</option>
            <option value="OVERDUE" ${statusFilter === 'OVERDUE' ? 'selected' : ''}>🚨 Overdue (&gt; 10 PM)</option>
            <option value="REVOKED" ${statusFilter === 'REVOKED' ? 'selected' : ''}>Revoked</option>
          </select>

          <!-- Category Filter -->
          <select id="selectDeviceCatFilter" class="form-select" style="height: 38px; width: 140px; font-size: 12.5px;">
            <option value="ALL" ${categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
            <option value="BIDĀYA" ${categoryFilter === 'BIDĀYA' ? 'selected' : ''}>BIDĀYA</option>
            <option value="ŪLĀ" ${categoryFilter === 'ŪLĀ' ? 'selected' : ''}>ŪLĀ</option>
            <option value="THĀNAWIYYAH" ${categoryFilter === 'THĀNAWIYYAH' ? 'selected' : ''}>THĀNAWIYYAH</option>
            <option value="ʿĀLIYAH" ${categoryFilter === 'ʿĀLIYAH' ? 'selected' : ''}>ʿĀLIYAH</option>
          </select>
        </div>
      </div>

      <!-- DEVICE LISTING TABLE / CARDS -->
      ${filteredPermits.length === 0 ? `
        <div class="empty-state-card" style="padding: 48px 20px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
          <div style="font-size: 42px; margin-bottom: 12px;">📱</div>
          <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">No Device Permits Found</h3>
          <p class="text-muted" style="max-width: 440px; margin: 0 auto 16px auto; font-size: 13px;">
            ${permits.length === 0 
              ? 'No candidates have been issued a smartphone permit yet. Click "Issue Phone Permit" to authorize students who extremely need a phone for competition practice.'
              : 'No devices match your current search and filter criteria.'}
          </p>
          ${permits.length === 0 ? `
            <button class="btn btn-primary" id="btnEmptyIssuePermit">
              ${getIcon('plus')} Issue First Permit
            </button>
          ` : ''}
        </div>
      ` : `
        <div class="saas-table-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div class="table-responsive">
            <table class="saas-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; color: #64748b; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 12px 16px;">Device Tag</th>
                  <th style="padding: 12px 16px;">Candidate / Student</th>
                  <th style="padding: 12px 16px;">Live Status (9 AM – 10 PM)</th>
                  <th style="padding: 12px 16px;">Practice Progress Indicator</th>
                  <th style="padding: 12px 16px; text-align: right;">Supervisor Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredPermits.map(p => {
                  const cand = state.getCandidateById(p.candidateId) || { name: 'Unknown', category: 'GENERAL', chestNo: 'N/A' };
                  const candInitials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const status = state.getDevicePermitStatus(p, now);
                  const isCheckedOut = status.code === 'LEGAL';

                  // Progress info
                  const dossierData = state.getCandidateMenteeDashboardData(cand.id);
                  const meetsToday = dossierData?.todayStatus?.meets?.length || 0;
                  const progCount = dossierData?.dossier?.programs?.length || 0;

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                      <!-- Device Tag -->
                      <td style="padding: 14px 16px; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: #eef2ff; color: #4f46e5; font-weight: 800; font-family: monospace; font-size: 13px;">
                            📱
                          </span>
                          <div>
                            <strong style="color: #0f172a; font-family: monospace; font-size: 13.5px;">${p.deviceTag}</strong>
                            <div style="font-size: 11px; color: #64748b;">${p.deviceModel || 'Phone'}</div>
                          </div>
                        </div>
                      </td>

                      <!-- Candidate -->
                      <td style="padding: 14px 16px; vertical-align: middle;">
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

                      <!-- Live Status -->
                      <td style="padding: 14px 16px; vertical-align: middle;">
                        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor};">
                          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${status.color};"></span>
                          <span>${status.badge}</span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                          ${status.remainingMinutes !== null ? `⏳ ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m remaining` : ''}
                          ${status.overdueMinutes !== null ? `🚨 OVERDUE by ${status.overdueMinutes}m` : ''}
                          ${status.code === 'SUBMITTED' ? `Safe in locker` : ''}
                          ${status.code === 'NOT_CHECKED_OUT' ? `Desk checkout pending` : ''}
                        </div>
                      </td>

                      <!-- Progress Indicator ("Is he progressing from his phone?") -->
                      <td style="padding: 14px 16px; vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span style="font-size: 12px; font-weight: 700; color: ${meetsToday > 0 ? '#059669' : '#d97706'};">
                            ${meetsToday > 0 ? `🟢 ${meetsToday} Meets Today` : `🟡 0 Meets Today`}
                          </span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                          ${progCount} program(s) enrolled • ${p.reason}
                        </div>
                      </td>

                      <!-- Supervisor Actions -->
                      <td style="padding: 14px 16px; vertical-align: middle; text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          ${isCheckedOut ? `
                            <button class="btn btn-sm btn-outline btn-return-phone" data-id="${p.id}" title="Submit Phone Before 10 PM" style="border-color: #a7f3d0; background: #ecfdf5; color: #047857; font-weight: 700; height: 30px; padding: 0 9px;">
                              ${getIcon('check')} Submit
                            </button>
                          ` : `
                            <button class="btn btn-sm btn-outline btn-checkout-phone" data-id="${p.id}" title="Issue Phone for Today" style="border-color: #cbd5e1; font-weight: 700; height: 30px; padding: 0 9px;">
                              ${getIcon('plus')} Issue
                            </button>
                          `}

                          <button class="btn btn-sm btn-outline btn-inspect-phone" data-tag="${p.deviceTag}" title="Live QR & Progress Inspection" style="border-color: #cbd5e1; height: 30px; padding: 0 8px;">
                            ${getIcon('eye')}
                          </button>

                          <button class="btn btn-sm btn-outline btn-sticker-phone" data-id="${p.id}" title="Print Physical Phone Sticker" style="border-color: #cbd5e1; height: 30px; padding: 0 8px;">
                            ${getIcon('printer')}
                          </button>

                          <button class="btn btn-sm btn-outline btn-edit-permit" data-id="${p.id}" title="Edit Permit" style="border-color: #cbd5e1; height: 30px; padding: 0 8px;">
                            ${getIcon('edit')}
                          </button>

                          <button class="btn btn-sm btn-outline text-danger btn-delete-permit" data-id="${p.id}" title="Delete / Revoke Permit" style="border-color: #fecaca; height: 30px; padding: 0 8px;">
                            ${getIcon('trash')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
    `;

    // --- BIND EVENT HANDLERS ---
    // Top actions
    const btnScanQr = container.querySelector('#btnDeviceScanQr');
    if (btnScanQr) {
      btnScanQr.onclick = () => {
        openDeviceScannerModal({
          onVerified: (tag) => {
            // Navigate directly to live inspection view
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

    const btnIssuePermit = container.querySelector('#btnDeviceIssuePermit') || container.querySelector('#btnEmptyIssuePermit');
    if (btnIssuePermit) {
      btnIssuePermit.onclick = () => {
        openDevicePermitModal({
          onSaved: () => render()
        });
      };
    }

    // Search and filters
    const inputSearch = container.querySelector('#inputDeviceSearch');
    if (inputSearch) {
      inputSearch.oninput = (e) => {
        searchTerm = e.target.value.trim();
        render();
      };
    }

    const selectStatus = container.querySelector('#selectDeviceStatusFilter');
    if (selectStatus) {
      selectStatus.onchange = (e) => {
        statusFilter = e.target.value;
        render();
      };
    }

    const selectCat = container.querySelector('#selectDeviceCatFilter');
    if (selectCat) {
      selectCat.onchange = (e) => {
        categoryFilter = e.target.value;
        render();
      };
    }

    // Row Actions: Checkout
    container.querySelectorAll('.btn-checkout-phone').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const issuer = prompt('Supervisor / Teacher Name issuing this phone:', 'Duty Teacher');
        if (issuer === null) return;

        const res = state.checkoutDevice(id, issuer.trim() || 'Duty Teacher');
        if (res.success) {
          toast.success('Phone checked out for today. Must be returned before 10:00 PM.');
          render();
        }
      };
    });

    // Row Actions: Submit / Return
    container.querySelectorAll('.btn-return-phone').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const receiver = prompt('Supervisor / Teacher Name receiving the phone:', 'Duty Teacher');
        if (receiver === null) return;

        const res = state.submitDevice(id, receiver.trim() || 'Duty Teacher');
        if (res.success) {
          toast.success('Phone returned and logged as submitted.');
          render();
        }
      };
    });

    // Row Actions: Inspect
    container.querySelectorAll('.btn-inspect-phone').forEach(btn => {
      btn.onclick = () => {
        const tag = btn.getAttribute('data-tag');
        navigateTo(`device-verify:${tag}`);
      };
    });

    // Row Actions: Print Sticker
    container.querySelectorAll('.btn-sticker-phone').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        openDeviceStickerModal({ permitId: id });
      };
    });

    // Row Actions: Edit
    container.querySelectorAll('.btn-edit-permit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        openDevicePermitModal({
          permitId: id,
          onSaved: () => render()
        });
      };
    });

    // Row Actions: Delete
    container.querySelectorAll('.btn-delete-permit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete / revoke this student device permit?')) {
          state.deleteDevicePermit(id);
          toast.info('Device permit removed.');
          render();
        }
      };
    });
  };

  render();
}
