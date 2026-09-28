import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng, smoothstep } from "@/lib/math";
import type { StackPart } from "@/content/menu";
import { bandTexture, buildLathe, mixHex, shade, snapshotPositions, srgb } from "../lib/geometry";
import { createNoise3, fbm } from "../lib/noise";
import type { Kit } from "./kit";

/**
 * One layer of a burger. The object's origin is the bottom centre of the layer, so stacking is
 * just adding heights. Stylised, not photoreal: soft shapes, honest imperfections.
 */
export type Layer = {
  part: StackPart;
  object: THREE.Group;
  /** Thickness used when stacking. */
  height: number;
  radius: number;
  /** Pieces that fall on their own (tomato slices, onion rings, pickle chips). */
  pieces?: THREE.Object3D[];
  /** Cheese: 0 = flat slice, 1 = draped over the patty. */
  setMelt?: (m: number) => void;
  /** Lettuce: ruffle wobble. */
  setFlutter?: (amount: number, time: number) => void;
};

const tmp = new THREE.Color();
const up = new THREE.Vector3(0, 1, 0);

function group(mesh: THREE.Object3D, name: string) {
  const g = new THREE.Group();
  g.name = name;
  g.add(mesh);
  return g;
}

/* ── Buns ───────────────────────────────────────────────────────────────────── */

export function bottomBun(kit: Kit, seed = 11): Layer {
  const noise = createNoise3(seed);
  const crumb = srgb(new THREE.Color(), 0xead3a4);
  const geo = buildLathe({
    profile: [
      [0, 0],
      [0.36, 0],
      [0.48, 0.005],
      [0.527, 0.026],
      [0.552, 0.066],
      [0.557, 0.112],
      [0.549, 0.155],
      [0.529, 0.186],
      [0.496, 0.203],
      [0.42, 0.211],
      [0.2, 0.214],
      [0, 0.215],
    ],
    samples: kit.seg(40, 22),
    segments: kit.seg(88, 44),
    displace(p) {
      const k = 1 + 0.016 * noise(p.x * 2.1, p.y * 2.1, p.z * 2.1) + 0.005 * noise(p.x * 7, p.y * 7, p.z * 7);
      p.x *= k * 1.01;
      p.z *= k * 0.99;
      if (p.y > 0.2) p.y += 0.003 * noise(p.x * 10, 4.2, p.z * 10);
    },
    color(p, _v, c) {
      const r = Math.hypot(p.x, p.z);
      const m = noise(p.x * 6 + 3, p.y * 6, p.z * 6);
      if (p.y > 0.197 && r < 0.49) {
        // Cut face, toasted on the griddle, pale crumb at the rim.
        mixHex(c, 0xb97a42, 0xe2c592, smoothstep(0.28, 0.48, r));
        shade(c, 1 + 0.12 * m);
      } else if (p.y < 0.008 && r < 0.47) {
        mixHex(c, 0xd9b27e, 0xc4945a, smoothstep(0.25, 0.46, r));
        shade(c, 1 + 0.05 * m);
      } else {
        mixHex(c, 0xd8b07a, 0xb57b45, smoothstep(0.01, 0.1, p.y));
        c.lerp(crumb, smoothstep(0.162, 0.198, p.y));
        shade(c, 1 + 0.09 * m);
      }
    },
  });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }));
  return { part: "bottomBun", object: group(mesh, "bottomBun"), height: 0.212, radius: 0.56 };
}

type Scatter = { p: THREE.Vector3; n: THREE.Vector3 };

