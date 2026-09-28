"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { BoaiveLogo } from "@/components/brand/BoaiveLogo";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { chapterCopy, layers, sceneNames, sides, storyCopy } from "@/content/experience";
import { webglAvailable } from "@/scene/core/quality";
import type { ExperienceScene } from "@/scene/experience/ExperienceScene";
import { TOTAL, chapterRanges, cue, textRanges } from "@/story/beats";
import { StoryDirector } from "@/story/director";
import { createOverlay } from "@/story/overlay";
import styles from "./Experience.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** Pre-rendered frames of the film (scripts/render-stills.mjs), shown only when WebGL is unavailable. */
const stills = [
  { name: "build", from: cue.bottomBun, to: cue.shiftStart },
  { name: "meal", from: cue.shiftStart, to: cue.dimStart },
  { name: "layers", from: cue.dimStart, to: cue.reassemble },
  { name: "reveal", from: cue.reassemble, to: TOTAL + 1 },
];
const range = (r: readonly [number, number]) => ({ "data-in": r[0], "data-out": r[1] });

/**
 * The landing page's film. A tall section with a sticky stage: scrolling moves story time,
 * the 3D scene (loaded lazily) builds the burger, and the DOM carries every word.
 */
export function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!section || !stage || !host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const director = new StoryDirector(section, stage, reduced);
    const overlay = createOverlay(section, stage);
    let scene: ExperienceScene | null = null;
    let cancelled = false;

    director.onFrame = (f) => {
      scene?.frame({ t: f.t, now: f.now, dt: f.dt, reduced, pointer: director.pointer });
      overlay.update(f.t, scene);
    };
    director.start();

    const resize = () => {
      overlay.measure();
      scene?.resize(stage.clientWidth, stage.clientHeight);
      director.measure();
      director.wake();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    if (webglAvailable()) {
      stage.dataset.webgl = "loading";
      import("@/scene/experience/ExperienceScene")
        .then(({ createExperienceScene }) => createExperienceScene(host))
        .then((s) => {
          if (cancelled) return s.dispose();
          scene = s;
          scene.resize(stage.clientWidth, stage.clientHeight);
          director.wake();
          requestAnimationFrame(() => {
            stage.dataset.webgl = "ready";
          });
          if (process.env.NODE_ENV !== "production") (window as unknown as { __story: unknown }).__story = { director, scene };
        })
        .catch((err) => {
          console.error(err);
          stage.dataset.webgl = "off";
        });
    } else {
      stage.dataset.webgl = "off";
    }

    /* Pointer: a little parallax with a mouse; taps and clicks poke the food. */
    let down: { x: number; y: number } | null = null;
    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = local(e);
      director.pointer.x = (p.x / p.w) * 2 - 1;
      director.pointer.y = -((p.y / p.h) * 2 - 1);
      director.pointer.inside = true;
      const hit = scene?.pick(p.x, p.y);
      stage.style.cursor = hit ? "pointer" : "";
      director.wake();
    };
    const onLeave = () => {
      director.pointer.inside = false;
      stage.style.cursor = "";
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || !scene) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8 || (e.target as HTMLElement).closest("a,button")) return;
      const p = local(e);
      const hit = scene.pick(p.x, p.y);
      if (hit) {
        scene.poke(hit);
        director.wake();
      }
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);

    return () => {
      cancelled = true;
      director.stop();
      ro.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      scene?.dispose();
    };
  }, []);

  const lineIds = [...layers.map((l) => l.id), "fries", "drink"];

  return (
    <section
      id="experience"
      ref={sectionRef}
      className={styles.story}
      data-surface="light"
      data-bare-header=""
      aria-labelledby="story-title"
      style={{ "--story-len": TOTAL } as CSSProperties}
    >
      <div ref={stageRef} className={styles.stage} data-tone="light" data-webgl="pending">
        <div ref={hostRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.stills} aria-hidden="true">
          {stills.map((s) => (
            <picture key={s.name} className={styles.still} data-in={s.from} data-out={s.to}>
              <source media="(max-aspect-ratio: 9/10)" srcSet={`/story/frames/tall-${s.name}.webp`} />
              <img src={`/story/frames/wide-${s.name}.webp`} alt="" loading="lazy" decoding="async" />
            </picture>
          ))}
        </div>
        <p className="visually-hidden">{storyCopy.description}</p>

        <svg className={styles.lines} aria-hidden="true">
          {lineIds.map((id) => (
            <g key={id}>
              <path data-callout-line={id} pathLength={1} className={styles.line} />
              <circle data-callout-dot={id} r={3.2} className={styles.dot} />
            </g>
          ))}
        </svg>

        <ol className={styles.callouts} data-callouts="" data-mode="food" aria-hidden="true">
          {layers.map((l, i) => (
            <li key={l.id} data-callout={l.id} className={styles.callout} style={{ "--i": i } as CSSProperties}>
              <span className={styles.num}>{pad(i + 1)}</span>
              <span className={styles.names}>
                <span className={styles.food}>
                  <b>{l.food}</b>
                  <small>{l.foodNote}</small>
                </span>
                <span className={styles.digital}>
                  <b>{l.digital}</b>
                  <small>{l.digitalNote}</small>
                </span>
              </span>
            </li>
          ))}
          <li data-callout="fries" className={styles.callout}>
            <span className={styles.num}>09</span>
            <span className={styles.names}>
              <span className={styles.food}>
                <b>{sides.fries.label}</b>
                <small>{sides.fries.note}</small>
              </span>
            </span>
          </li>
          <li data-callout="drink" className={styles.callout}>
            <span className={styles.num}>10</span>
            <span className={styles.names}>
              <span className={styles.food}>
                <b>{sides.drink.label}</b>
                <small>{sides.drink.note}</small>
              </span>
            </span>
          </li>
        </ol>

        <header className={styles.title} {...range(textRanges.title)} data-on="">
          <p className={`t-ticket ${styles.kicker}`}>An experiment in eight layers</p>
          <h1 id="story-title" className={`t-display ${styles.titleText}`}>
            {storyCopy.title}
          </h1>
          <p className={styles.thesis}>{storyCopy.thesis}</p>
        </header>

        <p className={`t-ticket ${styles.cue}`} data-in={-1} data-out={0.45} data-on="">
          {storyCopy.scrollCue}
          <span className={styles.cueLine} aria-hidden="true" />
        </p>

        <div className={styles.captions}>
          {(Object.keys(chapterRanges) as (keyof typeof chapterRanges)[]).map((key) => (
            <div key={key} className={styles.chapter} {...range(chapterRanges[key].range)}>
              <p className="t-ticket">Scene {pad(chapterRanges[key].scene)}</p>
              <p className={`t-display ${styles.chapterTitle}`}>{chapterCopy[key].title}</p>
              <p className={styles.chapterLine}>{chapterCopy[key].line}</p>
            </div>
          ))}
          <p className={`t-display ${styles.caption}`} {...range(textRanges.complete)}>
            {storyCopy.complete}
          </p>
          <p className={`t-display ${styles.caption}`} {...range(textRanges.together)}>
            {storyCopy.together}
          </p>
          <div className={styles.captionPair}>
            <p className={`t-display ${styles.caption}`} {...range(textRanges.layered)}>
              {storyCopy.layered}
            </p>
            <p className={`t-display ${styles.caption} ${styles.captionAccent}`} {...range(textRanges.digital)}>
              {storyCopy.digital}
            </p>
          </div>
        </div>

        <p className={`t-display ${styles.captionTop}`} {...range(textRanges.meal)}>
          {storyCopy.meal}
        </p>

        <div className={styles.ticket} data-ticket="" aria-hidden="true">
          <span className={styles.ticketNum} data-ticket-num="" />
          <span className={styles.ticketText}>
            <b data-ticket-name="" />
            <small data-ticket-note="" />
          </span>
        </div>

        <div className={styles.hud} {...range([0.4, textRanges.hud[1]])} aria-hidden="true">
          <span className={styles.hudCount}>
            <span data-hud-index="">01</span>/{pad(sceneNames.length)}
          </span>
          <span className="visually-hidden" data-hud-name="">
            {sceneNames[0]}
          </span>
          <span className={styles.hudTrack}>
            <span className={styles.hudBar} data-hud-bar="" />
          </span>
        </div>

        <a className={`t-ticket ${styles.skip}`} href="#after-story" {...range([0.4, textRanges.hud[1]])} data-inert="" inert>
          {storyCopy.skip}
          <span aria-hidden="true"> ↓</span>
        </a>

        <div className={styles.reveal} {...range(textRanges.reveal)}>
          <div className={styles.maker}>
            <span className="t-ticket">{storyCopy.reveal.kicker}</span>
            <BoaiveLogo className={styles.logo} sizes="(max-width: 720px) 70vw, 420px" />
          </div>
          <p className={`t-display ${styles.fiction}`} {...range(textRanges.revealFiction)}>
            {storyCopy.reveal.fiction}
          </p>
          <p className={styles.statement} {...range(textRanges.revealStatement)}>
            {storyCopy.reveal.statement}
          </p>
          <div className={styles.revealCta} {...range(textRanges.revealCta)} data-inert="" inert>
            <ArrowLink href="#contact">{storyCopy.reveal.cta}</ArrowLink>
          </div>
        </div>

        <p className={`t-ticket ${styles.loading}`} aria-hidden="true">
          {storyCopy.loading}
        </p>
      </div>
    </section>
  );
}
