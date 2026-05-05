// ── navbar.js — Bottom navigation ────────────────────────

const Navbar = {
  init() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const target = item.dataset.screen;
        if (target) App.navigate(target);
      });
    });
  },

  setActive(screenId) {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });
  },
};
