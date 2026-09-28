import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Budget } from "./quality";

/**
 * A transparent renderer: the page's own background (and its grain) shows through, so the 3D
 * scene and the DOM share one set of colours exactly.
 */
export function createRenderer(budget: Budget, canvas?: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: budget.antialias,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Khronos PBR Neutral keeps food colours close to their base colours.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/** Soft studio reflections from a procedural room (no files to download). */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.035).texture;
  room.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
  pmrem.dispose();
  return env;
}

/** Key, fill and rim, set up like a small product shoot. The light count never changes (no shader recompiles). */
export type StudioLights = {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  group: THREE.Group;
};

export function studioLights(budget: Budget): StudioLights {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0xa4876a, 0.72);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.1);
  key.position.set(-2.6, 4.6, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(budget.shadowMap, budget.shadowMap);
  key.shadow.radius = 7;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.018;
  const cam = key.shadow.camera;
  cam.left = -2.6;
  cam.right = 2.6;
  cam.top = 2.6;
  cam.bottom = -2.6;
  cam.near = 1;
  cam.far = 14;
  const rim = new THREE.DirectionalLight(0xffe2c0, 0.8);
  rim.position.set(2.4, 2.8, -3.4);
  group.add(hemi, key, key.target, rim);
  return { hemi, key, rim, group };
}
