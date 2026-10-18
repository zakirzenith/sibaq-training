import { state } from './services/state.js';
import { firebaseService } from './services/firebase.js';
import { toast } from './components/toast.js';
import { getIcon } from './components/icons.js';
import { renderDashboardView } from './components/dashboardView.js';
import { renderCandidatesView } from './components/candidatesView.js';
import { renderProgramsView } from './components/programsView.js';
import { renderTrainersView } from './components/trainersView.js';
import { renderDailyProgressView } from './components/dailyProgressView.js';
import { renderTrainerDashboardView } from './components/trainerPortal/trainerDashboardView.js';
import { renderTrainerDailyProgressView } from './components/trainerPortal/trainerDailyProgressView.js';
import { openExcelUploadModal } from './components/modals/excelUploadModal.js';
import { openCloudDatabaseModal } from './components/modals/cloudDatabaseModal.js';
import { openTrainerLoginModal } from './components/modals/trainerLoginModal.js';

class App {
  constructor() {
    // Snapshot original controller nav elements so we can restore them effortlessly
    const sidebarNavEl = document.querySelector('.sidebar-nav');
    const sidebarFooterEl = document.querySelector('.sidebar-footer');
    const mobileNavEl = document.getElementById('mobileNavBar');

    this.controllerSidebarNavHtml = sidebarNavEl ? sidebarNavEl.innerHTML : '';
    this.controllerSidebarFooterHtml = sidebarFooterEl ? sidebarFooterEl.innerHTML : '';
    this.controllerMobileNavHtml = mobileNavEl ? mobileNavEl.innerHTML : '';

    this.mainContent = document.getElementById('mainContent');

    // Check active portal and active trainer
    const activeTrainer = state.getActiveTrainer();
    const savedPortal = localStorage.getItem('mentorflow_active_portal');
    if (activeTrainer && savedPortal === 'trainer') {
      this.currentPortal = 'trainer';
      this.currentView = 'trainer-dashboard';
    } else {
      this.currentPortal = 'controller';
      this.currentView = 'dashboard';
    }

    this.initTheme();
    this.initPortalTriggers();
    this.initNavigation();
    this.initDataActions();
    this.initCloudDatabaseSync();
    this.initSidebarShortcuts();
    this.updatePortalUI();
    this.updateBadges();

    // Global exposure for modal triggers
    window.appInstance = this;
    window.openTrainerLogin = () => {
      openTrainerLoginModal({
        onSuccess: (trainer) => {
          this.switchPortal('trainer', trainer);
        }
      });
    };

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
    document.body.classList.add('light-theme');
    localStorage.setItem('mentorflow_theme', 'light');
  }

  switchPortal(portalType, trainer = null) {
    this.currentPortal = portalType;
    localStorage.setItem('mentorflow_active_portal', portalType);

    if (portalType === 'trainer') {
      if (trainer) {
        state.setActiveTrainer(trainer.id);
      }
      this.currentView = 'trainer-dashboard';
      this.updatePortalUI();
      this.navigateTo('trainer-dashboard');
    } else {
      state.clearActiveTrainer();
      this.currentView = 'trainers';
      this.updatePortalUI();
      this.navigateTo('trainers');
    }
  }

