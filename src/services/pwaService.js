/**
 * Sibaq Mentoring - PWA (Progressive Web App) Service
 * Manages service worker registration, install prompts, standalone detection, and iOS support.
 */

class PwaService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstallable = false;
    this.listeners = new Set();
    this.init();
  }

  init() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('Sibaq Mentoring ServiceWorker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('Sibaq Mentoring ServiceWorker registration failed:', err);
          });
      });
    }

    // 2. Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.notifyListeners();

      // Trigger first-time auto prompt check
      this.checkAutoPrompt();
    });

    // 3. Listen for app installed
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstallable = false;
      localStorage.setItem('sibaq_pwa_installed', 'true');
      this.notifyListeners();
      console.log('Sibaq Mentoring PWA was installed successfully');
    });

    // 4. Check for standalone mode
    if (this.isStandalone()) {
      localStorage.setItem('sibaq_pwa_installed', 'true');
    }
  }

  isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  isIOS() {
    return (
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
      !window.MSStream
    );
  }

  canInstall() {
    if (this.isStandalone()) return false;
    return !!this.deferredPrompt || this.isIOS();
  }

  onInstallableChange(callback) {
    this.listeners.add(callback);
    callback(this.canInstall());
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const status = this.canInstall();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error('PWA listener error:', err);
      }
    });
  }

  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('sibaq_pwa_installed', 'true');
        this.deferredPrompt = null;
        this.isInstallable = false;
        this.notifyListeners();
        return { success: true, outcome: 'accepted' };
      }
      return { success: false, outcome: 'dismissed' };
    }

    if (this.isIOS()) {
      return { success: false, isIOS: true };
    }

    return { success: false, error: 'No install prompt available' };
  }

  dismissPrompt(days = 7) {
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem('sibaq_pwa_dismissed_until', String(expiry));
  }

  isDismissed() {
    const raw = localStorage.getItem('sibaq_pwa_dismissed_until');
    if (!raw) return false;
    const expiry = Number(raw);
    return Date.now() < expiry;
  }

  checkAutoPrompt(callback) {
    if (this.isStandalone()) return;
    if (localStorage.getItem('sibaq_pwa_installed') === 'true') return;
    if (this.isDismissed()) return;

    // Small delay so user sees application first
    setTimeout(() => {
      if (this.canInstall() && !this.isStandalone() && !this.isDismissed()) {
        if (typeof callback === 'function') {
          callback();
        } else if (window.__openPwaInstallModal) {
          window.__openPwaInstallModal();
        }
      }
    }, 2200);
  }
}

export const pwaService = new PwaService();
