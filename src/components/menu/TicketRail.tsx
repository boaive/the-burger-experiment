"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { MenuCategory } from "@/content/menu";
import { Spring } from "@/lib/math";
import styles from "./TicketRail.module.css";

/**
 * The kitchen's ticket rail. The first ticket is the menu's table of contents; the others are
 * orders and notes from a fictional service. Tickets hang from their clips and swing when a
 * pointer passes by — faster movement, bigger swing.
 */
export function TicketRail({ categories }: { categories: MenuCategory[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const items = categories.reduce((n, c) => n + c.products.length, 0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tickets = [...rail.querySelectorAll<HTMLElement>(`:scope > .${styles.hanger}`)];
    const springs = tickets.map(() => new Spring(28, 1.6));
    let raf = 0;
    let last = 0;

    const tick = (ms: number) => {
      const dt = Math.min(0.05, (ms - last) / 1000 || 0.016);
      last = ms;
      let moving = false;
      springs.forEach((s, i) => {
        s.step(0, dt);
        tickets[i].style.setProperty("--swing", `${s.value.toFixed(3)}deg`);
        if (Math.abs(s.value) + Math.abs(s.velocity) > 0.01) moving = true;
      });
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // Just hung: a small settle when the page opens.
    springs.forEach((s, i) => s.kick((i % 2 ? -1 : 1) * (14 + i * 6)));
    wake();

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tickets.forEach((t, i) => {
        const r = t.getBoundingClientRect();
        const dx = Math.abs(e.clientX - (r.left + r.width / 2));
        if (dx > r.width) return;
        const falloff = 1 - dx / r.width;
        springs[i].kick(Math.max(-40, Math.min(40, e.movementX * 1.6 * falloff)));
      });
      wake();
    };
    const onTap = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || (e.target as HTMLElement).closest("a")) return;
      springs.forEach((s, i) => s.kick((i % 2 ? -1 : 1) * 22));
      wake();
    };
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerdown", onTap);
    return () => {
      cancelAnimationFrame(raf);
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerdown", onTap);
    };
  }, []);

  return (
    <div ref={railRef} className={styles.rail}>
      <div className={styles.bar} aria-hidden="true" />

      <nav className={`${styles.hanger} ${styles.main}`} aria-label="Menu sections" style={{ "--tilt": "-1.5deg" } as CSSProperties}>
        <span className={styles.clip} aria-hidden="true" />
        <div className={styles.paper}>
          <p className={styles.center}>Boaive&rsquo;s Burger Experiment</p>
          <p className={styles.center}>8 Layer Lane</p>
          <hr />
          <p className={styles.row}>
            <span>Order No. 001</span>
            <span>Table: you</span>
          </p>
          <hr />
          <ul role="list">
            {categories.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className={styles.line}>
                  <span>{c.title}</span>
                  <span className={styles.dots} aria-hidden="true" />
                  <span>{String(c.products.length).padStart(2, "0")}</span>
                </a>
              </li>
            ))}
          </ul>
          <hr />
          <p className={styles.row}>
            <span>Items</span>
            <span>{items}</span>
          </p>
          <hr />
          <p className={styles.center}>* Messy hands. Good decisions. *</p>
        </div>
      </nav>

      <div className={`${styles.hanger} ${styles.order}`} aria-hidden="true" style={{ "--tilt": "2.5deg" } as CSSProperties}>
        <span className={styles.clip} />
        <div className={styles.paper}>
          <p className={styles.row}>
            <span>Table 4</span>
            <span>21:14</span>
          </p>
          <hr />
          <p>1 × Classic Smash</p>
          <p>1 × Loaded Fries</p>
          <p>2 × Cola</p>
          <p className={styles.note}>+ extra pickles</p>
        </div>
      </div>

      <div className={`${styles.hanger} ${styles.memo}`} aria-hidden="true" style={{ "--tilt": "-3deg" } as CSSProperties}>
        <span className={styles.clip} />
        <div className={styles.paper}>
          <p className={styles.memoHead}>Kitchen note</p>
          <p>House Special: eight layers.</p>
          <p>No substitutions.</p>
          <p className={styles.note}>(We tried.)</p>
        </div>
      </div>
    </div>
  );
}
