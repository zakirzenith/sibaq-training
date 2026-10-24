import './style.css';
import { state } from './services/state.js';
import { firebaseService } from './services/firebase.js';
import { toast } from './components/toast.js';
import { getIcon } from './components/icons.js';
import { renderLoginView } from './components/loginView.js';
import { renderDashboardView } from './components/dashboardView.js';
import { renderCandidatesView } from './components/candidatesView.js';
import { renderProgramsView } from './components/programsView.js';
import { renderTrainersView } from './components/trainersView.js';
import { renderDailyProgressView } from './components/dailyProgressView.js';
import { renderReportsView } from './components/reportsView.js';
import { renderTrainerDashboardView } from './components/trainerPortal/trainerDashboardView.js';
import { renderTrainerDailyProgressView } from './components/trainerPortal/trainerDailyProgressView.js';
import { renderTrainerReportsView } from './components/trainerPortal/trainerReportsView.js';
import { renderTrainerAppealsView } from './components/trainerPortal/trainerAppealsView.js';
import { renderAppealsView } from './components/appealsView.js';
import { renderMenteeDashboardView } from './components/menteePortal/menteeDashboardView.js';
import { renderMenteePracticeView } from './components/menteePortal/menteePracticeView.js';
import { renderMenteeCompareView } from './components/menteePortal/menteeCompareView.js';
import { openCandidateDossierModal } from './components/modals/candidateDossierModal.js';
import { openExcelUploadModal } from './components/modals/excelUploadModal.js';
import { openCloudDatabaseModal } from './components/modals/cloudDatabaseModal.js';
import { openTrainerLoginModal } from './components/modals/trainerLoginModal.js';
import { pwaService } from './services/pwaService.js';
import { openPwaInstallModal } from './components/modals/pwaInstallModal.js';
import { renderDeviceManagementView } from './components/deviceManagementView.js';
import { renderDeviceVerificationView } from './components/deviceVerificationView.js';
import { openDeviceScannerModal } from './components/modals/deviceScannerModal.js';
import { openDeviceStickerModal } from './components/modals/deviceStickerModal.js';
import { openDevicePermitModal } from './components/modals/devicePermitModal.js';

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

    // 1. Session & Authentication Verification
    const session = state.getAuthSession();
    if (!session) {
      this.isAuthenticated = false;
      this.currentPortal = 'login';
      this.currentView = 'login';
      this.loginDefaultRole = 'mentee';
      document.body.classList.add('auth-mode');
    } else {
      this.isAuthenticated = true;
      document.body.classList.remove('auth-mode');
      if (session.role === 'trainer') {
        this.currentPortal = 'trainer';
        this.currentView = 'trainer-dashboard';
      } else if (session.role === 'mentee') {
        this.currentPortal = 'mentee';
        this.currentView = 'mentee-dashboard';
      } else {
        this.currentPortal = 'controller';
        this.currentView = 'dashboard';
      }
    }

    // Check for QR Code Device Inspection in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const isDeviceVerify = urlParams.get('verify') === 'device' || urlParams.has('device') || urlParams.has('tag');
    const deviceVerifyTag = urlParams.get('tag') || urlParams.get('device') || '';

    if (isDeviceVerify && deviceVerifyTag) {
      this.currentView = `device-verify:${deviceVerifyTag}`;
    }

    this.initTheme();
    this.initPortalTriggers();
    this.initNavigation();
    this.initAuthActions();
    this.initDataActions();
    this.initCloudDatabaseSync();
    this.initSidebarShortcuts();
    this.updatePortalUI();
    this.updateBadges();

    // Global exposure for modal triggers
    window.appInstance = this;
    window.openTrainerLogin = () => {
      const session = state.getAuthSession();
      if (session && session.role === 'trainer') {
        toast.info(`You are currently logged in as ${session.trainer.name}. Sign out first to switch accounts.`);
        return;
      }
      openTrainerLoginModal({
        onSuccess: (trainer) => {
          this.switchPortal('trainer', trainer);
        }
      });
    };

    // Subscribe to state changes to keep badges and views in sync across all devices
    state.subscribe(() => {
      this.updateBadges();
      if (this.isAuthenticated) {
        this.updatePortalUI();
      }

      // Auto-refresh views when changes arrive from Cloud Firestore
      const activeModal = document.querySelector('.modal-backdrop');
      const isTyping = document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (this.isAuthenticated && !activeModal && !isTyping && this.currentView !== 'programs' && this.currentView !== 'login') {
        this.render();
      }
    });

    // Render initial view
    this.render();

    // Check PWA first-time installation auto-prompt
    pwaService.checkAutoPrompt(() => openPwaInstallModal());
  }

  initTheme() {
    document.body.classList.add('light-theme');
    localStorage.setItem('mentorflow_theme', 'light');
  }

  initAuthActions() {
    const btnLogout = document.getElementById('btnTopLogout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        this.logout();
      };
    }

    const btnTopInstallApp = document.getElementById('btnTopInstallApp');
    if (btnTopInstallApp) {
      pwaService.onInstallableChange((canInstall) => {
        btnTopInstallApp.style.display = (canInstall && !pwaService.isStandalone()) ? 'inline-flex' : 'none';
      });
      btnTopInstallApp.onclick = () => {
        openPwaInstallModal({ force: true });
      };
    }

    const btnTopDevices = document.getElementById('btnTopDevices');
    if (btnTopDevices) {
      btnTopDevices.onclick = () => {
        this.navigateTo('devices');
      };
    }

    const userPill = document.getElementById('topbarUserProfileBtn') || document.querySelector('.saas-user-pill');
    if (userPill) {
      userPill.onclick = () => {
        this.openProfileModal();
      };
      userPill.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openProfileModal();
        }
      };
    }

    document.querySelectorAll('[data-action="open-profile"]').forEach(el => {
      el.onclick = () => {
        this.openProfileModal();
      };
    });

    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.onclick = () => {
        this.logout();
      };
    });
  }

  logout() {
    state.logout();
    this.isAuthenticated = false;
    this.currentPortal = 'login';
    this.currentView = 'login';
    this.loginDefaultRole = 'mentee';
    document.body.classList.add('auth-mode');
    toast.info('You have been signed out.');
    this.render();
  }

  openProfileModal() {
    const session = state.getAuthSession();
    if (!session) return;

    const isTrainer = session.role === 'trainer' || this.currentPortal === 'trainer';
    const isMentee = session.role === 'mentee' || this.currentPortal === 'mentee';
    const activeTrainer = isTrainer ? state.getActiveTrainer() : null;
    const activeMentee = (isMentee && session && session.candidate)
      ? (state.getCandidateById(session.candidate.id) || session.candidate)
      : (session && session.candidate ? (state.getCandidateById(session.candidate.id) || session.candidate) : null);

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';

    let panelName = 'Controller Panel';
    let panelBadgeStyle = 'background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;';
    let panelDotColor = '#6366f1';
    let userName = 'DH BENGAL';
    let userRole = 'Sibaq Controller Central Hub';
    let userIdentifier = 'Username: sibaq';

    if (isTrainer && activeTrainer) {
      panelName = 'Mentor Panel';
      panelBadgeStyle = 'background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;';
      panelDotColor = '#6366f1';
      userName = activeTrainer.name;
      userRole = 'Assigned Mentor & Coach';
      userIdentifier = activeTrainer.username || 'Trainer ID: ' + activeTrainer.id;
    } else if (isMentee && activeMentee) {
      panelName = 'Mentee / Candidate Portal';
      panelBadgeStyle = 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';
      panelDotColor = '#10b981';
      userName = activeMentee.name;
      userRole = `Registered Candidate (${activeMentee.category})`;
      userIdentifier = 'Admission / Chest: ' + (activeMentee.adNo || activeMentee.chestNo || activeMentee.id);
    }

    overlay.innerHTML = `
      <div class="modal-dialog profile-modal-dialog" style="max-width: 400px; width: 92%;">
        <div class="modal-header" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
          <div>
            <div class="modal-badge" style="display: inline-flex; align-items: center; gap: 5px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${panelDotColor};"></span>
              Session Profile
            </div>
            <h2 class="modal-title" style="font-size: 18px; margin: 4px 0 0 0;">Profile & Panel Info</h2>
          </div>
          <button class="modal-close-btn" id="btnCloseProfileModal" aria-label="Close">${getIcon('x')}</button>
        </div>

        <div class="modal-body" style="padding: 16px 18px;">
          <!-- Top Profile Banner -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 14px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 62px; height: 62px; border-radius: 50%; background: ${isTrainer && activeTrainer ? (activeTrainer.color || '#6366f1') : (isMentee ? '#059669' : '#ffffff')}; color: #fff; font-size: 22px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 3px solid #ffffff; margin-bottom: 10px; overflow: hidden;">
              ${isTrainer && activeTrainer 
                ? (activeTrainer.photo 
                    ? `<img src="${activeTrainer.photo}" alt="${activeTrainer.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='${activeTrainer.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}';" />` 
                    : activeTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join(''))
                : isMentee && activeMentee
                  ? (activeMentee.photo
                      ? `<img src="${activeMentee.photo}" alt="${activeMentee.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='${activeMentee.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}';" />`
                      : activeMentee.name.split(' ').map(n => n[0]).slice(0, 2).join(''))
                  : `<img src="/logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;" />`}
            </div>
            <h3 style="font-size: 16.5px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">${userName}</h3>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">${userRole}</div>

            <!-- Active Panel Capsule Badge -->
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; ${panelBadgeStyle}; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${panelDotColor}; box-shadow: 0 0 0 2px rgba(255,255,255,0.8);"></span>
              <span>Active in: <strong>${panelName}</strong></span>
            </div>
          </div>

          <!-- Session Metadata Details -->
          <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; font-size: 12.5px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b;">Current Panel:</span>
              <span style="font-weight: 800; color: #0f172a;">${panelName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b;">Account ID:</span>
              <span style="font-weight: 700; color: #334155; font-family: monospace;">${userIdentifier}</span>
            </div>
            ${isTrainer && activeTrainer ? `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Assigned Domain:</span>
                <span style="font-weight: 700; color: #0f172a;">${activeTrainer.expertise || 'General'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Assigned Programs:</span>
                <span style="font-weight: 700; color: #4f46e5;">${state.getTrainerPrograms(activeTrainer.id).length} Active Program(s)</span>
              </div>
            ` : isMentee && activeMentee ? `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Category:</span>
                <span style="font-weight: 700; color: #0f172a;">${activeMentee.category}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Enrolled Programs:</span>
                <span style="font-weight: 700; color: #059669;">${state.getCandidatePrograms(activeMentee.id).length} Program(s)</span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b;">Authority:</span>
                <span style="font-weight: 700; color: #059669;">Full Controller Privileges</span>
              </div>
            `}
          </div>

          <!-- Controller Shortcuts (Controller Only) -->
          ${session.role === 'controller' ? `
            <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
              <button type="button" id="btnModalOpenDevices" class="btn btn-outline" style="width: 100%; height: 38px; font-weight: 700; font-size: 12px; border-radius: 10px; border-color: #cbd5e1; display: flex; align-items: center; justify-content: center; gap: 6px; background: #ffffff;">
                <span>📱</span> Manage Student Phones &amp; QR
              </button>
              ${this.currentPortal === 'trainer' ? `
                <button type="button" id="btnModalSwitchToController" class="btn btn-outline" style="width: 100%; height: 38px; font-weight: 700; font-size: 12px; border-radius: 10px;">
                  ${getIcon('logout')} Return to Controller Panel
                </button>
              ` : `
                <button type="button" id="btnModalOpenTrainerLogin" class="btn btn-outline" style="width: 100%; height: 38px; font-weight: 700; font-size: 12px; border-radius: 10px;">
                  ${getIcon('trainers')} Switch to Trainer Portal
                </button>
              `}
            </div>
          ` : ''}

          <!-- PWA Install Shortcut (If not in standalone app mode) -->
          ${!pwaService.isStandalone() ? `
            <div style="margin-bottom: 12px;">
              <button type="button" id="btnModalInstallApp" class="btn btn-outline" style="width: 100%; height: 40px; font-weight: 700; font-size: 12.5px; border-radius: 10px; border: 1.5px solid #4f46e5; color: #4f46e5; background: #eef2ff; display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; transition: all 0.15s ease;">
                ${getIcon('download')} Install Sibaq Mentoring App
              </button>
            </div>
          ` : ''}

          <!-- Prominent Sign Out Button -->
          <button type="button" id="btnModalSignOut" class="btn btn-primary" style="width: 100%; height: 42px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; color: #ffffff; font-weight: 800; font-size: 13px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25); cursor: pointer;">
            ${getIcon('logout')}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.add('modal-closing');
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#btnCloseProfileModal').onclick = close;
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    // Install App action
    const btnModalInstall = overlay.querySelector('#btnModalInstallApp');
    if (btnModalInstall) {
      btnModalInstall.onclick = () => {
        close();
        openPwaInstallModal({ force: true });
      };
    }

    // Sign out action
    overlay.querySelector('#btnModalSignOut').onclick = () => {
      close();
      this.logout();
    };

    const btnSwitchCtrl = overlay.querySelector('#btnModalSwitchToController');
    if (btnSwitchCtrl) {
      btnSwitchCtrl.onclick = () => {
        close();
        this.switchPortal('controller');
      };
    }

    const btnOpenTrn = overlay.querySelector('#btnModalOpenTrainerLogin');
    if (btnOpenTrn) {
      btnOpenTrn.onclick = () => {
        close();
        window.openTrainerLogin();
      };
    }

    const btnModalOpenDev = overlay.querySelector('#btnModalOpenDevices');
    if (btnModalOpenDev) {
      btnModalOpenDev.onclick = () => {
        close();
        this.navigateTo('devices');
      };
    }
  }

  handleLoginSuccess(role, data) {
    this.isAuthenticated = true;
    document.body.classList.remove('auth-mode');

    if (role === 'trainer') {
      this.currentPortal = 'trainer';
      localStorage.setItem('mentorflow_active_portal', 'trainer');
      if (data && data.id) {
        state.setActiveTrainer(data.id);
      }
      this.updatePortalUI();
      this.navigateTo('trainer-dashboard');
    } else if (role === 'mentee') {
      this.currentPortal = 'mentee';
      localStorage.setItem('mentorflow_active_portal', 'mentee');
      this.updatePortalUI();
      this.navigateTo('mentee-dashboard');
    } else {
      this.currentPortal = 'controller';
      localStorage.setItem('mentorflow_active_portal', 'controller');
      this.updatePortalUI();
      this.navigateTo('dashboard');
    }
  }

  switchPortal(portalType, trainer = null) {
    const session = state.getAuthSession();

    if (portalType === 'trainer') {
      if (session && session.role === 'trainer') {
        state.setActiveTrainer(session.trainer.id);
        this.currentPortal = 'trainer';
        this.updatePortalUI();
        this.navigateTo('trainer-dashboard');
        return;
      }
      if (session && session.role === 'controller') {
        this.currentPortal = 'trainer';
        localStorage.setItem('mentorflow_active_portal', 'trainer');
        if (trainer) {
          state.setActiveTrainer(trainer.id);
        }
        this.updatePortalUI();
        this.navigateTo('trainer-dashboard');
      } else {
        this.loginDefaultRole = 'trainer';
        this.logout();
      }
    } else {
      // Switching to controller panel: ONLY allowed if authenticated as controller
      if (session && session.role === 'controller') {
        this.currentPortal = 'controller';
        localStorage.setItem('mentorflow_active_portal', 'controller');
        state.clearActiveTrainer();
        this.updatePortalUI();
        this.navigateTo('dashboard');
      } else {
        toast.error('Access Restricted: Trainer accounts cannot enter the Controller Panel.');
        this.loginDefaultRole = 'controller';
        this.logout();
      }
    }
  }

  updatePortalUI() {
    if (!this.isAuthenticated) {
      document.body.classList.add('auth-mode');
      return;
    }

    document.body.classList.remove('auth-mode');

    const session = state.getAuthSession();
    const isRealTrainerSession = session && session.role === 'trainer';
    const isRealMenteeSession = session && session.role === 'mentee';
    const isTrainer = this.currentPortal === 'trainer';
    const isMentee = this.currentPortal === 'mentee' || isRealMenteeSession;
    const activeTrainer = state.getActiveTrainer();
    const activeMentee = (session && session.role === 'mentee' && session.candidate)
      ? (state.getCandidateById(session.candidate.id) || session.candidate)
      : (session && session.candidate ? (state.getCandidateById(session.candidate.id) || session.candidate) : null);

    const brandSubtitle = document.querySelector('.logo-subtitle');
    const statusCapsule = document.querySelector('.topbar-status-capsule');
    const userPill = document.querySelector('.saas-user-pill');
    const btnTopTrainer = document.getElementById('btnTopTrainerPortal');
    const btnTopLogout = document.getElementById('btnTopLogout');
    const sidebarNav = document.querySelector('.sidebar-nav');
    const sidebarFooter = document.querySelector('.sidebar-footer');
    const mobileNav = document.getElementById('mobileNavBar');

    if (btnTopLogout) {
      btnTopLogout.style.display = 'inline-flex';
    }

    if (isTrainer && activeTrainer) {
      if (brandSubtitle) brandSubtitle.textContent = 'Trainer Portal';
      if (statusCapsule) {
        statusCapsule.innerHTML = `<span class="dot-stage"></span> Trainer: <strong>${activeTrainer.name}</strong>`;
      }
      if (userPill) {
        userPill.innerHTML = `
          <div class="sup-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: ${activeTrainer.color || '#6366f1'}; color: #fff; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${activeTrainer.photo 
              ? `<img src="${activeTrainer.photo}" alt="${activeTrainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` 
              : activeTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div class="sup-info">
            <span class="sup-name">${activeTrainer.name}</span>
          </div>
        `;
      }

      if (btnTopTrainer) {
        if (isRealTrainerSession) {
          // Real trainer session: completely hide switch button
          btnTopTrainer.style.display = 'none';
        } else {
          // Controller inspecting trainer: can exit to controller
          btnTopTrainer.style.display = 'inline-flex';
          btnTopTrainer.innerHTML = `
            ${getIcon('logout')}
            <span class="btn-trainer-portal-text">Exit to Controller</span>
          `;
          btnTopTrainer.title = 'Switch back to Controller Panel';
          btnTopTrainer.style.borderColor = '#cbd5e1';
          btnTopTrainer.style.color = '#64748b';
        }
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
          <a class="nav-item ${this.currentView === 'trainer-reports' ? 'active' : ''}" data-view="trainer-reports" id="navTrainerReports">
            <span class="nav-item-icon">${getIcon('award')}</span>
            <span>Reports & Dossiers</span>
          </a>
          <a class="nav-item ${this.currentView === 'trainer-appeals' ? 'active' : ''}" data-view="trainer-appeals" id="navTrainerAppeals">
            <span class="nav-item-icon">${getIcon('appeal')}</span>
            <span>Mentee Appeals</span>
            <span id="sidebarTrainerAppealBadge" class="nav-item-badge" style="background:#fee2e2; color:#b91c1c; font-weight: 800;">0</span>
          </a>

          ${!isRealTrainerSession ? `
            <div class="nav-section-title" style="margin-top: 18px;">Navigation</div>
            <a class="nav-item" data-action="exit-portal" id="navTrainerExit" style="cursor: pointer; color: #64748b;">
              <span class="nav-item-icon">${getIcon('logout')}</span>
              <span>Exit to Controller</span>
            </a>
          ` : ''}

          <div class="nav-section-title" style="margin-top: 18px;">Account</div>
          <a class="nav-item" data-action="logout" style="cursor: pointer; color: #ef4444;">
            <span class="nav-item-icon">${getIcon('logout')}</span>
            <span>Sign Out</span>
          </a>
        `;
      }

      // Sidebar Footer for Trainer Portal
      if (sidebarFooter) {
        sidebarFooter.innerHTML = `
          ${!isRealTrainerSession ? `
            <button id="sidebarBtnExitPortal" class="sidebar-portal-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 12px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer; margin-bottom: 10px; transition: all 0.15s ease;">
              ${getIcon('logout')}
              <span>Exit to Controller</span>
            </button>
          ` : ''}
          <div class="saas-system-card">
            <div class="ssc-dot-row">
              <span class="status-pulse-dot" style="background: #10b981;"></span>
              <span class="ssc-title">${activeTrainer.expertise || 'Trainer Workspace'}</span>
            </div>
            <div class="ssc-subtitle">Trainer Session Active</div>
          </div>
        `;
      }

      // Mobile Nav for Trainer Portal (Sign Out is accessed inside Profile)
      if (mobileNav) {
        mobileNav.innerHTML = `
          <button class="mobile-nav-btn ${this.currentView === 'trainer-dashboard' ? 'active' : ''}" data-view="trainer-dashboard">
            ${getIcon('dashboard')}
            <span>Dashboard</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'trainer-daily-progress' ? 'active' : ''}" data-view="trainer-daily-progress">
            ${getIcon('calendar')}
            <span>Daily</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'trainer-reports' ? 'active' : ''}" data-view="trainer-reports">
            ${getIcon('award')}
            <span>Reports</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'trainer-appeals' ? 'active' : ''}" data-view="trainer-appeals">
            ${getIcon('appeal')}
            <span>Appeals</span>
          </button>
          <button class="mobile-nav-btn" data-action="open-profile">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:${activeTrainer.color || '#6366f1'}; color:#fff; font-weight:700; font-size:11px; overflow:hidden;">
              ${activeTrainer.photo 
                ? `<img src="${activeTrainer.photo}" alt="${activeTrainer.name}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                : activeTrainer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
            <span>Profile</span>
          </button>
        `;
      }

    } else if (isMentee && activeMentee) {
      if (brandSubtitle) brandSubtitle.textContent = 'Mentee Portal';
      if (statusCapsule) {
        statusCapsule.innerHTML = `<span class="dot-stage" style="background: #10b981;"></span> Mentee: <strong>${activeMentee.name}</strong>`;
      }
      if (userPill) {
        const menteeInitials = activeMentee.name ? activeMentee.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'M';
        userPill.innerHTML = `
          <div class="sup-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: #059669; color: #fff; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${activeMentee.photo 
              ? `<img src="${activeMentee.photo}" alt="${activeMentee.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='${menteeInitials}';" />` 
              : menteeInitials}
          </div>
          <div class="sup-info">
            <span class="sup-name">${activeMentee.name}</span>
          </div>
        `;
      }

      if (btnTopTrainer) {
        btnTopTrainer.style.display = 'none';
      }

      // Sidebar Nav for Mentee Portal
      if (sidebarNav) {
        sidebarNav.innerHTML = `
          <div class="nav-section-title">Mentee Workspace</div>
          <a class="nav-item ${this.currentView === 'mentee-dashboard' ? 'active' : ''}" data-view="mentee-dashboard" id="navMenteeDashboard">
            <span class="nav-item-icon">${getIcon('dashboard')}</span>
            <span>Dashboard</span>
          </a>
          <a class="nav-item ${this.currentView === 'mentee-practice' ? 'active' : ''}" data-view="mentee-practice" id="navMenteePractice">
            <span class="nav-item-icon">${getIcon('calendar')}</span>
            <span>My Practice</span>
          </a>
          <a class="nav-item ${this.currentView === 'mentee-compare' ? 'active' : ''}" data-view="mentee-compare" id="navMenteeCompare">
            <span class="nav-item-icon">${getIcon('chart')}</span>
            <span>Compare</span>
          </a>
          <a class="nav-item" data-action="view-my-dossier" id="navMenteeDossier" style="cursor: pointer;">
            <span class="nav-item-icon">${getIcon('award')}</span>
            <span>My Official Dossier</span>
          </a>

          <div class="nav-section-title" style="margin-top: 18px;">Account</div>
          <a class="nav-item" data-action="logout" style="cursor: pointer; color: #ef4444;">
            <span class="nav-item-icon">${getIcon('logout')}</span>
            <span>Sign Out</span>
          </a>
        `;
      }

      // Sidebar Footer for Mentee Portal
      if (sidebarFooter) {
        sidebarFooter.innerHTML = `
          <div class="saas-system-card" style="border-color: #a7f3d0; background: #ecfdf5;">
            <div class="ssc-dot-row">
              <span class="status-pulse-dot" style="background: #10b981;"></span>
              <span class="ssc-title" style="color: #065f46;">AD: ${activeMentee.adNo || activeMentee.chestNo}</span>
            </div>
            <div class="ssc-subtitle" style="color: #047857;">Category: ${activeMentee.category}</div>
          </div>
        `;
      }

      // Mobile Nav for Mentee Portal
      if (mobileNav) {
        mobileNav.innerHTML = `
          <button class="mobile-nav-btn ${this.currentView === 'mentee-dashboard' ? 'active' : ''}" data-view="mentee-dashboard">
            ${getIcon('dashboard')}
            <span>Dashboard</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'mentee-practice' ? 'active' : ''}" data-view="mentee-practice">
            ${getIcon('calendar')}
            <span>Practice</span>
          </button>
          <button class="mobile-nav-btn ${this.currentView === 'mentee-compare' ? 'active' : ''}" data-view="mentee-compare">
            ${getIcon('chart')}
            <span>Compare</span>
          </button>
          <button class="mobile-nav-btn" data-action="view-my-dossier">
            ${getIcon('award')}
            <span>Dossier</span>
          </button>
          <button class="mobile-nav-btn" data-action="open-profile">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#059669; color:#fff; font-weight:700; font-size:11px; overflow:hidden;">
              ${activeMentee.photo
                ? `<img src="${activeMentee.photo}" alt="${activeMentee.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='${activeMentee.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}';" />`
                : activeMentee.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}
            </span>
            <span>Profile</span>
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
        btnTopTrainer.style.display = 'inline-flex';
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
    this.initAuthActions();
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

    document.querySelectorAll('[data-action="view-my-dossier"]').forEach(el => {
      el.onclick = () => {
        const session = state.getAuthSession();
        if (session && session.role === 'mentee' && session.candidate) {
          openCandidateDossierModal(session.candidate.id);
        }
      };
    });
  }

  navigateTo(viewName) {
    if (viewName && viewName.startsWith('device-verify')) {
      this.currentView = viewName;
      this.render();
      return;
    }

    if (!this.isAuthenticated) {
      this.currentView = 'login';
      this.render();
      return;
    }

    const session = state.getAuthSession();
    if (session && session.role === 'trainer') {
      const allowedTrainerViews = ['trainer-dashboard', 'trainer-daily-progress', 'trainer-reports', 'trainer-appeals', 'devices'];
      if (!allowedTrainerViews.includes(viewName)) {
        toast.error('Access Restricted: Trainer accounts cannot access Controller views.');
        this.currentView = 'trainer-dashboard';
        this.render();
        return;
      }
    }

    if (session && session.role === 'mentee') {
      const allowedMenteeViews = ['mentee-dashboard', 'mentee-practice', 'mentee-compare'];
      if (!allowedMenteeViews.includes(viewName)) {
        toast.error('Access Restricted: Candidates can only access candidate portal views.');
        this.currentView = 'mentee-dashboard';
        this.render();
        return;
      }
    }

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
      'reports': 'Performance Reports & Dossiers',
      'appeals': 'Trainer Appeals & Escalation Desk',
      'devices': 'Student Phone & Device Desk',
      'trainer-dashboard': 'Trainer Dashboard',
      'trainer-daily-progress': 'Trainer Daily Progress',
      'trainer-reports': 'Performance & Mentorship Reports',
      'trainer-appeals': 'Mentee Appeals & Issue Reports',
      'mentee-dashboard': 'Candidate Practice & Daily Tasks'
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
    const appealBadge = document.getElementById('sidebarAppealBadge');
    const trnAppealBadge = document.getElementById('sidebarTrainerAppealBadge');

    if (candBadge) candBadge.textContent = state.getCandidates().length;
    if (progBadge) progBadge.textContent = state.getPrograms().length;
    if (trnBadge) trnBadge.textContent = state.getTrainers().length;
    if (meetBadge) {
      const todayStr = new Date().toISOString().split('T')[0];
      meetBadge.textContent = state.getDailyMeets(todayStr).length;
    }
    if (appealBadge) {
      const pendingCount = state.getPendingAppealsCount();
      appealBadge.textContent = pendingCount;
      appealBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
    if (trnAppealBadge) {
      const activeTrn = state.getActiveTrainer();
      const count = activeTrn ? state.getTrainerAppeals(activeTrn.id).length : 0;
      trnAppealBadge.textContent = count;
      trnAppealBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Devices & Phones Badges (Sidebar & Mobile Topbar)
    const deviceBadge = document.getElementById('sidebarDeviceBadge');
    const topDeviceBadge = document.getElementById('topbarDeviceBadge');
    if (state.getDeviceMetrics) {
      const devMetrics = state.getDeviceMetrics();
      if (deviceBadge) {
        deviceBadge.textContent = devMetrics.checkedOutCount > 0 ? `${devMetrics.checkedOutCount} Active` : devMetrics.totalPermits;
        if (devMetrics.overdueCount > 0) {
          deviceBadge.style.background = '#fee2e2';
          deviceBadge.style.color = '#b91c1c';
        } else if (devMetrics.checkedOutCount > 0) {
          deviceBadge.style.background = '#ecfdf5';
          deviceBadge.style.color = '#047857';
        } else {
          deviceBadge.style.background = '#e0e7ff';
          deviceBadge.style.color = '#4338ca';
        }
      }
      if (topDeviceBadge) {
        if (devMetrics.totalPermits > 0) {
          topDeviceBadge.style.display = 'inline-flex';
          topDeviceBadge.textContent = devMetrics.overdueCount > 0 ? `🚨 ${devMetrics.overdueCount}` : (devMetrics.checkedOutCount > 0 ? `${devMetrics.checkedOutCount}` : `${devMetrics.totalPermits}`);
          topDeviceBadge.style.background = devMetrics.overdueCount > 0 ? '#dc2626' : (devMetrics.checkedOutCount > 0 ? '#059669' : '#6366f1');
        } else {
          topDeviceBadge.style.display = 'none';
        }
      }
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

    // Device QR Verification is universally accessible for teachers on campus without blocking login
    if (this.currentView && this.currentView.startsWith('device-verify')) {
      const parts = this.currentView.split(':');
      const tag = parts.length > 1 ? parts.slice(1).join(':') : null;
      document.body.classList.remove('auth-mode');
      renderDeviceVerificationView(this.mainContent, tag, (view) => this.navigateTo(view));
      return;
    }

    // If not authenticated, render Official Login Page
    if (!this.isAuthenticated || this.currentView === 'login') {
      document.body.classList.add('auth-mode');
      renderLoginView(
        this.mainContent,
        (role, data) => this.handleLoginSuccess(role, data),
        { defaultRole: this.loginDefaultRole || 'mentee' }
      );
      return;
    }

    document.body.classList.remove('auth-mode');
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
      case 'reports':
        renderReportsView(this.mainContent, navigate);
        break;
      case 'appeals':
        renderAppealsView(this.mainContent, navigate);
        break;
      case 'devices':
        renderDeviceManagementView(this.mainContent, navigate);
        break;
      case 'trainer-dashboard':
        renderTrainerDashboardView(this.mainContent, navigate);
        break;
      case 'trainer-daily-progress':
        renderTrainerDailyProgressView(this.mainContent, navigate);
        break;
      case 'trainer-reports':
        renderTrainerReportsView(this.mainContent, navigate);
        break;
      case 'trainer-appeals':
        renderTrainerAppealsView(this.mainContent, navigate);
        break;
      case 'mentee-dashboard':
        renderMenteeDashboardView(this.mainContent, navigate);
        break;
      case 'mentee-practice':
        renderMenteePracticeView(this.mainContent, navigate);
        break;
      case 'mentee-compare':
        renderMenteeCompareView(this.mainContent, navigate);
        break;
      default:
        if (this.currentPortal === 'trainer') {
          renderTrainerDashboardView(this.mainContent, navigate);
        } else if (this.currentPortal === 'mentee') {
          renderMenteeDashboardView(this.mainContent, navigate);
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
