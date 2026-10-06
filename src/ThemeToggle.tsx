import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, saveTheme } from "./lib/theme";
export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    applyTheme(theme);
    const sync = (event: StorageEvent) => {
      if (event.key === "launchpad-theme") setTheme(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [theme]);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="icon-button theme-toggle"
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        saveTheme(next);
        setTheme(next);
      }}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
