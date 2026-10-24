import QRCode from 'qrcode';
import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Physical Phone Sticker & QR Pass Generator Modal
 * Renders print-ready, pocket/phone-sized stickers for transparent phone cases or adhesion.
 * Sized and formatted responsively for both desktop print previews and mobile phones.
 */
export async function openDeviceStickerModal({ permitId = null, batchAll = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-sticker-modal-backdrop';

  let permitsToPrint = [];
  if (batchAll) {
    permitsToPrint = state.getDevicePermits().filter(p => p.status === 'active');
    if (permitsToPrint.length === 0) {
      toast.info('No active device permits found to print.');
      return;
    }
  } else {
    const permit = state.getDevicePermitById(permitId);
    if (!permit) {
      toast.error('Device permit not found.');
      return;
    }
    permitsToPrint = [permit];
  }

  // Pre-generate QR data URLs for all permits
  const qrMap = new Map();
  for (const p of permitsToPrint) {
    try {
      const origin = window.location.origin;
      const verifyUrl = `${origin}/?verify=device&tag=${encodeURIComponent(p.deviceTag)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      qrMap.set(p.id, qrDataUrl);
    } catch (err) {
      console.error('Failed to generate QR for permit:', p.id, err);
    }
  }

  const renderStickerHtml = (permit) => {
    const cand = state.getCandidateById(permit.candidateId) || {
      name: 'Registered Candidate',
      category: 'GENERAL',
      chestNo: 'N/A'
    };
    const qrUrl = qrMap.get(permit.id) || '';
    const candInitials = (cand.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return `
      <div class="phone-qr-sticker" id="sticker-${permit.id}">
        <!-- Sticker Top Header -->
        <div class="pqs-header">
          <div class="pqs-brand">
            <span class="pqs-logo-dot"></span>
            <span class="pqs-title">SIBAQ 2026 PRACTICE PASS</span>
          </div>
          <span class="pqs-tag-capsule">${permit.deviceTag}</span>
        </div>

        <!-- Main Body: QR Code + Candidate Details -->
        <div class="pqs-body">
          <div class="pqs-qr-wrap">
            <img src="${qrUrl}" alt="Device QR ${permit.deviceTag}" class="pqs-qr-img" />
            <span class="pqs-scan-hint">Scan to Verify</span>
          </div>

          <div class="pqs-candidate-info">
            <div class="pqs-avatar-row">
              <div class="pqs-avatar">
                ${cand.photo 
                  ? `<img src="${cand.photo}" alt="${cand.name}" />`
                  : candInitials}
              </div>
              <div class="pqs-names">
                <h4 class="pqs-cand-name">${cand.name}</h4>
                <div class="pqs-cand-meta">
                  <span class="pqs-cat-badge">${cand.category}</span>
                  <span class="pqs-ad-text">CHEST: ${cand.chestNo || cand.adNo || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div class="pqs-device-meta">
              <div class="pqs-meta-line">
                <span class="pqs-meta-k">Phone Model:</span>
                <span class="pqs-meta-v">${permit.deviceModel || 'Smartphone'}</span>
              </div>
              <div class="pqs-meta-line">
                <span class="pqs-meta-k">Practice Focus:</span>
                <span class="pqs-meta-v" title="${permit.reason}">${permit.reason || 'Competition Prep'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Time Window & Institutional Rule Ribbon -->
        <div class="pqs-rule-ribbon">
          <div class="pqs-rule-time">
            <span class="pqs-clock-icon">⏰</span>
            <span>PERMITTED: <strong>09:00 AM — 10:00 PM</strong></span>
          </div>
          <div class="pqs-rule-sub">Mandatory Nightly Submission Before 10:00 PM</div>
        </div>

        <!-- Watermark Footer -->
        <div class="pqs-footer">
          <span>Official DH Bengal Permit #${permit.id.slice(-6).toUpperCase()}</span>
          <span>Verified Device</span>
        </div>
      </div>
    `;
  };

  overlay.innerHTML = `
    <div class="modal-dialog modal-lg device-sticker-dialog" style="max-width: ${batchAll ? '850px' : '520px'}; width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
      <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
            <span>${getIcon('printer')}</span>
            <span>Phone Sticker &amp; QR Pass Generator</span>
          </div>
          <h2 class="modal-title" style="margin-top: 4px; font-size: 18px; font-weight: 800; color: #0f172a;">
            ${batchAll ? `Print ${permitsToPrint.length} Device Stickers (Batch)` : `Print Sticker: ${permitsToPrint[0].deviceTag}`}
          </h2>
          <p class="modal-subtitle" style="margin-top: 2px; font-size: 12px; color: #64748b;">
            Sized for phone backs (~55mm × 85mm). Place under transparent case or adhere directly.
          </p>
        </div>
        <button class="modal-close-btn" id="btnCloseStickerModal" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body" style="padding: 16px 20px; flex: 1; overflow-y: auto; background: #f8fafc;">
        <!-- Sticker Print Sheet Container -->
        <div class="pqs-print-sheet ${batchAll ? 'pqs-grid-sheet' : ''}" id="printableStickerArea">
          ${permitsToPrint.map(renderStickerHtml).join('')}
        </div>
      </div>

      <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: #ffffff; flex-wrap: wrap; gap: 8px;">
        <div class="pqs-print-instructions text-muted" style="font-size: 11.5px;">
          💡 <strong>Tip:</strong> In print dialog, set Margin to <em>None</em> or <em>Minimum</em> and enable <em>Background graphics</em>.
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary" id="btnCancelStickerModal" style="height: 36px;">Close</button>
          <button type="button" class="btn btn-primary" id="btnExecuteStickerPrint" style="gap: 6px; height: 36px; font-weight: 700;">
            ${getIcon('printer')} <span>Print ${batchAll ? `All (${permitsToPrint.length})` : 'Sticker'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnCloseStickerModal').onclick = close;
  overlay.querySelector('#btnCancelStickerModal').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  overlay.querySelector('#btnExecuteStickerPrint').onclick = () => {
    window.print();
  };
}
