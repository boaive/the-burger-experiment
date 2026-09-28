import { clamp, damp } from "@/lib/math";
import { TOTAL } from "./beats";

export type StoryFrame = {
  /** Smoothed story time (what everything animates to). */
  t: number;
  /** Raw story time from the scroll position. */
  target: number;
  now: number;
  dt: number;
};

/**
 * Turns scroll position into story time. The page scrolls natively (no hijacking); only the story
 * follows the scroll with a little critically-damped smoothing, so wheel steps don't stutter.
 * One rAF loop, running only while the story is on screen and the tab is visible.
 */
export class StoryDirector {
  t = 0;
  target = 0;
  pointer = { x: 0, y: 0, inside: false };
  onFrame: (f: StoryFrame) => void = () => {};

  private raf = 0;
  private last = 0;
  private inView = false;
  private started = false;
  private range = 1;
  private io?: IntersectionObserver;

  constructor(
    private section: HTMLElement,
    private stage: HTMLElement,
    private reduced: boolean,
  ) {}

  start() {
    this.measure();
    this.t = this.target;
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.inView = entry.isIntersecting;
        if (this.inView) this.wake();
      },
      { rootMargin: "10% 0px" },
    );
    this.io.observe(this.section);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.started = true;
    this.wake();
  }

  stop() {
    this.started = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.io?.disconnect();
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  /** Make sure a frame runs (after the 3D arrives, after a resize…). */
  wake() {
    if (!this.started || this.raf || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  measure() {
    this.range = Math.max(1, this.section.offsetHeight - this.stage.offsetHeight);
    const top = this.section.getBoundingClientRect().top;
    this.target = clamp(-top / this.range) * TOTAL;
  }

  private onScroll = () => {
    const top = this.section.getBoundingClientRect().top;
    this.target = clamp(-top / this.range) * TOTAL;
    this.wake();
  };

  private onResize = () => {
    this.measure();
    this.wake();
  };

  private onVisibility = () => {
    if (!document.hidden) this.wake();
  };

  private tick = (ms: number) => {
    this.raf = 0;
    const now = ms / 1000;
    const dt = Math.min(0.1, Math.max(0, (ms - this.last) / 1000));
    this.last = ms;
    // Big jumps (anchor links, reloads) arrive quickly; small scrolls glide.
    const gap = Math.abs(this.target - this.t);
    const lambda = this.reduced ? 14 : gap > 1.5 ? 9 : 5.5;
    this.t = damp(this.t, this.target, lambda, dt);
    if (Math.abs(this.target - this.t) < 1e-4) this.t = this.target;
    this.onFrame({ t: this.t, target: this.target, now, dt });
    if (this.inView && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  };
}
