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
  let activeTab = options.defaultRole === 'trainer' ? 'trainer' : (options.defaultRole === 'mentee' ? 'mentee' : 'controller');

  const trainers = state.getTrainers();
  const categories = state.getAvailableCategories();

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

          <!-- Triple Portal Role Switcher Tabs -->
          <div class="auth-role-tabs" style="grid-template-columns: repeat(3, 1fr);">
            <button 
              type="button" 
              id="tabController" 
              class="auth-tab-btn ${activeTab === 'controller' ? 'active' : ''}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
              <span>Controller</span>
            </button>

            <button 
              type="button" 
              id="tabTrainer" 
              class="auth-tab-btn ${activeTab === 'trainer' ? 'active' : ''}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
              <span>Mentor</span>
            </button>

            <button 
              type="button" 
              id="tabMentee" 
              class="auth-tab-btn ${activeTab === 'mentee' ? 'active' : ''}"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <span>Mentee</span>
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
            ` : activeTab === 'trainer' ? `
              <!-- ================= TRAINER LOGIN FORM ================= -->
              <div class="auth-form-header">
                <div class="auth-badge-pill badge-trainer">
                  <span class="auth-badge-dot" style="background: #6366f1;"></span> Mentor Portal
                </div>
                <h2 class="auth-form-title">Mentor Sign In</h2>
                <p class="auth-form-desc">
                  Access your assigned mentees, enrolled programs, and report daily progress.
                </p>
              </div>

              <form id="formTrainerLogin" class="auth-form-body">
                <div class="form-group">
                  <label class="form-label" for="trnUsername">Mentor Username / ID</label>
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
                  <label class="form-label" for="trnPassword">Mentor Password</label>
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
                  <span>Sign In to Mentor Panel</span>
                  <span class="auth-btn-arrow">&rarr;</span>
                </button>
              </form>
            ` : `
              <!-- ================= MENTEE LOGIN FORM ================= -->
              <div class="auth-form-header">
                <div class="auth-badge-pill badge-mentee" style="background: #ecfdf5; color: #047857; border-color: #a7f3d0;">
                  <span class="auth-badge-dot" style="background: #10b981;"></span> Candidate Portal
                </div>
                <h2 class="auth-form-title">Mentee Sign In</h2>
                <p class="auth-form-desc">
                  Access your daily practice tasks, assigned mentors, enrolled programs, and mentor reviews.
                </p>
              </div>

              <form id="formMenteeLogin" class="auth-form-body">
                <div class="form-group">
                  <label class="form-label" for="menteeAdNo">Admission / Chest Number</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">${getIcon('user')}</span>
                    <input 
                      type="text" 
                      id="menteeAdNo" 
                      class="form-input auth-input" 
                      required 
                      placeholder="e.g. AD-2026-01 or 101"
                      autocomplete="username"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="menteeCategory">Competition Category</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon" style="color: #059669;">${getIcon('award')}</span>
                    <select id="menteeCategory" class="form-select auth-input" required style="width: 100%; cursor: pointer;">
                      <option value="">-- Choose Your Category --</option>
                      ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <button type="submit" id="btnSubmitMentee" class="btn btn-primary auth-submit-btn" style="background: #059669; border-color: #047857;">
                  <span>Sign In to Mentee Portal</span>
                  <span class="auth-btn-arrow">&rarr;</span>
                </button>
              </form>
            `}
          </div>

          <!-- Bottom Footer Details -->
          <div class="auth-footer-bar">
            <span>DH BENGAL &bull; Sibaq 2026</span>
            <span class="afb-bullet">&bull;</span>
            <span>Candidate & Mentorship Portal</span>
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
    const tabMnt = container.querySelector('#tabMentee');

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

    if (tabMnt) {
      tabMnt.addEventListener('click', () => {
        if (activeTab !== 'mentee') {
          activeTab = 'mentee';
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

    // 3. Trainer / Mentor Form Logic
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

    // 4. Mentee Form Logic
    if (activeTab === 'mentee') {
      const formMnt = container.querySelector('#formMenteeLogin');
      const txtAdNo = container.querySelector('#menteeAdNo');
      const selCat = container.querySelector('#menteeCategory');

      if (formMnt) {
        formMnt.addEventListener('submit', (e) => {
          e.preventDefault();
          const adNo = txtAdNo.value.trim();
          const category = selCat.value.trim();

          const result = state.authenticateMentee(adNo, category);
          if (!result.success) {
            toast.error(result.error);
            txtAdNo.classList.add('input-error');
            setTimeout(() => txtAdNo.classList.remove('input-error'), 1000);
            return;
          }

          toast.success(`Welcome back, ${result.candidate.name}!`);
          onLoginSuccess('mentee', result.candidate);
        });
      }
    }
  }

  render();
}
