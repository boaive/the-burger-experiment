import type { Detail } from "../models/kit";

export type Tier = "high" | "medium" | "low";

export type Budget = {
  detail: Detail;
  /** Pixel ratio range; adaptive resolution moves between them. */
  dprMin: number;
  dprStart: number;
  dprMax: number;
  shadowMap: number;
  antialias: boolean;
};

export const budgets: Record<Tier, Budget> = {
  high: { detail: 2, dprMin: 1, dprStart: 1.75, dprMax: 2, shadowMap: 2048, antialias: true },
  medium: { detail: 1, dprMin: 1, dprStart: 1.5, dprMax: 1.75, shadowMap: 1024, antialias: true },
  low: { detail: 0, dprMin: 0.9, dprStart: 1.4, dprMax: 1.75, shadowMap: 1024, antialias: false },
};

/** A rough, conservative guess. `?quality=low|medium|high` forces a tier. */
export function detectTier(): Tier {
  const forced = new URLSearchParams(location.search).get("quality");
  if (forced === "low" || forced === "medium" || forced === "high") return forced;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(screen.width, screen.height);
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse && shortSide < 700) return "low";
  if (coarse || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

let webglCache: boolean | null = null;

/** WebGL can be off (policy, blocklist, `?3d=off`); the story then plays with still frames. */
export function webglAvailable(): boolean {
  if (webglCache !== null) return webglCache;
  if (new URLSearchParams(location.search).get("3d") === "off") return (webglCache = false);
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglCache = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/**
 * Steps the pixel ratio down when frames run slow and back up when there is headroom.
 * Gives up adjusting after a few changes so it never oscillates.
 */
export class AdaptiveResolution {
  private acc = 0;
  private frames = 0;
  private changes = 0;
  constructor(
    private budget: Budget,
    public ratio: number,
    private apply: (ratio: number) => void,
  ) {}

  sample(dt: number) {
    if (this.changes >= 6 || dt <= 0 || dt > 0.25) return;
    this.acc += dt;
    this.frames++;
    if (this.acc < 1.2) return;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    const screenMax = Math.min(this.budget.dprMax, window.devicePixelRatio || 1);
    let next = this.ratio;
    if (avg > 1 / 45) next = Math.max(this.budget.dprMin, this.ratio - 0.2);
    else if (avg < 1 / 57 && this.ratio < screenMax) next = Math.min(screenMax, this.ratio + 0.1);
    if (Math.abs(next - this.ratio) > 0.01) {
      this.ratio = next;
      this.changes++;
      this.apply(next);
    }
  }
}
