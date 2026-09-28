import * as THREE from "three";
import { Spring, clamp } from "@/lib/math";
import type { Product, ProductModel } from "@/content/menu";
import { budgets, detectTier } from "../core/quality";
import { createRenderer, studioEnvironment, studioLights } from "../core/renderer";
import { buildLayer, type Layer } from "../models/burger";
import { buildDrink } from "../models/drinks";
import { buildLoadedFries, buildOnionRings, buildShake, type Rigged } from "../models/extras";
import { buildFries } from "../models/fries";
import { createKit, disposeObject, enableShadows, type Kit } from "../models/kit";
import { contactShadow } from "../models/props";

/**
 * One offscreen renderer for every product on a page. Each product draws into its own 2D canvas
 * (so it scrolls natively with its card) and only re-renders while something is moving.
 */

export type Anchor = { x: number; y: number };

export type ProductView = {
  /** Burgers: take apart (true) or put back together. Others: ignored. */
  setOpen: (open: boolean) => void;
  /** One-shot interaction: shake, stir, nudge, poke. */
  poke: (strength?: number) => void;
  /** Horizontal pointer position over the card (−1..1), or null when it leaves. */
  setPointer: (x: number | null) => void;
  /** Rotate by a horizontal drag (pixels). */
  drag: (dx: number) => void;
  /** Called after renders with label anchors (burgers only), in CSS px of the canvas. */
  onAnchors: ((anchors: Anchor[], open: number) => void) | null;
  resize: () => void;
  dispose: () => void;
};

type Built = {
  root: THREE.Group;
  /** Bounds at rest and fully opened, for framing. */
  rest: THREE.Sphere;
  open: THREE.Sphere;
  /** Radius of the contact shadow. */
  footprint: number;
  update: (dt: number, openAmount: number) => boolean;
  poke: (s: number) => void;
  anchors?: (camera: THREE.Camera, width: number, height: number, out: Anchor[]) => void;
};

const GAP = 0.2;

function buildBurger(kit: Kit, stack: Extract<ProductModel, { kind: "burger" }>["stack"]): Built {
  const root = new THREE.Group();
  const layers: { layer: Layer; slot: THREE.Group }[] = stack.map((part, i) => {
    const layer = buildLayer(kit, part, i);
    layer.setMelt?.(1);
    enableShadows(layer.object);
    const slot = new THREE.Group();
    slot.add(layer.object);
    root.add(slot);
    return { layer, slot };
  });
  let height = 0;
  const bases = layers.map(({ layer }) => {
    const y = height;
    height += layer.height;
    return y;
  });
  const n = layers.length;
  const rest = new THREE.Sphere(new THREE.Vector3(0, height / 2, 0), Math.max(0.72, height * 0.62));
  const openH = height + GAP * (n - 1);
  const open = new THREE.Sphere(new THREE.Vector3(0, openH / 2, 0), Math.max(0.75, openH * 0.56));
  const squash = new Spring(160, 9);
  let lastOpen = 0;
  const v = new THREE.Vector3();
  const right = new THREE.Vector3();

  const update = (dt: number, e: number) => {
    // Closing makes a small soft clack.
    if (lastOpen > 0.05 && e <= 0.05) squash.kick(2.2);
    lastOpen = e;
    squash.step(0, dt);
    const q = clamp(squash.value * 0.05, -0.06, 0.08);
    layers.forEach(({ slot }, i) => {
      slot.position.y = bases[i] * (1 - q) + e * GAP * i;
      slot.rotation.y = e * 0.5 * (i / Math.max(1, n - 1) - 0.5);
      slot.scale.set(1 + q * 0.5, 1 - q, 1 + q * 0.5);
    });
    return Math.abs(squash.velocity) + Math.abs(squash.value) > 1e-4;
  };

  const anchors = (camera: THREE.Camera, width: number, h: number, out: Anchor[]) => {
    right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    root.updateMatrixWorld(true);
    layers.forEach(({ layer, slot }, i) => {
      v.set(0, layer.height * 0.5, 0);
      slot.localToWorld(v);
      v.addScaledVector(right, 0.6);
      v.project(camera);
      out[i] = { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * h };
    });
  };

  return { root, rest, open, footprint: 0.78, update, poke: () => squash.kick(2.5), anchors };
}

