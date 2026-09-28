import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Spring, clamp, rng } from "@/lib/math";
import { mixHex } from "../lib/geometry";
import { cartonPrintTexture } from "../lib/textures";
import type { Kit } from "./kit";

const FRY_LEN = 0.62;

/** A single fry: a soft-edged stick, golden with darker ends. Shared by cartons and trays. */
export function fryGeometry(kit: Kit): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(0.056, FRY_LEN, 0.056, kit.detail === 0 ? 1 : 2, 0.012);
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.abs(pos.getY(i)) / (FRY_LEN / 2);
    mixHex(c, 0xf3d386, 0xcf9a4c, clamp((t - 0.7) / 0.3));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

export function fryMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66 });
}

type CartonShape = { a0: number; b0: number; a1: number; b1: number; H: number };

/** Superellipse cross-section: a rounded rectangle that flares toward the top, front and back raised. */
function cartonGeometry(shape: CartonShape, around: number, rows: number) {
  const { a0, b0, a1, b1, H } = shape;
  const n = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const cols = around + 1; // duplicated seam column for the print UVs
  const topY = (phi: number) => H * (0.9 + 0.12 * Math.sin(phi) ** 2);
  const vMax = H * 1.02;
  const shapeAt = (phi: number, a: number, b: number) => {
    const co = Math.cos(phi);
    const si = Math.sin(phi);
    return [a * Math.sign(co) * Math.pow(Math.abs(co), 2 / n), b * Math.sign(si) * Math.pow(Math.abs(si), 2 / n)];
  };

  // Angle steps are very uneven on a superellipse (the flat faces race past), so resample the
  // outline by arc length: even tessellation and a print that isn't stretched.
  const fine = 1440;
  const am = (a0 + a1) / 2;
  const bm = (b0 + b1) / 2;
  const cum = [0];
  let [px, pz] = shapeAt(-Math.PI / 2, am, bm);
  for (let k = 1; k <= fine; k++) {
    const [x, z] = shapeAt(-Math.PI / 2 + (k / fine) * Math.PI * 2, am, bm);
    cum.push(cum[k - 1] + Math.hypot(x - px, z - pz));
    px = x;
    pz = z;
  }
  const total = cum[fine];
  const phis: number[] = [];
  for (let i = 0, k = 0; i < cols; i++) {
    const target = (i / around) * total;
    while (k < fine && cum[k + 1] < target) k++;
    const f = (target - cum[k]) / Math.max(1e-9, cum[Math.min(fine, k + 1)] - cum[k]);
    phis.push(-Math.PI / 2 + ((k + Math.min(1, f)) / fine) * Math.PI * 2);
  }

  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const a = a0 + (a1 - a0) * t;
    const b = b0 + (b1 - b0) * t;
    for (let i = 0; i < cols; i++) {
      const phi = phis[i];
      const [x, z] = shapeAt(phi, a, b);
      const y = t * topY(phi);
      positions.push(x, y, z);
      // u runs left-to-right when seen from the front, so the print reads correctly.
      uvs.push(1 - i / around, y / vMax);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < around; i++) {
      const a = r * cols + i;
      const b = r * cols + i + 1;
      const c = (r + 1) * cols + i + 1;
      const d = (r + 1) * cols + i;
      index.push(a, d, b, b, d, c);
    }
  }
  // Bottom: a fan to a centre vertex.
  const centre = positions.length / 3;
  positions.push(0, 0, 0);
  uvs.push(0.5, 0);
  for (let i = 0; i < around; i++) index.push(centre, i, i + 1);

  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  // Weld the seam normals so the back of the carton shades smoothly.
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  for (let r = 0; r <= rows; r++) {
    const i0 = r * cols;
    const i1 = r * cols + around;
    v.fromBufferAttribute(nor, i0).add(w.fromBufferAttribute(nor, i1)).normalize();
    nor.setXYZ(i0, v.x, v.y, v.z);
    nor.setXYZ(i1, v.x, v.y, v.z);
  }
  return g;
}