  updatePortalUI() {
    const isTrainer = this.currentPortal === 'trainer';
    const activeTrainer = state.getActiveTrainer();

    const brandSubtitle = document.querySelector('.logo-subtitle');
    const statusCapsule = document.querySelector('.topbar-status-capsule');
    const userPill = document.querySelector('.saas-user-pill');
    const btnTopTrainer = document.getElementById('btnTopTrainerPortal');
    const sidebarNav = document.querySelector('.sidebar-nav');
    const sidebarFooter = document.querySelector('.sidebar-footer');
    const mobileNav = document.getElementById('mobileNavBar');

    if (isTrainer && activeTrainer) {
      if (brandSubtitle) brandSubtitle.textContent = 'Trainer Portal';
      if (statusCapsule) {
        statusCapsule.innerHTML = `<span class="dot-stage"></span> Trainer: <strong>${activeTrainer.name}</strong>`;
      }
      if (userPill) {
        userPill.innerHTML = `
          <div class="sup-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: ${activeTrainer.color || '#6366f1'}; color: #fff; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center;">
            ${activeTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="sup-info">
            <span class="sup-name">${activeTrainer.name}</span>
          </div>
        `;
      }
      if (btnTopTrainer) {
        btnTopTrainer.innerHTML = `
          ${getIcon('logout')}
          <span class="btn-trainer-portal-text">Exit to Controller</span>
        `;
        btnTopTrainer.title = 'Switch back to Controller Panel';
        btnTopTrainer.style.borderColor = '#cbd5e1';
        btnTopTrainer.style.color = '#64748b';
      }

      // Sidebar Nav for Trainer Portal
      if (sidebarNav) {
        sidebarNav.innerHTML = `
          <div class="nav-section-title">Trainer Workspace</div>
          <a class="nav-item ${this.currentView === 'trainer-dashboard' ? 'active' : ''}" data-view="trainer-dashboard" id="navTrainerDashboard">
            <span class="nav-item-icon">${getIcon('dashboard')}</span>
            <span>My Dashboard</span>
          </a>
          <a class="nav-item ${this.currentView === 'trainer-daily-progress' ? 'active' : ''}" data-view="trainer-daily-progress" id="navTrainerDailyProgress">
            <span class="nav-item-icon">${getIcon('calendar')}</span>
            <span>Daily Progress</span>
          </a>

          <div class="nav-section-title" style="margin-top: 18px;">Navigation</div>
          <a class="nav-item" data-action="exit-portal" id="navTrainerExit" style="cursor: pointer; color: #64748b;">
            <span class="nav-item-icon">${getIcon('logout')}</span>
            <span>Exit to Controller</span>
          </a>
        `;
      }

      // Sidebar Footer for Trainer Portal
      if (sidebarFooter) {
        sidebarFooter.innerHTML = `
          <button id="sidebarBtnExitPortal" class="sidebar-portal-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 12px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; margin-bottom: 10px; transition: all 0.15s ease;">
            ${getIcon('logout')}
            <span>Exit to Controller</span>
          </button>
          <div class="saas-system-card">
            <div class="ssc-dot-row">
              <span class="status-pulse-dot" style="background: #10b981;"></span>
              <span class="ssc-title">${activeTrainer.expertise}</span>
            </div>
            <div class="ssc-subtitle">Faculty Session Active</div>
          </div>
        `;
      }

      // Mobile Nav for Trainer Portal
      if (mobileNav) {
        mobileNav.innerHTML = `
          <button class="mobile-nav-btn ${this.currentView === 'trainer-dashboard' ? 'active' : ''}" data-view="trainer-dashboard">
            ${getIcon('dashboard')}
            <span>Dashboard</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'trainer-daily-progress' ? 'active' : ''}" data-view="trainer-daily-progress">
            ${getIcon('calendar')}
            <span>Daily Progress</span>
          </button>
          <button class="mobile-nav-btn" data-action="exit-portal">
            ${getIcon('logout')}
            <span>Exit</span>
          </button>
        `;
      }

    } else {
      // Restore Controller Navigation
      if (brandSubtitle) brandSubtitle.textContent = 'Sibaq Controller';
      if (statusCapsule) {
        statusCapsule.innerHTML = `<span class="dot-stage"></span> Stage & Non-Stage Hub`;
      }
      if (userPill) {
        userPill.innerHTML = `
          <div class="sup-avatar" style="overflow: hidden; padding: 2px; background: #ffffff; border: 1px solid #e2e8f0;">
            <img src="/logo.png" alt="DH" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div class="sup-info">
            <span class="sup-name">DH BENGAL</span>
          </div>
        `;
      }
      if (btnTopTrainer) {
        btnTopTrainer.innerHTML = `
          ${getIcon('trainers')}
          <span class="btn-trainer-portal-text">Trainer Portal</span>
        `;
        btnTopTrainer.title = 'Trainer Sign In & Portal';
        btnTopTrainer.style.borderColor = '#cbd5e1';
        btnTopTrainer.style.color = 'inherit';
      }

      if (sidebarNav && this.controllerSidebarNavHtml) {
        sidebarNav.innerHTML = this.controllerSidebarNavHtml;
      }
      if (sidebarFooter && this.controllerSidebarFooterHtml) {
        sidebarFooter.innerHTML = this.controllerSidebarFooterHtml;
      }
      if (mobileNav && this.controllerMobileNavHtml) {
        mobileNav.innerHTML = this.controllerMobileNavHtml;
      }
    }

    // Re-bind listeners
    this.initNavigation();
    this.initPortalTriggers();
    this.initSidebarShortcuts();
    this.updateBadges();
  }

