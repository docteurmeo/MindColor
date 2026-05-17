// MindColor — Theme controller (light/dark)
// - Persists choice in localStorage("mc-theme")
// - Falls back to prefers-color-scheme
// - Toggle component mounted into every [data-toggle-slot]
// - Applies smooth color crossfade via .theme-animating class (CSS handles it)

const Theme = (() => {
  const STORAGE_KEY = "mc-theme";
  const FADE_MS = 420;

  function current() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function apply(theme, animate) {
    const html = document.documentElement;
    if (animate) {
      html.classList.add("theme-animating");
      window.setTimeout(() => html.classList.remove("theme-animating"), FADE_MS + 60);
    }
    html.setAttribute("data-theme", theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    const meta = document.getElementById("meta-theme-color");
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0e0d0c" : "#ffffff");
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark", true);
  }

  function mountAll() {
    const tpl = document.getElementById("tpl-theme-toggle");
    if (!tpl) return;
    document.querySelectorAll("[data-toggle-slot]").forEach((slot) => {
      if (slot.dataset.mounted) return;
      slot.appendChild(tpl.content.cloneNode(true));
      slot.dataset.mounted = "1";
    });
  }

  document.addEventListener("DOMContentLoaded", mountAll);
  // Already-parsed body case:
  if (document.readyState !== "loading") mountAll();

  // System theme change → follow only if user hasn't explicitly chosen
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? "dark" : "light", true);
    });
  }

  // Click handler — delegated
  document.addEventListener("click", (e) => {
    const t = e.target.closest('[data-action="toggle-theme"]');
    if (t) toggle();
  });

  return { current, apply, toggle };
})();
