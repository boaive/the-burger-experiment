import * as THREE from "three";
import {
  type BrandFonts,
  loadBrandFonts,
  onionBandTexture,
  pickleTexture,
  radialTexture,
  strawTexture,
  tomatoFleshTexture,
} from "../lib/textures";

/** 0 = phones, 1 = laptops, 2 = desktops. Drives segment counts, instance counts and shadow sizes. */
export type Detail = 0 | 1 | 2;

/**
 * Shared resources for building food: fonts for printed packaging, reusable textures, and the
 * detail level. One kit per renderer; dispose it with the renderer.
 */
export type Kit = {
  detail: Detail;
  fonts: BrandFonts;
  tex: {
    tomato: THREE.Texture;
    pickle: THREE.Texture;
    onion: THREE.Texture;
    radial: THREE.Texture;
    straw: THREE.Texture;
    strawYellow: THREE.Texture;
  };
  /** Scale a segment count by detail, keeping a floor. */
  seg: (high: number, min?: number) => number;
  track: <T extends { dispose(): void }>(r: T) => T;
  dispose: () => void;
};

export async function createKit(detail: Detail): Promise<Kit> {
  const fonts = await loadBrandFonts();
  const owned: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(r: T) => {
    owned.push(r);
    return r;
  };
  const tex = {
    tomato: track(tomatoFleshTexture()),
    pickle: track(pickleTexture()),
    onion: track(onionBandTexture()),
    radial: track(radialTexture()),
    straw: track(strawTexture()),
    strawYellow: track(strawTexture("#e7b53a", "#f7efdc")),
  };
  const factor = [0.55, 0.8, 1][detail];
  return {
    detail,
    fonts,
    tex,
    seg: (high, min = 8) => Math.max(min, Math.round(high * factor)),
    track,
    dispose: () => owned.forEach((r) => r.dispose()),
  };
}

/** Dispose every geometry and material under an object (textures owned by the kit are left alone). */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

export function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}
