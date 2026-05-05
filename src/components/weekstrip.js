const WeekStrip = {
  weekOffset: 0, // 0 = current week; +1 = next week; -1 = prev week

  render(containerId, onDayClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const now        = new Date();
    const selDateStr = Store.get('selectedDate');
    const todayStr   = Utils.fmtDate(now);
    const labels     = ['日', '一', '二', '三', '四', '五', '六'];

    // Monday of (current week + weekOffset)
    const dow    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + this.weekOffset * 7);

    const tlEvents = Store.get('tlEvents') || [];

    let colsHTML = '';
    for (let i = 0; i < 7; i++) {
      const d        = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr     = Utils.fmtDate(d);
      const isSelected    = dStr === selDateStr;
      const isActualToday = dStr === todayStr;
      const hasEvent      = tlEvents.some(e => e.date === dStr);

      colsHTML += `
        <div class="week-col" data-date="${dStr}">
          <div class="week-name">${labels[d.getDay()]}</div>
          <div class="week-num ${isSelected ? 'selected' : ''} ${isActualToday ? 'is-today' : ''}">${d.getDate()}</div>
          <div class="week-dot ${hasEvent ? 'visible' : ''}"></div>
        </div>
      `;
    }

    container.innerHTML = `<div class="week-strip-inner">${colsHTML}</div>`;

    // Day-click listeners
    container.querySelectorAll('.week-col').forEach(col => {
      col.addEventListener('click', () => {
        if (onDayClick) onDayClick(Utils.parseDate(col.dataset.date));
      });
    });

    // Bind swipe once per DOM element lifetime
    if (!container._wsBound) {
      container._wsBound = true;
      this._bindSwipe(containerId, onDayClick);
    }
  },

  _bindSwipe(containerId, onDayClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let startX = 0, startY = 0;

    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        const dir = dx < 0 ? 1 : -1; // 1 = next week, -1 = prev week
        this.weekOffset += dir;
        this._renderAnimated(containerId, onDayClick, dir);
      }
    }, { passive: true });
  },

  _renderAnimated(containerId, onDayClick, dir) {
    const container = document.getElementById(containerId);
    if (!container) { this.render(containerId, onDayClick); return; }

    const inner = container.querySelector('.week-strip-inner');
    if (!inner)   { this.render(containerId, onDayClick); return; }

    const outX = dir > 0 ? '-110%' : '110%';
    const inX  = dir > 0 ?  '110%' : '-110%';

    // Slide current inner out
    inner.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    inner.style.transform  = `translateX(${outX})`;
    inner.style.opacity    = '0';

    setTimeout(() => {
      this.render(containerId, onDayClick); // rebuilds innerHTML → new inner
      const newInner = container.querySelector('.week-strip-inner');
      if (!newInner) return;
      newInner.style.transition = 'none';
      newInner.style.transform  = `translateX(${inX})`;
      newInner.style.opacity    = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        newInner.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        newInner.style.transform  = 'translateX(0)';
        newInner.style.opacity    = '1';
      }));
    }, 200);
  },
};
