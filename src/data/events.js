// ── events.js — Timeline & Calendar event data ───────────

// Colour palette for events (index matches picker order)
const EVENT_COLORS = [
  { bg: '#FEF3E6', bd: '#F8CDA0', tx: '#8A4E1A' }, // peach
  { bg: '#EAF0FD', bd: '#A8C4F0', tx: '#1A3E7A' }, // blue
  { bg: '#FDE8ED', bd: '#F7B5C2', tx: '#8A2040' }, // pink
  { bg: '#F0ECFD', bd: '#C4B0F0', tx: '#3A1E8A' }, // purple
  { bg: '#E6F7EA', bd: '#A8E0B0', tx: '#1A6630' }, // green
  { bg: '#E4F7F6', bd: '#2AAFA8', tx: '#1A7A76' }, // teal
];

// Default timeline events for today
const TODAY = Utils.fmtDate(new Date());
const DEFAULT_TL_EVENTS = [];

// Calendar / upcoming events (including Google Calendar stubs)
const DEFAULT_CAL_EVENTS = [];

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return Utils.fmtDate(d);
}

// Seed on first run
(function seedEvents() {
  if (!Store.get('tlEvents') || Store.get('tlEvents').length === 0) {
    Store.set('tlEvents', DEFAULT_TL_EVENTS);
  }
  if (!Store.get('calEvents') || Store.get('calEvents').length === 0) {
    Store.set('calEvents', DEFAULT_CAL_EVENTS);
  }
})();
