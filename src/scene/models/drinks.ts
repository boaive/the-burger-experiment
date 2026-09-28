import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Spring, rng } from "@/lib/math";
import { canvasTexture, cupPrintTexture } from "../lib/textures";
import type { Kit } from "./kit";

export type DrinkModel = {
  object: THREE.Group;
  height: number;
  radius: number;
  /** Push the liquid and straw (e.g. from the cup's own acceleration or a tap). */
  nudge: (x: number, z: number) => void;
  /** Stir: ice bobs, straw swings. */
  stir: (strength: number) => void;
  /** Secondary motion; returns true while anything is still moving. */
  update: (dt: number, time: number, idle: boolean) => boolean;
};

const CUP_H = 1.3;
const R_BOTTOM = 0.3;
const R_TOP = 0.41;
const radiusAt = (y: number) => R_BOTTOM + (R_TOP - R_BOTTOM) * (y / CUP_H);

function lemonTexture() {
  return canvasTexture(128, 128, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = "#e9c12e";
    ctx.beginPath();
    ctx.arc(c, c, c - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fbf1c9";
    ctx.beginPath();
    ctx.arc(c, c, c - 7, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 9; k++) {
      const a0 = (k / 9) * Math.PI * 2 + 0.06;
      const a1 = ((k + 1) / 9) * Math.PI * 2 - 0.06;
      ctx.fillStyle = k % 2 ? "#f4d54f" : "#f7dc62";
      ctx.beginPath();
      ctx.moveTo(c + Math.cos((a0 + a1) / 2) * 6, c + Math.sin((a0 + a1) / 2) * 6);
      ctx.arc(c, c, c - 11, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** A cup of something cold: paper for cola, clear for lemonade. */
export function buildDrink(kit: Kit, opts: { drink?: "cola" | "lemonade"; seed?: number; label?: string } = {}): DrinkModel {
  const drink = opts.drink ?? "cola";
  const clear = drink === "lemonade";
  const random = rng(opts.seed ?? 29);
  const object = new THREE.Group();
  object.name = "drink";
  const seg = kit.seg(64, 32);

  // Cup wall: one lathe, printed outside, plain paper inside. The seam sits at the back.
  const profile = [new THREE.Vector2(0, 0.014), new THREE.Vector2(0.29, 0.014), new THREE.Vector2(R_BOTTOM, 0), new THREE.Vector2(R_TOP, CUP_H)];
  const cupGeo = new THREE.LatheGeometry(profile, seg, Math.PI, Math.PI * 2);
  const uv = cupGeo.getAttribute("uv") as THREE.BufferAttribute;
  const pos = cupGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) / CUP_H);

  let outsideMat: THREE.Material;
  if (clear) {
    outsideMat = new THREE.MeshStandardMaterial({
      color: 0xf6fbf8,
      roughness: 0.08,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
  } else {
    const print = kit.track(
      cupPrintTexture(kit.fonts, { width: 2 * Math.PI * radiusAt(CUP_H / 2), height: CUP_H }, { label: opts.label ?? "No. 10 · Cola" }),
    );
    outsideMat = new THREE.MeshStandardMaterial({ map: print, roughness: 0.55 });
  }
  const outside = new THREE.Mesh(cupGeo, outsideMat);
  outside.renderOrder = clear ? 3 : 0;
  object.add(outside);
  if (!clear) {
    object.add(new THREE.Mesh(cupGeo, new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 0.8, side: THREE.BackSide })));
  }
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(R_TOP, clear ? 0.008 : 0.013, 8, seg),
    clear ? outsideMat : new THREE.MeshStandardMaterial({ color: 0xf4ebdc, roughness: 0.5 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = CUP_H;
  object.add(rim);

  // Liquid: a surface that sloshes (and, in a clear cup, a body you can see).
  const fill = clear ? 1.08 : 1.12;
  const surfaceGroup = new THREE.Group();
  surfaceGroup.position.y = fill;
  object.add(surfaceGroup);
  const liquidColor = clear ? 0xf1d772 : 0x2a120a;
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(radiusAt(fill) * 0.985, seg),
    new THREE.MeshStandardMaterial({ color: liquidColor, roughness: clear ? 0.2 : 0.08, transparent: clear, opacity: clear ? 0.85 : 1 }),
  );
  surface.rotation.x = -Math.PI / 2;
  surfaceGroup.add(surface);
  if (clear) {
    const body = new THREE.Mesh(
      new THREE.LatheGeometry([new THREE.Vector2(0, 0.02), new THREE.Vector2(0.285, 0.02), new THREE.Vector2(radiusAt(fill) * 0.98, fill)], seg),
      new THREE.MeshStandardMaterial({ color: liquidColor, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    body.renderOrder = 1;
    object.add(body);
  }

  // Ice.
  const iceGeo = new RoundedBoxGeometry(0.15, 0.13, 0.15, 2, 0.03);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xe8f3f5, roughness: 0.05, transparent: true, opacity: clear ? 0.55 : 0.84 });
  const icePlaces = [
    [0.13, 0.1],
    [-0.15, 0.07],
    [0.02, -0.17],
    [-0.1, -0.08],
    [0.18, -0.1],
  ].slice(0, kit.detail === 0 ? 4 : 5);
  const ice = icePlaces.map(([x, z], i) => {
    const m = new THREE.Mesh(iceGeo, iceMat);
    m.position.set(x, fill - 0.015, z);
    m.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
    m.userData.rest = m.position.y;
    m.userData.phase = i * 1.7;
    m.renderOrder = 2;
    object.add(m);
    return m;
  });

  if (clear) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 32), [
      new THREE.MeshStandardMaterial({ color: 0xe0b52a, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: kit.track(lemonTexture()), roughness: 0.35 }),
      new THREE.MeshStandardMaterial({ map: kit.track(lemonTexture()), roughness: 0.35 }),
    ]);
    wheel.rotation.set(Math.PI / 2, 0, 0.3);
    wheel.position.set(-0.3, CUP_H - 0.02, 0.22);
    object.add(wheel);
  }

  // Straw: pivots at the cup floor, leans on the rim.
  const straw = new THREE.Group();
  straw.position.set(0.06, 0.12, 0.03);
  const strawTex = (clear ? kit.tex.strawYellow : kit.tex.straw).clone();
  strawTex.repeat.set(1, 3.2);
  strawTex.needsUpdate = true;
  kit.track(strawTex);
  const strawLen = 1.62;
  const strawMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, strawLen, 16, 1, true),
    new THREE.MeshStandardMaterial({ map: strawTex, roughness: 0.55, side: THREE.DoubleSide }),
  );
  strawMesh.position.y = strawLen / 2;
  straw.add(strawMesh);
  const lean = { x: 0.1, z: -0.19 };
  straw.rotation.set(lean.x, 0, lean.z);
  object.add(straw);

  const sloshX = new Spring(55, 2.6);
  const sloshZ = new Spring(55, 2.6);
  const strawX = new Spring(120, 3.2);
  const strawZ = new Spring(120, 3.2);
  const bob = new Spring(40, 2.2);

  const nudge = (x: number, z: number) => {
    sloshX.kick(z * 0.9);
    sloshZ.kick(-x * 0.9);
    strawX.kick(z * 1.6);
    strawZ.kick(-x * 1.6);
    bob.kick(Math.hypot(x, z) * 0.25);
  };
  const stir = (s: number) => {
    strawZ.kick((random() - 0.3) * 4 * s);
    strawX.kick((random() - 0.5) * 3 * s);
    sloshX.kick((random() - 0.5) * 1.2 * s);
    sloshZ.kick((random() - 0.5) * 1.2 * s);
    bob.kick(0.8 * s);
  };

  const update = (dt: number, time: number, idle: boolean) => {
    sloshX.step(0, dt);
    sloshZ.step(0, dt);
    strawX.step(0, dt);
    strawZ.step(0, dt);
    bob.step(0, dt);
    const cap = 0.07;
    surfaceGroup.rotation.set(Math.max(-cap, Math.min(cap, sloshX.value)), 0, Math.max(-cap, Math.min(cap, sloshZ.value)));
    straw.rotation.set(lean.x + strawX.value * 0.35, 0, lean.z + strawZ.value * 0.35);
    const idleAmp = idle ? 1 : 0;
    ice.forEach((m, i) => {
      const ph = m.userData.phase as number;
      m.position.y = (m.userData.rest as number) + idleAmp * 0.005 * Math.sin(time * 1.6 + ph) + bob.value * 0.04 * Math.sin(ph + i);
      m.rotation.z += idleAmp * 0.0006 * Math.sin(time + ph);
    });
    return (
      Math.abs(sloshX.velocity) + Math.abs(sloshZ.velocity) + Math.abs(strawX.velocity) + Math.abs(strawZ.velocity) + Math.abs(bob.velocity) >
      1e-3
    );
  };

  return { object, height: CUP_H + 0.35, radius: R_TOP + 0.05, nudge, stir, update };
}
