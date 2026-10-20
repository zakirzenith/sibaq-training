import { state } from '../services/state.js';
import { toast } from './toast.js';
import { getIcon } from './icons.js';

// Canonical floating coordinates spread organically around the perimeter of the screen
const CANONICAL_BUBBLE_CONFIGS = [
  { top: '6%', left: '4%', size: 64, dur: 14, delay: -2, anim: 'floatAmbient1' },
  { top: '22%', left: '2%', size: 72, dur: 18, delay: -8, anim: 'floatAmbient2' },
  { top: '42%', left: '5%', size: 54, dur: 15, delay: -4, anim: 'floatAmbient3' },
  { top: '62%', left: '2.5%', size: 68, dur: 20, delay: -11, anim: 'floatAmbient1' },
  { top: '80%', left: '4%', size: 56, dur: 16, delay: -7, anim: 'floatAmbient2' },

  { top: '7%', right: '4%', size: 66, dur: 17, delay: -3, anim: 'floatAmbient3' },
  { top: '24%', right: '2%', size: 54, dur: 13, delay: -9, anim: 'floatAmbient1' },
  { top: '44%', right: '4.5%', size: 74, dur: 22, delay: -14, anim: 'floatAmbient2' },
  { top: '64%', right: '2.5%', size: 52, dur: 16, delay: -6, anim: 'floatAmbient3' },
  { top: '82%', right: '4.5%', size: 64, dur: 19, delay: -10, anim: 'floatAmbient1' },

  { top: '3%', left: '22%', size: 48, dur: 16, delay: -2, anim: 'floatAmbient2' },
  { top: '3.5%', right: '23%', size: 52, dur: 21, delay: -12, anim: 'floatAmbient3' },

  { bottom: '12%', left: '12%', size: 50, dur: 18, delay: -8, anim: 'floatAmbient1' },
  { bottom: '9%', right: '14%', size: 52, dur: 14, delay: -13, anim: 'floatAmbient2' },
  { bottom: '3%', left: '24%', size: 46, dur: 19, delay: -5, anim: 'floatAmbient3' },
  { bottom: '3%', right: '26%', size: 48, dur: 17, delay: -11, anim: 'floatAmbient1' }
];

const FALLBACK_CANDIDATES = [
  { name: 'Aarav Sharma', category: 'THĀNAWIYYAH', color: '#6366f1' },
  { name: 'Fathima Noor', category: 'ŪLĀ', color: '#ec4899' },
  { name: 'Zayan Ahmed', category: 'BIDĀYA', color: '#06b6d4' },
  { name: 'Bilal Hassan', category: 'ʿĀLIYAH', color: '#10b981' },
  { name: 'Chloe Dubois', category: 'THĀNAWIYYAH', color: '#8b5cf6' },
  { name: 'Maryam Rizwan', category: 'BIDĀYA', color: '#f59e0b' },
  { name: 'Omar Khalid', category: 'ŪLĀ', color: '#3b82f6' },
  { name: 'Rayyan Malik', category: 'ʿĀLIYAH', color: '#14b8a6' },
  { name: 'Hafsa Siddiqui', category: 'BIDĀYA', color: '#d946ef' },
  { name: 'Hamza Farooq', category: 'ŪLĀ', color: '#f97316' },
  { name: 'Safiyya Bano', category: 'THĀNAWIYYAH', color: '#0ea5e9' },
  { name: 'Zubair Akhtar', category: 'ʿĀLIYAH', color: '#84cc16' },
  { name: 'Amina Zahra', category: 'THĀNAWIYYAH', color: '#e11d48' },
  { name: 'Ibrahim Qasim', category: 'ʿĀLIYAH', color: '#4f46e5' },
  { name: 'Khadija Tara', category: 'ŪLĀ', color: '#059669' },
  { name: 'Tariq Mansoor', category: 'BIDĀYA', color: '#ca8a04' }
];

/**
 * Generate circular candidate bubbles floating gracefully in the background
 */
