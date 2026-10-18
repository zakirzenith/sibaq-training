import { getIcon } from './icons.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show({ title, message, type = 'info', duration = 3500 }) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type}`;

    let iconHtml = getIcon('info');
    if (type === 'success') iconHtml = getIcon('check');
    if (type === 'error') iconHtml = getIcon('x');

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">${getIcon('x')}</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 250);
    };

    closeBtn.addEventListener('click', dismiss);

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  success(message, title = 'Success') {
    this.show({ title, message, type: 'success' });
  }

  error(message, title = 'Error') {
    this.show({ title, message, type: 'error', duration: 4500 });
  }

  info(message, title = 'Notice') {
    this.show({ title, message, type: 'info' });
  }
}

export const toast = new ToastManager();
