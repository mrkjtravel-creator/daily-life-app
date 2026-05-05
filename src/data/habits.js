// ── habits.js — Default habit data ───────────────────────
// Seeded on first launch. User can add / toggle / delete.

const DEFAULT_HABITS = [
  { id: 'h1', name: '喝一杯水',     icon: '🥤', color: '#EAF0FD', colorBd: '#A8C4F0', colorTx: '#1A3E7A', time: '06:00', streak: 3,  done: false },
  { id: 'h2', name: '晨間冥想',     icon: '🧘', color: '#E6F7EA', colorBd: '#A8E0B0', colorTx: '#1A6630', time: '06:15', streak: 8,  done: false },
  { id: 'h3', name: '閱讀 30 分鐘', icon: '📖', color: '#F0ECFD', colorBd: '#C4B0F0', colorTx: '#3A1E8A', time: '06:45', streak: 12, done: false },
  { id: 'h4', name: '拉伸 10 分鐘', icon: '🤸', color: '#E4F7F6', colorBd: '#2AAFA8', colorTx: '#1A7A76', time: '07:15', streak: 5,  done: false },
  { id: 'h5', name: '跑步 5km',      icon: '🏃', color: '#FDE8ED', colorBd: '#F7B5C2', colorTx: '#8A2040', time: '17:30', streak: 14, done: false },
  { id: 'h6', name: '學習 / 複習',  icon: '💻', color: '#FEF3E6', colorBd: '#F8CDA0', colorTx: '#8A4E1A', time: '20:30', streak: 6,  done: false },
];

// Seed habits into store on first run
(function seedHabits() {
  const existing = Store.get('habits');
  if (!existing || existing.length === 0) {
    Store.set('habits', DEFAULT_HABITS);
  }
})();
