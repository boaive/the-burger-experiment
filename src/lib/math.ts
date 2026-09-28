export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp(t), 3);
export const easeInOutCubic = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOutBack = (t: number, s = 1.4) => {
  const x = clamp(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};

/** Damped oscillation starting at 0 with an initial kick: the shape of a soft impact. */
export function ring(t: number, omega: number, zeta: number): number {
  if (t <= 0) return 0;
  return Math.exp(-zeta * omega * t) * Math.sin(omega * t);
}

/** Deterministic pseudo-random generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A critically-damped-ish spring integrated per frame (secondary motion only). */
export class Spring {
  value = 0;
  velocity = 0;
  constructor(
    public stiffness = 180,
    public damping = 12,
  ) {}
  kick(v: number) {
    this.velocity += v;
  }
  step(target: number, dt: number) {
    // Semi-implicit Euler with substeps keeps stiff springs stable at low frame rates.
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.stiffness * (target - this.value) - this.damping * this.velocity;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
  reset(v = 0) {
    this.value = v;
    this.velocity = 0;
  }
}
