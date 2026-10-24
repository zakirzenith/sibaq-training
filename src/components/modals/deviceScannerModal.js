import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * In-App QR Scanner Modal
 * Uses HTML5 Camera API or manual Device Tag entry to immediately verify a phone.
 * Styled with standard input classes and responsive dialog for phone view.
 */
export function openDeviceScannerModal({ onVerified = null } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop device-scanner-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md device-scanner-dialog" style="max-width: 440px; width: 92%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
      <div class="modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
        <div>
          <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800;">
            <span>${getIcon('qrCode')}</span>
            <span>QR Scanner &amp; Quick Lookup</span>
          </div>
          <h2 class="modal-title" style="margin-top: 4px; font-size: 18px; font-weight: 800; color: #0f172a;">Inspect Student Phone</h2>
          <p class="modal-subtitle" style="margin-top: 2px; font-size: 12px; color: #64748b;">
            Scan the QR code sticker on the back of the phone.
          </p>
        </div>
        <button class="modal-close-btn" id="btnCloseScannerModal" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body" style="padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; align-items: center; background: #f8fafc;">
        <!-- Camera Viewfinder -->
        <div class="scanner-viewfinder-box" style="width: 100%; height: 230px; background: #0f172a; border-radius: 12px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">
          <video id="scannerVideo" style="width: 100%; height: 100%; object-fit: cover; display: none;" playsinline></video>
          
          <div id="scannerPlaceholder" style="text-align: center; color: #94a3b8; padding: 20px;">
            <div style="font-size: 38px; margin-bottom: 8px;">📷</div>
            <div style="font-size: 13.5px; font-weight: 700; color: #f1f5f9;">Live Camera Viewfinder</div>
            <div style="font-size: 11.5px; color: #94a3b8; margin-top: 4px;">Point camera directly at the phone's QR sticker</div>
            <button class="btn btn-sm btn-primary" id="btnStartCamera" style="margin-top: 12px; font-size: 12px; padding: 6px 14px; font-weight: 700;">
              Start Camera
            </button>
          </div>

          <!-- Aim target reticle -->
          <div class="scanner-aim-frame" id="scannerAimFrame" style="display: none; position: absolute; width: 160px; height: 160px; border: 2px solid #38bdf8; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none;">
            <div class="scanner-laser-line"></div>
          </div>
        </div>

        <!-- Manual Tag Input Divider -->
        <div style="display: flex; align-items: center; width: 100%; margin: 16px 0 12px 0;">
          <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
          <span style="padding: 0 10px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Or Lookup by Device Tag</span>
          <div style="flex: 1; height: 1px; background: #e2e8f0;"></div>
        </div>

        <!-- Manual Tag Input Form -->
        <form id="formManualLookup" style="width: 100%; display: flex; gap: 8px;">
          <input type="text" id="manualDeviceTag" class="form-input" placeholder="e.g. DEV-01" required 
                 style="text-transform: uppercase; font-weight: 800; font-family: monospace; letter-spacing: 0.5px; height: 40px; flex: 1;" />
          <button type="submit" class="btn btn-primary" style="white-space: nowrap; gap: 5px; height: 40px; font-weight: 700;">
            ${getIcon('search')} <span>Inspect</span>
          </button>
        </form>
      </div>

      <div class="modal-footer" style="flex-shrink: 0; padding: 12px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #ffffff;">
        <button type="button" class="btn btn-secondary" id="btnCancelScannerModal" style="height: 36px;">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let mediaStream = null;

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  };

  const close = () => {
    stopCamera();
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#btnCloseScannerModal').onclick = close;
  overlay.querySelector('#btnCancelScannerModal').onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  // Start Camera handler
  const btnStartCamera = overlay.querySelector('#btnStartCamera');
  const video = overlay.querySelector('#scannerVideo');
  const placeholder = overlay.querySelector('#scannerPlaceholder');
  const aimFrame = overlay.querySelector('#scannerAimFrame');

  if (btnStartCamera) {
    btnStartCamera.onclick = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error('Camera access is not supported on this device/browser.');
          return;
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        video.srcObject = mediaStream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        aimFrame.style.display = 'block';
        video.play();

        // Modern BarcodeDetector API if supported by browser
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const detectInterval = setInterval(async () => {
            if (!mediaStream) {
              clearInterval(detectInterval);
              return;
            }
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                clearInterval(detectInterval);
                close();
                handleLookupValue(rawVal);
              }
            } catch (err) {
              // Frame dropped or not decoded
            }
          }, 350);
        }
      } catch (err) {
        console.warn('Camera permission denied or failed:', err);
        toast.info('Camera unavailable. You can type the Device Tag (e.g. DEV-01) below.');
      }
    };
  }

  const handleLookupValue = (val) => {
    let tag = val.trim();
    try {
      if (tag.includes('tag=') || tag.includes('device=')) {
        const url = new URL(tag);
        tag = url.searchParams.get('tag') || url.searchParams.get('device') || tag;
      }
    } catch (e) {}

    if (onVerified) {
      onVerified(tag);
    } else {
      window.location.search = `?verify=device&tag=${encodeURIComponent(tag)}`;
    }
  };

  const manualForm = overlay.querySelector('#formManualLookup');
  manualForm.onsubmit = (e) => {
    e.preventDefault();
    const tag = overlay.querySelector('#manualDeviceTag').value.trim();
    if (!tag) return;
    close();
    handleLookupValue(tag);
  };
}
