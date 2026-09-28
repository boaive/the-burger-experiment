import * as THREE from "three";
import { Spring, rng, smoothstep } from "@/lib/math";
import { buildLathe, mixHex, shade, srgb } from "../lib/geometry";
import { createNoise3, fbm } from "../lib/noise";
import { canvasTexture } from "../lib/textures";
import { fryGeometry, fryMaterial } from "./fries";
import type { Kit } from "./kit";

/** Menu-only models. Each returns an object plus a small secondary-motion rig for its interaction. */
export type Rigged = {
  object: THREE.Group;
  /** Trigger the product's interaction (strength ~0–1). */
  poke: (strength: number) => void;
  /** Secondary motion; returns true while anything moves. */
  update: (dt: number) => boolean;
};

/* ── Onion rings: stacked higher than strictly necessary ─────────────────────── */

export function buildOnionRings(kit: Kit, seed = 5): Rigged {
  const noise = createNoise3(seed);
  const random = rng(seed);
  const object = new THREE.Group();
  object.name = "onionRings";
  const count = 5;
  const rings: { mesh: THREE.Mesh; base: THREE.Vector3; rx: number; rz: number; sx: Spring; sz: Spring }[] = [];
  let y = 0;
  for (let i = 0; i < count; i++) {
    const R = 0.22 - i * 0.008 + (random() - 0.5) * 0.02;
    const tube = 0.072;
    const geo = new THREE.TorusGeometry(R, tube, kit.seg(16, 10), kit.seg(56, 28));
    geo.scale(1, 1, 0.9);
    geo.rotateX(Math.PI / 2);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    geo.computeVertexNormals();
    const nor = geo.getAttribute("normal") as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      n.fromBufferAttribute(nor, k);
      // Batter: lumpy, with crisp ridges.
      const ridge = 1 - Math.abs(noise(v.x * 9 + i, v.y * 9, v.z * 9));
      const bump = 0.014 * fbm(noise, v.x * 7 + i * 3, v.y * 7, v.z * 7, 3) + 0.012 * ridge * ridge;
      v.addScaledVector(n, bump);
      pos.setXYZ(k, v.x, v.y, v.z);
      mixHex(c, 0x9c5516, 0xe7ae55, smoothstep(0.15, 0.9, ridge));
      shade(c, 1 + 0.1 * noise(v.x * 14, v.y * 14, v.z * 14));
      colors.set([c.r, c.g, c.b], k * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.64 }));
    const h = tube * 0.9 * 2;
    // A leaning tower: each ring shifted and tipped a little more than the last.
    const base = new THREE.Vector3(i * 0.03 + (random() - 0.5) * 0.05, y + h / 2, -i * 0.02 + (random() - 0.5) * 0.05);
    y += h * 0.78;
    rings.push({ mesh, base, rx: 0.3 + (random() - 0.5) * 0.22, rz: -0.08 + (random() - 0.5) * 0.3, sx: new Spring(90, 5), sz: new Spring(90, 5) });
    object.add(mesh);
  }
  const place = () => {
    for (const r of rings) {
      r.mesh.position.copy(r.base);
      r.mesh.rotation.set(r.rx + r.sx.value, 0, r.rz + r.sz.value);
      // Higher rings sway further from the stack's axis.
      r.mesh.position.x += r.sz.value * -r.base.y * 0.8;
      r.mesh.position.z += r.sx.value * r.base.y * 0.8;
    }
  };
  place();
  const poke = (s: number) => {
    const dir = random() > 0.5 ? 1 : -1;
    rings.forEach((r, i) => {
      r.sz.kick(dir * s * (0.8 + i * 0.7));
      r.sx.kick((random() - 0.5) * s * (0.5 + i * 0.4));
    });
  };
  const update = (dt: number) => {
    let moving = false;
    for (const r of rings) {
      r.sx.step(0, dt);
      r.sz.step(0, dt);
      if (Math.abs(r.sx.velocity) + Math.abs(r.sz.velocity) + Math.abs(r.sx.value) + Math.abs(r.sz.value) > 1e-4) moving = true;
    }
    place();
    return moving;
  };
  return { object, poke, update };
}

/* ── Loaded fries: a paper boat, a pile of fries, sauce, jalapeño, shallots ──── */