function fromRigged(rig: Rigged, radius: number, cy: number, footprint: number): Built {
  enableShadows(rig.object);
  const root = new THREE.Group();
  root.add(rig.object);
  const sphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  return { root, rest: sphere, open: sphere, footprint, update: (dt) => rig.update(dt), poke: rig.poke };
}

function buildProduct(kit: Kit, model: ProductModel): Built {
  switch (model.kind) {
    case "burger":
      return buildBurger(kit, model.stack);
    case "fries": {
      const fries = buildFries(kit, { spill: false });
      const wiggle = new Spring(160, 8);
      return fromRigged(
        {
          object: fries.object,
          poke: (s) => {
            fries.jostle(1.2 * s);
            wiggle.kick(2.4 * s);
          },
          update: (dt) => {
            wiggle.step(0, dt);
            fries.object.rotation.z = wiggle.value * 0.06;
            return fries.update(dt) || Math.abs(wiggle.velocity) + Math.abs(wiggle.value) > 1e-4;
          },
        },
        0.72,
        0.5,
        0.52,
      );
    }
    case "loadedFries":
      return fromRigged(buildLoadedFries(kit), 0.66, 0.16, 0.66);
    case "onionRings":
      return fromRigged(buildOnionRings(kit), 0.52, 0.3, 0.42);
    case "cup": {
      const drink = buildDrink(kit, { drink: model.drink, label: model.drink === "cola" ? "No. 10 · Cola" : "No. 11 · Lemonade" });
      let time = 0;
      return fromRigged(
        {
          object: drink.object,
          poke: (s) => drink.stir(s),
          update: (dt) => {
            time += dt;
            return drink.update(dt, time, false);
          },
        },
        0.9,
        0.8,
        0.5,
      );
    }
    case "shake":
      return fromRigged(buildShake(kit, model.flavor), 0.92, 0.84, 0.36);
  }
}

type View = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  built: Built;
  camera: THREE.PerspectiveCamera;
  shadow: THREE.Mesh;
  open: Spring;
  openTarget: number;
  yaw: Spring;
  yawTarget: number;
  dragYaw: number;
  awake: number;
  width: number;
  height: number;
  anchors: Anchor[];
  api: ProductView;
};

export class ProductStudio {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private lights: ReturnType<typeof studioLights>;
  private views = new Set<View>();
  private raf = 0;
  private last = 0;
  private bufW = 0;
  private bufH = 0;
  private pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  private env: THREE.Texture;
  private catcher: THREE.Mesh;

