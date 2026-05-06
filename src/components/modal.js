// ── modal.js — Add / Edit item modal ─────────────────────

const Modal = (() => {
  let editingItem      = null;
  let currentMode      = 'habit';
  let onSaveCallback   = null;
  let selectedColorIdx = 0;
  const COLORS         = EVENT_COLORS;

  let selectedDays     = [0,1,2,3,4,5,6]; // 0=Sun, 1=Mon...
  let selectedIcon     = '✅';
  let selectedDuration = 30; // mins
  let selectedCategory = 'timeline'; // 'timeline' or 'todo'
  let isAllDay         = false;

  const ICONS = ['🥤', '🧘', '📖', '🤸', '🏃', '💻', '🍎', '🥦', '💧', '🚶', '😴', '💊', '🔋', '📝', '🧹', '🎨', '🎸', '🌱'];

  function open(mode, callback, item = null, isViewOnly = false) {
    currentMode    = mode || 'habit';
    onSaveCallback = callback;
    editingItem    = item;
    selectedColorIdx = item ? (item.colorIdx ?? 0) : 0;
    selectedDays   = item ? (item.days || [0,1,2,3,4,5,6]) : [0,1,2,3,4,5,6];
    selectedIcon   = item ? (item.icon || '✅') : '✅';
    selectedDuration = item ? (item.duration || 30) : 30;
    selectedCategory = item ? (item.category || (mode === 'todo' ? 'todo' : 'timeline')) : (mode === 'todo' ? 'todo' : 'timeline');
    isAllDay       = item ? (item.isAllDay || false) : false;

    if (isViewOnly && item) {
      renderViewMode();
    } else {
      renderEditMode();
    }
    
    document.getElementById('modal-overlay').classList.add('open');
  }

  function renderViewMode() {
    const item = editingItem;
    const viewWrap = document.getElementById('modal-view-wrap');
    const formWrap = document.getElementById('modal-form-wrap');
    const titleEl  = document.getElementById('modal-title');
    const saveBtn  = document.getElementById('modal-save');
    const delBtn   = document.getElementById('modal-delete');

    viewWrap.style.display = 'block';
    formWrap.style.display = 'none';
    saveBtn.textContent = '編輯'; // Change Save to Edit in view mode
    delBtn.style.display = 'none'; // Hide delete in view mode

    let title = '詳細資訊';
    if (currentMode === 'habit') title = '每日習慣';
    else if (item.category === 'todo') title = '代辦事項';
    else title = '今日活動';

    titleEl.textContent = title;

    let timeStr = '';
    if (currentMode === 'habit') {
      timeStr = `${item.time || '08:00'} · ${item.duration || 30} 分鐘`;
    } else if (item.category === 'todo') {
      timeStr = item.date;
    } else if (item.isAllDay) {
      timeStr = `${item.date} · 全天`;
    } else if (item.meta) {
      // calEvent — use meta as time description
      timeStr = `${item.date} · ${item.meta}`;
    } else {
      timeStr = `${item.date} · ${item.start || ''}${item.end ? ' – ' + item.end : ''}`;
    }

    viewWrap.innerHTML = `
      <div class="view-item">
        <div class="view-icon-lg" style="background:${item.color ? item.color + '33' : 'var(--border)'}">
          ${Utils.getIcon(item.icon)}
        </div>
        <div class="view-main">
          <div class="view-name-lg">${item.name}</div>
          <div class="view-meta-lg">${timeStr}</div>
          ${item.location ? `<div class="view-meta-lg">📍 ${item.location}</div>` : ''}
          ${item.desc ? `<div class="view-desc-lg">${item.desc}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderEditMode() {
    const item = editingItem;
    const mode = currentMode;
    const isEdit = !!item;
    
    document.getElementById('modal-view-wrap').style.display = 'none';
    document.getElementById('modal-form-wrap').style.display = 'block';
    document.getElementById('modal-save').textContent = '儲存';

    let title = '新增事項';
    if (mode === 'habit') title = isEdit ? '編輯習慣' : '新增習慣';
    else if (mode === 'todo' || selectedCategory === 'todo') title = isEdit ? '編輯代辦事項' : '新增代辦事項';
    else title = isEdit ? '編輯事項' : '新增事項';

    document.getElementById('modal-title').textContent = title;

    // Show/hide delete button
    document.getElementById('modal-delete').style.display = isEdit ? 'block' : 'none';

    // Show/hide fields based on mode/category
    updateVisibility();

    // Set fields
    document.getElementById('modal-name').value  = item ? item.name : '';
    document.getElementById('modal-desc').value  = item ? (item.desc || '') : '';
    document.getElementById('modal-loc').value   = item ? (item.location || '') : '';
    document.getElementById('modal-start').value = item ? (item.start || '08:00') : '08:00';
    document.getElementById('modal-end').value   = item ? (item.end || '09:00') : '09:00';
    document.getElementById('modal-habit-time').value = item ? (item.time || '08:00') : '08:00';
    
    // Date
    const defaultDate = item ? item.date : Store.get('selectedDate');
    document.getElementById('modal-item-date').value = defaultDate;

    // Custom duration input
    const customInput = document.getElementById('modal-duration-custom');
    if (selectedDuration !== 10 && selectedDuration !== 30 && selectedDuration !== 60) {
      customInput.value = selectedDuration;
      customInput.style.display = 'block';
    } else {
      customInput.value = '';
      customInput.style.display = 'none';
    }

    if (item && mode === 'habit') {
      const idx = COLORS.findIndex(c => c.bg === item.color);
      if (idx !== -1) selectedColorIdx = idx;
    }

    renderIconPicker();
    renderColorPicker();
    renderDaySelector();
    renderDurationSelector();
    renderCategorySelector();
    renderAllDayChip();
  }

  function renderAllDayChip() {
    const chip   = document.getElementById('modal-allday-chip');
    const inputs = document.getElementById('modal-time-inputs');
    if (!chip || !inputs) return;
    chip.classList.toggle('selected', isAllDay);
    inputs.style.display = isAllDay ? 'none' : 'flex';
  }

  function updateVisibility() {
    const mode = currentMode;
    const cat  = selectedCategory;

    const wraps = {
      cat:    document.getElementById('modal-category-wrap'),
      date:   document.getElementById('modal-date-wrap'),
      tlTime: document.getElementById('modal-time-wrap'),
      hTime:  document.getElementById('modal-habit-time-wrap'),
      dur:    document.getElementById('modal-duration-wrap'),
      days:   document.getElementById('modal-days-wrap'),
      icon:   document.getElementById('modal-icon-wrap'),
      loc:    document.getElementById('modal-loc-wrap')
    };

    // Helper to safely set display
    const setDisp = (el, show) => { if (el) el.style.display = show ? 'block' : 'none'; };

    // Category & Date only for non-habit modes
    setDisp(wraps.cat,  mode !== 'habit');
    setDisp(wraps.date, mode !== 'habit');

    // Activity vs To-Do specific fields
    setDisp(wraps.tlTime, (mode !== 'habit' && cat === 'timeline'));
    setDisp(wraps.loc,    (mode !== 'habit' && cat === 'timeline'));
    
    // Habits specific
    setDisp(wraps.hTime, mode === 'habit');
    setDisp(wraps.dur,   mode === 'habit');
    setDisp(wraps.days,  mode === 'habit');

    // Icon is useful for everything now
    setDisp(wraps.icon, true);
  }

  function renderCategorySelector() {
    const selector = document.getElementById('modal-category-selector');
    if (!selector) return;
    const chips = selector.querySelectorAll('.cat-chip');
    chips.forEach(chip => {
      chip.classList.toggle('selected', chip.dataset.cat === selectedCategory);
    });
  }

  function close() {
    document.getElementById('modal-overlay').classList.remove('open');
    editingItem = null;
  }

  function renderDurationSelector() {
    const selector = document.getElementById('modal-duration-selector');
    if (!selector) return;
    const chips = selector.querySelectorAll('.duration-chip');
    const isCustomValue = selectedDuration !== 10 && selectedDuration !== 30 && selectedDuration !== 60;
    
    chips.forEach(chip => {
      const val = chip.dataset.mins;
      if (val === 'custom') {
        chip.classList.toggle('selected', isCustomValue);
      } else {
        chip.classList.toggle('selected', parseInt(val) === selectedDuration);
      }
    });
  }

  function renderDaySelector() {
    const btns = document.querySelectorAll('.day-btn');
    btns.forEach(btn => {
      const d = parseInt(btn.dataset.day);
      btn.classList.toggle('selected', selectedDays.includes(d));
    });
  }

  function renderIconPicker() {
    const ip = document.getElementById('modal-icon-picker');
    if (!ip) return;
    ip.innerHTML = ICONS.map(icon => `
      <div class="icon-item ${icon === selectedIcon ? 'selected' : ''}" data-icon="${icon}">
        ${icon}
      </div>
    `).join('');

    ip.querySelectorAll('.icon-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedIcon = item.dataset.icon;
        ip.querySelectorAll('.icon-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  }

  function renderColorPicker() {
    const cp = document.getElementById('modal-color-picker');
    if (!cp) return;
    cp.innerHTML = '';
    COLORS.forEach((c, i) => {
      const dot = document.createElement('div');
      dot.className = `color-dot ${i === selectedColorIdx ? 'selected' : ''}`;
      dot.style.background   = c.bg;
      dot.style.borderColor  = c.bd;
      dot.addEventListener('click', () => {
        selectedColorIdx = i;
        cp.querySelectorAll('.color-dot').forEach((d, j) => {
          d.className = `color-dot ${j === i ? 'selected' : ''}`;
        });
      });
      cp.appendChild(dot);
    });
  }

  function save() {
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn.textContent === '編輯') {
      renderEditMode();
      return;
    }

    const name = document.getElementById('modal-name').value.trim();
    if (!name) {
      document.getElementById('modal-name').focus();
      return;
    }

    const color = COLORS[selectedColorIdx];
    const date  = document.getElementById('modal-item-date').value || Store.get('selectedDate');

    if (currentMode === 'habit') {
      let duration = selectedDuration;
      const customInput = document.getElementById('modal-duration-custom');
      if (customInput.style.display === 'block') {
        duration = parseInt(customInput.value) || 30;
      }

      const habit = {
        id:       editingItem ? editingItem.id : 'h' + Date.now(),
        name,
        icon:     selectedIcon,
        color:    color.bg,
        colorBd:  color.bd,
        colorTx:  color.tx,
        time:     document.getElementById('modal-habit-time').value || '08:00',
        duration: duration,
        streak:   editingItem ? editingItem.streak : 1,
        done:     editingItem ? editingItem.done : false,
        days:     selectedDays,
      };
      Store.update('habits', (arr) => {
        if (editingItem) return arr.map(h => h.id === editingItem.id ? habit : h);
        return [...(arr || []), habit];
      });
    } else if (selectedCategory === 'todo') {
      const todo = {
        id:       editingItem ? editingItem.id : 'td' + Date.now(),
        category: 'todo',
        date,
        name,
        desc:     document.getElementById('modal-desc').value.trim(),
        icon:     selectedIcon,
        color:    color.bg,
        colorBd:  color.bd,
        colorTx:  color.tx,
        done:     editingItem ? editingItem.done : false,
      };
      if (!(editingItem && editingItem.gcal)) {
        Store.update('todoItems', (arr) => {
          const filtered = editingItem ? arr.filter(x => x.id !== editingItem.id) : (arr || []);
          return [...filtered, todo];
        });
      }

      // Sync To-do to GTasks
      console.log('Attempting GTasks sync...', todo);
      const prefs = Store.get('prefs');
      if (prefs && prefs.gcal) {
        if (editingItem && editingItem.gcal) {
          GCal.updateTask(editingItem.id, {
            name: todo.name,
            desc: todo.desc,
            date: todo.date
          });
        } else if (!editingItem) {
          GCal.createTask({
            name: todo.name,
            desc: todo.desc,
            date: todo.date
          });
        }
      } else {
        console.log('GTasks sync skipped: prefs.gcal is', prefs ? prefs.gcal : 'undefined');
      }
    } else {
      // Activities (Timeline)
      const item = {
        id:       editingItem ? editingItem.id : 'tl' + Date.now(),
        category: 'timeline',
        date,
        name,
        desc:     document.getElementById('modal-desc').value.trim(),
        location: document.getElementById('modal-loc').value.trim(),
        icon:     selectedIcon,
        isAllDay: isAllDay,
        start:    isAllDay ? '' : (document.getElementById('modal-start').value || '08:00'),
        end:      isAllDay ? '' : (document.getElementById('modal-end').value   || '09:00'),
        colorIdx: selectedColorIdx,
      };
      if (!(editingItem && editingItem.gcal)) {
        Store.update('tlEvents', (arr) => {
          const filtered = editingItem ? arr.filter(x => x.id !== editingItem.id) : (arr || []);
          const updated  = [...filtered, item];
          return updated.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        });
      }

      // Sync Activity to GCal
      console.log('Attempting GCal sync...', item);
      const prefs = Store.get('prefs');
      if (prefs && prefs.gcal) {
        if (editingItem && editingItem.gcal) {
          GCal.updateEvent(editingItem.id, {
            name: item.name,
            desc: item.desc,
            loc:  item.location,
            date: item.date,
            isAllDay: item.isAllDay,
            startTime: item.start,
            endTime:   item.end
          });
        } else if (!editingItem) {
          GCal.createEvent({
            name: item.name,
            desc: item.desc,
            loc:  item.location,
            date: item.date,
            isAllDay: item.isAllDay,
            startTime: item.start,
            endTime:   item.end
          });
        }
      } else {
        console.log('GCal sync skipped: prefs.gcal is', prefs ? prefs.gcal : 'undefined');
      }
    }

    close();
    if (onSaveCallback) onSaveCallback();
  }

  function remove() {
    if (!editingItem) return;
    if (!confirm('確定要刪除嗎？')) return;

    let key = 'tlEvents';
    if (currentMode === 'habit') key = 'habits';
    else if (editingItem.category === 'todo') key = 'todoItems';
    
    Store.update(key, (arr) => arr.filter(x => x.id !== editingItem.id));

    close();
    if (onSaveCallback) onSaveCallback();
  }

  function init() {
    document.getElementById('modal-overlay')
      .addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') close(); });

    document.getElementById('modal-cancel').addEventListener('click', close);
    document.getElementById('modal-save').addEventListener('click', save);
    document.getElementById('modal-delete').addEventListener('click', remove);

    // All-day toggle
    const alldayChip = document.getElementById('modal-allday-chip');
    if (alldayChip) {
      alldayChip.addEventListener('click', () => {
        isAllDay = !isAllDay;
        renderAllDayChip();
      });
    }

    // Category Selector
    document.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedCategory = chip.dataset.cat;
        renderCategorySelector();
        updateVisibility();
      });
    });

    // Duration selector
    document.querySelectorAll('.duration-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.mins;
        const customInput = document.getElementById('modal-duration-custom');
        
        if (val === 'custom') {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          selectedDuration = parseInt(val);
          customInput.style.display = 'none';
        }
        renderDurationSelector();
      });
    });

    // Day selector click
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = parseInt(btn.dataset.day);
        if (selectedDays.includes(d)) {
          selectedDays = selectedDays.filter(x => x !== d);
        } else {
          selectedDays.push(d);
        }
        renderDaySelector();
      });
    });
  }

  return { open, close, init };
})();
