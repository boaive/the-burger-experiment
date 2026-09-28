import { clamp, easeInOutCubic, easeOutCubic, ring } from "@/lib/math";

/**
 * Deterministic entrances. Every function maps "seconds since the entrance started" to a pose
 * offset from the object's resting place, so a moment always looks the same, however it's reached.
 */
export type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** Vertical scale (squash < 1 < stretch). */
  sy: number;
  /** Horizontal scale, the squash's bulge. */
  sxz: number;
};

export const restPose = (): Pose => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sy: 1, sxz: 1 });

export function resetPose(p: Pose): Pose {
  p.x = p.y = p.z = p.rx = p.ry = p.rz = 0;
  p.sy = p.sxz = 1;
  return p;
}

export type DropSpec = {
  /** Start height above the resting place. */
  h0: number;
  /** Gravity. Lower is floatier. */
  g: number;
  /** Restitution per bounce (0 = dead stop). */
  e: number;
  bounces: number;
  /** Squash on the first impact. */
  squash: number;
  omega?: number;
  zeta?: number;
  /** Initial tilt (rx, rz), levelled out by landing. */
  tilt?: [number, number];
  /** Yaw turned through during the fall. */
  spin?: number;
  /** Lateral sway while falling (leaves, paper). */
  sway?: number;
  swayFreq?: number;
  /** Whole turns about x on the way down (pickles). */
  flips?: number;
  /** Coin-like rocking after landing (onion rings). */
  wobble?: number;
  /** A little slide after landing: start offset (x, z) that friction wipes out. */
  skid?: [number, number];
  /** Stretch along the fall. */
  stretch?: number;
};

export type DropTiming = { fall: number; impacts: number[]; speeds: number[]; settled: number };

export function dropTiming(s: DropSpec): DropTiming {
  const fall = Math.sqrt((2 * s.h0) / s.g);
  const impacts = [fall];
  const speeds = [1];
  let v = s.g * fall;
  let t = fall;
  for (let b = 0; b < s.bounces; b++) {
    v *= s.e;
    const hop = (2 * v) / s.g;
    if (hop < 0.02) break;
    t += hop;
    impacts.push(t);
    speeds.push(Math.pow(s.e, b + 1));
  }
  return { fall, impacts, speeds, settled: t + 0.9 };
}

/** Pose of a falling, bouncing, squashing object `tau` seconds after release. */
export function dropPose(s: DropSpec, timing: DropTiming, tau: number, out: Pose): Pose {
  resetPose(out);
  const omega = s.omega ?? 24;
  const zeta = s.zeta ?? 0.32;
  const [tx, tz] = s.tilt ?? [0, 0];
  const { fall, impacts } = timing;

  if (tau < fall) {
    const u = tau / fall;
    const k = 1 - u;
    out.y = s.h0 - 0.5 * s.g * tau * tau;
    const st = 1 + (s.stretch ?? 0.05) * u;
    out.sy = st;
    out.sxz = 1 / Math.sqrt(st);
    out.rx = tx * k * k;
    out.rz = tz * k * k;
    out.ry = (s.spin ?? 0) * k * k;
    if (s.flips) out.rx += s.flips * Math.PI * 2 * (1 - easeOutCubic(u));
    if (s.sway) {
      const f = s.swayFreq ?? 3;
      out.x = s.sway * Math.sin(tau * f) * k;
      out.rz += s.sway * 0.9 * Math.cos(tau * f) * k;
      out.rx += s.sway * 0.5 * Math.sin(tau * f * 0.7) * k;
    }
    if (s.skid) {
      out.x += s.skid[0];
      out.z += s.skid[1];
    }
    return out;
  }

  // Bounces: short parabolic hops between impacts.
  for (let b = 1; b < impacts.length; b++) {
    if (tau < impacts[b]) {
      const t0 = impacts[b - 1];
      const hop = impacts[b] - t0;
      const t = tau - t0;
      const v = (s.g * hop) / 2;
      out.y = v * t - 0.5 * s.g * t * t;
      break;
    }
  }

  // Squash: every impact rings the object like a soft spring.
  let squash = 0;
  for (let i = 0; i < impacts.length; i++) squash += s.squash * timing.speeds[i] * ring(tau - impacts[i], omega, zeta);
  out.sy -= squash;
  out.sxz += squash * 0.55;

  const since = tau - fall;
  if (s.wobble) {
    const w = s.wobble * Math.exp(-since * 2.6);
    out.rx += w * Math.sin(since * 17);
    out.rz += w * Math.cos(since * 17);
  }
  if (s.skid) {
    const f = 1 - easeOutCubic(clamp(since / 0.35));
    out.x += s.skid[0] * f;
    out.z += s.skid[1] * f;
  }
  return out;
}

/** Rising out of frame when scrolled back past an entrance. */
export function leavePose(from: number, tau: number, out: Pose): Pose {
  resetPose(out);
  const u = clamp(tau / 0.5);
  out.y = from + u * u * u * 3.2;
  return out;
}

export const LEAVE_TIME = 0.5;

/** The top bun: lowered in slowly, then it waits. */
export function hoverPose(tau: number, hoverY: number, h0: number, now: number, reduced: boolean, out: Pose): Pose {
  resetPose(out);
  const u = clamp(tau / 1.15);
  const e = easeOutCubic(u);
  out.y = h0 + (hoverY - h0) * e;
  out.ry = 0.5 * (1 - e);
  out.rz = 0.06 * (1 - e);
  if (!reduced) {
    // Anticipation: a slow breath while it hovers.
    const bob = Math.sin(now * 2.1) * 0.014 * e;
    out.y += bob;
    out.rx = Math.sin(now * 1.3) * 0.012 * e;
  }
  return out;
}

/** The drink: slides in, tips forward as it stops, rocks back upright. */
export function slidePose(tau: number, from: [number, number], dur: number, out: Pose): Pose {
  resetPose(out);
  const u = clamp(tau / dur);
  const e = easeOutCubic(u);
  out.x = from[0] * (1 - e);
  out.z = from[1] * (1 - e);
  out.ry = -0.9 * (1 - e);
  const dir = Math.sign(from[0]) || 1;
  // Lean back while pushed, tip forward on the stop, then settle.
  const lean = 0.09 * Math.sin(u * Math.PI) * (1 - u) + 0.1 * ring(tau - dur * 0.72, 9, 0.28);
  out.rz = lean * dir;
  return out;
}

export function slideOutPose(tau: number, to: [number, number], out: Pose): Pose {
  resetPose(out);
  const u = easeInOutCubic(clamp(tau / 0.6));
  out.x = to[0] * u;
  out.z = to[1] * u;
  return out;
}
