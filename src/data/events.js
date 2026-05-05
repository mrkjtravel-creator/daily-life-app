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
const DEFAULT_TL_EVENTS = [
  { id: 'tl1', date: TODAY, name: '晨間冥想',        desc: '放空 15 分鐘，整理思緒',    start: '06:00', end: '06:20', colorIdx: 5 },
  { id: 'tl2', date: TODAY, name: '閱讀時間',        desc: '《原子習慣》 — 第三章',     start: '06:30', end: '07:15', colorIdx: 1 },
  { id: 'tl3', date: TODAY, name: '早餐 & 準備出門', desc: '',                           start: '07:30', end: '08:00', colorIdx: 4 },
  { id: 'tl4', date: TODAY, name: '專案規劃',        desc: '整理本週工作清單',           start: '09:00', end: '10:30', colorIdx: 0 },
  { id: 'tl5', date: TODAY, name: '午休',            desc: '小睡 20 分鐘',               start: '12:30', end: '13:00', colorIdx: 4 },
  { id: 'tl6', date: TODAY, name: 'PACE APP 開發',   desc: '完善跑步社 PWA 會員功能',   start: '14:00', end: '16:00', colorIdx: 3 },
  { id: 'tl7', date: TODAY, name: '跑步',            desc: '5km 慢跑',                   start: '17:30', end: '18:30', colorIdx: 5 },
  { id: 'tl8', date: TODAY, name: '晚餐',            desc: '',                           start: '19:00', end: '19:30', colorIdx: 0 },
  { id: 'tl9', date: TODAY, name: '學習 / Claude Code', desc: '練習 Claude Code 技巧',  start: '20:30', end: '21:30', colorIdx: 1 },
  { id: 'tl10',date: TODAY, name: '就寢準備',        desc: '關閉螢幕，放鬆',            start: '22:30', end: '23:00', colorIdx: 2 },
];

// Calendar / upcoming events (including Google Calendar stubs)
const DEFAULT_CAL_EVENTS = [
  { id: 'c1',  date: offsetDate(5),  name: '母親節',            meta: '全天 · 台灣節日',      gcal: true },
  { id: 'c2',  date: offsetDate(9),  name: 'PACE 跑步社聚跑',   meta: '早上 7:00 · 金邊河濱', gcal: false },
  { id: 'c3',  date: offsetDate(14), name: '端午節',            meta: '全天 · 台灣節日',      gcal: true },
  { id: 'c4',  date: offsetDate(20), name: '健康檢查',          meta: '上午 10:00',           gcal: true },
  { id: 'c5',  date: offsetDate(28), name: 'Amazon 選品截止',   meta: '月底 deadline',        gcal: false },
];

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
