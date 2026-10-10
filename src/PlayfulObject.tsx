import { BookOpen, Check, Sparkles, Star } from "lucide-react";

export type ObjectScene =
  | "overview"
  | "opportunities"
  | "applications"
  | "projects"
  | "prep"
  | "planner"
  | "calendar"
  | "contacts"
  | "resources";

// Decorative CSS objects inspired by the planner: no fake numbers or timers.
export function PlayfulObject({ view }: { view: ObjectScene }) {
  if (view === "opportunities")
    return (
      <div className="fun-object fun-rocket">
        <div className="rocket-flight">
          <span className="rocket-flame" />
          <span className="rocket-fin fin-left" />
          <span className="rocket-fin fin-right" />
          <span className="rocket-body">
            <i className="rocket-window" />
          </span>
        </div>
        <span className="object-star object-star-a">
          <Star />
        </span>
        <span className="object-star object-star-b">
          <Sparkles />
        </span>
      </div>
    );
  if (view === "applications")
    return (
      <div className="fun-object fun-pipeline">
        <span className="glass-pipe pipe-a" />
        <span className="glass-pipe pipe-b" />
        <span className="glass-pipe pipe-c" />
        <span className="pipe-node node-a" />
        <span className="pipe-node node-b" />
        <span className="pipe-node node-c" />
      </div>
    );
  if (view === "projects" || view === "planner")
    return (
      <div className="fun-object fun-treasure">
        <div className="treasure-lid" />
        <div className="treasure-mouth" />
        <div className="treasure-box">
          <span className="treasure-lock" />
        </div>
        <span className="treasure-token token-check">
          <Check />
        </span>
        <span className="treasure-token token-star">
          <Star />
        </span>
        <span className="treasure-token token-spark">
          <Sparkles />
        </span>
      </div>
    );
  if (view === "calendar")
    return (
      <div className="fun-object fun-wheel">
        <div className="wheel-spin">
          <span className="wheel-rim" />
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="wheel-spoke"
              style={{ transform: `rotate(${i * 45}deg)` }}
            />
          ))}
        </div>
        <span className="wheel-hub">
          <i />
          <b />
        </span>
      </div>
    );
  if (view === "contacts")
    return (
      <div className="fun-object fun-cloud">
        <span className="cloud-ball cloud-left" />
        <span className="cloud-ball cloud-right" />
        <span className="cloud-ball cloud-top" />
        <span className="cloud-ball cloud-base" />
        <span className="cloud-satellite satellite-a" />
        <span className="cloud-satellite satellite-b" />
      </div>
    );
  if (view === "resources")
    return (
      <div className="fun-object fun-books">
        <span className="floating-book book-back">
          <BookOpen />
        </span>
        <span className="floating-book book-front">
          <BookOpen />
        </span>
        <span className="object-star object-star-a">
          <Star />
        </span>
      </div>
    );
  return (
    <div className="fun-object fun-hourglass">
      <span className="hourglass-vessel" />
      <span className="hourglass-cap cap-top" />
      <span className="hourglass-cap cap-bottom" />
      <span className="hourglass-sand sand-top" />
      <span className="hourglass-sand sand-bottom" />
      <span className="hourglass-drop" />
      <span className="hourglass-check">
        <Check />
      </span>
      <span className="object-star object-star-a">
        <Star />
      </span>
    </div>
  );
}
