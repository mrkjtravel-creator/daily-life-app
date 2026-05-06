// ── home.js — Home screen ────────────────────────────────

const HomeScreen = {
  id: 'screen-home',

  template() {
    return `
      <div class="scroll-area">
        <div class="header">
          <div class="header-row">
            <div>
              <div class="header-title" id="home-greeting">早安，Jim 👋</div>
              <div class="header-sub" id="home-date"></div>
            </div>
          </div>
        </div>

        <div class="week-strip" id="home-week-strip"></div>

        <div class="section-header">
          <div class="section-title">每日習慣</div>
          <div class="section-action" id="home-add-habit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
        </div>
        <div id="home-habit-list"></div>

        <div class="section-header">
          <div class="section-title">今日代辦事項</div>
          <div class="section-action" id="home-add-todo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
        </div>
        <div id="home-todo-list"></div>

        <div class="section-header">
          <div class="section-title">今日活動</div>
          <div class="section-action" id="home-see-cal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
        <div id="home-event-list"></div>
      </div>
    `;
  },

  mount() {
    document.getElementById('home-add-habit').addEventListener('click', () =>
      Modal.open('habit', () => this.renderHabits()));
    document.getElementById('home-add-todo').addEventListener('click', () =>
      Modal.open('todo', () => this.renderTodos()));
    document.getElementById('home-see-cal').addEventListener('click', () => App.navigate('screen-calendar'));

    this.renderAll();
    this.startClock();
  },

  onDaySelect(date) {
    Store.set('selectedDate', Utils.fmtDate(date));
    this.renderAll();
  },

  renderAll() {
    this.renderGreeting();
    WeekStrip.render('home-week-strip', (d) => this.onDaySelect(d));
    this.renderHabits();
    this.renderTodos();
    this.renderEvents();
  },

  renderGreeting() {
    const h     = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('home-greeting').textContent = `${greet}, Jim 👋`;

    const now   = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    document.getElementById('home-date').textContent =
      `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  },

  renderHabits() {
    const selectedDate = Store.get('selectedDate');
    const dayOfWeek = Utils.parseDate(selectedDate).getDay(); // 0=Sun, 1=Mon...
    const allHabits = Store.get('habits') || [];
    const habits = allHabits.filter(h => {
      if (!h.days) return true; // Show on all days if not specified
      return h.days.includes(dayOfWeek);
    });

    const list   = document.getElementById('home-habit-list');
    if (!list) return;

    list.innerHTML = habits.map(h => `
      <div class="habit-card ${h.done ? 'done' : ''}" data-id="${h.id}">
        <div class="habit-check ${h.done ? 'done' : ''}" data-check="${h.id}">
          ${h.done ? '✓' : ''}
        </div>
        <div class="habit-body">
          <div class="habit-name">${h.name}</div>
          <div class="habit-streak">連續 ${h.streak} 天</div>
        </div>
        <div class="habit-time">${h.time}</div>
      </div>
    `).join('');

    list.querySelectorAll('.habit-card').forEach(card => {
      const id = card.dataset.id;
      const h  = habits.find(x => x.id === id);

      // Long press to edit
      App.bindLongPress(card, () => {
        Modal.open('habit', () => this.renderHabits(), h, false); // Edit mode
      });

      // Click card to view
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-check]')) return;
        Modal.open('habit', () => this.renderHabits(), h, true); // View mode
      });

      // Click check circle to toggle
      const btn = card.querySelector('[data-check]');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.update('habits', (arr) =>
          arr.map(x => x.id === id ? { ...x, done: !x.done } : x)
        );
        if (typeof GCal !== 'undefined' && GCal.syncHabitsBackup) GCal.syncHabitsBackup();
        this.renderHabits();
        ProfileScreen.updateStats();
      });

      // Swipe right to complete
      App.bindSwipeRight(card, () => {
        Store.update('habits', (arr) =>
          arr.map(x => x.id === id ? { ...x, done: true, streak: x.done ? x.streak : (x.streak + 1) } : x)
        );
        if (typeof GCal !== 'undefined' && GCal.syncHabitsBackup) GCal.syncHabitsBackup();
        this.renderHabits();
        ProfileScreen.updateStats();
      });
    });
  },

  renderTodos() {
    const selectedDate = Store.get('selectedDate');
    const allTodos = Store.get('todoItems') || [];
    const gTasks   = Store.get('gTasks') || [];
    
    const localTodos = allTodos.filter(t => t.date === selectedDate);
    const googleTasks = gTasks.filter(t => t.date === selectedDate);
    
    // De-duplicate: If a local todo has same name as a Google task, hide local
    const filteredLocal = localTodos.filter(lt => {
      return !googleTasks.some(gt => gt.name === lt.name);
    });

    const todos = [...filteredLocal, ...googleTasks].filter(t => !t.done);
    const list = document.getElementById('home-todo-list');
    if (!list) return;

    if (todos.length === 0) {
      list.innerHTML = `<div class="empty-state">今天沒有代辦事項</div>`;
      return;
    }

    list.innerHTML = todos.map(t => {
      const isDone = !!t.done;
      const isGcal = !!t.gcal;
      return `
        <div class="habit-card ${isDone ? 'done' : ''}" data-id="${t.id}" data-gcal="${isGcal}">
          <div class="habit-check ${isDone ? 'done' : ''}" data-check="${t.id}">
            ${isDone ? '✓' : ''}
          </div>
          <div class="habit-body">
            <div class="habit-name" style="text-decoration: ${isDone ? 'line-through' : 'none'}; opacity: ${isDone ? 0.6 : 1}">${t.name}</div>
            <div class="habit-streak">${t.desc || ''}</div>
          </div>
          ${isGcal ? `<div class="event-tag tag-gcal" style="margin-left:8px; font-size:9px">Tasks</div>` : ''}
          ${isDone && !isGcal ? `<div class="todo-done-time">${t.completedAt || ''}</div>` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.habit-card').forEach(card => {
      const id = card.dataset.id;
      const isGcal = card.dataset.gcal === 'true';
      const t  = todos.find(x => x.id === id);

      // Long press to edit (only for local)
      App.bindLongPress(card, () => {
        if (isGcal) return;
        Modal.open('todo', () => this.renderTodos(), t, false);
      });

      // Click card to view
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-check]')) return;
        Modal.open('todo', () => this.renderTodos(), t, true);
      });

      const completeAction = () => {
        if (isGcal) {
          if (typeof Toast !== 'undefined') Toast.show('完成中...', 'loading');
          GCal.completeTask(id);
          return;
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        Store.update('todoItems', (arr) =>
          arr.map(x => x.id === id ? { ...x, done: !x.done, completedAt: x.done ? '' : timeStr } : x)
        );
        this.renderTodos();
      };

      // Check to toggle
      const btn = card.querySelector('[data-check]');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        completeAction();
      });

      // Swipe right to complete
      App.bindSwipeRight(card, () => {
        const tNow = todos.find(x => x.id === id);
        if (!tNow.done) {
          completeAction();
        } else {
          // Reset card if already done
          card.style.transform = 'translateX(0)';
          card.style.opacity = '1';
        }
      });
    });
  },

  renderEvents() {
    const selectedDate = Store.get('selectedDate');
    const calEvents = (Store.get('calEvents') || []).filter(ev => ev.date === selectedDate);
    const tlEvents  = (Store.get('tlEvents') || []).filter(ev => ev.date === selectedDate);
    
    // De-duplicate: If a Personal event has the same name as a Google event, skip the Personal one.
    const filteredTlEvents = tlEvents.filter(te => {
      const isDuplicate = calEvents.some(ce => ce.name === te.name && ce.date === te.date);
      return !isDuplicate;
    });

    const combined = [
      ...calEvents.map(ev => ({ ...ev, category: 'calendar' })),
      ...filteredTlEvents.map(ev => ({ ...ev, category: 'timeline' }))
    ];

    // Sort by start time if available
    combined.sort((a, b) => (a.startTime || a.start || '').localeCompare(b.startTime || b.start || ''));

    const list = document.getElementById('home-event-list');
    if (!list) return;

    if (combined.length === 0) {
      list.innerHTML = `<div class="empty-state">今天沒有活動安排</div>`;
      return;
    }

    list.innerHTML = combined.map(ev => {
      const timeLabel = ev.meta || (ev.start ? `${ev.start} - ${ev.end}` : '全天');
      const isGcal    = ev.category === 'calendar' && ev.gcal;
      const dotColor  = (isGcal && ev.color) ? ev.color : 'var(--accent)';
      const tagStyle  = (isGcal && ev.color) ? `background:${ev.color}1a; color:${ev.color}; border:1px solid ${ev.color}33` : '';

      return `
        <div class="event-card" data-id="${ev.id}" data-cat="${ev.category}">
          <div class="event-dot" style="background:${dotColor}"></div>
          <div class="event-body">
            <div class="event-name">${ev.name}</div>
            <div class="event-time-label">${timeLabel}</div>
          </div>
          <div class="event-tag ${isGcal ? 'tag-gcal' : 'tag-personal'}" style="${tagStyle}">
            ${isGcal ? `Google · ${ev.calName || '日曆'}` : '個人'}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', () => {
        const id  = card.dataset.id;
        const cat = card.dataset.cat;
        const ev  = combined.find(x => x.id === id);
        
        // Use 'timeline' mode for both for viewing
        Modal.open('timeline', () => this.renderEvents(), ev, true); 
      });
    });
  },

  startClock() {
    const tick = () => {
      const now = new Date();
      const el  = document.getElementById('home-clock');
      if (el) el.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    };
    tick();
    setInterval(tick, 30000);
  },
};
