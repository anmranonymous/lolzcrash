// ===== SHARED UTILITIES =====

const API = {
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async get(url) {
    const res = await fetch(url);
    return res.json();
  }
};

// Toast notifications
const Toast = {
  container: null,
  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  },
  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span style="color:${type==='success'?'var(--accent3)':type==='error'?'var(--accent2)':type==='warning'?'var(--accent4)':'var(--accent)'}; margin-right:8px">${icons[type] || icons.info}</span>${message}`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Nav balance updater
async function loadNavBalance() {
  const el = document.getElementById('navBalance');
  if (!el) return;
  const data = await API.get('/api/me');
  if (data.loggedIn) {
    el.textContent = `₨ ${parseFloat(data.balance).toFixed(2)}`;
    el.style.display = 'block';
  }
}

// Auth check redirect
async function requireLogin(redirectTo) {
  const data = await API.get('/api/me');
  if (!data.loggedIn) { window.location.href = redirectTo || '/login'; return false; }
  return data;
}

// Format PKR
function formatPKR(n) { return `₨ ${parseFloat(n).toFixed(2)}`; }
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => Toast.show('Copied!', 'success', 1500));
}

// Hamburger menu
function initHamburger() {
  const ham = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (ham && navLinks) {
    ham.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
}

// Logout
function logout() {
  API.post('/api/logout', {}).then(() => window.location.href = '/');
}

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  loadNavBalance();
  initHamburger();
});
