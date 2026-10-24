import { state } from '../services/state.js';
import { getIcon } from './icons.js';
import { toast } from './toast.js';
import { openDevicePermitModal } from './modals/devicePermitModal.js';
import { openDeviceStickerModal } from './modals/deviceStickerModal.js';
import { openDeviceScannerModal } from './modals/deviceScannerModal.js';

/**
 * Dedicated Controller & Mentor View: Student Device & Phone Management Desk
 * Manages approved phones, daily checkout/return (9am - 10pm), QR pass generation, and progress tracking.
 * Features an ultra-compact top report strip (keeping main content front-and-center)
 * and responsive mobile touch cards for small screen devices.
 */
export function renderDeviceManagementView(container, navigateTo) {
  let searchTerm = '';
  let categoryFilter = 'ALL';
  let statusFilter = 'ALL';

  // 1. Render Static Shell (Top Header, Compact Radar Bar, Search/Filter, Dynamic List Container)
  container.innerHTML = `
    <div class="view-header" style="flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
      <div>
        <div class="view-tag" style="font-size: 11px; padding: 2px 7px;">${getIcon('smartphone')} Hardware &amp; Asset Security</div>
        <h1 class="view-title" style="margin: 2px 0 0 0; font-size: 22px;">Student Device Desk</h1>
        <p class="view-desc" style="font-size: 12px; margin-top: 2px; color: #64748b;">
          Regulated competition smartphones (09:00 AM – 10:00 PM). QR verification &amp; performance radar.
        </p>
      </div>

      <div class="view-actions" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
        <button id="btnDeviceScanQr" class="btn btn-secondary btn-sm" title="Scan phone QR with camera" style="height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
          ${getIcon('qrCode')} <span>Scan QR</span>
        </button>
        <button id="btnDeviceBatchStickers" class="btn btn-outline btn-sm" title="Print all phone stickers" style="border-color: #cbd5e1; background: #ffffff; height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
          ${getIcon('printer')} <span>Batch Stickers</span>
        </button>
        <button id="btnDeviceIssuePermit" class="btn btn-primary btn-sm" title="Issue new phone pass" style="height: 34px; font-size: 12px; font-weight: 700; gap: 5px;">
          ${getIcon('plus')} <span>Issue Phone Permit</span>
        </button>
      </div>
    </div>

    <!-- COMPACT RADAR REPORT STRIP (Low profile to keep main concern front-and-center) -->
    <div id="deviceMetricsContainer" class="compact-device-stats-bar">
      <!-- Injected dynamically -->
    </div>

    <!-- SEARCH & FILTER BAR -->
    <div class="saas-filter-bar" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; margin: 10px 0 16px 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
      <div style="display: flex; gap: 8px; flex: 1; min-width: 220px;">
        <div class="search-input-wrapper" style="position: relative; flex: 1; width: 100%;">
          <span class="search-icon" style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex;">
            ${getIcon('search')}
          </span>
          <input type="text" id="inputDeviceSearch" class="form-input" placeholder="Search by student name, chest #, or DEV tag..." 
                 value="${searchTerm}" style="padding-left: 34px; height: 36px; width: 100%; font-size: 12.5px;" />
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <!-- Status Filter -->
        <select id="selectDeviceStatusFilter" class="form-select" style="height: 36px; min-width: 150px; font-size: 12.5px;">
          <option value="ALL">All Statuses</option>
          <option value="CHECKED_OUT">Checked Out (In Hand)</option>
          <option value="SUBMITTED">Submitted to Locker</option>
          <option value="OVERDUE">🚨 Overdue (&gt; 10 PM)</option>
          <option value="REVOKED">Revoked</option>
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

  // 2. Metrics Updater (Compact, Slim Radar Bar)
  const updateMetrics = () => {
    const metricsContainer = container.querySelector('#deviceMetricsContainer');
    if (!metricsContainer) return;
    const metrics = state.getDeviceMetrics();

    metricsContainer.innerHTML = `
      <div class="mini-stat-capsule" title="Total permitted phones in registry">
        <span class="msc-icon">📱</span>
        <div class="msc-info">
          <span class="msc-label">Permits</span>
          <strong class="msc-val">${metrics.totalPermits}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule ${metrics.checkedOutCount > 0 ? 'active' : ''}" title="Currently in student hand for competition practice">
        <span class="msc-icon">🟢</span>
        <div class="msc-info">
          <span class="msc-label">In Hand</span>
          <strong class="msc-val" style="color: #059669;">${metrics.checkedOutCount}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule" title="Safely returned to supervisor locker">
        <span class="msc-icon">🔒</span>
        <div class="msc-info">
          <span class="msc-label">In Locker</span>
          <strong class="msc-val" style="color: #6366f1;">${metrics.submittedCount}</strong>
        </div>
      </div>

      <div class="mini-stat-capsule ${metrics.overdueCount > 0 ? 'danger' : ''}" title="Past 10:00 PM cutoff time without return">
        <span class="msc-icon">${metrics.overdueCount > 0 ? '🚨' : '🛡️'}</span>
        <div class="msc-info">
          <span class="msc-label">Overdue</span>
          <strong class="msc-val" style="${metrics.overdueCount > 0 ? 'color: #dc2626;' : 'color: #64748b;'}">${metrics.overdueCount}</strong>
        </div>
      </div>
    `;
  };

  // 3. Dynamic Device List Updater (Desktop Table + Mobile Cards)
  const updateList = () => {
    const listContainer = container.querySelector('#devicesListContainer');
    if (!listContainer) return;

    const permits = state.getDevicePermits();
    const now = new Date();

    // Filter permits
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
        if (statusFilter === 'REVOKED' && status.code !== 'REVOKED') return false;
      }

      return true;
    });

    if (filteredPermits.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card" style="padding: 42px 20px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px;">
          <div style="font-size: 38px; margin-bottom: 8px;">📱</div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">No Device Permits Found</h3>
          <p class="text-muted" style="max-width: 420px; margin: 0 auto 16px auto; font-size: 12.5px;">
            ${permits.length === 0 
              ? 'No candidates have been issued a smartphone permit yet. Click "Issue Phone Permit" to authorize students who extremely need a phone for competition practice.'
              : 'No devices match your current search and filter criteria.'}
          </p>
          <button class="btn btn-primary" id="btnEmptyIssuePermit" style="gap: 6px; font-weight: 700;">
            ${getIcon('plus')} Issue First Permit
          </button>
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

                  const dossierData = state.getCandidateMenteeDashboardData(cand.id);
                  const meetsToday = dossierData?.todayStatus?.meets?.length || 0;
                  const progCount = dossierData?.dossier?.programs?.length || 0;

                  return `
                    <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                      <!-- Device Tag -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
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

                      <!-- Live Status -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
                        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor};">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${status.color};"></span>
                          <span>${status.badge}</span>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                          ${status.remainingMinutes !== null ? `⏳ ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m remaining` : ''}
                          ${status.overdueMinutes !== null ? `🚨 OVERDUE by ${status.overdueMinutes}m` : ''}
                          ${status.code === 'SUBMITTED' ? `Safe in locker` : ''}
                          ${status.code === 'NOT_CHECKED_OUT' ? `Desk checkout pending` : ''}
                        </div>
                      </td>

                      <!-- Practice Progress Indicator -->
                      <td style="padding: 12px 16px; vertical-align: middle;">
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
                      <td style="padding: 12px 16px; vertical-align: middle; text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          ${isCheckedOut ? `
                            <button type="button" class="btn btn-sm btn-outline btn-return-phone" data-id="${p.id}" title="Submit Phone to Locker" style="border-color: #a7f3d0; background: #ecfdf5; color: #047857; font-weight: 700; height: 32px; padding: 0 10px;">
                              ${getIcon('check')} Submit
                            </button>
                          ` : `
                            <button type="button" class="btn btn-sm btn-outline btn-checkout-phone" data-id="${p.id}" title="Issue Phone for Today" style="border-color: #cbd5e1; font-weight: 700; height: 32px; padding: 0 10px;">
                              ${getIcon('plus')} Issue
                            </button>
                          `}

                          <button type="button" class="btn btn-sm btn-outline btn-inspect-phone" data-tag="${p.deviceTag}" title="Live QR & Progress Inspection" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                            ${getIcon('eye')}
                          </button>

                          <button type="button" class="btn btn-sm btn-outline btn-sticker-phone" data-id="${p.id}" title="Print Physical Phone Sticker" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                            ${getIcon('printer')}
                          </button>

                          <button type="button" class="btn btn-sm btn-outline btn-edit-permit" data-id="${p.id}" title="Edit Permit" style="border-color: #cbd5e1; height: 32px; padding: 0 8px;">
                            ${getIcon('edit')}
                          </button>

                          <button type="button" class="btn btn-sm btn-outline text-danger btn-delete-permit" data-id="${p.id}" title="Delete / Revoke Permit" style="border-color: #fecaca; height: 32px; padding: 0 8px;">
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
                  <span>📱</span>
                  <span>${p.deviceTag}</span>
                </span>
                <div style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.borderColor};">
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
                    <span>• ${p.deviceModel || 'Phone'}</span>
                  </div>
                </div>
              </div>

              <!-- Permitted Time & Remaining Countdown Bar -->
              <div class="mdc-rule-strip">
                <div>
                  <span style="color: #64748b;">Hours:</span>
                  <strong>09:00 AM – 10:00 PM</strong>
                </div>
                <div style="font-weight: 800; color: ${status.code === 'ILLEGAL_OVERDUE' ? '#dc2626' : (isCheckedOut ? '#059669' : '#64748b')};">
                  ${status.remainingMinutes !== null ? `⏳ ${Math.floor(status.remainingMinutes / 60)}h ${status.remainingMinutes % 60}m left` : ''}
                  ${status.overdueMinutes !== null ? `🚨 OVERDUE by ${status.overdueMinutes}m` : ''}
                  ${status.code === 'SUBMITTED' ? `✅ In Locker` : ''}
                  ${status.code === 'NOT_CHECKED_OUT' ? `⚠️ Not Checked Out` : ''}
                </div>
              </div>

              <!-- Practice Progress Activity Strip -->
              <div class="mdc-practice-strip">
                <div>
                  <span style="color: #64748b;">Practice Today:</span>
                  <strong style="color: ${meetsToday > 0 ? '#059669' : '#d97706'};">
                    ${meetsToday > 0 ? `🟢 ${meetsToday} Meets Done` : `🟡 0 Meets Logged`}
                  </strong>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                  ${progCount} program(s) enrolled
                </div>
              </div>

              <!-- Actions Area (Touch Buttons) -->
              <div class="mdc-actions-grid">
                <!-- Large Primary Button -->
                ${isCheckedOut ? `
                  <button type="button" class="btn btn-outline btn-return-phone mdc-primary-btn" data-id="${p.id}" style="background: #ecfdf5; border-color: #059669; color: #047857;">
                    ${getIcon('check')} Submit &amp; Return Phone to Locker
                  </button>
                ` : `
                  <button type="button" class="btn btn-primary btn-checkout-phone mdc-primary-btn" data-id="${p.id}">
                    ${getIcon('plus')} Issue / Check Out Phone for Today
                  </button>
                `}

                <!-- Secondary Action Buttons Strip -->
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
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    listContainer.innerHTML = desktopTableHtml + mobileCardsHtml;
  };

  // 4. Robust Event Delegation on listContainer (100% Reliable Click Handling, Zero prompt() Blocking)
  const listContainer = container.querySelector('#devicesListContainer');
  if (listContainer) {
    listContainer.onclick = (e) => {
      // A. Checkout / Issue Phone
      const btnCheckout = e.target.closest('.btn-checkout-phone');
      if (btnCheckout) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnCheckout.getAttribute('data-id');
        const permit = state.getDevicePermitById(id);
        const cand = permit ? state.getCandidateById(permit.candidateId) : null;
        const candName = cand ? cand.name : (permit ? permit.deviceTag : 'Student');

        const res = state.checkoutDevice(id, 'Duty Teacher');
        if (res.success) {
          toast.success(`📱 Phone issued to ${candName} for today. Return before 10:00 PM.`);
          updateMetrics();
          updateList();
        }
        return;
      }

      // B. Submit / Return Phone
      const btnReturn = e.target.closest('.btn-return-phone');
      if (btnReturn) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnReturn.getAttribute('data-id');
        const permit = state.getDevicePermitById(id);
        const cand = permit ? state.getCandidateById(permit.candidateId) : null;
        const candName = cand ? cand.name : (permit ? permit.deviceTag : 'Student');

        const res = state.submitDevice(id, 'Duty Teacher');
        if (res.success) {
          toast.success(`✅ Phone returned by ${candName} and safely locked in locker.`);
          updateMetrics();
          updateList();
        }
        return;
      }

      // C. Inspect QR & Progress
      const btnInspect = e.target.closest('.btn-inspect-phone');
      if (btnInspect) {
        e.preventDefault();
        e.stopPropagation();
        const tag = btnInspect.getAttribute('data-tag');
        navigateTo(`device-verify:${tag}`);
        return;
      }

      // D. Print Phone Sticker
      const btnSticker = e.target.closest('.btn-sticker-phone');
      if (btnSticker) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnSticker.getAttribute('data-id');
        openDeviceStickerModal({ permitId: id });
        return;
      }

      // E. Edit Permit
      const btnEdit = e.target.closest('.btn-edit-permit');
      if (btnEdit) {
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

      // F. Delete Permit
      const btnDelete = e.target.closest('.btn-delete-permit');
      if (btnDelete) {
        e.preventDefault();
        e.stopPropagation();
        const id = btnDelete.getAttribute('data-id');
        if (confirm('Are you sure you want to delete / revoke this student device permit?')) {
          state.deleteDevicePermit(id);
          toast.info('Device permit removed.');
          updateMetrics();
          updateList();
        }
        return;
      }
    };
  }

  // 5. Wire Static Search & Filter Handlers Once
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

  // 6. Wire Top Global Actions
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