  private constructor(private kit: Kit) {
    const budget = budgets[detectTier()];
    this.renderer = createRenderer(budget, document.createElement("canvas"));
    this.renderer.setPixelRatio(1);
    this.renderer.setScissorTest(true);
    this.env = studioEnvironment(this.renderer);
    this.scene.environment = this.env;
    this.scene.environmentIntensity = 0.42;
    this.lights = studioLights(budget);
    this.lights.hemi.intensity = 0.72;
    this.lights.key.intensity = 2.1;
    this.lights.key.shadow.camera.left = -1.6;
    this.lights.key.shadow.camera.right = 1.6;
    this.lights.key.shadow.camera.top = 1.6;
    this.lights.key.shadow.camera.bottom = -1.6;
    this.scene.add(this.lights.group);
    this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ color: 0x5a3b24, opacity: 0.16, depthWrite: false }));
    this.catcher.rotation.x = -Math.PI / 2;
    this.catcher.receiveShadow = true;
    this.scene.add(this.catcher);
  }

  static async create(): Promise<ProductStudio> {
    const kit = await createKit(budgets[detectTier()].detail);
    return new ProductStudio(kit);
  }

  attach(canvas: HTMLCanvasElement, product: Product): ProductView {
    const ctx = canvas.getContext("2d")!;
    const built = buildProduct(this.kit, product.model);
    built.root.visible = false;
    const shadow = contactShadow(this.kit, built.footprint);
    shadow.position.y = 0.003;
    built.root.add(shadow);
    this.scene.add(built.root);
    const view: View = {
      canvas,
      ctx,
      built,
      camera: new THREE.PerspectiveCamera(26, 1, 0.1, 40),
      shadow,
      open: new Spring(70, 13),
      openTarget: 0,
      yaw: new Spring(50, 11),
      yawTarget: 0,
      dragYaw: 0,
      awake: 1.2,
      width: 1,
      height: 1,
      anchors: [],
      api: null as unknown as ProductView,
    };
    const wake = (s = 1.5) => {
      view.awake = Math.max(view.awake, s);
      this.start();
    };
    view.api = {
      setOpen: (o) => {
        view.openTarget = o ? 1 : 0;
        wake();
      },
      poke: (s = 1) => {
        built.poke(s);
        wake(2.5);
      },
      setPointer: (x) => {
        view.yawTarget = x === null ? 0 : x * 0.45;
        wake();
      },
      drag: (dx) => {
        view.dragYaw += dx * 0.012;
        wake();
      },
      onAnchors: null,
      resize: () => {
        this.measure(view);
        wake(0.2);
      },
      dispose: () => {
        this.views.delete(view);
        this.scene.remove(built.root);
        disposeObject(built.root);
      },
    };
    this.measure(view);
    this.views.add(view);
    this.start();
    return view.api;
  }

  private measure(view: View) {
    const w = Math.max(1, Math.round(view.canvas.clientWidth * this.pixelRatio));
    const h = Math.max(1, Math.round(view.canvas.clientHeight * this.pixelRatio));
    view.width = w;
    view.height = h;
    if (view.canvas.width !== w) view.canvas.width = w;
    if (view.canvas.height !== h) view.canvas.height = h;
    if (w > this.bufW || h > this.bufH) {
      this.bufW = Math.max(this.bufW, w);
      this.bufH = Math.max(this.bufH, h);
      this.renderer.setSize(this.bufW, this.bufH, false);
    }
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (ms: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (ms - this.last) / 1000);
    this.last = ms;
    let any = false;
    for (const view of this.views) {
      if (view.awake <= 0) continue;
      const moving = this.renderView(view, dt);
      view.awake = moving ? Math.max(view.awake, 0.3) : view.awake - dt;
      any = true;
    }
    if (any) this.raf = requestAnimationFrame(this.tick);
  };

  private renderView(view: View, dt: number): boolean {
    const { built, camera } = view;
    view.open.step(view.openTarget, dt);
    view.yaw.step(view.yawTarget, dt);
    const e = clamp(view.open.value, 0, 1.05);
    const moving = built.update(dt, e);

    const az = -0.5;
    for (const v of this.views) v.built.root.visible = v === view;
    // Printed fronts face the camera; the pointer and drags turn things from there.
    built.root.rotation.y = az + view.yaw.value + view.dragYaw;

    // Frame: interpolate between the resting and opened bounds. Opened burgers slide left
    // (a lens shift) to make room for their labels.
    const c = built.rest.center.clone().lerp(built.open.center, clamp(e));
    const hasLabels = !!built.anchors;
    const shift = hasLabels ? 0.36 * clamp(e) : 0;
    const r = (built.rest.radius + (built.open.radius - built.rest.radius) * clamp(e)) * (1 + shift * 0.55);
    camera.aspect = view.width / view.height;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = (r * 1.04) / Math.sin(Math.min(vfov, hfov) / 2);
    const el = 0.3 - 0.12 * clamp(e);
    camera.position.set(c.x + Math.sin(az) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(c);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = shift;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    const key = this.lights.key;
    key.target.position.set(0, c.y * 0.5, 0);
    key.position.set(-2.4, 4.4, 3);
    this.lights.rim.position.set(2.4, 2.8, -3.4);

    const { width: w, height: h } = view;
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, camera);
    view.ctx.clearRect(0, 0, w, h);
    view.ctx.drawImage(this.renderer.domElement, 0, this.bufH - h, w, h, 0, 0, w, h);

    if (built.anchors && view.api.onAnchors) {
      built.anchors(camera, w / this.pixelRatio, h / this.pixelRatio, view.anchors);
      view.api.onAnchors(view.anchors, e);
    }
    return moving || Math.abs(view.open.velocity) > 1e-3 || Math.abs(view.yaw.velocity) > 1e-3 || Math.abs(view.open.value - view.openTarget) > 1e-3;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    for (const v of this.views) v.api.dispose();
    disposeObject(this.scene);
    this.env.dispose();
    this.kit.dispose();
    this.renderer.dispose();
  }
}

let shared: Promise<ProductStudio> | null = null;

/** The page-wide studio, created on first use. */
export function getStudio(): Promise<ProductStudio> {
  if (!shared) shared = ProductStudio.create();
  return shared;
}
