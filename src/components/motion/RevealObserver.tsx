"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reveals `[data-reveal]` elements once, as they enter the viewport.
 * `data-reveal-delay="120"` staggers siblings (milliseconds).
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
    for (const el of els) {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.setProperty("--reveal-delay", delay);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealed = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
