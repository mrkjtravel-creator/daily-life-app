// ── profile.js — Profile screen ──────────────────────────

const ProfileScreen = {
  id: 'screen-profile',

  template() {
    const user = Store.get('user');
    const name  = user ? user.name : 'Jim';
    const email = user ? user.email : '未連接 Google 帳號';
    const status = user ? '✓ 已連接' : '未連接';
    const statusColor = user ? 'var(--accent)' : '#999';

    return `
      <div class="scroll-area">
        <div class="profile-wrap">

          <div class="profile-hero">
            ${user && user.picture ? `<img src="${user.picture}" class="profile-img" />` : ''}
            <div>
              <div class="profile-name">${name}</div>
              <div class="profile-sub" id="profile-tz"></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-num" id="stat-streak">—</div>
              <div class="stat-label">連續天數</div>
            </div>
            <div class="stat-box">
              <div class="stat-num" id="stat-done">—</div>
              <div class="stat-label">今日完成</div>
            </div>
            <div class="stat-box">
              <div class="stat-num" id="stat-total">—</div>
              <div class="stat-label">習慣總數</div>
            </div>
          </div>

          <div class="pref-section">
            <div class="pref-section-title">設定</div>
            <div class="pref-item">
              <span class="pref-name">Google 日曆同步</span>
              <div class="toggle" id="tog-gcal" data-key="gcal"></div>
            </div>
            <div class="pref-item">
              <span class="pref-name">每日提醒通知</span>
              <div class="toggle" id="tog-notif" data-key="notif"></div>
            </div>
            <div class="pref-item">
              <span class="pref-name">深色模式</span>
              <div class="toggle off" id="tog-dark" data-key="dark"></div>
            </div>
            <div class="pref-item">
              <span class="pref-name">語言</span>
              <span class="pref-value">繁體中文</span>
            </div>
          </div>

          <div class="pref-section">
            <div class="pref-section-title">帳號</div>
            <div class="pref-item">
              <span class="pref-name" id="profile-email">${email}</span>
              <span class="pref-value" id="profile-status" style="color:${statusColor}">${status}</span>
            </div>
          </div>

          <div class="pref-section">
            <div class="pref-section-title">關於</div>
            <div class="pref-item" style="cursor:default">
              <span class="pref-name">Daily Life</span>
              <span class="pref-value">v1.0.0</span>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  mount() {
    const tzEl = document.getElementById('profile-tz');
    if (tzEl) {
      const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset();
      const sign   = offset >= 0 ? '+' : '-';
      const hh     = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const mm     = String(Math.abs(offset) % 60).padStart(2, '0');
      tzEl.textContent = `${tz} · UTC${sign}${hh}:${mm}`;
    }

    this.updateStats();
    this.loadPrefs();

    document.querySelectorAll('.toggle[data-key]').forEach(tog => {
      tog.addEventListener('click', () => {
        const key = tog.dataset.key;
        tog.classList.toggle('off');
        const isOn = !tog.classList.contains('off');
        this.savePref(key, isOn);
        if (key === 'dark') this.applyDark(isOn);
        if (key === 'gcal') isOn ? GCal.login() : GCal.logout();
      });
    });
  },

  loadPrefs() {
    const prefs = Store.get('prefs') || {};
    document.querySelectorAll('.toggle[data-key]').forEach(tog => {
      const key = tog.dataset.key;
      const isOn = prefs[key] !== undefined ? prefs[key] : (key !== 'dark');
      tog.classList.toggle('off', !isOn);
    });
  },

  savePref(key, isOn) {
    const prefs = Store.get('prefs') || {};
    prefs[key] = isOn;
    Store.set('prefs', prefs);
  },

  applyDark(isOn) {
    document.body.classList.toggle('dark', isOn);
  },

  updateStats() {
    const habits  = Store.get('habits') || [];
    const today   = Utils.fmtDate(new Date());
    const dow     = new Date().getDay();
    const todayHabits = habits.filter(h => !h.days || h.days.includes(dow));
    const done    = todayHabits.filter(h => h.done).length;
    const streak  = Store.get('streakDays') || 0;

    const el       = document.getElementById('stat-done');
    const elTotal  = document.getElementById('stat-total');
    const elStreak = document.getElementById('stat-streak');
    if (el)       el.textContent = done;
    if (elTotal)  elTotal.textContent = habits.length;
    if (elStreak) elStreak.textContent = streak;
  },
};

// Apply dark mode on page load from stored prefs
(function () {
  try {
    const raw = localStorage.getItem('daily-life-v1');
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state.prefs && state.prefs.dark) document.body.classList.add('dark');
  } catch {}
})();
