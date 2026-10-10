import { useEffect, useState } from "react";
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  Check,
  FolderKanban,
  GraduationCap,
  Pause,
  Play,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { applyMotion, readMotion, saveMotion } from "./lib/motion";

// Small CSS sculptures: no 3D engine, images, network requests or mouse tracking.
// The cards change with the current page, so the artwork belongs to the planner.
const scenes = {
  overview: [GraduationCap, CalendarDays],
  opportunities: [GraduationCap, Sparkles],
  applications: [Send, Check],
  projects: [FolderKanban, Check],
  prep: [BookOpen, GraduationCap],
  planner: [CalendarDays, Check],
  calendar: [CalendarDays, CalendarDays],
  contacts: [UsersRound, Send],
  resources: [Bookmark, BookOpen],
} as const;

export function CrystalScene({ view }: { view: keyof typeof scenes }) {
  const [First, Second] = scenes[view];
  return (
    <div className="crystal-scene" aria-hidden="true">
      <div className="crystal-aura" />
      <div className="crystal-orbit" />
      <div className="crystal-float">
        <div className="crystal-gem">
          {Array.from({ length: 6 }, (_, i) => (
            <span className={`gem-facet facet-${i + 1}`} key={i} />
          ))}
          <span className="gem-glint" />
        </div>
      </div>
      <div className="crystal-cube-float">
        <div className="crystal-cube">
          {["front", "back", "left", "right", "top", "bottom"].map((face) => (
            <span className={`cube-face cube-${face}`} key={face} />
          ))}
        </div>
      </div>
      <div className="crystal-mini-card crystal-mini-first">
        <First size={25} strokeWidth={1.6} />
        <span className="mini-line" />
        <span className="mini-line short" />
      </div>
      <div className="crystal-mini-card crystal-mini-second">
        <Second size={24} strokeWidth={1.7} />
        <span className="mini-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
      <span className="crystal-star star-one" />
      <span className="crystal-star star-two" />
      <span className="crystal-sphere" />
    </div>
  );
}

export function MotionToggle() {
  const [enabled, setEnabled] = useState(readMotion);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    applyMotion(enabled);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncDevice = () => setReduced(media.matches);
    const syncTab = (event: StorageEvent) => {
      if (event.key === "launchpad-motion" || event.key === null) {
        setEnabled(readMotion());
      }
    };
    media.addEventListener("change", syncDevice);
    window.addEventListener("storage", syncTab);
    return () => {
      media.removeEventListener("change", syncDevice);
      window.removeEventListener("storage", syncTab);
    };
  }, [enabled]);
  const playing = enabled && !reduced;
  return (
    <button
      className="motion-toggle"
      type="button"
      aria-label={
        reduced
          ? "Animations off: device prefers reduced motion"
          : playing
            ? "Pause animations"
            : "Play animations"
      }
      aria-pressed={playing}
      disabled={reduced}
      onClick={() => {
        saveMotion(!enabled);
        setEnabled(!enabled);
      }}
    >
      {playing ? <Pause size={15} /> : <Play size={15} />}
      <span>{playing ? "Motion on" : "Motion off"}</span>
    </button>
  );
}
