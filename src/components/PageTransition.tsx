import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * 180 ms fade-and-rise on route change. Keyed by pathname so React remounts
 * the wrapper and the CSS animation replays. Motion is disabled under
 * `prefers-reduced-motion` in styles.css.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
