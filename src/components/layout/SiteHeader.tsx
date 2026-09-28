"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/ui/ArrowLink";
import { emailHref, primaryNav, site } from "@/content/site";
import styles from "./SiteHeader.module.css";

/**
 * Fixed header. It reads the surface underneath it (`data-surface="light|dark"` on page sections)
 * to pick its ink colour, and stays bare over sections marked `data-bare-header` (the story stage).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const probe = header.offsetHeight / 2;
      let surface = "light";
      let bare = false;
      // Document order: nested surfaces come after their parents, so the innermost one wins.
      for (const el of document.querySelectorAll<HTMLElement>("[data-surface]")) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          surface = el.dataset.surface ?? "light";
          bare = el.hasAttribute("data-bare-header");
        }
      }
      header.dataset.tone = surface;
      header.dataset.bare = String(bare);
      header.dataset.scrolled = String(window.scrollY > 4);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("surfacechange", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("surfacechange", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset.menuOpen = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 861px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      delete root.dataset.menuOpen;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const close = () => setOpen(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header ref={ref} className={styles.header} data-tone="light" data-bare="true" data-scrolled="false" data-open={open}>
      <div className={styles.bar}>
        <Link href="/" className={styles.name} onClick={close} aria-label={`${site.name}, home`}>
          <span className={styles.nameTop}>Boaive&rsquo;s</span>
          <span className={styles.nameMain}>Burger Experiment</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul role="list">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} aria-current={isActive(item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <a className={styles.contact} href="#contact">
          Contact
          <Arrow className={styles.contactArrow} />
        </a>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="site-sheet"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="visually-hidden">{open ? "Close navigation" : "Open navigation"}</span>
          <span className={styles.icon} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>

      <div id="site-sheet" className={styles.sheet} inert={!open}>
        <nav aria-label="Mobile">
          <ul role="list" className={styles.sheetList}>
            {primaryNav.map((item, i) => (
              <li key={item.href} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={item.href}
                  className={styles.sheetLink}
                  onClick={close}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <span className="t-ticket">{String(i + 1).padStart(2, "0")}</span>
                  {item.label}
                </Link>
              </li>
            ))}
            <li style={{ "--i": primaryNav.length } as React.CSSProperties}>
              <a href="#contact" className={styles.sheetLink} onClick={close}>
                <span className="t-ticket">{String(primaryNav.length + 1).padStart(2, "0")}</span>
                Contact
              </a>
            </li>
          </ul>
        </nav>
        <div className={styles.sheetFoot}>
          <a href={site.contact.instagram.url} target="_blank" rel="noopener noreferrer">
            <span className="t-ticket">Instagram</span>
            {site.contact.instagram.handle}
          </a>
          <a href={emailHref}>
            <span className="t-ticket">Email</span>
            {site.contact.email}
          </a>
        </div>
      </div>
    </header>
  );
}
