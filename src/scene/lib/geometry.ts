import * as THREE from "three";

export type ProfilePoint = [r: number, y: number];

export type LatheOptions = {
  /** (radius, height) pairs, from the bottom centre outward and up (like THREE.LatheGeometry). */
  profile: ProfilePoint[];
  /** Points after resampling the profile by arc length (smooth Catmull-Rom). */
  samples?: number;
  segments: number;
  /** Mutates `p` in place. `n` is the outward profile normal, `v` the position along the profile (0–1). */
  displace?: (p: THREE.Vector3, n: THREE.Vector3, v: number) => void;
  /** Writes a colour (sRGB hex via Color.setHex/setRGB is fine — it is converted to linear). */
  color?: (p: THREE.Vector3, v: number, out: THREE.Color) => void;
};

/**
 * A lathe without a duplicated seam column, so displaced, noise-coloured surfaces shade smoothly
 * all the way round. UVs: u = angle (not seam-safe), v = position along the profile — textures
 * that vary only along v (roughness bands) are safe to use.
 */
export function buildLathe(opts: LatheOptions): THREE.BufferGeometry {
  const { segments, displace, color } = opts;
  const curve = new THREE.SplineCurve(opts.profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const samples = opts.samples ?? 32;
  const pts = curve.getSpacedPoints(samples - 1);
  const n = pts.length;

  // Profile normals (outward): tangent (dr, dy) → normal (dy, -dr).
  const pn: THREE.Vector2[] = pts.map((_, j) => {
    const a = pts[Math.max(0, j - 1)];
    const b = pts[Math.min(n - 1, j + 1)];
    return new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
  });

  const count = segments * n;
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const colors = color ? new Float32Array(count * 3) : null;
  const p = new THREE.Vector3();
  const nn = new THREE.Vector3();
  const c = new THREE.Color();

  for (let i = 0; i < segments; i++) {
    const phi = (i / segments) * Math.PI * 2;
    const s = Math.sin(phi);
    const co = Math.cos(phi);
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      const v = j / (n - 1);
      const r = Math.max(0, pts[j].x);
      p.set(r * s, pts[j].y, r * co);
      nn.set(pn[j].x * s, pn[j].y, pn[j].x * co);
      displace?.(p, nn, v);
      position.set([p.x, p.y, p.z], k * 3);
      uv.set([i / segments, v], k * 2);
      if (colors && color) {
        color(p, v, c);
        colors.set([c.r, c.g, c.b], k * 3);
      }
    }
  }

  const index: number[] = [];
  for (let i = 0; i < segments; i++) {
    const i2 = (i + 1) % segments;
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = i2 * n + j;
      const cc = i2 * n + j + 1;
      const d = i * n + j + 1;
      index.push(a, b, d, cc, d, b);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (colors) g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Linear colour from sRGB components 0–255 (so vertex colours match hex values in the palette). */
export function srgb(out: THREE.Color, hex: number): THREE.Color {
  return out.setHex(hex, THREE.SRGBColorSpace);
}

/** Mix two sRGB hex colours into `out` (in linear space). */
const _a = new THREE.Color();
const _b = new THREE.Color();
export function mixHex(out: THREE.Color, h1: number, h2: number, t: number): THREE.Color {
  _a.setHex(h1, THREE.SRGBColorSpace);
  _b.setHex(h2, THREE.SRGBColorSpace);
  return out.copy(_a).lerp(_b, Math.min(1, Math.max(0, t)));
}

/** Multiply a colour's brightness, keeping it in range. */
export function shade(c: THREE.Color, k: number): THREE.Color {
  c.r = Math.min(1, c.r * k);
  c.g = Math.min(1, c.g * k);
  c.b = Math.min(1, c.b * k);
  return c;
}

/** A 1×N texture that varies along v only (for roughness bands on lathes). */
export function bandTexture(stops: [v: number, value: number][], size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const v = i / (size - 1);
    let val = stops[0][1];
    for (let s = 0; s < stops.length - 1; s++) {
      const [v0, a] = stops[s];
      const [v1, b] = stops[s + 1];
      if (v >= v0 && v <= v1) {
        const t = (v - v0) / (v1 - v0 || 1);
        const e = t * t * (3 - 2 * t);
        val = a + (b - a) * e;
        break;
      }
      if (v > v1) val = b;
    }
    const byte = Math.round(Math.min(1, Math.max(0, val)) * 255);
    data.set([byte, byte, byte, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, 1, size);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Store the current positions as the rest pose (for meshes deformed on the CPU). */
export function snapshotPositions(g: THREE.BufferGeometry): Float32Array {
  return (g.getAttribute("position").array as Float32Array).slice();
}