/** Poisson-ish scatter over the triangles of a geometry that pass `keep`. */
function scatter(geo: THREE.BufferGeometry, keep: (c: THREE.Vector3) => boolean, count: number, minDist: number, seed: number): Scatter[] {
  const pos = geo.getAttribute("position");
  const nor = geo.getAttribute("normal");
  const idx = geo.getIndex()!;
  const random = rng(seed);
  const tris: number[] = [];
  const cdf: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < idx.count; t += 3) {
    a.fromBufferAttribute(pos, idx.getX(t));
    b.fromBufferAttribute(pos, idx.getX(t + 1));
    c.fromBufferAttribute(pos, idx.getX(t + 2));
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (!keep(centroid)) continue;
    const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    if (area <= 0) continue;
    total += area;
    tris.push(t);
    cdf.push(total);
  }
  const out: Scatter[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 40 && tris.length) {
    attempts++;
    const target = random() * total;
    let lo = 0;
    let hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const t = tris[lo];
    const i0 = idx.getX(t);
    const i1 = idx.getX(t + 1);
    const i2 = idx.getX(t + 2);
    let u = random();
    let v = random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    const p = new THREE.Vector3()
      .fromBufferAttribute(pos, i0)
      .multiplyScalar(w)
      .addScaledVector(a.fromBufferAttribute(pos, i1), u)
      .addScaledVector(b.fromBufferAttribute(pos, i2), v);
    if (out.some((s) => s.p.distanceToSquared(p) < minDist * minDist)) continue;
    const n = new THREE.Vector3()
      .fromBufferAttribute(nor, i0)
      .multiplyScalar(w)
      .addScaledVector(a.fromBufferAttribute(nor, i1), u)
      .addScaledVector(b.fromBufferAttribute(nor, i2), v)
      .normalize();
    out.push({ p, n });
  }
  return out;
}

/** Sesame brioche by default; `potato` is the smash bun: lower, paler, glossier, with white and black sesame. */
export function topBun(kit: Kit, opts: { potato?: boolean; seed?: number } = {}): Layer {
  const sesame = !opts.potato;
  const noise = createNoise3(opts.seed ?? 23);
  const H = sesame ? 0.456 : 0.41;
  const s = H / 0.456;
  const crumb = srgb(new THREE.Color(), 0xe8d0a0);
  const domeA = sesame ? 0xb97738 : 0xc98e4c;
  const domeB = sesame ? 0x874a1c : 0x95592a;
  const dome = new THREE.Color();

  const geo = buildLathe({
    profile: (
      [
        [0, 0.004],
        [0.3, 0],
        [0.47, 0.004],
        [0.53, 0.016],
        [0.56, 0.045],
        [0.572, 0.085],
        [0.566, 0.13],
        [0.545, 0.185],
        [0.5, 0.255],
        [0.43, 0.325],
        [0.33, 0.385],
        [0.2, 0.43],
        [0.08, 0.452],
        [0, 0.456],
      ] as [number, number][]
    ).map(([r, y]) => [r, y * s] as [number, number]),
    samples: kit.seg(48, 26),
    segments: kit.seg(96, 48),
    displace(p) {
      const k = 1 + 0.02 * noise(p.x * 1.8, p.y * 1.8, p.z * 1.8) + 0.006 * noise(p.x * 6, p.y * 6, p.z * 6);
      p.x *= k * 1.012;
      p.z *= k * 0.986;
      p.y += 0.014 * noise(p.x * 2.4 + 5, 0.3, p.z * 2.4) * (p.y / H);
    },
    color(p, _v, c) {
      const r = Math.hypot(p.x, p.z);
      const m = noise(p.x * 5, p.y * 5 + 9, p.z * 5);
      const fine = noise(p.x * 17, p.y * 17, p.z * 17);
      if (p.y < 0.01 && r < 0.49) {
        mixHex(c, 0xb67a42, 0xe3c894, smoothstep(0.3, 0.48, r));
        shade(c, 1 + 0.09 * m);
        return;
      }
      const t = p.y / H;
      mixHex(c, 0xe9d1a2, 0xd4a56e, smoothstep(0.01, 0.12, t));
      mixHex(dome, domeA, domeB, smoothstep(0.3, 0.98, t));
      c.lerp(dome, smoothstep(0.1, 0.4, t));
      if (t < 0.05) c.lerp(crumb, 0.5);
      shade(c, 1 + 0.1 * m + 0.035 * fine);
    },
  });

  const roughnessMap = kit.track(
    bandTexture(
      sesame
        ? [
            [0, 0.78],
            [0.4, 0.74],
            [0.48, 0.62],
            [0.62, 0.42],
            [1, 0.34],
          ]
        : [
            [0, 0.78],
            [0.45, 0.66],
            [1, 0.42],
          ],
    ),
  );
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, roughnessMap }));
  const g = group(mesh, "topBun");

  {
    const spots = sesame
      ? scatter(geo, (c) => c.y > 0.17, kit.seg(96, 48), 0.052, 91)
      : scatter(geo, (c) => c.y > 0.15 * s, kit.seg(80, 40), 0.06, 57);
    const seedGeo = new THREE.SphereGeometry(1, 10, 6);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 });
    const seeds = new THREE.InstancedMesh(seedGeo, seedMat, spots.length);
    const random = rng(7);
    const q = new THREE.Quaternion();
    const twist = new THREE.Quaternion();
    const m4 = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    spots.forEach((sp, i) => {
      q.setFromUnitVectors(up, sp.n);
      twist.setFromAxisAngle(up, random() * Math.PI * 2);
      q.multiply(twist);
      const k = 0.85 + random() * 0.3;
      // A third of the potato bun's seeds are black sesame, a touch smaller.
      const black = !sesame && random() < 0.34;
      const b = black ? 0.85 : 1;
      scale.set(0.0165 * k * b, 0.0062, 0.0098 * k * b);
      m4.compose(sp.p.clone().addScaledVector(sp.n, 0.003), q, scale);
      seeds.setMatrixAt(i, m4);
      if (black) seeds.setColorAt(i, mixHex(tmp, 0x1c1714, 0x3a302a, random()));
      else seeds.setColorAt(i, mixHex(tmp, 0xefdcb0, 0xd3b07a, random()));
    });
    seeds.instanceMatrix.needsUpdate = true;
    if (seeds.instanceColor) seeds.instanceColor.needsUpdate = true;
    seeds.name = "seeds";
    g.add(seeds);
  }

  return { part: sesame ? "topBun" : "topBunPotato", object: g, height: H, radius: 0.57 };
}

