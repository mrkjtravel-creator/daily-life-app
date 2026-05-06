// ── calendar.js — Calendar screen ────────────────────────

const CalendarScreen = {
  id: 'screen-calendar',
  calMonth: { year: new Date().getFullYear(), month: new Date().getMonth() },

  template() {
    return `
      <div class="scroll-area">
        <div class="cal-wrap">
          <div class="cal-nav">
            <div class="cal-nav-left">
              <div class="cal-nav-title" id="cal-month-title"></div>
              <div class="cal-today-btn" id="cal-today-btn">Today</div>
              <div class="cal-today-btn" id="cal-all-btn">All</div>
            </div>
            <div class="cal-nav-btns">
              <div class="cal-nav-btn" id="cal-prev">‹</div>
              <div class="cal-nav-btn" id="cal-next">›</div>
            </div>
          </div>
          <div class="cal-grid" id="cal-grid"></div>
        </div>

        <div class="section-header">
          <div class="section-title" id="cal-list-title">即將到來</div>
        </div>
        <div id="cal-list"></div>
      </div>
    `;
  },

  mount() {
    document.getElementById('cal-prev').addEventListener('click', () => this.changeMonthAnimated(-1));
    document.getElementById('cal-next').addEventListener('click', () => this.changeMonthAnimated(1));
    document.getElementById('cal-today-btn').addEventListener('click', () => {
      const now = new Date();
      this.calMonth = { year: now.getFullYear(), month: now.getMonth() };
      this.selectDate(Utils.fmtDate(now));
      this.setActiveBtn('cal-today-btn');
    });
    document.getElementById('cal-all-btn').addEventListener('click', () => {
      this.renderAll();
      this.setActiveBtn('cal-all-btn');
    });
    this.renderCalendar();
    this.renderAll();
    this.setActiveBtn('cal-all-btn');
    this.bindSwipe(document.querySelector('#screen-calendar .cal-wrap'));
  },

  bindSwipe(el) {
    if (!el) return;
    let startX = 0;
    let startY = 0;

    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only trigger for clearly horizontal swipes (>50px, dominant axis)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        this.changeMonthAnimated(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  },

  changeMonth(dir) {
    this.calMonth.month += dir;
    if (this.calMonth.month < 0)  { this.calMonth.month = 11; this.calMonth.year--; }
    if (this.calMonth.month > 11) { this.calMonth.month = 0;  this.calMonth.year++; }
    this.renderCalendar();
  },

  changeMonthAnimated(dir) {
    const grid = document.getElementById('cal-grid');
    if (!grid) { this.changeMonth(dir); return; }

    const outX = dir > 0 ? '-110%' : '110%';
    const inX  = dir > 0 ?  '110%' : '-110%';

    // Slide current grid out
    grid.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
    grid.style.transform  = `translateX(${outX})`;
    grid.style.opacity    = '0';

    setTimeout(() => {
      this.changeMonth(dir);              // update data + re-render innerHTML
      grid.style.transition = 'none';
      grid.style.transform  = `translateX(${inX})`;
      grid.style.opacity    = '0';
      // Double rAF ensures transition re-triggers after style reset
      requestAnimationFrame(() => requestAnimationFrame(() => {
        grid.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
        grid.style.transform  = 'translateX(0)';
        grid.style.opacity    = '1';
      }));
    }, 220);
  },

  selectDate(dateStr) {
    Store.set('selectedDate', dateStr);
    this.renderCalendar();
    this.renderDayEvents(dateStr);
    this.setActiveBtn(null);
  },

  setActiveBtn(activeId) {
    ['cal-today-btn', 'cal-all-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', id === activeId);
    });
  },

  renderAll() {
    const titleEl = document.getElementById('cal-list-title');
    const listEl  = document.getElementById('cal-list');
    if (!titleEl || !listEl) return;

    titleEl.textContent = '所有活動';

    const today     = Utils.fmtDate(new Date());
    const monthsEn  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const daysZh    = ['日','一','二','三','四','五','六'];

    const calEvents = (Store.get('calEvents') || []).filter(e => e.date >= today);
    const tlEvents  = (Store.get('tlEvents')  || []).filter(e => e.date >= today);
    const combined  = [
      ...calEvents.map(e => ({ ...e, _src: 'cal' })),
      ...tlEvents.map(e => ({ ...e,  _src: 'tl'  })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''));

    if (combined.length === 0) {
      listEl.innerHTML = `<div class="empty-state">近期沒有活動</div>`;
      return;
    }

    listEl.innerHTML = combined.map(ev => {
      const d         = new Date(ev.date + 'T00:00:00');
      const mon       = monthsEn[d.getMonth()];
      const day       = d.getDate();
      const isToday   = ev.date === today;
      const timeLabel = ev.meta || (ev.start ? `${ev.start} – ${ev.end}` : '全天');
      const pill      = ev.gcal
        ? `<span class="gcal-pill">Google - ${ev.calName || '日曆'}</span>`
        : ev._src === 'tl'
          ? '<span class="gcal-pill" style="background:var(--purple-bg);color:var(--purple-tx)">時間表</span>'
          : '';
      return `
        <div class="upcoming-item cal-clickable-item">
          <div class="upcoming-date">
            <div class="upcoming-month">${isToday ? 'TODAY' : mon}</div>
            <div class="upcoming-day" style="${isToday ? 'color:var(--accent)' : ''}">${day}</div>
          </div>
          <div class="upcoming-body">
            <div class="upcoming-name">${ev.name}</div>
            <div class="upcoming-meta">${timeLabel}</div>
            ${pill}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.cal-clickable-item').forEach((el, i) => {
      el.addEventListener('click', () => Modal.open('timeline', () => {}, combined[i], true));
    });
  },

  renderCalendar() {
    const { year, month } = this.calMonth;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('cal-month-title').textContent = `${monthNames[month]} ${year}`;

    const grid       = document.getElementById('cal-grid');
    const today      = Utils.fmtDate(new Date());
    const selDateStr = Store.get('selectedDate');

    // Collect event days from both calEvents and tlEvents
    const calEvents = Store.get('calEvents') || [];
    const tlEvents  = Store.get('tlEvents')  || [];
    const eventDays = new Set([
      ...calEvents.map(e => e.date),
      ...tlEvents.map(e => e.date),
    ]);

    const firstDay  = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDow  = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0

    const dayHeaders = ['一','二','三','四','五','六','日'];
    let html = dayHeaders.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    for (let i = 0; i < startDow; i++) html += `<div class="cal-cell other-month"></div>`;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr    = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday    = dateStr === today;
      const isSelected = dateStr === selDateStr && !isToday;
      const hasEvent   = eventDays.has(dateStr);
      html += `<div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''} ${hasEvent ? 'has-dot' : ''}" data-date="${dateStr}">${d}</div>`;
    }

    grid.innerHTML = html;

    // Attach click handlers to each date cell
    grid.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => this.selectDate(cell.dataset.date));
    });
  },

  renderDayEvents(dateStr) {
    const titleEl = document.getElementById('cal-list-title');
    const listEl  = document.getElementById('cal-list');
    if (!titleEl || !listEl) return;

    const d      = Utils.parseDate(dateStr);
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const days   = ['日','一','二','三','四','五','六'];
    titleEl.textContent = `${months[d.getMonth()]} ${d.getDate()}日 · 週${days[d.getDay()]}`;

    const calEvents = (Store.get('calEvents') || []).filter(e => e.date === dateStr);
    const tlEvents  = (Store.get('tlEvents')  || []).filter(e => e.date === dateStr);
    const combined  = [
      ...calEvents.map(e => ({ ...e, _src: 'cal' })),
      ...tlEvents.map(e => ({ ...e,  _src: 'tl'  })),
    ].sort((a, b) => (a.start || '').localeCompare(b.start || ''));

    if (combined.length === 0) {
      listEl.innerHTML = `<div class="empty-state">這天沒有活動</div>`;
      return;
    }

    const monthsEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    listEl.innerHTML = combined.map(ev => {
      const timeLabel = ev.meta || (ev.start ? `${ev.start} – ${ev.end}` : '全天');
      const pill = ev.gcal
        ? `<span class="gcal-pill">Google - ${ev.calName || '日曆'}</span>`
        : ev._src === 'tl'
          ? '<span class="gcal-pill" style="background:var(--purple-bg);color:var(--purple-tx)">時間表</span>'
          : '';
      return `
        <div class="upcoming-item cal-clickable-item">
          <div class="upcoming-date">
            <div class="upcoming-month">${monthsEn[d.getMonth()]}</div>
            <div class="upcoming-day">${d.getDate()}</div>
          </div>
          <div class="upcoming-body">
            <div class="upcoming-name">${ev.name}</div>
            <div class="upcoming-meta">${timeLabel}</div>
            ${pill}
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.cal-clickable-item').forEach((el, i) => {
      el.addEventListener('click', () => Modal.open('timeline', () => {}, combined[i], true));
    });
  },

  renderUpcoming() {
    const events    = Store.get('calEvents') || [];
    const today     = Utils.fmtDate(new Date()); // local time, not UTC
    const monthsEn  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const titleEl = document.getElementById('cal-list-title');
    const listEl  = document.getElementById('cal-list');
    if (!listEl) return;

    if (titleEl) titleEl.textContent = '即將到來';

    const future = events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);

    if (future.length === 0) {
      listEl.innerHTML = `<div class="empty-state">近期沒有活動</div>`;
      return;
    }

    listEl.innerHTML = future.map(ev => {
      const d   = new Date(ev.date + 'T00:00:00');
      const mon = monthsEn[d.getMonth()];
      const day = d.getDate();
      return `
        <div class="upcoming-item">
          <div class="upcoming-date">
            <div class="upcoming-month">${mon}</div>
            <div class="upcoming-day">${day}</div>
          </div>
          <div class="upcoming-body">
            <div class="upcoming-name">${ev.name}</div>
            <div class="upcoming-meta">${ev.meta}</div>
            ${ev.gcal ? `<span class="gcal-pill">Google - ${ev.calName || '日曆'}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },
};