function perimeter(a: number, b: number) {
  let p = 0;
  let px = a;
  let pz = 0;
  for (let i = 1; i <= 128; i++) {
    const phi = (i / 128) * Math.PI * 2;
    const x = a * Math.sign(Math.cos(phi)) * Math.pow(Math.abs(Math.cos(phi)), 0.5);
    const z = b * Math.sign(Math.sin(phi)) * Math.pow(Math.abs(Math.sin(phi)), 0.5);
    p += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  return p;
}

type Fry = {
  base: THREE.Vector3;
  rx: number;
  ry: number;
  rz: number;
  len: number;
  sx: Spring;
  sz: Spring;
};

export type FriesModel = {
  object: THREE.Group;
  height: number;
  radius: number;
  /** Shake every fry a little (strength ~0–1). */
  jostle: (strength: number) => void;
  /** Secondary motion; returns true while anything is still moving. */
  update: (dt: number) => boolean;
  /** Loose fries that hop out when the carton lands: 0 = hidden inside, 1 = resting on the table. */
  setSpill: (tau: number) => void;
};

/** The fries carton: branded board, a crowd of imperfect fries, two escapees. */
export function buildFries(kit: Kit, opts: { spill?: boolean; seed?: number; label?: string } = {}): FriesModel {
  const random = rng(opts.seed ?? 17);
  const shape: CartonShape = { a0: 0.25, b0: 0.145, a1: 0.34, b1: 0.2, H: 0.74 };
  const object = new THREE.Group();
  object.name = "fries";

  const geo = cartonGeometry(shape, kit.seg(72, 40), kit.seg(12, 6));
  const print = kit.track(
    cartonPrintTexture(kit.fonts, { width: perimeter((shape.a0 + shape.a1) / 2, (shape.b0 + shape.b1) / 2), height: shape.H * 1.02 }, opts.label),
  );
  const outside = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: print, roughness: 0.62 }));
  const inside = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xeee0c8, roughness: 0.85, side: THREE.BackSide }));
  object.add(outside, inside);

  const fryGeo = fryGeometry(kit);
  const fryMat = fryMaterial();
  const count = [12, 16, 20][kit.detail];
  const fries = new THREE.InstancedMesh(fryGeo, fryMat, count);
  fries.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const list: Fry[] = [];
  const cols = count / 4;
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = -0.25 + (col / (cols - 1)) * 0.5 + (random() - 0.5) * 0.05;
    const z = -0.12 + (row / 3) * 0.22 + (random() - 0.5) * 0.04;
    list.push({
      base: new THREE.Vector3(x, 0.2 + random() * 0.14, z),
      rx: z * 1.1 + (random() - 0.5) * 0.22,
      ry: random() * Math.PI,
      rz: -x * 0.75 + (random() - 0.5) * 0.24,
      len: 0.92 + random() * 0.32,
      sx: new Spring(140 + random() * 60, 5 + random() * 2),
      sz: new Spring(140 + random() * 60, 5 + random() * 2),
    });
    fries.setColorAt(i, mixHex(new THREE.Color(), 0xffffff, 0xe6c79a, random() * 0.7));
  }
  if (fries.instanceColor) fries.instanceColor.needsUpdate = true;
  object.add(fries);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const writeFries = () => {
    list.forEach((f, i) => {
      e.set(f.rx + f.sx.value, f.ry, f.rz + f.sz.value);
      q.setFromEuler(e);
      dir.set(0, 1, 0).applyQuaternion(q);
      pos.copy(f.base).addScaledVector(dir, (FRY_LEN * f.len) / 2);
      scl.set(1, f.len, 1);
      m4.compose(pos, q, scl);
      fries.setMatrixAt(i, m4);
    });
    fries.instanceMatrix.needsUpdate = true;
  };
  writeFries();

  // Escapees: they sit hidden in the carton until it lands.
  const spill: { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; rot: THREE.Euler; delay: number }[] = [];
  if (opts.spill !== false) {
    const targets = [
      { to: new THREE.Vector3(0.5, 0.029, 0.34), rot: new THREE.Euler(0, 0.55, Math.PI / 2), delay: 0 },
      { to: new THREE.Vector3(-0.08, 0.029, 0.5), rot: new THREE.Euler(0, -0.35, Math.PI / 2), delay: 0.08 },
    ];
    for (const t of targets) {
      const mesh = new THREE.Mesh(fryGeo, fryMat);
      mesh.visible = false;
      object.add(mesh);
      spill.push({ mesh, from: new THREE.Vector3(0.12, 0.72, 0.02), to: t.to, rot: t.rot, delay: t.delay });
    }
  }

  const setSpill = (tau: number) => {
    for (const s of spill) {
      const t = tau - s.delay;
      if (t <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.mesh.visible = true;
      const flight = 0.5;
      if (t < flight) {
        const u = t / flight;
        s.mesh.position.lerpVectors(s.from, s.to, u);
        s.mesh.position.y += Math.sin(u * Math.PI) * 0.34;
        // Tumble through the air, arriving flat.
        s.mesh.rotation.set((1 - u) * 5, s.rot.y + (1 - u) * 1.6, s.rot.z * u);
      } else {
        // A small hop after touching down.
        const h = t - flight;
        const hop = h < 0.16 ? Math.sin((h / 0.16) * Math.PI) * 0.03 : 0;
        s.mesh.position.copy(s.to);
        s.mesh.position.y += hop;
        s.mesh.rotation.set(0, s.rot.y, s.rot.z);
      }
    }
  };

  const jostle = (strength: number) => {
    for (const f of list) {
      f.sx.kick((random() - 0.5) * 7 * strength);
      f.sz.kick((random() - 0.5) * 7 * strength);
    }
  };

  const update = (dt: number) => {
    let moving = false;
    for (const f of list) {
      f.sx.step(0, dt);
      f.sz.step(0, dt);
      if (Math.abs(f.sx.value) + Math.abs(f.sx.velocity) + Math.abs(f.sz.value) + Math.abs(f.sz.velocity) > 1e-4) moving = true;
    }
    if (moving) writeFries();
    return moving;
  };

  return { object, height: 1.05, radius: 0.42, jostle, update, setSpill };
}
