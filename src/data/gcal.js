// ── gcal.js — Google Calendar integration ────────────────

const GCal = (() => {
  const CLIENT_ID = '161440799211-3ihs9hppl6vuptv9f22jis4rkld5ccbm.apps.googleusercontent.com';
  const SCOPE     = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

  let tokenClient  = null;
  let accessToken  = null;

  let syncCount = 0;
  function _setSyncState(isSyncing) {
    if (isSyncing) {
      syncCount++;
      Store.set('syncStatus', 'syncing');
    } else {
      syncCount = Math.max(0, syncCount - 1);
      if (syncCount === 0) Store.set('syncStatus', 'synced');
    }
    const statusEl = document.getElementById('profile-status');
    if (statusEl) {
      const user = Store.get('user');
      if (!user) {
        statusEl.textContent = '未同步';
        statusEl.style.color = '#999';
      } else if (Store.get('syncStatus') === 'syncing') {
        statusEl.textContent = '↻ 同步中';
        statusEl.style.color = '#f39c12';
      } else {
        statusEl.textContent = '✓ 已同步';
        statusEl.style.color = 'var(--accent)';
      }
    }
  }

  function wrapSync(fn) {
    return async function(...args) {
      _setSyncState(true);
      try {
        return await fn(...args);
      } finally {
        _setSyncState(false);
      }
    };
  }

  function init() {
    if (typeof google === 'undefined') return;
    
    // Try to restore token from session (short-term persistence)
    const savedToken = sessionStorage.getItem('gcal_token');
    if (savedToken) {
      accessToken = savedToken;
      fetchUserInfo();
      fetchEvents();
      fetchTasks();
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPE,
      prompt:    'select_account consent', 
      callback:  (res) => {
        if (res.error) { 
          console.warn('GCal auth error', res);
          return; 
        }
        accessToken = res.access_token;
        sessionStorage.setItem('gcal_token', accessToken);
        console.log('GCal Token received');
        fetchUserInfo();
        fetchEvents();
        fetchTasks();
      },
    });
  }

  function login() {
    if (!tokenClient) { init(); }
    if (!tokenClient) { alert('Google 登入尚未載入，請稍後再試'); return; }
    tokenClient.requestAccessToken();
  }

  function logout() {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken);
      accessToken = null;
      sessionStorage.removeItem('gcal_token');
    }
    Store.set('calEvents', []);
    Store.set('user', null);
    _refreshCalendarUI();
    const prof = document.getElementById('screen-profile');
    if (prof && prof.classList.contains('active')) App.navigate('screen-profile');
  }

  async function fetchUserInfo() {
    if (!accessToken) return;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        Store.set('user', {
          email: data.email,
          name:  data.name || data.given_name || 'User',
          picture: data.picture
        });
        const prof = document.getElementById('screen-profile');
        if (prof && prof.classList.contains('active')) App.navigate('screen-profile');
      }
    } catch (err) { console.warn('User info fetch failed', err); }
  }

  async function createEvent(event, localId, calId = 'primary') {
    console.log('GCal.createEvent called', event);
    if (!accessToken) {
      console.log('No token, requesting...');
      login();
      return;
    }

    // Convert App event to GCal format
    const body = {
      summary: event.name,
      description: event.desc || '',
      location: event.loc || '',
      start: {},
      end: {},
    };

    if (event.isAllDay) {
      body.start.date = event.date;
      // GCal all-day end is exclusive. We need to add 1 day to the date.
      const d = new Date(event.date);
      d.setDate(d.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      body.end.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else {
      body.start.dateTime = `${event.date}T${event.startTime || '00:00'}:00`;
      body.end.dateTime   = `${event.date}T${event.endTime || '23:59'}:00`;
      body.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      body.end.timeZone   = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        console.log('Event synced to Google Calendar');
        if (localId) {
          Store.update('tlEvents', arr => (arr || []).filter(e => e.id !== localId));
        }
        fetchEvents(); // Refresh to show the synced event
      } else {
        const err = await res.json();
        console.error('Failed to sync event', err);
        alert('同步至 Google 日曆失敗: ' + (err.error?.message || '未知錯誤'));
      }
    } catch (err) {
      console.error('GCal sync error', err);
      alert('網路錯誤，無法同步至 Google 日曆');
    }
  }

  async function createTask(todo, localId) {
    console.log('GCal.createTask called', todo);
    if (!accessToken) {
      console.log('No token, requesting...');
      login();
      return;
    }

    const body = {
      title: todo.name,
      notes: todo.desc || '',
      due:   todo.date ? `${todo.date}T00:00:00Z` : undefined
    };

    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log('Task synced to Google Tasks');
        if (localId) {
          Store.update('todoItems', arr => (arr || []).filter(t => t.id !== localId));
        }
        fetchTasks(); 
      } else {
        const err = await res.json();
        console.error('Failed to sync task', err);
        if (res.status === 403 && err.error?.message?.includes('disabled')) {
          alert('同步失敗：請至 Google Cloud Console 啟用「Google Tasks API」。\n\n錯誤訊息：' + err.error.message);
        } else if (res.status === 403) {
          alert('同步失敗：權限不足。請登出後重新登入，並確保有勾選「Google 工作表 (Tasks)」權限。\n\n詳細訊息：' + (err.error?.message || '未知錯誤'));
        } else {
          alert('同步工作表失敗: ' + (err.error?.message || '未知錯誤'));
        }
      }
    } catch (err) {
      console.error('GTasks sync error', err);
      alert('網路錯誤，無法同步至 Google Tasks');
    }
  }

  async function fetchTasks() {
    if (!accessToken) return;
    _setSyncState(true);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const tasks = (data.items || []).map(t => ({
          id:      t.id,
          name:    t.title,
          desc:    t.notes || '',
          date:    t.due ? t.due.split('T')[0] : Store.get('selectedDate'),
          done:    t.status === 'completed',
          gcal:    true,
          category: 'todo'
        }));
        Store.set('gTasks', tasks);
        _refreshCalendarUI();

        // Auto restore habits if empty locally
        const localHabits = Store.get('habits') || [];
        if (localHabits.length === 0) {
          await restoreHabitsBackup();
        }
      }
    } catch (err) { 
      console.warn('Fetch tasks failed', err); 
    } finally {
      _setSyncState(false);
    }
  }

  async function fetchEvents() {
    if (!accessToken) return;

    _setSyncState(true);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    const now = startDate.toISOString();
    const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months later
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // Step 1: fetch all calendar IDs
      const listRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
        { headers }
      );
      if (!listRes.ok) {
        if (listRes.status === 403) {
          alert('讀取日曆失敗：權限不足。請登出後重新登入，並確保有勾選「Google 日曆」權限。');
        }
        throw new Error(`calendarList HTTP ${listRes.status}`);
      }
      const listData = await listRes.json();
      const calendars = listData.items || [];
      
      Store.set('gcalCalendars', calendars.map(c => ({
        id: c.id,
        summary: c.summary,
        color: c.backgroundColor || 'var(--accent)'
      })));
      if (typeof ProfileScreen !== 'undefined' && ProfileScreen.renderCalendars) {
        ProfileScreen.renderCalendars();
      }

      const hidden = Store.get('hiddenCalendars') || [];
      const activeCalendars = calendars.filter(c => !hidden.includes(c.id));

      // Step 2: fetch events from active calendars in parallel
      const results = await Promise.allSettled(
        activeCalendars.map(cal =>
          fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events` +
            `?timeMin=${encodeURIComponent(now)}` +
            `&timeMax=${encodeURIComponent(end)}` +
            `&singleEvents=true&orderBy=startTime&maxResults=100`,
            { headers }
          ).then(r => r.ok ? r.json() : Promise.reject(r.status))
           .then(data => ({ cal, items: data.items || [] }))
        )
      );

      // Step 3: merge, deduplicate by id
      const seen = new Set();
      const events = [];
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { cal, items } = result.value;
        for (const e of items) {
          const uid = 'gc_' + e.id;
          if (seen.has(uid)) continue;
          seen.add(uid);
          const isAllDay  = !!e.start.date;
          const dateStr   = (e.start.date || e.start.dateTime || '').slice(0, 10);
          const startTime = e.start.dateTime
            ? new Date(e.start.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '';
          const endTime = e.end && e.end.dateTime
            ? new Date(e.end.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '';
          events.push({
            id:        uid,
            name:      e.summary || '(無標題)',
            date:      dateStr,
            startTime: startTime,
            endTime:   endTime,
            isAllDay:  isAllDay,
            meta:      isAllDay ? '全天' : `${startTime}${endTime ? ' – ' + endTime : ''}`,
            calName:   cal.summary || '',
            calId:     cal.id,
            desc:      e.description || '',
            location:  e.location || '',
            gcal:      true,
          });
        }
      }

      Store.set('calEvents', events);
      _refreshCalendarUI();
    } catch (err) {
      console.warn('GCal fetch failed', err);
    } finally {
      _setSyncState(false);
    }
  }

  function _refreshCalendarUI() {
    if (document.getElementById('cal-grid'))  CalendarScreen.renderCalendar();
    if (document.getElementById('cal-list'))  CalendarScreen.renderAll();
  }

  async function updateEvent(eventId, event, calId = 'primary') {
    if (!accessToken) return;
    const gcalId = eventId.replace(/^gc_/, '');

    const body = {
      summary: event.name,
      description: event.desc || '',
      location: event.loc || '',
      start: {},
      end: {},
    };

    if (event.isAllDay) {
      body.start.date = event.date;
      const d = new Date(event.date);
      d.setDate(d.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      body.end.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else {
      body.start.dateTime = `${event.date}T${event.startTime || '00:00'}:00`;
      body.end.dateTime   = `${event.date}T${event.endTime || '23:59'}:00`;
      body.start.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      body.end.timeZone   = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${gcalId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        console.log('Event updated in Google Calendar');
        fetchEvents();
      } else {
        const err = await res.json();
        console.error('Failed to update event', err);
        if (res.status === 403) {
          alert('更新失敗：權限不足。請登出後重新登入，並確保有勾選「Google 日曆」權限。');
        } else {
          alert('更新至 Google 日曆失敗: ' + (err.error?.message || '未知錯誤'));
        }
      }
    } catch (err) {
      console.error('GCal update error', err);
      alert('網路錯誤，無法更新至 Google 日曆');
    }
  }

  async function updateTask(taskId, todo) {
    if (!accessToken) return;
    
    const body = {
      id: taskId,
      title: todo.name,
      notes: todo.desc || '',
      due:   todo.date ? `${todo.date}T00:00:00Z` : undefined
    };

    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log('Task updated in Google Tasks');
        fetchTasks(); 
      } else {
        const err = await res.json();
        console.error('Failed to update task', err);
        if (res.status === 403) {
          alert('更新失敗：權限不足。請登出後重新登入，並確保有勾選「Google 工作表 (Tasks)」權限。');
        } else {
          alert('同步工作表失敗: ' + (err.error?.message || '未知錯誤'));
        }
      }
    } catch (err) {
      console.error('GTasks update error', err);
      alert('網路錯誤，無法更新至 Google Tasks');
    }
  }

  async function deleteTask(taskId) {
    if (!accessToken) return;
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        console.log('Task deleted from Google Tasks');
        fetchTasks();
      } else {
        console.error('Failed to delete task', await res.json());
        alert('刪除工作表失敗');
      }
    } catch (err) {
      console.error('GTasks delete error', err);
    }
  }

  async function deleteEvent(eventId, calId = 'primary') {
    if (!accessToken) return;
    const gcalId = eventId.replace(/^gc_/, '');
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${gcalId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        console.log('Event deleted from Google Calendar');
        fetchEvents();
      } else {
        console.error('Failed to delete event', await res.json());
        alert('刪除日曆事件失敗');
      }
    } catch (err) {
      console.error('GCal delete error', err);
    }
  }

  // -----------------------------------------
  // Hidden Backup via Google Tasks
  // -----------------------------------------
  const BACKUP_LIST_NAME = '[Daily Life] 資料備份 (請勿刪除)';
  const HABITS_TASK_TITLE = '習慣紀錄備份';

  async function _getOrCreateBackupList() {
    if (!accessToken) return null;
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      let list = (data.items || []).find(l => l.title === BACKUP_LIST_NAME);
      if (list) return list.id;

      const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: BACKUP_LIST_NAME })
      });
      const newList = await createRes.json();
      return newList.id;
    } catch (e) {
      console.warn('Backup list error', e);
      return null;
    }
  }

  async function _getOrCreateBackupTask(listId) {
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showHidden=true`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      let task = (data.items || []).find(t => t.title === HABITS_TASK_TITLE);
      if (task) return task.id;

      const createRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: HABITS_TASK_TITLE })
      });
      const newTask = await createRes.json();
      return newTask.id;
    } catch (e) {
      console.warn('Backup task error', e);
      return null;
    }
  }

  async function syncHabitsBackup() {
    const prefs = Store.get('prefs');
    if (!prefs || !prefs.gcal || !accessToken) return;
    try {
      const listId = await _getOrCreateBackupList();
      if (!listId) return;
      const taskId = await _getOrCreateBackupTask(listId);
      if (!taskId) return;
      const habits = Store.get('habits') || [];
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, title: HABITS_TASK_TITLE, notes: JSON.stringify(habits) })
      });
      console.log('Habits backup synced');
    } catch (e) {
      console.error('Failed to sync habits backup', e);
    }
  }

  async function restoreHabitsBackup() {
    if (!accessToken) return;
    try {
      const listId = await _getOrCreateBackupList();
      if (!listId) return;
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showHidden=true`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      const task = (data.items || []).find(t => t.title === HABITS_TASK_TITLE);
      if (task && task.notes) {
        try {
          const habits = JSON.parse(task.notes);
          if (Array.isArray(habits)) {
            Store.set('habits', habits);
            if (typeof HomeScreen !== 'undefined' && HomeScreen.renderHabits) {
              HomeScreen.renderHabits();
            }
            console.log('Habits restored from backup');
          }
        } catch (err) { console.warn('Parse habits backup error', err); }
      }
    } catch (e) { console.error('Failed to restore habits', e); }
  }

  return { 
    init, login, logout, fetchUserInfo,
    fetchEvents: wrapSync(fetchEvents),
    fetchTasks: wrapSync(fetchTasks),
    createEvent: wrapSync(createEvent),
    createTask: wrapSync(createTask),
    updateEvent: wrapSync(updateEvent),
    updateTask: wrapSync(updateTask),
    deleteEvent: wrapSync(deleteEvent),
    deleteTask: wrapSync(deleteTask),
    syncHabitsBackup: wrapSync(syncHabitsBackup),
    restoreHabitsBackup: wrapSync(restoreHabitsBackup)
  };
})();
