import { state } from '../services/state.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';

/**
 * Render Official Login Page with Dual Portals (Controller & Trainer)
 * @param {HTMLElement} container - The DOM element where the login view is mounted
 * @param {Function} onLoginSuccess - Callback when login succeeds: (role, userOrTrainer) => void
 * @param {Object} options - Optional initial configuration: { defaultRole: 'controller' | 'trainer' }
 */
export function renderLoginView(container, onLoginSuccess, options = {}) {
  let activeTab = options.defaultRole === 'trainer' ? 'trainer' : 'controller';

  const trainers = state.getTrainers();

  function render() {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <!-- Ambient Decorative Glows -->
        <div class="auth-glow auth-glow-1"></div>
        <div class="auth-glow auth-glow-2"></div>

        <div class="auth-card-container">
          <!-- Official Brand Header -->
          <div class="auth-brand-header">
            <div class="auth-logo-badge">
              <img src="/logo.png" alt="DH BENGAL" class="auth-logo-img" />
            </div>
            <h1 class="auth-main-title">DH BENGAL</h1>
            <p class="auth-main-subtitle">Sibaq Operations & Training Management System</p>
          </div>

          <!-- Dual Portal Role Switcher Tabs -->
          <div class="auth-role-tabs">
            <button 
              type="button" 
              id="tabController" 
              class="auth-tab-btn ${activeTab === 'controller' ? 'active' : ''}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
              <span>Controller Login</span>
            </button>

            <button 
              type="button" 
              id="tabTrainer" 
              class="auth-tab-btn ${activeTab === 'trainer' ? 'active' : ''}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
              <span>Trainer Login</span>
            </button>
          </div>

          <!-- Dynamic Authentication Forms -->
          <div class="auth-form-card">
            ${activeTab === 'controller' ? `
              <!-- ================= CONTROLLER LOGIN FORM ================= -->
              <div class="auth-form-header">
                <div class="auth-badge-pill badge-controller">
                  <span class="auth-badge-dot"></span> Official Controller Access
                </div>
                <h2 class="auth-form-title">Controller Sign In</h2>
                <p class="auth-form-desc">
                  Access overall operations, candidate assignments, programs roster, and live scoring.
                </p>
              </div>

              <form id="formControllerLogin" class="auth-form-body">
                <div class="form-group">
                  <label class="form-label" for="ctrlUsername">Controller Username</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">${getIcon('user')}</span>
                    <input 
                      type="text" 
                      id="ctrlUsername" 
                      class="form-input auth-input" 
                      required 
                      placeholder="Enter controller username"
                      autocomplete="username"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="ctrlPassword">Security Password</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">${getIcon('lock')}</span>
                    <input 
                      type="password" 
                      id="ctrlPassword" 
                      class="form-input auth-input" 
                      required 
                      placeholder="Enter controller password"
                      autocomplete="current-password"
                    />
                    <button type="button" class="btn-toggle-pwd" id="btnToggleCtrlPwd" title="Show/Hide Password">
                      👁️
                    </button>
                  </div>
                </div>

                <button type="submit" id="btnSubmitCtrl" class="btn btn-primary auth-submit-btn">
                  <span>Sign In to Controller Panel</span>
                  <span class="auth-btn-arrow">&rarr;</span>
                </button>
              </form>
            ` : `
              <!-- ================= TRAINER LOGIN FORM ================= -->
              <div class="auth-form-header">
                <div class="auth-badge-pill badge-trainer">
                  <span class="auth-badge-dot" style="background: #6366f1;"></span> Trainer Portal
                </div>
                <h2 class="auth-form-title">Trainer Sign In</h2>
                <p class="auth-form-desc">
                  Access your assigned mentees, enrolled programs, and report daily progress.
                </p>
              </div>

              <form id="formTrainerLogin" class="auth-form-body">
                <div class="form-group">
                  <label class="form-label" for="trnUsername">Trainer Username / ID</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">${getIcon('user')}</span>
                    <input 
                      type="text" 
                      id="trnUsername" 
                      class="form-input auth-input" 
                      required 
                      placeholder="Enter your assigned username"
                      autocomplete="username"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="trnPassword">Trainer Password</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">${getIcon('lock')}</span>
                    <input 
                      type="password" 
                      id="trnPassword" 
                      class="form-input auth-input" 
                      required 
                      placeholder="Enter your assigned password"
                      autocomplete="current-password"
                    />
                    <button type="button" class="btn-toggle-pwd" id="btnToggleTrnPwd" title="Show/Hide Password">
                      👁️
                    </button>
                  </div>
                </div>

                <button type="submit" id="btnSubmitTrn" class="btn btn-primary auth-submit-btn" style="background: #4f46e5; border-color: #4338ca;">
                  <span>Sign In to Trainer Panel</span>
                  <span class="auth-btn-arrow">&rarr;</span>
                </button>
              </form>
            `}
          </div>

          <!-- Bottom Footer Details -->
          <div class="auth-footer-bar">
            <span>DH BENGAL &bull; Sibaq 2026</span>
            <span class="afb-bullet">&bull;</span>
            <span>Role-Based Access Control</span>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // 1. Tab Switchers
    const tabCtrl = container.querySelector('#tabController');
    const tabTrn = container.querySelector('#tabTrainer');

    if (tabCtrl) {
      tabCtrl.addEventListener('click', () => {
        if (activeTab !== 'controller') {
          activeTab = 'controller';
          render();
        }
      });
    }

    if (tabTrn) {
      tabTrn.addEventListener('click', () => {
        if (activeTab !== 'trainer') {
          activeTab = 'trainer';
          render();
        }
      });
    }

    // 2. Controller Form Logic
    if (activeTab === 'controller') {
      const formCtrl = container.querySelector('#formControllerLogin');
      const txtCtrlUser = container.querySelector('#ctrlUsername');
      const txtCtrlPwd = container.querySelector('#ctrlPassword');
      const btnToggle = container.querySelector('#btnToggleCtrlPwd');

      if (btnToggle && txtCtrlPwd) {
        btnToggle.addEventListener('click', () => {
          txtCtrlPwd.type = txtCtrlPwd.type === 'password' ? 'text' : 'password';
          btnToggle.textContent = txtCtrlPwd.type === 'password' ? '👁️' : '🔒';
        });
      }

      if (formCtrl) {
        formCtrl.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = txtCtrlUser.value.trim();
          const password = txtCtrlPwd.value.trim();

          const result = state.authenticateController(username, password);
          if (!result.success) {
            toast.error(result.error);
            txtCtrlPwd.classList.add('input-error');
            setTimeout(() => txtCtrlPwd.classList.remove('input-error'), 1000);
            return;
          }

          toast.success('Controller authentication successful! Welcome to DH BENGAL.');
          onLoginSuccess('controller', { user: 'sibaq' });
        });
      }
    }

    // 3. Trainer Form Logic
    if (activeTab === 'trainer') {
      const formTrn = container.querySelector('#formTrainerLogin');
      const txtTrnUser = container.querySelector('#trnUsername');
      const txtTrnPwd = container.querySelector('#trnPassword');
      const btnToggleTrn = container.querySelector('#btnToggleTrnPwd');

      if (btnToggleTrn && txtTrnPwd) {
        btnToggleTrn.addEventListener('click', () => {
          txtTrnPwd.type = txtTrnPwd.type === 'password' ? 'text' : 'password';
          btnToggleTrn.textContent = txtTrnPwd.type === 'password' ? '👁️' : '🔒';
        });
      }

      if (formTrn) {
        formTrn.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = txtTrnUser.value.trim();
          const password = txtTrnPwd.value.trim();

          const result = state.authenticateTrainer(username, password);
          if (!result.success) {
            toast.error(result.error);
            txtTrnPwd.classList.add('input-error');
            setTimeout(() => txtTrnPwd.classList.remove('input-error'), 1000);
            return;
          }

          toast.success(`Welcome back, ${result.trainer.name}!`);
          onLoginSuccess('trainer', result.trainer);
        });
      }
    }
  }

  render();
}