  initPortalTriggers() {
    const btnTop = document.getElementById('btnTopTrainerPortal');
    if (btnTop) {
      btnTop.onclick = () => {
        if (this.currentPortal === 'trainer') {
          this.switchPortal('controller');
        } else {
          window.openTrainerLogin();
        }
      };
    }

    const btnSidebarPortal = document.getElementById('sidebarBtnTrainerPortal');
    if (btnSidebarPortal) {
      btnSidebarPortal.onclick = () => {
        window.openTrainerLogin();
      };
    }

    const btnSidebarExit = document.getElementById('sidebarBtnExitPortal');
    if (btnSidebarExit) {
      btnSidebarExit.onclick = () => {
        this.switchPortal('controller');
      };
    }

    document.querySelectorAll('[data-action="exit-portal"]').forEach(el => {
      el.onclick = () => {
        this.switchPortal('controller');
      };
    });
  }

  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view], .mobile-nav-btn[data-view]');

    navItems.forEach(item => {
      item.onclick = () => {
        const targetView = item.getAttribute('data-view');
        if (targetView) {
          this.navigateTo(targetView);
        }
      };
    });
  }

  navigateTo(viewName) {
    this.currentView = viewName;

    // Update active nav items (Desktop sidebar + Mobile bottom nav)
    document.querySelectorAll('.nav-item[data-view], .mobile-nav-btn[data-view]').forEach(el => {
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
      'daily-progress': 'Daily Progress & Scoring',
      'trainer-dashboard': 'Trainer Dashboard',
      'trainer-daily-progress': 'Trainer Daily Progress'
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
      btnCand.onclick = () => {
        openExcelUploadModal({
          type: 'candidates',
          onComplete: () => this.render()
        });
      };
    }

    if (btnProg) {
      btnProg.onclick = () => {
        openExcelUploadModal({
          type: 'programs',
          onComplete: () => this.render()
        });
      };
    }
  }

  initDataActions() {
    const btnData = document.getElementById('btnDataManage');
    if (!btnData) return;

    btnData.onclick = () => {
      this.openDataActionsModal();
    };
  }

  initCloudDatabaseSync() {
    const btnCloud = document.getElementById('btnCloudDbModal');
    const cloudDot = document.getElementById('topbarCloudDot');
    const cloudLabel = document.getElementById('topbarCloudLabel');

    if (btnCloud) {
      btnCloud.onclick = () => {
        openCloudDatabaseModal({
          onUpdate: () => {
            this.updateBadges();
            this.render();
          }
        });
      };
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

    overlay.querySelector('.modal-close-btn').onclick = close;
    overlay.querySelector('#btnCloseDataModal').onclick = close;
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    // Export JSON
    overlay.querySelector('#btnExportJson').onclick = () => {
      const dataStr = state.exportDataJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MentorFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('System database exported successfully.');
    };

    // Import JSON
    const fileInput = overlay.querySelector('#jsonFileInput');
    overlay.querySelector('#btnImportJsonTrigger').onclick = () => {
      fileInput.click();
    };

    fileInput.onchange = async e => {
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
    };

    // Reset Demo
    overlay.querySelector('#btnResetDemo').onclick = () => {
      if (confirm('Load rich sample demo records for testing and exploration?')) {
        state.loadSampleDemoData();
        toast.success('Loaded sample records.');
        this.render();
        close();
      }
    };

    // Clear Data
    overlay.querySelector('#btnClearData').onclick = () => {
      if (confirm('Are you sure you want to delete ALL data? This will clear all records so you can upload real candidates, programs, and trainers.')) {
        state.clearAll();
        toast.info('All data has been cleared. Database is clean for real data uploads.');
        this.render();
        close();
      }
    };
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
      case 'trainer-dashboard':
        renderTrainerDashboardView(this.mainContent, navigate);
        break;
      case 'trainer-daily-progress':
        renderTrainerDailyProgressView(this.mainContent, navigate);
        break;
      default:
        if (this.currentPortal === 'trainer') {
          renderTrainerDashboardView(this.mainContent, navigate);
        } else {
          renderDashboardView(this.mainContent, navigate);
        }
    }
  }
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
