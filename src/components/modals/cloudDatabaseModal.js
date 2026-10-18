import { firebaseService } from '../../services/firebase.js';
import { state } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { toast } from '../toast.js';

/**
 * Cloud Database (Firebase Firestore) Setup Modal
 * Allows coordinator to connect real cloud database, paste credentials,
 * test connection, and sync real data across all devices in real-time.
 */
export function openCloudDatabaseModal({ onUpdate = () => {} } = {}) {
  const existingModal = document.querySelector('.cloud-db-modal-backdrop');
  if (existingModal) existingModal.remove();

  const currentStatus = firebaseService.getStatus();
  const currentConfig = firebaseService.getStoredConfig();

  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop cloud-db-modal-backdrop';

  overlay.innerHTML = `
    <div class="modal-dialog modal-md saas-cloud-modal">
      <div class="modal-header">
        <div class="header-title-group">
          <div class="modal-badge">
            ${getIcon('database')} Cloud Database & Sync
          </div>
          <h3 class="modal-title">Firebase Firestore Setup</h3>
          <p class="text-xs text-muted">
            Connect a real cloud database to enable real-time sync across multiple trainers and devices.
          </p>
        </div>
        <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
      </div>

      <div class="modal-body">
        <!-- Live Connection Status Strip -->
        <div class="cloud-status-card ${currentStatus.status === 'connected' ? 'status-connected' : 'status-disconnected'}">
          <div class="csc-left">
            <span class="csc-indicator-dot"></span>
            <div>
              <strong class="csc-status-label">
                ${currentStatus.status === 'connected' ? 'Cloud Firestore Connected & Synced' : 'Offline / Local Database Mode'}
              </strong>
              <div class="csc-meta text-xs text-muted">
                ${currentStatus.status === 'connected' 
                  ? `Active Project: <code class="font-mono">${currentStatus.projectId}</code>`
                  : 'Currently saving changes locally in browser. Connect Firebase to sync across devices.'}
              </div>
            </div>
          </div>
          ${currentStatus.status === 'connected' ? `
            <button id="btnDisconnectCloud" class="btn btn-xs btn-outline-danger">Disconnect</button>
          ` : ''}
        </div>

        <!-- Configuration Form -->
        <div class="cloud-config-section mt-3">
          <label class="form-label font-semibold text-xs" for="firebaseConfigInput">
            Paste Firebase Configuration (JavaScript snippet or JSON)
          </label>
          <textarea 
            id="firebaseConfigInput" 
            class="form-textarea font-mono text-xs" 
            rows="6" 
            placeholder='const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "my-app.firebaseapp.com",\n  projectId: "my-app",\n  storageBucket: "my-app.appspot.com",\n  messagingSenderId: "123456789",\n  appId: "1:123..."\n};'
          >${currentConfig ? JSON.stringify(currentConfig, null, 2) : ''}</textarea>
          
          <div class="text-xs text-muted mt-1" style="display: flex; justify-content: space-between;">
            <span>Get your config from: <strong>Firebase Console &rarr; Project Settings &rarr; Your apps &rarr; Web app</strong></span>
            <button type="button" id="btnFillDemoDemo" class="saas-text-link">Load Sample Config</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="cloud-modal-actions mt-3" style="display: flex; gap: 8px;">
          <button id="btnConnectFirebase" class="btn btn-primary btn-sm" style="flex: 1;">
            ${getIcon('zap')} Connect & Activate Real-time Sync
          </button>
        </div>

        <!-- Data Sync & Clean Slate Tools -->
        <div class="cloud-tools-section mt-4 pt-3" style="border-top: 1px solid #e2e8f0;">
          <span class="text-xs font-bold text-muted uppercase">Real Data Tools</span>
          
          <div class="cloud-tools-grid mt-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="btnUploadLocalToCloud" class="btn btn-secondary btn-sm" ${currentStatus.status !== 'connected' ? 'disabled' : ''}>
              ${getIcon('trendingUp')} Push Local to Cloud
            </button>
            <button id="btnPullCloudToLocal" class="btn btn-secondary btn-sm" ${currentStatus.status !== 'connected' ? 'disabled' : ''}>
              ${getIcon('history')} Pull Cloud to Local
            </button>
          </div>

          <div class="mt-3 p-3" style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <strong class="text-xs text-main">Clean Slate (Wipe All Data)</strong>
              <div class="text-xs text-muted">Clear all candidates, programs, and records to upload real data.</div>
            </div>
            <button id="btnWipeCleanSlate" class="btn btn-danger btn-xs">
              ${getIcon('trash')} Wipe All
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="btnCloseCloudModal" class="btn btn-secondary btn-sm">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 180);
  };

  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#btnCloseCloudModal').addEventListener('click', close);

  // Helper to parse Firebase config from text
  const parseConfigString = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return null;

    // Try direct JSON parse
    try {
      const obj = JSON.parse(trimmed);
      if (obj.apiKey && obj.projectId) return obj;
    } catch (e) {}

    // Extract object from JavaScript snippet like: const firebaseConfig = { ... };
    try {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        // Convert JS object properties to JSON format
        const jsonLike = match[0]
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}');
        const parsed = JSON.parse(jsonLike);
        if (parsed.apiKey && parsed.projectId) return parsed;
      }
    } catch (e) {}

    // Regex extract key values manually
    const getVal = (key) => {
      const m = trimmed.match(new RegExp(`${key}["'\\s]*:?["'\\s]*([^"',\\s\\n\\r]+)`));
      return m ? m[1].replace(/['"]/g, '') : '';
    };

    const apiKey = getVal('apiKey');
    const projectId = getVal('projectId');
    const authDomain = getVal('authDomain') || `${projectId}.firebaseapp.com`;
    const storageBucket = getVal('storageBucket') || `${projectId}.appspot.com`;
    const messagingSenderId = getVal('messagingSenderId') || '';
    const appId = getVal('appId') || '';

    if (apiKey && projectId) {
      return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
    }

    return null;
  };

  // Connect Firebase
  overlay.querySelector('#btnConnectFirebase').addEventListener('click', async () => {
    const inputVal = overlay.querySelector('#firebaseConfigInput').value;
    const config = parseConfigString(inputVal);

    if (!config) {
      toast.error('Invalid configuration. Please paste a valid Firebase config containing apiKey and projectId.');
      return;
    }

    toast.info('Connecting to Firebase Firestore...');
    const result = await firebaseService.connect(config);

    if (result.success) {
      toast.success(`Connected to Firebase project: ${config.projectId}!`);
      state.initCloudSync();
      onUpdate();
      close();
    } else {
      toast.error(`Connection failed: ${result.error}`);
    }
  });

  // Disconnect Firebase
  const btnDisconnect = overlay.querySelector('#btnDisconnectCloud');
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      if (confirm('Disconnect from Firebase Firestore and return to local mode?')) {
        firebaseService.disconnect();
        toast.info('Disconnected from Cloud Firestore.');
        onUpdate();
        close();
      }
    });
  }

  // Sample Config button
  overlay.querySelector('#btnFillDemoDemo').addEventListener('click', () => {
    overlay.querySelector('#firebaseConfigInput').value = JSON.stringify({
      apiKey: "AIzaSyDemoKeyExampleForController123",
      authDomain: "mentorflow-live.firebaseapp.com",
      projectId: "mentorflow-live",
      storageBucket: "mentorflow-live.appspot.com",
      messagingSenderId: "1092837465",
      appId: "1:1092837465:web:abcd1234efgh"
    }, null, 2);
  });

  // Push Local to Cloud
  const btnUpload = overlay.querySelector('#btnUploadLocalToCloud');
  if (btnUpload) {
    btnUpload.addEventListener('click', async () => {
      toast.info('Uploading all local data to Cloud Firestore...');
      try {
        await state.syncAllLocalToCloud();
        toast.success('Successfully uploaded all candidates, programs, trainers, and meets to Cloud Firestore!');
      } catch (err) {
        toast.error(`Upload error: ${err.message}`);
      }
    });
  }

  // Pull Cloud to Local
  const btnPull = overlay.querySelector('#btnPullCloudToLocal');
  if (btnPull) {
    btnPull.addEventListener('click', async () => {
      toast.info('Pulling documents from Cloud Firestore...');
      try {
        await state.fetchFromCloud();
        toast.success('Cloud data pulled successfully into view!');
        onUpdate();
      } catch (err) {
        toast.error(`Pull error: ${err.message}`);
      }
    });
  }

  // Wipe Clean Slate
  overlay.querySelector('#btnWipeCleanSlate').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL data? This will clear all records so you can upload real candidates, programs, and trainers.')) {
      state.clearAll();
      toast.success('Database has been completely cleared. Ready for real data uploads!');
      onUpdate();
      close();
    }
  });
}