function jalapenoTexture() {
  return canvasTexture(64, 64, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = "#3f6b1f";
    ctx.beginPath();
    ctx.arc(c, c, c - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9cc25a";
    ctx.beginPath();
    ctx.arc(c, c, c - 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9e7b8";
    ctx.beginPath();
    ctx.arc(c, c, c - 17, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.fillStyle = "#f3efcf";
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * 8, c + Math.sin(a) * 8, 3, 2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function buildLoadedFries(kit: Kit, seed = 12): Rigged {
  const random = rng(seed);
  const object = new THREE.Group();
  object.name = "loadedFries";
  const body = new THREE.Group();
  object.add(body);

  // The boat: a low, flared, rounded-rectangle tray.
  const a0 = 0.44;
  const b0 = 0.29;
  const a1 = 0.5;
  const b1 = 0.34;
  const H = 0.17;
  const around = kit.seg(64, 36);
  const profile: number[] = [];
  const rows = 4;
  const index: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const a = a0 + (a1 - a0) * t;
    const b = b0 + (b1 - b0) * t;
    for (let i = 0; i < around; i++) {
      const phi = (i / around) * Math.PI * 2;
      const co = Math.cos(phi);
      const si = Math.sin(phi);
      profile.push(a * Math.sign(co) * Math.pow(Math.abs(co), 0.4), t * H, b * Math.sign(si) * Math.pow(Math.abs(si), 0.4));
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < around; i++) {
      const i2 = (i + 1) % around;
      const a = r * around + i;
      const b = r * around + i2;
      const c = (r + 1) * around + i2;
      const d = (r + 1) * around + i;
      index.push(a, d, b, b, d, c);
    }
  }
  const centre = profile.length / 3;
  profile.push(0, 0, 0);
  for (let i = 0; i < around; i++) index.push(centre, i, (i + 1) % around);
  const trayGeo = new THREE.BufferGeometry();
  trayGeo.setIndex(index);
  trayGeo.setAttribute("position", new THREE.Float32BufferAttribute(profile, 3));
  trayGeo.computeVertexNormals();
  body.add(new THREE.Mesh(trayGeo, new THREE.MeshStandardMaterial({ color: 0xc23a20, roughness: 0.6 })));
  body.add(new THREE.Mesh(trayGeo, new THREE.MeshStandardMaterial({ color: 0xeee0c8, roughness: 0.85, side: THREE.BackSide })));

  // A heap of fries.
  const fryCount = [18, 24, 30][kit.detail];
  const fries = new THREE.InstancedMesh(fryGeometry(kit), fryMaterial(), fryCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const heightAt = (x: number, z: number) => 0.24 * Math.max(0, 1 - (x * x) / 0.2 - (z * z) / 0.1);
  for (let i = 0; i < fryCount; i++) {
    const x = (random() - 0.5) * 0.4;
    const z = (random() - 0.5) * 0.3;
    const y = 0.06 + heightAt(x, z) * random();
    // Mostly along the tray's long side, so they sit inside it.
    e.set((random() - 0.5) * 0.4, (random() - 0.5) * 1.1, Math.PI / 2 + (random() - 0.5) * 0.4);
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 0.62 + random() * 0.3, 1));
    fries.setMatrixAt(i, m4);
    fries.setColorAt(i, mixHex(new THREE.Color(), 0xffffff, 0xe6c79a, random() * 0.7));
  }
  body.add(fries);

  // Cheese sauce: glossy ribbons draped over the heap.
  const sauceMat = new THREE.MeshStandardMaterial({ color: 0xf4b43a, roughness: 0.22, emissive: 0x7a4200, emissiveIntensity: 0.15 });
  for (let k = 0; k < 4; k++) {
    const pts: THREE.Vector3[] = [];
    const z0 = (random() - 0.5) * 0.3;
    for (let s = 0; s <= 6; s++) {
      const x = -0.32 + (s / 6) * 0.64;
      const z = z0 + Math.sin(s * 1.3 + k) * 0.08;
      pts.push(new THREE.Vector3(x, 0.1 + heightAt(x, z) * 0.95, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, kit.seg(48, 24), 0.024 + random() * 0.01, 8), sauceMat));
  }

  // Toppings that hop when shaken.
  const toppings: { obj: THREE.Object3D; base: THREE.Vector3; hop: Spring }[] = [];
  const jalaGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20);
  const jalaMats = [
    new THREE.MeshStandardMaterial({ color: 0x3f6b1f, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: kit.track(jalapenoTexture()), roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: kit.track(jalapenoTexture()), roughness: 0.4 }),
  ];
  for (let k = 0; k < 7; k++) {
    const x = (random() - 0.5) * 0.55;
    const z = (random() - 0.5) * 0.32;
    const m = new THREE.Mesh(jalaGeo, jalaMats);
    const base = new THREE.Vector3(x, 0.17 + heightAt(x, z), z);
    m.position.copy(base);
    m.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
    body.add(m);
    toppings.push({ obj: m, base, hop: new Spring(70, 5) });
  }
  const shallotGeo = new THREE.SphereGeometry(0.026, 7, 5);
  shallotGeo.scale(1.4, 0.45, 0.8);
  const shallotMat = new THREE.MeshStandardMaterial({ color: 0x8a4a1c, roughness: 0.7 });
  for (let k = 0; k < 16; k++) {
    const x = (random() - 0.5) * 0.6;
    const z = (random() - 0.5) * 0.36;
    const m = new THREE.Mesh(shallotGeo, shallotMat);
    const base = new THREE.Vector3(x, 0.18 + heightAt(x, z), z);
    m.position.copy(base);
    m.rotation.set(random(), random() * 3, random());
    body.add(m);
    toppings.push({ obj: m, base, hop: new Spring(80, 6) });
  }

  const tilt = new Spring(120, 7);
  const poke = (s: number) => {
    tilt.kick((random() > 0.5 ? 1 : -1) * 2.2 * s);
    toppings.forEach((t) => t.hop.kick((1.2 + random() * 1.6) * s));
  };
  const update = (dt: number) => {
    tilt.step(0, dt);
    body.rotation.z = tilt.value * 0.1;
    body.rotation.x = tilt.value * 0.04;
    let moving = Math.abs(tilt.velocity) + Math.abs(tilt.value) > 1e-4;
    for (const t of toppings) {
      t.hop.step(0, dt);
      t.obj.position.y = t.base.y + Math.max(0, t.hop.value) * 0.12;
      if (Math.abs(t.hop.velocity) > 1e-4) moving = true;
    }
    return moving;
  };
  return { object, poke, update };
}

/* ── Milkshakes: a tulip glass, a thick shake, swirled cream, something on top ─ */

function strawberry(kit: Kit): THREE.Group {
  const g = new THREE.Group();
  const noise = createNoise3(4);
  const berry = buildLathe({
    profile: [
      [0, 0],
      [0.05, 0.012],
      [0.085, 0.05],
      [0.1, 0.1],
      [0.095, 0.15],
      [0.07, 0.18],
      [0, 0.19],
    ],
    samples: 20,
    segments: kit.seg(28, 16),
    displace(p) {
      p.x *= 1 + 0.05 * noise(p.x * 20, p.y * 20, p.z * 20);
    },
    color(p, _v, c) {
      mixHex(c, 0xc4182a, 0xd8324a, smoothstep(0, 0.2, p.y));
      const seed = noise(p.x * 60, p.y * 60, p.z * 60);
      if (seed > 0.55) srgb(c, 0xf1d27a);
    },
  });
  berry.rotateX(Math.PI);
  berry.translate(0, 0.19, 0);
  g.add(new THREE.Mesh(berry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 })));
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.5, side: THREE.DoubleSide });
  for (let k = 0; k < 5; k++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4, 1), leafMat);
    leaf.scale.set(1, 1, 0.25);
    leaf.position.set(Math.cos((k / 5) * Math.PI * 2) * 0.04, 0.19, Math.sin((k / 5) * Math.PI * 2) * 0.04);
    leaf.rotation.set(0, -(k / 5) * Math.PI * 2, Math.PI / 2 - 0.35);
    g.add(leaf);
  }
  return g;
}

