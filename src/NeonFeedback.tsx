import { useEffect, useRef, useState } from "react";

type Ripple = { id: number; x: number; y: number };

// Visual feedback only. Do not prevent clicks, read input values or save positions.
export function NeonFeedback() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const glow = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        media.matches ||
        document.documentElement.dataset.motion === "off"
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(':disabled, [aria-disabled="true"]')) return;
      const ripple = {
        id: ++counter.current,
        x: event.clientX,
        y: event.clientY,
      };
      setRipples((previous) => [...previous.slice(-5), ripple]);
      const timer = setTimeout(() => {
        setRipples((previous) =>
          previous.filter((item) => item.id !== ripple.id),
        );
        timers.delete(timer);
      }, 650);
      timers.add(timer);
    };
    document.addEventListener("pointerdown", glow, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", glow);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div className="neon-feedback" aria-hidden="true">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="neon-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  );
}

export function LiquidBackdrop() {
  return (
    <div className="liquid-backdrop" aria-hidden="true">
      <span className="liquid-ribbon ribbon-rose" />
      <span className="liquid-ribbon ribbon-pearl" />
      <span className="liquid-ribbon ribbon-violet" />
    </div>
  );
}
