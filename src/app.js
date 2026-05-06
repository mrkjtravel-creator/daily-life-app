// ── app.js — Router & Bootstrap ──────────────────────────

const SCREENS = [HomeScreen, TimelineScreen, CalendarScreen, ProfileScreen];

const NAV_ITEMS = [
  { 
    screenId: 'screen-home',     
    label: '首頁',   
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>` 
  },
  { 
    screenId: 'screen-timeline', 
    label: '時間表', 
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>` 
  },
  { 
    screenId: 'screen-calendar', 
    label: '日曆',   
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>` 
  },
  { 
    screenId: 'screen-profile',  
    label: '我的',   
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>` 
  },
];

const App = (() => {
  let currentScreen = null;

  function buildShell() {
    const app = document.getElementById('app');

    // Build screen containers
    SCREENS.forEach(sc => {
      const div = document.createElement('div');
      div.className = 'screen';
      div.id = sc.id;
      app.appendChild(div);
    });

    // Build bottom nav — floating card with center FAB
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    const navItem = (item) => `
      <div class="nav-item" data-screen="${item.screenId}">
        <div class="nav-icon">${item.icon}</div>
        <div class="nav-label">${item.label}</div>
      </div>
    `;
    nav.innerHTML = [
      ...NAV_ITEMS.slice(0, 2).map(navItem),
      `<button class="nav-fab" id="nav-fab">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>`,
      ...NAV_ITEMS.slice(2).map(navItem),
    ].join('');
    app.appendChild(nav);

    // Build modal
    const modalHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title" id="modal-title">新增事項</div>
          <div id="modal-view-wrap" style="display:none; padding: 10px 0 20px;"></div>
          <div id="modal-form-wrap">
            <div class="form-group" id="modal-category-wrap">
            <label class="form-label">分類</label>
            <div class="category-selector" id="modal-category-selector">
              <div class="cat-chip selected" data-cat="timeline">活動</div>
              <div class="cat-chip" data-cat="todo">代辦事項</div>
            </div>
          </div>
          <div class="form-group" id="modal-date-wrap">
            <label class="form-label">日期</label>
            <input class="form-input" id="modal-item-date" type="date" />
          </div>
          <div class="form-group" id="modal-cal-wrap" style="display:none">
            <label class="form-label">所屬日曆</label>
            <select class="form-input" id="modal-calendar-select" style="background:#242424"></select>
          </div>
          <div class="form-group">
            <label class="form-label">名稱</label>
            <input class="form-input" id="modal-name" placeholder="輸入名稱..." />
          </div>

          <div class="form-group">
            <label class="form-label">備註（選填）</label>
            <input class="form-input" id="modal-desc" placeholder="備註..." />
          </div>
          <div class="form-group" id="modal-loc-wrap">
            <label class="form-label">地點（選填）</label>
            <input class="form-input" id="modal-loc" placeholder="地點..." />
          </div>
          <div class="form-group" id="modal-time-wrap" style="display:none">
            <label class="form-label">時間範圍</label>
            <div class="allday-row">
              <div class="allday-chip" id="modal-allday-chip">全天</div>
            </div>
            <div class="form-2col" id="modal-time-inputs">
              <input class="form-input" id="modal-start" type="time" value="08:00" />
              <input class="form-input" id="modal-end"   type="time" value="09:00" />
            </div>
          </div>
          <div class="form-group" id="modal-habit-time-wrap">
            <label class="form-label">時間</label>
            <input class="form-input" id="modal-habit-time" type="time" value="08:00" />
          </div>
          <div class="form-group" id="modal-duration-wrap">
            <label class="form-label">執行時間</label>
            <div class="duration-selector" id="modal-duration-selector">
              <div class="duration-chip" data-mins="10">10分鐘</div>
              <div class="duration-chip" data-mins="30">30分鐘</div>
              <div class="duration-chip" data-mins="60">1小時</div>
              <div class="duration-chip" data-mins="custom">自訂</div>
            </div>
            <input class="form-input" id="modal-duration-custom" type="number" placeholder="輸入分鐘數..." style="display:none; margin-top:8px" />
          </div>
          <div class="form-group" id="modal-days-wrap">
            <label class="form-label">固定星期</label>
            <div class="days-selector" id="modal-days-selector">
              <div class="day-btn" data-day="1">一</div>
              <div class="day-btn" data-day="2">二</div>
              <div class="day-btn" data-day="3">三</div>
              <div class="day-btn" data-day="4">四</div>
              <div class="day-btn" data-day="5">五</div>
              <div class="day-btn" data-day="6">六</div>
              <div class="day-btn" data-day="0">日</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">顏色</label>
            <div class="color-picker" id="modal-color-picker"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-delete" id="modal-delete" style="display:none">刪除</button>
            <button class="btn-cancel" id="modal-cancel">取消</button>
            <button class="btn-save"   id="modal-save">儲存</button>
          </div>
        </div>
      </div>
    `;
    app.insertAdjacentHTML('beforeend', modalHTML);
  }

  function navigate(screenId, force = false) {
    if (!force && currentScreen === screenId) return;
    currentScreen = screenId;

    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Show target
    const target = document.getElementById(screenId);
    const sc     = SCREENS.find(s => s.id === screenId);

    if (target && sc) {
      target.innerHTML = sc.template();
      target.classList.add('active');
      if (sc.mount) sc.mount();
    }

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });
  }

  function init() {
    buildShell();
    Navbar.init();
    Modal.init();

    document.getElementById('nav-fab').addEventListener('click', () => {
      const activeItem = document.querySelector('.nav-item.active');
      const screenId   = activeItem ? activeItem.dataset.screen : 'screen-home';
      if (screenId === 'screen-timeline') {
        Modal.open('timeline', () => TimelineScreen.renderTimeline());
      } else if (screenId === 'screen-home') {
        Modal.open('todo', () => HomeScreen.renderTodos());
      } else {
        Modal.open('timeline', () => {});
      }
    });

    navigate('screen-home');
  }

  function bindLongPress(el, callback) {
    let timer = null;
    const start = (e) => {
      timer = setTimeout(() => {
        timer = null;
        callback(e);
      }, 500);
    };
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    el.addEventListener('mousedown',  start);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('mouseup',    cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('touchend',   cancel);
    el.addEventListener('touchmove',  cancel);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function bindSwipeRight(el, onComplete) {
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    const threshold = 100; // px

    const onStart = (e) => {
      startX = e.touches ? e.touches[0].clientX : e.clientX;
      isSwiping = true;
      el.style.transition = 'none';
    };

    const onMove = (e) => {
      if (!isSwiping) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const diff = x - startX;
      
      if (diff > 0) {
        currentX = diff;
        el.style.transform = `translateX(${currentX}px)`;
        // If swiping right, highlight or change color of background
        if (currentX > threshold) {
          el.style.opacity = '0.7';
        } else {
          el.style.opacity = '1';
        }
      }
    };

    const onEnd = () => {
      if (!isSwiping) return;
      isSwiping = false;
      el.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      
      if (currentX > threshold) {
        el.style.transform = `translateX(100%)`;
        el.style.opacity = '0';
        setTimeout(() => {
          onComplete();
        }, 300);
      } else {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      }
      currentX = 0;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    
    // Also support mouse for testing
    el.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  return { navigate, init, bindLongPress, bindSwipeRight };
})();

// ── Toast notification system ─────────────────────────────
const Toast = (() => {
  let _timer = null;
  let _el = null;

  function _getEl() {
    if (!_el) {
      _el = document.createElement('div');
      _el.id = 'toast-bar';
      document.getElementById('app').appendChild(_el);
    }
    return _el;
  }

  function show(msg, type = 'info', duration = 2500) {
    const el = _getEl();
    el.textContent = msg;
    el.className = `toast toast-${type} toast-visible`;
    clearTimeout(_timer);
    if (type !== 'loading') {
      _timer = setTimeout(() => el.classList.remove('toast-visible'), duration);
    }
    return el;
  }

  function hide() {
    clearTimeout(_timer);
    const el = _getEl();
    el.classList.remove('toast-visible');
  }

  return { show, hide };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  // Init GCal after Google Identity Services loads
  window.addEventListener('load', () => {
    if (typeof google !== 'undefined') GCal.init();
  });
});

// PWA service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