export function buildShake(kit: Kit, flavor: "strawberry" | "caramel", seed = 3): Rigged {
  const random = rng(seed);
  const object = new THREE.Group();
  object.name = "shake";
  const seg = kit.seg(56, 32);

  const outer: [number, number][] = [
    [0, 0],
    [0.24, 0],
    [0.25, 0.02],
    [0.2, 0.04],
    [0.075, 0.07],
    [0.055, 0.12],
    [0.055, 0.19],
    [0.1, 0.24],
    [0.22, 0.38],
    [0.3, 0.6],
    [0.35, 0.9],
    [0.38, 1.18],
  ];
  const glassGeo = new THREE.LatheGeometry(
    outer.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );
  const glass = new THREE.Mesh(
    glassGeo,
    new THREE.MeshStandardMaterial({ color: 0xf3f8f6, roughness: 0.06, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  );
  glass.renderOrder = 3;
  object.add(glass);

  const shakeColor = flavor === "strawberry" ? 0xf0a3b0 : 0xc79058;
  const fillProfile = [
    new THREE.Vector2(0, 0.22),
    new THREE.Vector2(0.09, 0.25),
    new THREE.Vector2(0.2, 0.38),
    new THREE.Vector2(0.28, 0.6),
    new THREE.Vector2(0.33, 0.9),
    new THREE.Vector2(0.355, 1.12),
    new THREE.Vector2(0, 1.12),
  ];
  const fill = new THREE.Mesh(
    new THREE.LatheGeometry(fillProfile, seg),
    new THREE.MeshStandardMaterial({ color: shakeColor, roughness: 0.62, emissive: shakeColor, emissiveIntensity: 0.08 }),
  );
  object.add(fill);

  // Whipped cream: a dome with a spiral ridge, piped from a star nozzle.
  const cream = new THREE.Group();
  cream.position.y = 1.1;
  object.add(cream);
  const creamGeo = buildLathe({
    profile: [
      [0, 0],
      [0.36, 0],
      [0.37, 0.05],
      [0.33, 0.14],
      [0.25, 0.25],
      [0.15, 0.34],
      [0.06, 0.41],
      [0, 0.46],
    ],
    samples: kit.seg(40, 24),
    segments: kit.seg(72, 40),
    displace(p, n, v) {
      const a = Math.atan2(p.x, p.z);
      const ridge = Math.sin(a * 7 - v * 26) * (1 - v * 0.6);
      p.addScaledVector(n, 0.022 * ridge * smoothstep(0, 0.12, v));
    },
    color(_p, v, c) {
      mixHex(c, 0xfbf3e6, 0xf3e6d2, v * 0.5);
    },
  });
  const creamMesh = new THREE.Mesh(creamGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58 }));
  cream.add(creamMesh);

  let topping: THREE.Object3D;
  if (flavor === "strawberry") {
    topping = strawberry(kit);
    topping.rotation.z = 0.25;
  } else {
    // Caramel drizzle over the cream, and a maraschino cherry.
    const drizzle = new THREE.MeshStandardMaterial({ color: 0xa8601f, roughness: 0.2, emissive: 0x3a1800, emissiveIntensity: 0.2 });
    for (let k = 0; k < 3; k++) {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 10; s++) {
        const a = (s / 10) * Math.PI * 2 + k * 2.1;
        const r = 0.3 - s * 0.018;
        const y = 0.06 + s * 0.028;
        pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r));
      }
      cream.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.016, 6), drizzle));
    }
    const cherry = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), new THREE.MeshStandardMaterial({ color: 0xa3121f, roughness: 0.18 }));
    ball.position.y = 0.07;
    const stem = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.13, 0), new THREE.Vector3(0.02, 0.22, 0), new THREE.Vector3(0.08, 0.27, 0)), 12, 0.006, 5),
      new THREE.MeshStandardMaterial({ color: 0x5a3a14, roughness: 0.6 }),
    );
    cherry.add(ball, stem);
    topping = cherry;
  }
  topping.position.y = 0.42;
  cream.add(topping);

  const straw = new THREE.Group();
  straw.position.set(-0.08, 0.3, 0.05);
  const strawTex = (flavor === "strawberry" ? kit.tex.straw : kit.tex.strawYellow).clone();
  strawTex.repeat.set(1, 3);
  strawTex.needsUpdate = true;
  kit.track(strawTex);
  const strawMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.6, 14, 1, true),
    new THREE.MeshStandardMaterial({ map: strawTex, roughness: 0.55, side: THREE.DoubleSide }),
  );
  strawMesh.position.y = 0.8;
  straw.add(strawMesh);
  straw.rotation.set(0.12, 0, 0.24);
  object.add(straw);

  const squash = new Spring(150, 7);
  const hop = new Spring(110, 6);
  const sway = new Spring(100, 4);
  const poke = (s: number) => {
    squash.kick(3.5 * s);
    hop.kick(4 * s);
    sway.kick((random() - 0.5) * 3 * s);
  };
  const update = (dt: number) => {
    squash.step(0, dt);
    hop.step(0, dt);
    sway.step(0, dt);
    const q = squash.value * 0.12;
    cream.scale.set(1 + q * 0.6, 1 - q, 1 + q * 0.6);
    topping.position.y = 0.42 * (1 - q) + Math.max(0, hop.value) * 0.08;
    topping.rotation.x = sway.value * 0.2;
    straw.rotation.z = 0.24 + sway.value * 0.1;
    return Math.abs(squash.velocity) + Math.abs(hop.velocity) + Math.abs(sway.velocity) + Math.abs(squash.value) > 1e-4;
  };
  return { object, poke, update };
}
