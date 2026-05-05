// ── gcal.js — Google Calendar integration ────────────────

const GCal = (() => {
  const CLIENT_ID = '161440799211-3ihs9hppl6vuptv9f22jis4rkld5ccbm.apps.googleusercontent.com';
  const SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly';

  let tokenClient  = null;
  let accessToken  = null;

  function init() {
    if (typeof google === 'undefined') return;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPE,
      callback:  (res) => {
        if (res.error) { console.warn('GCal auth error', res); return; }
        accessToken = res.access_token;
        fetchEvents();
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
    _refreshCalendarUI();
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
            id:       uid,
            name:     e.summary || '(無標題)',
            date:     dateStr,
            meta:     isAllDay ? '全天' : `${startTime}${endTime ? ' – ' + endTime : ''}`,
            calName:  cal.summary || '',
            gcal:     true,
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

  return { init, login, logout, fetchEvents };
})();
