// ── profile.js — Profile screen ──────────────────────────

const ProfileScreen = {
  id: 'screen-profile',

  template() {
    const user = Store.get('user');
    const name  = user ? user.name : 'Jim';
    const email = user ? user.email : '未連接 Google 帳號';
    const syncStatus = Store.get('syncStatus');
    let status = '未同步';
    let statusColor = '#999';
    if (user) {
      if (syncStatus === 'syncing') {
        status = '↻ 同步中';
        statusColor = '#f39c12';
      } else {
        status = '✓ 已同步';
        statusColor = 'var(--accent)';
      }
    }

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
              <span class="pref-name">每日提醒通知</span>
              <div class="toggle" id="tog-notif" data-key="notif"></div>
            </div>
            <div class="pref-item">
              <span class="pref-name">深色模式</span>
              <div class="toggle off" id="tog-dark" data-key="dark"></div>
            </div>
          </div>

          <div class="pref-section">
            <div class="pref-section-title">帳號</div>
            <div class="pref-item">
              <span class="pref-name">Google 日曆同步</span>
              <div class="toggle" id="tog-gcal" data-key="gcal"></div>
            </div>
            <div class="pref-item">
              <span class="pref-name" id="profile-email">${email}</span>
              <span class="pref-value" id="profile-status" style="color:${statusColor}">${status}</span>
            </div>
            ${user ? `
            <div class="pref-item" id="btn-restore-habits" style="cursor:pointer;">
              <span class="pref-name">從雲端還原習慣紀錄</span>
              <span class="pref-value" style="color:var(--accent)">還原</span>
            </div>
            ` : ''}
          </div>

          ${user ? `
          <div class="pref-section" id="profile-calendars-section">
            <div class="pref-section-title">顯示的日曆</div>
            <div id="profile-calendars-list"></div>
          </div>
          ` : ''}

          <div class="pref-section">
            <div class="pref-section-title">危險區域</div>
            <div class="pref-item" id="btn-reset-data" style="cursor:pointer; color: #ff4d4d;">
              <span class="pref-name">重置所有資料</span>
              <span class="pref-value">⚠️</span>
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

    const btnRestore = document.getElementById('btn-restore-habits');
    if (btnRestore) {
      btnRestore.addEventListener('click', async () => {
        if (!confirm('這將會覆蓋你目前的習慣紀錄，確定要從雲端還原嗎？')) return;
        btnRestore.querySelector('.pref-value').textContent = '還原中...';
        await GCal.restoreHabitsBackup();
        btnRestore.querySelector('.pref-value').textContent = '已還原';
        setTimeout(() => btnRestore.querySelector('.pref-value').textContent = '還原', 2000);
      });
    }

    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('確定要刪除所有本地資料嗎？此操作無法還原。')) {
          localStorage.clear();
          window.location.reload();
        }
      });
    }

    this.renderCalendars();
  },

  renderCalendars() {
    const listEl = document.getElementById('profile-calendars-list');
    if (!listEl) return;
    const calendars = Store.get('gcalCalendars') || [];
    const hidden = Store.get('hiddenCalendars') || [];
    
    if (calendars.length === 0) {
      listEl.innerHTML = `<div class="pref-item"><span class="pref-name" style="color:#999;font-size:13px;padding:4px 0;">尚無日曆資料，或同步中...</span></div>`;
      return;
    }

    listEl.innerHTML = calendars.map(cal => `
      <div class="pref-item" style="border-radius: 500px; padding: 12px 16px; margin-bottom: 10px;">
        <span class="pref-name" style="display:flex;align-items:center;gap:12px; max-width: 80%;">
          <div style="width:14px;height:14px;border-radius:50%;background:${cal.color}; flex-shrink:0;"></div>
          <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cal.summary}</div>
        </span>
        <div class="toggle ${hidden.includes(cal.id) ? 'off' : ''}" data-calid="${cal.id}"></div>
      </div>
    `).join('');

    listEl.querySelectorAll('.toggle').forEach(tog => {
      tog.addEventListener('click', () => {
        tog.classList.toggle('off');
        const isHidden = tog.classList.contains('off');
        const calId = tog.dataset.calid;
        
        let arr = Store.get('hiddenCalendars') || [];
        if (isHidden) {
          if (!arr.includes(calId)) arr.push(calId);
        } else {
          arr = arr.filter(x => x !== calId);
        }
        Store.set('hiddenCalendars', arr);
        
        if (typeof GCal !== 'undefined') {
          GCal.fetchEvents();
        }
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
