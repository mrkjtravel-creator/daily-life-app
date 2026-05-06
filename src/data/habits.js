// ── habits.js — Default habit data ───────────────────────
// Seeded on first launch. User can add / toggle / delete.

const DEFAULT_HABITS = [];

// Seed habits into store on first run
(function seedHabits() {
  const existing = Store.get('habits');
  if (!existing || existing.length === 0) {
    Store.set('habits', DEFAULT_HABITS);
  }
})();