function getCandidateBubblesHTML(rawCandidates = []) {
  // Prioritize candidates with photos, then other real candidates
  const candidatesWithPhoto = rawCandidates.filter(c => c && c.photo);
  const candidatesWithoutPhoto = rawCandidates.filter(c => c && !c.photo);
  const combined = [...candidatesWithPhoto, ...candidatesWithoutPhoto];

  let pool = [...combined];
  let fbIndex = 0;
  while (pool.length < CANONICAL_BUBBLE_CONFIGS.length && fbIndex < FALLBACK_CANDIDATES.length) {
    pool.push(FALLBACK_CANDIDATES[fbIndex++]);
  }
  if (pool.length === 0) {
    pool = [...FALLBACK_CANDIDATES];
  }

  return CANONICAL_BUBBLE_CONFIGS.map((cfg, idx) => {
    const cand = pool[idx % pool.length];
    const initials = (cand.name || 'C')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const shortName = cand.name ? cand.name.split(' ')[0] : 'Candidate';
    const category = cand.category || 'Sibaq';

    const posStyles = [];
    if (cfg.top) posStyles.push(`top: ${cfg.top}`);
    if (cfg.bottom) posStyles.push(`bottom: ${cfg.bottom}`);
    if (cfg.left) posStyles.push(`left: ${cfg.left}`);
    if (cfg.right) posStyles.push(`right: ${cfg.right}`);
    posStyles.push(`width: ${cfg.size}px`);
    posStyles.push(`height: ${cfg.size}px`);
    posStyles.push(`animation-duration: ${cfg.dur}s`);
    posStyles.push(`animation-delay: ${cfg.delay}s`);

    const styleAttr = posStyles.join('; ');
    const fallbackColor = cand.color || '#4f46e5';

    return `
      <div 
        class="auth-candidate-bubble ${cfg.anim}" 
        style="${styleAttr}"
        title="${cand.name || 'Candidate'} • ${category}"
      >
        <div class="afb-inner">
          ${cand.photo 
            ? `<img src="${cand.photo}" alt="${cand.name || 'Candidate'}" class="afb-img" loading="lazy" />` 
            : `<div class="afb-initials-fallback" style="background: linear-gradient(135deg, ${fallbackColor}, #0f172a);">
                <span>${initials}</span>
              </div>`
          }
          <div class="afb-ring"></div>
        </div>
        <div class="afb-pill-label">
          <span class="afb-pill-name">${shortName}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Official Login Page with Dual Portals (Controller & Trainer)
 * @param {HTMLElement} container - The DOM element where the login view is mounted
 * @param {Function} onLoginSuccess - Callback when login succeeds: (role, userOrTrainer) => void
 * @param {Object} options - Optional initial configuration: { defaultRole: 'controller' | 'trainer' }
 */
export function renderLoginView(container, onLoginSuccess, options = {}) {
  let activeTab = options.defaultRole === 'controller' ? 'controller' : (options.defaultRole === 'trainer' ? 'trainer' : 'mentee');

  const trainers = state.getTrainers();
  const categories = state.getAvailableCategories();

  // Sibaq Grand Finale Deadline: 24 Nov 2026, 11:59:59 PM (Month 10 is November in JS)
  const FINALE_TARGET = new Date(2026, 10, 24, 23, 59, 59).getTime();
  let countdownTimer = null;

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown() {
    stopCountdown();
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, FINALE_TARGET - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n) => String(n).padStart(2, '0');

      const dEls = container.querySelectorAll('.countdown-days');
      const hEls = container.querySelectorAll('.countdown-hours');
      const mEls = container.querySelectorAll('.countdown-minutes');
      const sEls = container.querySelectorAll('.countdown-seconds');

      dEls.forEach(el => el.textContent = pad(days));
      hEls.forEach(el => el.textContent = pad(hours));
      mEls.forEach(el => el.textContent = pad(minutes));
      sEls.forEach(el => el.textContent = pad(seconds));

      const dMini = container.querySelectorAll('.countdown-days-mini');
      const hMini = container.querySelectorAll('.countdown-hours-mini');
      const mMini = container.querySelectorAll('.countdown-minutes-mini');
      const sMini = container.querySelectorAll('.countdown-seconds-mini');

      dMini.forEach(el => el.textContent = pad(days));
      hMini.forEach(el => el.textContent = pad(hours));
      mMini.forEach(el => el.textContent = pad(minutes));
      sMini.forEach(el => el.textContent = pad(seconds));
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function render() {
    stopCountdown();
    const candidates = state.getCandidates();

    container.innerHTML = `
      <div class="auth-page-wrapper">
        <!-- Ambient Decorative Glows -->
        <div class="auth-glow auth-glow-1 glow-${activeTab}"></div>
        <div class="auth-glow auth-glow-2 glow-${activeTab}"></div>

        <!-- Floating Candidates Circular Ambient Bubbles Layer -->
        <div class="auth-floating-candidates-layer" aria-hidden="true">
          ${getCandidateBubblesHTML(candidates)}
        </div>

        <!-- Floating Grand Finale Live Countdown (Primary Desktop/Tablet Widget) -->
        <div class="auth-floating-countdown auth-floating-countdown-main" title="Live Countdown to Sibaq Grand Finale 2026">
          <div class="afc-header">
            <span class="afc-trophy">🏆</span>
            <span class="afc-title">Sibaq Grand Finale</span>
            <span class="afc-live-dot" title="Live Countdown Active"></span>
          </div>
          <div class="afc-timer-row">
            <div class="afc-unit">
              <span class="afc-value countdown-days">00</span>
              <span class="afc-label">Days</span>
            </div>
            <span class="afc-divider">|</span>
            <div class="afc-unit">
              <span class="afc-value countdown-hours">00</span>
              <span class="afc-label">Hrs</span>
            </div>
            <span class="afc-divider">|</span>
            <div class="afc-unit">
              <span class="afc-value countdown-minutes">00</span>
              <span class="afc-label">Min</span>
            </div>
            <span class="afc-divider">|</span>
            <div class="afc-unit">
              <span class="afc-value countdown-seconds">00</span>
              <span class="afc-label">Sec</span>
            </div>
          </div>
          <div class="afc-footer">
            <span class="afc-target-date">Grand Finale: 24 Nov 2026 • 11:59 PM</span>
          </div>
        </div>

        <!-- Floating Grand Finale Mini Pill (Secondary Bottom Flank) -->
        <div class="auth-floating-countdown auth-floating-countdown-mini" title="Sibaq Grand Finale Countdown">
          <span class="afcm-icon">⏳</span>
          <span class="afcm-title">Grand Finale:</span>
          <span class="afcm-numbers">
            <span class="countdown-days-mini">00</span>d <span class="afcm-pipe">|</span>
            <span class="countdown-hours-mini">00</span>h <span class="afcm-pipe">|</span>
            <span class="countdown-minutes-mini">00</span>m <span class="afcm-pipe">|</span>
            <span class="countdown-seconds-mini">00</span>s
          </span>
        </div>

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
          <div class="auth-role-tabs" role="tablist" aria-label="Portal Selection">
            <button 
              type="button" 
              id="tabController" 
              data-role="controller"
              class="auth-tab-btn ${activeTab === 'controller' ? 'active' : ''}"
              role="tab"
              aria-selected="${activeTab === 'controller'}"
              title="Official Controller Portal"
            >
              <span class="auth-tab-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>
                </svg>
              </span>
              <span class="auth-tab-label">Controller</span>
            </button>

            <button 
              type="button" 
              id="tabTrainer" 
              data-role="trainer"
              class="auth-tab-btn ${activeTab === 'trainer' ? 'active' : ''}"
              role="tab"
              aria-selected="${activeTab === 'trainer'}"
              title="Mentor Guidance Portal"
            >
              <span class="auth-tab-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <span class="auth-tab-label">Mentor</span>
            </button>

            <button 
              type="button" 
              id="tabMentee" 
              data-role="mentee"
              class="auth-tab-btn ${activeTab === 'mentee' ? 'active' : ''}"
              role="tab"
              aria-selected="${activeTab === 'mentee'}"
              title="Candidate Mentee Portal"
            >
              <span class="auth-tab-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </span>
              <span class="auth-tab-label">Mentee</span>
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

                <button type="submit" id="btnSubmitCtrl" class="btn btn-primary auth-submit-btn" style="background: linear-gradient(135deg, #4338ca, #4f46e5); border: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.32);">
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

                <button type="submit" id="btnSubmitTrn" class="btn btn-primary auth-submit-btn" style="background: linear-gradient(135deg, #6d28d9, #7c3aed); border: none; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.32);">
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

                <button type="submit" id="btnSubmitMentee" class="btn btn-primary auth-submit-btn" style="background: linear-gradient(135deg, #047857, #059669); border: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.32);">
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
    startCountdown();
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

    // Candidate bubble interactive touch
    container.querySelectorAll('.auth-candidate-bubble').forEach(bubble => {
      bubble.addEventListener('click', () => {
        const title = bubble.getAttribute('title') || '';
        if (title) {
          toast.info(`Sibaq Candidate: ${title}`);
        }
      });
    });

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
          stopCountdown();
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
          stopCountdown();
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
          stopCountdown();
          onLoginSuccess('mentee', result.candidate);
        });
      }
    }
  }

  render();
}
