import * as THREE from "three";
import { at, cue } from "@/story/beats";

/**
 * Where things stand and where the camera looks, per layout.
 * "wide" is landscape (laptop, desktop, landscape tablet); "tall" is portrait (phones, tablets).
 * Portrait is its own choreography: a closer camera, a higher angle, and the meal arranged in depth
 * instead of in a row.
 */
export type LayoutKind = "wide" | "tall";

type V3 = [number, number, number];

export type Placement = {
  burgerBuild: V3;
  burgerMeal: V3;
  fries: V3;
  friesYaw: number;
  drink: V3;
  drinkYaw: number;
  /** Where the drink slides in from, relative to its place. */
  drinkFrom: [number, number];
  /** Where the sides go when the lights dim. */
  friesAway: V3;
  drinkAway: V3;
};

export const placements: Record<LayoutKind, Placement> = {
  wide: {
    burgerBuild: [0, 0, 0],
    burgerMeal: [0.34, 0, 0.14],
    fries: [-1.12, 0, -0.24],
    friesYaw: 0.3,
    drink: [1.62, 0, -0.34],
    drinkYaw: -0.25,
    drinkFrom: [2.6, 0.2],
    friesAway: [-6.5, 0, -2.6],
    drinkAway: [7.2, 0, -2.6],
  },
  tall: {
    burgerBuild: [0, 0, 0],
    burgerMeal: [0.2, 0, 0.55],
    fries: [-0.64, 0, -0.8],
    friesYaw: 0.36,
    drink: [0.74, 0, -1.02],
    drinkYaw: -0.3,
    drinkFrom: [2.2, -0.3],
    friesAway: [-4.6, 0, -3.2],
    drinkAway: [5.2, 0, -3.6],
  },
};

/** A camera setup: what to look at, how much must fit, from which angle, and where it sits on screen. */
export type Shot = {
  t: number;
  target: V3;
  /** Radius of the sphere that must fit the frame's narrower dimension. */
  fit: number;
  /** Azimuth around the target (radians, 0 = looking down −z). */
  az: number;
  /** Elevation above the horizon (radians). */
  el: number;
  /** Where the target sits on screen, in NDC (−1..1). Negative y = lower. */
  sx: number;
  sy: number;
};

const W = placements.wide;
const T = placements.tall;
const wb = W.burgerMeal;
const tb = T.burgerMeal;

export const shots: Record<LayoutKind, Shot[]> = {
  wide: [
    { t: 0, target: [0, 0.16, 0], fit: 1.25, az: -0.42, el: 0.36, sx: 0, sy: -0.32 },
    { t: at("intro", 0.85), target: [0, 0.16, 0], fit: 1.02, az: -0.36, el: 0.36, sx: -0.05, sy: -0.12 },
    { t: cue.patty, target: [0, 0.22, 0], fit: 0.98, az: -0.24, el: 0.33, sx: -0.06, sy: -0.1 },
    { t: cue.lettuce, target: [0, 0.3, 0], fit: 0.98, az: -0.08, el: 0.3, sx: -0.06, sy: -0.08 },
    { t: cue.crownEnter, target: [0, 0.42, 0], fit: 1.04, az: 0.08, el: 0.26, sx: -0.06, sy: -0.08 },
    { t: cue.crownLand + 0.25, target: [0, 0.46, 0], fit: 0.94, az: 0.22, el: 0.2, sx: -0.04, sy: -0.06 },
    { t: cue.fries - 0.05, target: [-0.3, 0.45, -0.05], fit: 1.7, az: 0.14, el: 0.26, sx: 0, sy: -0.08 },
    { t: cue.drink + 0.45, target: [0.3, 0.55, -0.1], fit: 2.25, az: 0.04, el: 0.27, sx: 0, sy: -0.06 },
    { t: cue.mealEnd, target: [0.24, 0.38, -0.12], fit: 2.35, az: -0.1, el: 0.56, sx: 0, sy: -0.2 },
    { t: cue.dimEnd, target: [wb[0], 0.75, wb[2]], fit: 1.35, az: 0.12, el: 0.16, sx: -0.12, sy: -0.02 },
    { t: cue.explodeEnd + 0.1, target: [wb[0], 1.2, wb[2]], fit: 1.56, az: 0.32, el: 0.2, sx: -0.14, sy: 0 },
    { t: at("layers", 0.95), target: [wb[0], 1.2, wb[2]], fit: 1.6, az: 0.46, el: 0.2, sx: -0.14, sy: 0 },
    { t: cue.reveal, target: [wb[0], 0.5, wb[2]], fit: 1.35, az: 0.55, el: 0.22, sx: -0.42, sy: -0.12 },
    { t: at("boaive", 1), target: [wb[0], 0.5, wb[2]], fit: 1.45, az: 0.72, el: 0.24, sx: -0.44, sy: -0.12 },
  ],
  tall: [
    { t: 0, target: [0, 0.12, 0], fit: 1.12, az: -0.42, el: 0.46, sx: 0, sy: -0.36 },
    { t: at("intro", 0.85), target: [0, 0.2, 0], fit: 0.8, az: -0.36, el: 0.42, sx: 0, sy: -0.24 },
    { t: cue.patty, target: [0, 0.24, 0], fit: 0.78, az: -0.24, el: 0.4, sx: 0, sy: -0.22 },
    { t: cue.lettuce, target: [0, 0.32, 0], fit: 0.8, az: -0.08, el: 0.36, sx: 0, sy: -0.2 },
    { t: cue.crownEnter, target: [0, 0.44, 0], fit: 0.86, az: 0.08, el: 0.32, sx: 0, sy: -0.18 },
    { t: cue.crownLand + 0.25, target: [0, 0.48, 0], fit: 0.8, az: 0.22, el: 0.28, sx: 0, sy: -0.16 },
    { t: cue.fries - 0.05, target: [-0.18, 0.42, -0.12], fit: 1.22, az: 0.12, el: 0.42, sx: 0, sy: -0.16 },
    { t: cue.drink + 0.45, target: [0.08, 0.5, -0.3], fit: 1.5, az: 0.04, el: 0.44, sx: 0, sy: -0.14 },
    { t: cue.mealEnd, target: [0.12, 0.4, -0.3], fit: 1.6, az: -0.08, el: 0.6, sx: 0, sy: -0.2 },
    { t: cue.dimEnd, target: [tb[0], 0.8, tb[2]], fit: 1.2, az: 0.12, el: 0.2, sx: -0.2, sy: -0.04 },
    { t: cue.explodeEnd + 0.1, target: [tb[0], 1.2, tb[2]], fit: 1.42, az: 0.32, el: 0.2, sx: -0.3, sy: -0.16 },
    { t: at("layers", 0.95), target: [tb[0], 1.2, tb[2]], fit: 1.45, az: 0.46, el: 0.2, sx: -0.3, sy: -0.16 },
    { t: cue.reveal, target: [tb[0], 0.48, tb[2]], fit: 1.0, az: 0.55, el: 0.26, sx: 0, sy: -0.5 },
    { t: at("boaive", 1), target: [tb[0], 0.48, tb[2]], fit: 1.08, az: 0.72, el: 0.28, sx: 0, sy: -0.52 },
  ],
};

