import * as THREE from "three";
import { smoothstep } from "@/lib/math";
import { snapshotPositions } from "../lib/geometry";
import { createNoise3 } from "../lib/noise";
import { linerTexture } from "../lib/textures";
import type { Kit } from "./kit";

export type Liner = {
  object: THREE.Group;
  /** Bend the sheet while it glides down (0 = flat). */
  setBend: (amount: number, time: number) => void;
};

/** The greaseproof sheet the burger is built on: printed, a little crinkled, corners lifting. */
export function buildLiner(kit: Kit): Liner {
  const size = 1.32;
  const n = kit.seg(28, 14);
  const geo = new THREE.PlaneGeometry(size, size, n, n);
  geo.rotateX(-Math.PI / 2);
  const noise = createNoise3(71);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const edge = Math.max(Math.abs(x), Math.abs(z)) / (size / 2);
    const corner = Math.min(Math.abs(x), Math.abs(z)) / (size / 2);
    const curl = 0.05 * smoothstep(0.6, 1, edge) * smoothstep(0.55, 1, corner);
    pos.setY(i, 0.003 + 0.0035 * noise(x * 3, 0, z * 3) + curl);
  }
  geo.computeVertexNormals();
  const base = snapshotPositions(geo);
  const mat = new THREE.MeshStandardMaterial({ map: kit.track(linerTexture(kit.fonts)), roughness: 0.86 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  const object = new THREE.Group();
  object.name = "liner";
  object.add(mesh);

  let last = 0;
  const setBend = (amount: number, time: number) => {
    if (amount === 0 && last === 0) return;
    last = amount;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      arr[i * 3 + 1] = base[i * 3 + 1] + amount * (0.09 * Math.sin(x * 2.6 + time * 5) + 0.05 * Math.cos(z * 3.1 + time * 4));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };

  return { object, setBend };
}

/** A soft blob that grounds an object; its opacity and spread follow the object's height. */
export function contactShadow(kit: Kit, radius: number, color = 0x3a2213): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ color, map: kit.tex.radial, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}