/* ── Patty & cheese ─────────────────────────────────────────────────────────── */

export function patty(kit: Kit, seed = 5): Layer {
  const noise = createNoise3(seed);
  const char = srgb(new THREE.Color(), 0x2c190e);
  const hi = srgb(new THREE.Color(), 0x96603a);
  const geo = buildLathe({
    profile: [
      [0, 0.004],
      [0.44, 0],
      [0.525, 0.01],
      [0.568, 0.038],
      [0.584, 0.074],
      [0.575, 0.108],
      [0.54, 0.136],
      [0.46, 0.151],
      [0.22, 0.157],
      [0, 0.159],
    ],
    samples: kit.seg(30, 16),
    segments: kit.seg(140, 60),
    displace(p, n) {
      const a = Math.atan2(p.x, p.z);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Smash patties spread unevenly: a lacy, wandering edge.
      const edge = 1 + 0.032 * fbm(noise, ca * 1.8, sa * 1.8, 2.3, 3) + 0.016 * noise(ca * 6, sa * 6, 9.1);
      p.x *= edge;
      p.z *= edge;
      const crag = 0.0065 * fbm(noise, p.x * 8, p.y * 8, p.z * 8, 3) + 0.0028 * noise(p.x * 26, p.y * 26, p.z * 26);
      p.addScaledVector(n, crag);
    },
    color(p, _v, c) {
      const r = Math.hypot(p.x, p.z);
      const n1 = fbm(noise, p.x * 5 + 7, p.y * 5, p.z * 5, 3);
      const n2 = noise(p.x * 16, p.y * 16 + 2, p.z * 16);
      mixHex(c, 0x55301d, 0x7e4e2d, smoothstep(-0.15, 0.45, n1));
      if (n1 < -0.18) c.lerp(char, smoothstep(-0.18, -0.5, n1) * 0.85);
      if (n2 > 0.45) c.lerp(hi, (n2 - 0.45) * 1.1);
      if (r > 0.53) shade(c, 0.8);
    },
  });
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  return { part: "patty", object: group(mesh, "patty"), height: 0.152, radius: 0.59 };
}

