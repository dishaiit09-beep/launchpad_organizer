export type Theme = "light" | "dark";
const key = "launchpad-theme";
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(key, theme);
  } catch {}
}