/**
 * Short portrait screens (iPhone SE and friends, aspect > 0.5) have less room under the captions
 * during the reveal, so the exploded stack sits lower and a little smaller there.
 */
export const shortTallShots: Shot[] = shots.tall.map((s) =>
  s.t >= cue.dimEnd - 0.01 && s.t < cue.reveal ? { ...s, sy: s.sy - 0.2, fit: s.fit * 1.12 } : s,
);

export function shotsFor(layout: LayoutKind, aspect: number): Shot[] {
  if (layout === "wide") return shots.wide;
  return aspect > 0.5 ? shortTallShots : shots.tall;
}

const KEYS = ["fit", "az", "el", "sx", "sy"] as const;

/** Hermite interpolation through the shots (non-uniform knots), so the camera never stops dead. */
export function sampleShot(list: Shot[], t: number, out: Shot): Shot {
  if (t <= list[0].t) return Object.assign(out, list[0], { target: [...list[0].target] as V3 });
  const last = list[list.length - 1];
  if (t >= last.t) return Object.assign(out, last, { target: [...last.target] as V3 });
  let i = 0;
  while (i < list.length - 2 && t > list[i + 1].t) i++;
  const a = list[i];
  const b = list[i + 1];
  const prev = list[Math.max(0, i - 1)];
  const next = list[Math.min(list.length - 1, i + 2)];
  const span = b.t - a.t;
  const u = (t - a.t) / span;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const tangent = (p0: number, p1: number, p2: number, t0: number, t2: number) => ((p2 - p0) / Math.max(1e-4, t2 - t0)) * span * 0.8;
  const interp = (get: (s: Shot) => number) => {
    const m0 = tangent(get(prev), get(a), get(b), prev.t, b.t);
    const m1 = tangent(get(a), get(b), get(next), a.t, next.t);
    return h00 * get(a) + h10 * m0 + h01 * get(b) + h11 * m1;
  };
  out.t = t;
  for (const k of KEYS) out[k] = interp((s) => s[k]);
  out.target = [interp((s) => s.target[0]), interp((s) => s.target[1]), interp((s) => s.target[2])];
  return out;
}

/** Place the camera for a shot. The off-centre framing is a lens shift, so perspective stays honest. */
export function applyShot(camera: THREE.PerspectiveCamera, shot: Shot, extra: { az: number; el: number; shake: THREE.Vector3 }) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const fov = Math.min(vfov, hfov);
  const dist = shot.fit / Math.sin(fov / 2);
  const az = shot.az + extra.az;
  const el = shot.el + extra.el;
  const [x, y, z] = shot.target;
  camera.position.set(x + Math.sin(az) * Math.cos(el) * dist, y + Math.sin(el) * dist, z + Math.cos(az) * Math.cos(el) * dist);
  camera.position.add(extra.shake);
  camera.lookAt(x + extra.shake.x * 0.5, y + extra.shake.y * 0.5, z);
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[8] = -shot.sx;
  camera.projectionMatrix.elements[9] = -shot.sy;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
