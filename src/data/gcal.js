// ── gcal.js — Google Calendar integration ────────────────

const GCal = (() => {
  const CLIENT_ID = '161440799211-3ihs9hppl6vuptv9f22jis4rkld5ccbm.apps.googleusercontent.com';
  const SCOPE     = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

  let tokenClient  = null;
  let accessToken  = null;

  function init() {
    if (typeof google === 'undefined') return;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPE,
      prompt:    'select_account consent', 
      callback:  (res) => {
        if (res.error) { 
          console.warn('GCal auth error', res);
          alert('Google 授權失敗: ' + (res.error_description || res.error));
          return; 
        }
        accessToken = res.access_token;
        console.log('GCal Token received');
        fetchUserInfo();
        fetchEvents();
        fetchTasks(); // Added tasks fetch
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

  async function createEvent(event) {
    if (!accessToken) {
      alert('尚未獲得 Google 授權，請先登入');
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
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        console.log('Event synced to Google Calendar');
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

  async function createTask(todo) {
    if (!accessToken) return;

    const body = {
      title: todo.name,
      notes: todo.desc || '',
      due:   todo.date ? `${todo.date}T00:00:00Z` : undefined
    };

    try {
      const res = await fetch('https://www.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        console.log('Task synced to Google Tasks');
        fetchTasks(); 
      } else {
        const err = await res.json();
        console.error('Failed to sync task', err);
        if (res.status === 403) {
          alert('同步失敗：權限不足。請登出後重新登入，並確保有勾選「Google 工作表 (Tasks)」權限。');
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
    try {
      const res = await fetch('https://www.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false', {
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
      }
    } catch (err) { console.warn('Fetch tasks failed', err); }
  }

  async function fetchEvents() {
    if (!accessToken) return;

    const now = new Date().toISOString();
    const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // Step 1: fetch all calendar IDs
      const listRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
        { headers }
      );
      if (!listRes.ok) throw new Error(`calendarList HTTP ${listRes.status}`);
      const listData = await listRes.json();
      const calendars = listData.items || [];

      // Step 2: fetch events from every calendar in parallel
      const results = await Promise.allSettled(
        calendars.map(cal =>
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
            gcal:      true,
          });
        }
      }

      Store.set('calEvents', events);
      _refreshCalendarUI();
    } catch (err) {
      console.warn('GCal fetch failed', err);
    }
  }

  function _refreshCalendarUI() {
    if (document.getElementById('cal-grid'))  CalendarScreen.renderCalendar();
    if (document.getElementById('cal-list'))  CalendarScreen.renderAll();
  }

  return { init, login, logout, fetchEvents, fetchTasks, createEvent, createTask };
})();
