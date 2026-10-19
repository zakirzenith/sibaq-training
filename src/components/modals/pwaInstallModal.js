import { pwaService } from '../../services/pwaService.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * PWA Install Modal
 * Presents a first-time or on-demand dialog to install Sibaq Mentoring as a standalone web app.
 */
export function openPwaInstallModal({ force = false } = {}) {
  // If already open, avoid duplicate
  if (document.querySelector('.pwa-install-modal-backdrop')) {
    return;
  }

  // If already running in standalone mode, no need to show
  if (pwaService.isStandalone()) {
    if (force) toast.info('Sibaq Mentoring is already running as an installed web app!');
    return;
  }

  const isIOS = pwaService.isIOS();
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop pwa-install-modal-backdrop';
  overlay.style.zIndex = '99999';

  overlay.innerHTML = `
    <div class="modal-dialog pwa-install-dialog" style="max-width: 440px; width: 92%; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35); border: 1px solid rgba(226, 232, 240, 0.8);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 20px 20px; color: #ffffff; text-align: center; position: relative;">
        <button class="modal-close-btn" id="btnClosePwaModal" aria-label="Close" style="position: absolute; top: 12px; right: 12px; color: #94a3b8; background: rgba(255,255,255,0.08); border: none; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${getIcon('x')}
        </button>

        <div style="width: 72px; height: 72px; margin: 0 auto 12px; border-radius: 18px; background: #ffffff; padding: 6px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <img src="/logo.png" alt="Sibaq Mentoring Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>

        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(129, 140, 248, 0.3); padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          ${getIcon('sparkles')} Official Web App
        </div>

        <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 6px; color: #ffffff; letter-spacing: -0.02em;">Install Sibaq Mentoring</h2>
        <p style="font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.45;">
          Install on your phone or PC for 1-tap instant launch, full-screen workspace, and faster evaluation.
        </p>
      </div>

      <div class="modal-body" style="padding: 20px 22px; background: #ffffff;">
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
              ${getIcon('zap')}
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">1-Tap Home Screen & Desktop Access</div>
              <div style="font-size: 11.5px; color: #64748b; line-height: 1.35;">Opens right from your desktop, taskbar, or phone screen.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
              ${getIcon('dashboard')}
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Full-Screen Standalone Window</div>
              <div style="font-size: 11.5px; color: #64748b; line-height: 1.35;">Clean, distraction-free view with no browser URL bar or tabs.</div>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fef3c7; color: #b45309; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
              ${getIcon('checkCircle')}
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Fast & Offline Ready</div>
              <div style="font-size: 11.5px; color: #64748b; line-height: 1.35;">High-speed cached rosters and smooth performance everywhere.</div>
            </div>
          </div>
        </div>

        ${isIOS ? `
          <div style="background: #eff6ff; border: 1.5px dashed #93c5fd; border-radius: 14px; padding: 14px; margin-bottom: 18px; text-align: left;">
            <div style="font-size: 12.5px; font-weight: 800; color: #1e40af; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>📱</span> To install on iPhone / iPad:
            </div>
            <ol style="margin: 0; padding-left: 20px; font-size: 12px; color: #1e3a8a; line-height: 1.6;">
              <li>Tap the <strong>Share</strong> button <span style="font-size: 14px;">⎋</span> at the bottom of Safari.</li>
              <li>Scroll down and select <strong>"Add to Home Screen"</strong> ➕.</li>
              <li>Tap <strong>"Add"</strong> in the top right corner.</li>
            </ol>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${!isIOS ? `
            <button type="button" id="btnConfirmInstallPwa" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 14px; font-weight: 700; border-radius: 12px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; border: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${getIcon('download')} Install Sibaq Mentoring
            </button>
          ` : `
            <button type="button" id="btnConfirmInstallPwa" class="btn btn-primary" style="width: 100%; height: 44px; font-size: 14px; font-weight: 700; border-radius: 12px; background: #4f46e5; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${getIcon('check')} Got It, Thanks!
            </button>
          `}

          <button type="button" id="btnDismissInstallPwa" class="btn btn-outline" style="width: 100%; height: 38px; font-size: 12.5px; font-weight: 600; border-radius: 10px; border: 1px solid #cbd5e1; color: #64748b; background: transparent; cursor: pointer;">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector('#btnClosePwaModal')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#btnDismissInstallPwa')?.addEventListener('click', () => {
    pwaService.dismissPrompt(7);
    close();
  });

  overlay.querySelector('#btnConfirmInstallPwa')?.addEventListener('click', async () => {
    if (isIOS) {
      pwaService.dismissPrompt(7);
      close();
      return;
    }

    const res = await pwaService.promptInstall();
    if (res.success && res.outcome === 'accepted') {
      toast.success('Sibaq Mentoring installed as app! Launch it from your desktop or home screen.');
      close();
    } else if (res.outcome === 'dismissed') {
      pwaService.dismissPrompt(3);
      close();
    } else {
      toast.info('Click the Install icon in your browser address bar to complete installation.');
      close();
    }
  });
}

// Make accessible globally
window.__openPwaInstallModal = openPwaInstallModal;