export function cheese(kit: Kit, seed = 8, rotation = 0.38): Layer {
  const n = kit.seg(44, 24);
  const T = 0.02;
  const geo = new THREE.BoxGeometry(0.92, T, 0.92, n, 1, n);
  geo.translate(0, T / 2, 0);
  const noise = createNoise3(seed);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  // A soft-cornered slice (squircle), edges not quite straight.
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const cheb = Math.max(Math.abs(x), Math.abs(z));
    let k = 1;
    if (cheb > 1e-5) {
      const cx = Math.abs(x) / cheb;
      const cz = Math.abs(z) / cheb;
      k = Math.pow(Math.pow(cx, 5) + Math.pow(cz, 5), -1 / 5);
    }
    const nx = x * k + 0.007 * noise(x * 4, 0, z * 4);
    const nz = z * k + 0.007 * noise(x * 4, 5, z * 4);
    pos.setXYZ(i, nx, pos.getY(i), nz);
  }
  const base = snapshotPositions(geo);
  const weight = new Float32Array(pos.count);
  const bump = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    weight[i] = 1 + 0.45 * noise(x * 2.2 + 1, 0.5, z * 2.2);
    bump[i] = noise(x * 7, 3, z * 7);
  }
  // The slice sits flat on the patty, then bends over its rounded shoulder along an arc and hangs.
  const R = 0.43;
  const BEND = 0.085;
  const MAX = 1.38;
  let current = -1;
  const setMelt = (m: number) => {
    if (Math.abs(m - current) < 1e-4) return;
    current = m;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const h = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      const d = Math.hypot(x, z);
      const s = d - R;
      if (s <= 0 || m <= 0.001) {
        arr[i * 3] = x;
        arr[i * 3 + 1] = h + m * 0.0025 * bump[i];
        arr[i * 3 + 2] = z;
        continue;
      }
      const rc = BEND / (m * weight[i]);
      const arcEnd = MAX * rc;
      let along: number;
      let down: number;
      let theta: number;
      if (s <= arcEnd) {
        theta = s / rc;
        along = rc * Math.sin(theta);
        down = rc * (1 - Math.cos(theta));
      } else {
        theta = MAX;
        const rest = s - arcEnd;
        along = rc * Math.sin(MAX) + rest * Math.cos(MAX);
        down = rc * (1 - Math.cos(MAX)) + rest * Math.sin(MAX);
      }
      // Keep the slab's thickness along the bent normal.
      const radial = R + along + h * Math.sin(theta);
      arr[i * 3] = (x / d) * radial;
      arr[i * 3 + 1] = -down + h * Math.cos(theta);
      arr[i * 3 + 2] = (z / d) * radial;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  setMelt(0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0xf7c23c, roughness: 0.28, emissive: 0x8a5200, emissiveIntensity: 0.14 }),
  );
  mesh.rotation.y = rotation;
  return { part: "cheese", object: group(mesh, "cheese"), height: 0.016, radius: 0.6, setMelt };
}

/* ── The fresh stuff ────────────────────────────────────────────────────────── */

