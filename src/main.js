import { state } from './services/state.js';
import { firebaseService } from './services/firebase.js';
import { toast } from './components/toast.js';
import { getIcon } from './components/icons.js';
import { renderDashboardView } from './components/dashboardView.js';
import { renderCandidatesView } from './components/candidatesView.js';
import { renderProgramsView } from './components/programsView.js';
import { renderTrainersView } from './components/trainersView.js';
import { renderMatrixView } from './components/matrixView.js';
import { renderDailyProgressView } from './components/dailyProgressView.js';
import { openExcelUploadModal } from './components/modals/excelUploadModal.js';
import { openCloudDatabaseModal } from './components/modals/cloudDatabaseModal.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.mainContent = document.getElementById('mainContent');
    this.initTheme();
    this.initNavigation();
    this.initDataActions();
    this.initCloudDatabaseSync();
    this.initSidebarShortcuts();
    this.updateBadges();

    // Subscribe to state changes to keep badges and views in sync across all devices
    state.subscribe(() => {
      this.updateBadges();
      
      // Auto-refresh views when changes arrive from Cloud Firestore
      const activeModal = document.querySelector('.modal-backdrop');
      const isTyping = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (!activeModal && !isTyping && this.currentView !== 'programs') {
        this.render();
      }
    });

    // Render initial view
    this.render();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('mentorflow_theme') || 'light';
    if (savedTheme !== 'dark') {
      document.body.classList.add('light-theme');
      localStorage.setItem('mentorflow_theme', 'light');
    }

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeIcon = document.getElementById('themeIcon');

    const updateIcon = () => {
      const isLight = document.body.classList.contains('light-theme');
      themeIcon.innerHTML = isLight ? getIcon('moon') : getIcon('sun');
    };

    updateIcon();

    btnThemeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('mentorflow_theme', isLight ? 'light' : 'dark');
      updateIcon();
      toast.info(`Switched to ${isLight ? 'Light' : 'Dark'} theme`);
    });
  }

  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.getAttribute('data-view');
        this.navigateTo(targetView);
      });
    });
  }

  navigateTo(viewName) {
    this.currentView = viewName;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-view') === viewName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update Topbar Breadcrumb View Name
    const viewTitleMap = {
      'dashboard': 'Dashboard',
      'candidates': 'Candidates & Mentees',
      'programs': 'Programs & Assignments',
      'trainers': 'Trainers & Mentors',
      'daily-progress': 'Daily Progress & Scoring'
    };
    const breadcrumbEl = document.getElementById('topbarCurrentViewName');
    if (breadcrumbEl && viewTitleMap[viewName]) {
      breadcrumbEl.textContent = viewTitleMap[viewName];
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.render();
  }

  updateBadges() {
    const candBadge = document.getElementById('sidebarCandBadge');
    const progBadge = document.getElementById('sidebarProgBadge');
    const trnBadge = document.getElementById('sidebarTrnBadge');
    const meetBadge = document.getElementById('sidebarMeetBadge');

    if (candBadge) candBadge.textContent = state.getCandidates().length;
    if (progBadge) progBadge.textContent = state.getPrograms().length;
    if (trnBadge) trnBadge.textContent = state.getTrainers().length;
    if (meetBadge) {
      const todayStr = new Date().toISOString().split('T')[0];
      meetBadge.textContent = state.getDailyMeets(todayStr).length;
    }
  }

  initSidebarShortcuts() {
    const btnCand = document.getElementById('sidebarBtnCandUpload');
    const btnProg = document.getElementById('sidebarBtnProgUpload');

    if (btnCand) {
      btnCand.addEventListener('click', () => {
        openExcelUploadModal({
          type: 'candidates',
          onComplete: () => this.render()
        });
      });
    }

    if (btnProg) {
      btnProg.addEventListener('click', () => {
        openExcelUploadModal({
          type: 'programs',
          onComplete: () => this.render()
        });
      });
    }
  }

  initDataActions() {
    const btnData = document.getElementById('btnDataManage');
    if (!btnData) return;

    btnData.addEventListener('click', () => {
      this.openDataActionsModal();
    });
  }

  initCloudDatabaseSync() {
    const btnCloud = document.getElementById('btnCloudDbModal');
    const cloudDot = document.getElementById('topbarCloudDot');
    const cloudLabel = document.getElementById('topbarCloudLabel');

    if (btnCloud) {
      btnCloud.addEventListener('click', () => {
        openCloudDatabaseModal({
          onUpdate: () => {
            this.updateBadges();
            this.render();
          }
        });
      });
    }

    firebaseService.onStatusChange(status => {
      if (!cloudDot || !cloudLabel) return;
      if (status.status === 'connected') {
        cloudDot.className = 'cloud-status-dot online';
        cloudLabel.textContent = status.projectId ? `Cloud: ${status.projectId}` : 'Cloud: Connected';
        if (btnCloud) btnCloud.classList.add('connected');
      } else if (status.status === 'connecting') {
        cloudDot.className = 'cloud-status-dot connecting';
        cloudLabel.textContent = 'Connecting...';
        if (btnCloud) btnCloud.classList.remove('connected');
      } else {
        cloudDot.className = 'cloud-status-dot offline';
        cloudLabel.textContent = 'Database: Local';
        if (btnCloud) btnCloud.classList.remove('connected');
      }
    });
  }

  openDataActionsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <div class="modal-badge">System Data Manager</div>
            <h2 class="modal-title">Data Actions & Backup</h2>
            <p class="modal-subtitle">Manage persistence, export JSON backups, or reset demo data.</p>
          </div>
          <button class="modal-close-btn" aria-label="Close">${getIcon('x')}</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Full System Backup & Restore</label>
            <div style="display: flex; gap: 10px; margin-top: 4px;">
              <button id="btnExportJson" class="btn btn-secondary flex-1">
                ${getIcon('download')} Export JSON Backup
              </button>
              <button id="btnImportJsonTrigger" class="btn btn-outline flex-1">
                ${getIcon('upload')} Restore JSON
              </button>
              <input type="file" id="jsonFileInput" accept=".json" style="display: none;" />
            </div>
            <div class="form-hint">Backs up all candidates, programs, trainers, and assignments into a single JSON file.</div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 6px 0;" />

          <div class="form-group">
            <label class="form-label">Reset or Clear Operations Data</label>
            <div style="display: flex; gap: 10px; margin-top: 4px;">
              <button id="btnResetDemo" class="btn btn-secondary flex-1">
                ${getIcon('refresh')} Load Rich Sample Data
              </button>
              <button id="btnClearData" class="btn btn-outline text-danger flex-1">
                ${getIcon('trash')} Clear All Data
              </button>
            </div>
            <div class="form-hint">Reset back to default template dataset or wipe database clean.</div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btnCloseDataModal" class="btn btn-primary">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.add('modal-closing');
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('.modal-close-btn').addEventListener('click', close);
    overlay.querySelector('#btnCloseDataModal').addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // Export JSON
    overlay.querySelector('#btnExportJson').addEventListener('click', () => {
      const dataStr = state.exportDataJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MentorFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('System database exported successfully.');
    });

    // Import JSON
    const fileInput = overlay.querySelector('#jsonFileInput');
    overlay.querySelector('#btnImportJsonTrigger').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async e => {
      if (!e.target.files.length) return;
      const file = e.target.files[0];
      try {
        const text = await file.text();
        const res = state.importDataJson(text);
        if (res.success) {
          toast.success('Database restored successfully from backup!');
          this.render();
          close();
        } else {
          toast.error(`Import failed: ${res.error}`);
        }
      } catch (err) {
        toast.error('Failed to read backup file.');
      }
    });

    // Reset Demo
    overlay.querySelector('#btnResetDemo').addEventListener('click', () => {
      if (confirm('Load rich sample demo records for testing and exploration?')) {
        state.loadSampleDemoData();
        toast.success('Loaded sample records.');
        this.render();
        close();
      }
    });

    // Clear Data
    overlay.querySelector('#btnClearData').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL data? This will clear all records so you can upload real candidates, programs, and trainers.')) {
        state.clearAll();
        toast.info('All data has been cleared. Database is clean for real data uploads.');
        this.render();
        close();
      }
    });
  }

  render() {
    this.mainContent.innerHTML = '';
    const navigate = (view) => this.navigateTo(view);

    switch (this.currentView) {
      case 'dashboard':
        renderDashboardView(this.mainContent, navigate);
        break;
      case 'candidates':
        renderCandidatesView(this.mainContent, navigate);
        break;
      case 'programs':
        renderProgramsView(this.mainContent, navigate);
        break;
      case 'trainers':
        renderTrainersView(this.mainContent, navigate);
        break;
      case 'daily-progress':
      case 'matrix':
        renderDailyProgressView(this.mainContent, navigate);
        break;
      default:
        renderDashboardView(this.mainContent, navigate);
    }
  }
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
