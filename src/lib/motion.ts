// This is an appearance preference on this device, not private account data.
const key = "launchpad-motion";
export function readMotion() {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "on" || saved === "off") return saved === "on";
  } catch {
    // Appearance controls still work when browser storage is unavailable.
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function applyMotion(enabled: boolean) {
  document.documentElement.dataset.motion = enabled ? "on" : "off";
}
export function saveMotion(enabled: boolean) {
  try {
    localStorage.setItem(key, enabled ? "on" : "off");
  } catch {
    // Keep the current choice for this visit.
  }
  applyMotion(enabled);
}
