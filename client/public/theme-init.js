// Runs before first paint to avoid a flash of the wrong theme.
// Reads a per-browser convenience copy of the theme preference; the account setting is the source of truth.
(function () {
  try {
    var theme = window.localStorage.getItem('voyage.theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    var motion = window.localStorage.getItem('voyage.motion');
    if (motion === 'reduce' || motion === 'full') {
      document.documentElement.setAttribute('data-motion', motion);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the system theme applies.
  }
})();