export function lettuce(kit: Kit, opts: { seed?: number; palette?: "lettuce" | "slaw"; radius?: number } = {}): Layer {
  const noise = createNoise3(opts.seed ?? 3);
  const slaw = opts.palette === "slaw";
  const around = kit.seg(160, 72);
  const rings = kit.seg(18, 10);
  const R0 = opts.radius ?? 0.61;
  const count = around * (rings + 1);
  const position = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const theta = new Float32Array(count);
  const sArr = new Float32Array(count);
  const vein = srgb(new THREE.Color(), slaw ? 0xf7f5e4 : 0xdfe8b0);
  const c = new THREE.Color();
  const pal = slaw ? [0xf1efd8, 0xdfe3b8, 0xc2cf8e] : [0xd6dea2, 0x98b95c, 0x5b8a36];

  for (let j = 0; j <= rings; j++) {
    const s = j / rings;
    for (let i = 0; i < around; i++) {
      const k = j * around + i;
      const th = (i / around) * Math.PI * 2;
      const co = Math.cos(th);
      const si = Math.sin(th);
      const Rt = R0 * (1 + 0.045 * noise(co * 1.4, si * 1.4, 3.1) + 0.02 * noise(co * 5, si * 5, 7.7));
      const r = s * Rt;
      const ph = 2.4 * noise(co * 2, si * 2, 1.7);
      // Frills grow toward the edge: a slow wave, a quicker ruffle and a fine crinkle.
      const frill = Math.pow(smoothstep(0.35, 1, s), 1.4);
      const A = slaw ? 0.026 : 0.036;
      const wave =
        0.55 * Math.sin((slaw ? 11 : 7) * th + ph) + 0.35 * Math.sin((slaw ? 27 : 19) * th + ph * 1.6) + 0.18 * Math.sin(41 * th + ph * 2.3);
      // Past the patty's shoulder the leaf follows it down, then hangs as a skirt. Frills are
      // biased upward so they sit on the food instead of cutting into it.
      const shoulder = r > 0.42 ? -2.1 * (r - 0.42) * (r - 0.42) : 0;
      const y = shoulder + A * frill * (wave + 0.65) + 0.012 * s * noise(co * 3, si * 3, 5.5);
      // Ruffles also push in and out a little, so the edge isn't a clean circle.
      const rr = r * (1 + 0.035 * frill * Math.sin(19 * th + ph));
      position.set([rr * si, y, rr * co], k * 3);
      theta[k] = th;
      sArr[k] = s;
      if (s < 0.55) mixHex(c, pal[0], pal[1], s / 0.55);
      else mixHex(c, pal[1], pal[2], (s - 0.55) / 0.45);
      const v = Math.pow(1 - Math.abs(Math.sin(th * 5.5 + 1.8 * noise(co * 1.3, si * 1.3, 2.2))), 22);
      c.lerp(vein, v * 0.25 * (1 - s * 0.7));
      shade(c, 1 + 0.08 * noise(co * 6 * s, si * 6 * s, 8) + 0.06 * wave * frill);
      colors.set([c.r, c.g, c.b], k * 3);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < around; i++) {
      const i2 = (i + 1) % around;
      const a = j * around + i;
      const b = j * around + i2;
      const cc = (j + 1) * around + i2;
      const d = (j + 1) * around + i;
      index.push(a, d, b, b, d, cc);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.translate(0, slaw ? 0.03 : 0.022, 0);
  const baseShifted = (geo.getAttribute("position").array as Float32Array).slice();

  let lastAmount = 0;
  const setFlutter = (amount: number, time: number) => {
    if (Math.abs(amount) < 1e-4 && Math.abs(lastAmount) < 1e-4) return;
    lastAmount = amount;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let k = 0; k < count; k++) {
      const s = sArr[k];
      arr[k * 3 + 1] = baseShifted[k * 3 + 1] + amount * 0.04 * Math.pow(s, 1.5) * Math.sin(3 * theta[k] + time * 11 + s * 3);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
  return { part: slaw ? "slaw" : "lettuce", object: group(mesh, slaw ? "slaw" : "lettuce"), height: slaw ? 0.05 : 0.03, radius: R0, setFlutter };
}

export function tomato(kit: Kit, seed = 4): Layer {
  const noise = createNoise3(seed);
  const skin = new THREE.MeshStandardMaterial({ color: 0xbf3322, roughness: 0.26 });
  const flesh = new THREE.MeshStandardMaterial({ map: kit.tex.tomato, roughness: 0.28 });
  const g = new THREE.Group();
  g.name = "tomato";
  const slice = (r: number, k: number) => {
    const geo = new THREE.CylinderGeometry(r, r * 0.99, 0.052, kit.seg(48, 24), 1);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const a = Math.atan2(x, z);
      const f = 1 + 0.035 * noise(Math.cos(a) * 1.5 + k, Math.sin(a) * 1.5, k);
      pos.setX(i, x * f);
      pos.setZ(i, z * f);
    }
    geo.translate(0, 0.026, 0);
    return new THREE.Mesh(geo, [skin, flesh, flesh]);
  };
  const a = slice(0.29, 1);
  a.position.set(-0.14, 0, 0.05);
  a.rotation.y = 0.4;
  const b = slice(0.275, 4);
  b.position.set(0.15, 0.02, -0.05);
  b.rotation.set(0, 2.1, -0.075);
  g.add(a, b);
  return { part: "tomato", object: g, height: 0.052, radius: 0.46, pieces: [a, b] };
}

export function onion(kit: Kit): Layer {
  const mat = new THREE.MeshStandardMaterial({ map: kit.tex.onion, roughness: 0.32, emissive: 0x2a1426, emissiveIntensity: 0.2 });
  const g = new THREE.Group();
  g.name = "onion";
  const rings = [
    { R: 0.285, x: 0.04, z: 0.02, rx: 0.02, rz: -0.03, y: 0 },
    { R: 0.205, x: -0.14, z: 0.11, rx: -0.04, rz: 0.05, y: 0.006 },
    { R: 0.14, x: 0.16, z: -0.14, rx: 0.05, rz: 0.02, y: 0.01 },
  ];
  const pieces = rings.map((r) => {
    const geo = new THREE.TorusGeometry(r.R, 0.017, kit.seg(10, 6), kit.seg(80, 36));
    geo.scale(1, 1, 0.55);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.0095, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(r.x, r.y, r.z);
    m.rotation.set(r.rx, 0, r.rz);
    g.add(m);
    return m;
  });
  return { part: "onion", object: g, height: 0.018, radius: 0.36, pieces };
}

export function pickles(kit: Kit): Layer {
  const side = new THREE.MeshStandardMaterial({ color: 0x3b5220, roughness: 0.42 });
  const face = new THREE.MeshStandardMaterial({ map: kit.tex.pickle, roughness: 0.36 });
  const g = new THREE.Group();
  g.name = "pickles";
  const chips = [
    { x: 0.36, z: 0.26, y: 0.0, rx: 0.05, rz: -0.08 },
    { x: -0.38, z: 0.24, y: 0.004, rx: -0.06, rz: 0.07 },
    { x: 0.1, z: -0.36, y: 0.002, rx: 0.06, rz: 0.05 },
    { x: -0.04, z: 0.05, y: 0.012, rx: -0.03, rz: -0.05 },
  ];
  const pieces = chips.map((c, i) => {
    const geo = new THREE.CylinderGeometry(0.095, 0.095, 0.016, kit.seg(42, 22), 1);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const z = pos.getZ(v);
      if (Math.hypot(x, z) < 1e-4) continue;
      const a = Math.atan2(x, z);
      const k = 1 + 0.05 * Math.sin(14 * a) + 0.03 * Math.sin(a + i);
      pos.setX(v, x * k);
      pos.setZ(v, z * k);
    }
    geo.translate(0, 0.008, 0);
    const m = new THREE.Mesh(geo, [side, face, face]);
    m.position.set(c.x, c.y, c.z);
    m.rotation.set(c.rx, i * 1.3, c.rz);
    g.add(m);
    return m;
  });
  return { part: "pickles", object: g, height: 0.016, radius: 0.32, pieces };
}

/* ── Menu-only layers ───────────────────────────────────────────────────────── */

/** A buttermilk-fried chicken thigh: lumpy, craggy, golden. */
export function chicken(kit: Kit, seed = 9): Layer {
  const noise = createNoise3(seed);
  let geo: THREE.BufferGeometry = new THREE.SphereGeometry(1, kit.seg(96, 48), kit.seg(48, 24));
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.x, v.z);
    const outline = 1 + 0.12 * noise(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.5) + 0.05 * noise(Math.cos(a) * 3, Math.sin(a) * 3, 2);
    const ridge = 1 - Math.abs(noise(v.x * 5, v.y * 5, v.z * 5));
    const bumps = 0.045 * fbm(noise, v.x * 3, v.y * 3, v.z * 3, 3) + 0.03 * ridge * ridge;
    const n = v.clone().normalize();
    v.x *= 0.64 * outline;
    v.z *= 0.52 * outline;
    v.y *= v.y > 0 ? 0.15 : 0.1;
    v.addScaledVector(n, bumps);
    pos.setXYZ(i, v.x, v.y, v.z);
    mixHex(c, 0xa45d20, 0xe0a24c, smoothstep(0.2, 0.85, ridge));
    shade(c, 1 + 0.12 * noise(v.x * 12, v.y * 12, v.z * 12));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.translate(0, -geo.boundingBox!.min.y, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 }));
  mesh.rotation.y = 0.5;
  return { part: "chicken", object: group(mesh, "chicken"), height: 0.2, radius: 0.66 };
}

export function buildLayer(kit: Kit, part: StackPart, seed = 1): Layer {
  switch (part) {
    case "bottomBun":
      return bottomBun(kit, 11 + seed);
    case "patty":
      return patty(kit, 5 + seed * 7);
    case "cheese":
      return cheese(kit, 8 + seed, 0.38 + seed * 0.6);
    case "lettuce":
      return lettuce(kit, { seed: 3 + seed });
    case "slaw":
      return lettuce(kit, { seed: 13 + seed, palette: "slaw", radius: 0.56 });
    case "tomato":
      return tomato(kit, 4 + seed);
    case "onion":
      return onion(kit);
    case "pickles":
      return pickles(kit);
    case "chicken":
      return chicken(kit, 9 + seed);
    case "topBun":
      return topBun(kit, { seed: 23 + seed });
    case "topBunPotato":
      return topBun(kit, { potato: true, seed: 29 + seed });
  }
}
