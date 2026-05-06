// ── timeline.js — Timeline screen ────────────────────────

const TimelineScreen = {
  id: 'screen-timeline',

  HOURS: Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, h })),

  template() {
    return `
      <div class="tl-sticky-header">
        <div class="header">
          <div class="header-row">
            <div>
              <div class="header-title">今天</div>
              <div class="header-sub" id="tl-date"></div>
            </div>
            <div class="tl-clock" id="tl-clock"></div>
          </div>
        </div>
        <div class="week-strip" id="tl-week-strip"></div>
      </div>
      <div class="scroll-area">
        <div class="timeline-wrap" id="tl-timeline"></div>
      </div>
    `;
  },

  onDaySelect(date) {
    Store.set('selectedDate', Utils.fmtDate(date));
    this.renderDate();
    this.renderTimeline();
    WeekStrip.render('tl-week-strip', (d) => this.onDaySelect(d));
  },

  _clockTimer: null,

  updateClock() {
    const el = document.getElementById('tl-clock');
    if (!el) { clearInterval(this._clockTimer); return; }
    const now = new Date();
    el.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  },

  scrollToNow() {
    const today = Utils.fmtDate(new Date());
    const isToday = Store.get('selectedDate') === today;

    const doScroll = () => {
      const nowH       = new Date().getHours();
      const row        = document.querySelector(`#tl-timeline .tl-row[data-hour="${nowH}"]`);
      const scrollArea = document.querySelector('#screen-timeline .scroll-area');
      if (!row || !scrollArea) return;
      const rowRect  = row.getBoundingClientRect();
      const areaRect = scrollArea.getBoundingClientRect();
      const target   = scrollArea.scrollTop + rowRect.top - areaRect.top
                       - scrollArea.clientHeight / 2 + row.offsetHeight / 2;
      scrollArea.scrollTo({ top: target, behavior: 'smooth' });
    };

    if (!isToday) {
      Store.set('selectedDate', today);
      this.renderDate();
      this.renderTimeline();
      WeekStrip.render('tl-week-strip', (d) => this.onDaySelect(d));
      setTimeout(doScroll, 80);
    } else {
      doScroll();
    }
  },

  mount() {
    this.updateClock();
    this._clockTimer = setInterval(() => this.updateClock(), 30000);

    document.getElementById('tl-clock').addEventListener('click', () => this.scrollToNow());

    this.renderDate();
    WeekStrip.render('tl-week-strip', (d) => this.onDaySelect(d));
    this.renderTimeline();
  },

  renderDate() {
    const selDateStr = Store.get('selectedDate');
    const d = Utils.parseDate(selDateStr);
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const days   = ['日','一','二','三','四','五','六'];
    const titleEl = document.querySelector('#screen-timeline .header-title');
    const subEl   = document.getElementById('tl-date');
    
    const today = Utils.fmtDate(new Date());
    if (titleEl) titleEl.textContent = (selDateStr === today) ? '今天' : '日程';
    
    if (subEl) {
      subEl.textContent = `${d.getFullYear()}年 ${months[d.getMonth()]} ${d.getDate()}日 · 週${days[d.getDay()]}`;
    }
  },

  parseHour(t) { return parseInt((t || '00:00').split(':')[0]); },

  fmtTime(t) {
    if (!t) return '';
    const [hStr, m] = t.split(':');
    return `${parseInt(hStr)}:${m}`;
  },

  renderTimeline() {
    const wrap   = document.getElementById('tl-timeline');
    const selectedDate = Store.get('selectedDate');
    const dayOfWeek    = Utils.parseDate(selectedDate).getDay();

    // Regular timeline events — split into all-day and timed
    const tlEvents    = Store.get('tlEvents') || [];
    const calEvents   = Store.get('calEvents') || [];
    
    // Combine and filter for selected date
    const dayCalEvents = calEvents.filter(e => e.date === selectedDate);
    // De-duplicate: Hide local event if a Google event with same name exists
    const dayTlEvents  = tlEvents.filter(e => {
      if (e.date !== selectedDate) return false;
      const isDuplicate = dayCalEvents.some(ce => ce.name === e.name);
      return !isDuplicate;
    });
    
    const dayEvents    = [...dayTlEvents, ...dayCalEvents];

    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents  = dayEvents.filter(e => !e.isAllDay);

    // Habits for this day
    const allHabits = Store.get('habits') || [];
    const habits = allHabits.filter(h => !h.days || h.days.includes(dayOfWeek));

    if (!wrap) return;

    // All-day events — rendered as full-width rows above the hour grid
    const allDayHTML = allDayEvents.map((ev, i) => {
      const c = ev.gcal ? { bg: '#EAF0FD', tx: '#1A3E7A' } : (EVENT_COLORS[ev.colorIdx] || EVENT_COLORS[0]);
      const showLabel = i === 0;
      return `
        <div class="tl-row tl-allday-row">
          <div class="tl-time-label tl-allday-label">${showLabel ? 'All Day' : ''}</div>
          <div class="tl-axis">
            <div class="tl-axis-dot has-event"></div>
          </div>
          <div class="tl-content">
            <div class="tl-event-block tl-allday-event ${ev.gcal ? 'gcal-type' : ''}" data-id="${ev.id}" style="background:${c.bg}">
              <div class="tl-event-title" style="color:${c.tx}">
                ${ev.gcal ? '🗓️ ' : ''}
                ${ev.name}
              </div>
              ${ev.desc ? `<div class="tl-event-desc" style="color:${c.tx}">${ev.desc}</div>` : ''}
              ${ev.gcal ? `<div class="tl-gcal-badge" style="color:${c.tx}; border-color:${c.tx}33">Google · ${ev.calName || '日曆'}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Hour rows (timed events + habits)
    const hoursHTML = this.HOURS.map(({ label, h }) => {
      const eventsHere = timedEvents.filter(e => this.parseHour(e.start) === h);
      const habitsHere = habits.filter(hb => this.parseHour(hb.time) === h);

      const hasItem = eventsHere.length > 0 || habitsHere.length > 0;

      const evHTML = eventsHere.map(ev => {
        const c = ev.gcal ? { bg: '#EAF0FD', tx: '#1A3E7A' } : (EVENT_COLORS[ev.colorIdx] || EVENT_COLORS[0]);
        return `
          <div class="tl-event-block ${ev.gcal ? 'gcal-type' : ''}" data-id="${ev.id}" style="background:${c.bg}">
            <div class="tl-event-title" style="color:${c.tx}">
              ${ev.gcal ? '🗓️ ' : ''}${ev.name}
            </div>
            ${ev.location ? `<div class="tl-event-loc" style="color:${c.tx}">📍 ${ev.location}</div>` : ''}
            ${ev.desc ? `<div class="tl-event-desc" style="color:${c.tx}">${ev.desc}</div>` : ''}
            <div class="tl-event-time" style="color:${c.tx}">
              ${this.fmtTime(ev.startTime || ev.start)}${ev.endTime || ev.end ? ' – ' + this.fmtTime(ev.endTime || ev.end) : ''}
            </div>
            ${ev.gcal ? `<div class="tl-gcal-badge" style="color:${c.tx}; border-color:${c.tx}33">Google · ${ev.calName || '日曆'}</div>` : ''}
          </div>
        `;
      }).join('');

      const hbHTML = habitsHere.map(hb => {
        const start = hb.time || '08:00';
        const dur   = hb.duration || 30;
        const [hStr, mStr] = start.split(':');
        const startTotal = parseInt(hStr) * 60 + parseInt(mStr);
        const endTotal   = startTotal + dur;
        const endH   = Math.floor(endTotal / 60);
        const endM   = endTotal % 60;
        const endFmt = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        return `
          <div class="tl-event-block habit-type" data-habit-id="${hb.id}" style="background:${hb.color}">
            <div class="tl-event-title" style="color:${hb.colorTx}">
              ${hb.name}
            </div>
            <div class="tl-event-time" style="color:${hb.colorTx}">
              ${this.fmtTime(start)} – ${this.fmtTime(endFmt)} · ${dur}分鐘
            </div>
          </div>
        `;
      }).join('');

      const emptyHTML = !hasItem ? `<div class="tl-empty-slot" data-hour="${h}"></div>` : '';

      return `
        <div class="tl-row" data-hour="${h}">
          <div class="tl-time-label">${label}</div>
          <div class="tl-axis">
            <div class="tl-axis-dot ${hasItem ? 'has-event' : ''}"></div>
          </div>
          <div class="tl-content">${evHTML}${hbHTML}${emptyHTML}</div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = allDayHTML + hoursHTML;

    // Current time indicator — only on today
    const todayStr = Utils.fmtDate(new Date());
    if (selectedDate === todayStr) {
      const now    = new Date();
      const nowH   = now.getHours();
      const nowM   = now.getMinutes();
      const currentRow = wrap.querySelector(`.tl-row[data-hour="${nowH}"]`);

      if (currentRow) {
        const dot = currentRow.querySelector('.tl-axis-dot');
        if (dot) dot.classList.add('now');

        const content = currentRow.querySelector('.tl-content');
        if (content) {
          const nowFmt = this.fmtTime(
            `${String(nowH).padStart(2,'0')}:${String(nowM).padStart(2,'0')}`
          );
          const nowEl = document.createElement('div');
          nowEl.className = 'tl-now-line';
          nowEl.innerHTML = `
            <div class="tl-now-dot"></div>
            <div class="tl-now-bar"></div>
            <span class="tl-now-time">${nowFmt}</span>
          `;
          content.insertBefore(nowEl, content.firstChild);
        }

        setTimeout(() => {
          const scrollArea = document.querySelector('#screen-timeline .scroll-area');
          if (!scrollArea) return;
          const rowRect  = currentRow.getBoundingClientRect();
          const areaRect = scrollArea.getBoundingClientRect();
          const target   = scrollArea.scrollTop + rowRect.top - areaRect.top
                           - scrollArea.clientHeight / 2 + currentRow.offsetHeight / 2;
          scrollArea.scrollTo({ top: target, behavior: 'smooth' });
        }, 80);
      }
    }

    // All event block interactions (all-day + timed)
    wrap.querySelectorAll('.tl-event-block').forEach(block => {
      const id   = block.dataset.id;
      const hbId = block.dataset.habitId;

      if (id) {
        block.addEventListener('click', (e) => {
          e.stopPropagation();
          const ev = dayEvents.find(x => x.id === id);
          Modal.open('timeline', () => this.renderTimeline(), ev, true);
        });
        App.bindLongPress(block, () => {
          const ev = dayEvents.find(x => x.id === id);
          Modal.open('timeline', () => this.renderTimeline(), ev, false);
        });
      } else if (hbId) {
        const hb = habits.find(x => x.id === hbId);
        block.addEventListener('click', () => Modal.open('habit', () => this.renderTimeline(), hb, true));
        App.bindLongPress(block, () => Modal.open('habit', () => this.renderTimeline(), hb, false));
      }
    });

    // Empty slot click
    wrap.querySelectorAll('.tl-empty-slot').forEach(slot => {
      slot.addEventListener('click', () => Modal.open('timeline', () => this.renderTimeline()));
    });
  },
};
