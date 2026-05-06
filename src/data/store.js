// ── store.js — Central state ──────────────────────────────
// All app state lives here. Screens read from and write to
// this object, then call render functions to update the UI.

const Utils = {
  fmtDate: (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  parseDate: (str) => {
    // Parse YYYY-MM-DD in local time
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
  getIcon: (icon) => {
    if (icon === '掃除') return '🧹';
    if (icon === '跑步') return '🏃';
    return icon || '✅';
  }
};

const Store = (() => {
  const STORAGE_KEY = 'daily-life-v1';

  const defaults = {
    habits: [],
    tlEvents: [],
    todoItems: [],
    calEvents: [],
    selectedDate: Utils.fmtDate(new Date()),
    calMonth: { year: new Date().getFullYear(), month: new Date().getMonth() },
    prefs: { gcal: true, dark: false },
    streakDays: 0,
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch { return { ...defaults }; }
  }

  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Storage write failed', e); }
  }

  let state = load();

  return {
    get: (key) => state[key],
    set: (key, value) => { state[key] = value; save(state); },
    update: (key, fn) => { state[key] = fn(state[key]); save(state); },
    getAll: () => ({ ...state }),
  };
})();
