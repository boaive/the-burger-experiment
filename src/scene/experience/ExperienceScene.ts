import * as THREE from "three";
import { Spring, clamp, easeInCubic, easeInOutCubic, easeOutCubic, lerp, ring, smoothstep } from "@/lib/math";
import type { LayerId } from "@/content/experience";
import { cue } from "@/story/beats";
import { AdaptiveResolution, budgets, detectTier, type Tier } from "../core/quality";
import { createRenderer, studioEnvironment, studioLights } from "../core/renderer";
import { bottomBun, cheese, lettuce, onion, patty, pickles, tomato, topBun, type Layer } from "../models/burger";
import { buildDrink } from "../models/drinks";
import { buildFries } from "../models/fries";
import { createKit, disposeObject, enableShadows } from "../models/kit";
import { buildLiner, contactShadow } from "../models/props";
import { applyShot, placements, sampleShot, shots, shotsFor, type LayoutKind, type Shot } from "./direction";
import {
  LEAVE_TIME,
  dropPose,
  dropTiming,
  hoverPose,
  leavePose,
  restPose,
  slideOutPose,
  slidePose,
  type DropSpec,
  type DropTiming,
  type Pose,
} from "./motion";

export type SceneInput = {
  /** Smoothed story time. */
  t: number;
  /** Clock, seconds. */
  now: number;
  dt: number;
  reduced: boolean;
  /** Pointer in NDC (−1..1) and whether it is over the stage. */
  pointer: { x: number; y: number; inside: boolean };
};

export type Anchor = { x: number; y: number; on: boolean };
export type Pickable = "burger" | "fries" | "drink";

export type ExperienceScene = {
  layout: LayoutKind;
  tier: Tier;
  /** Screen positions (CSS px, relative to the canvas) that the DOM labels point at. */
  anchors: Record<string, Anchor>;
  resize: (width: number, height: number) => void;
  frame: (input: SceneInput) => void;
  pick: (x: number, y: number) => Pickable | null;
  poke: (what: Pickable) => void;
  dispose: () => void;
};

type LayerSpec = DropSpec & { mass: number; shake?: number; soft: number; stagger?: number; anchorR: number };

/** Each ingredient falls in its own way. */
const SPECS: Record<Exclude<LayerId, "topBun">, LayerSpec> = {
  bottomBun: { h0: 2.6, g: 17, e: 0.2, bounces: 2, squash: 0.14, tilt: [0.16, -0.1], spin: 0.6, mass: 0.7, shake: 0.5, soft: 0.35, anchorR: 0.58 },
  patty: { h0: 2.4, g: 19, e: 0.12, bounces: 1, squash: 0.26, omega: 20, tilt: [0.06, 0.12], spin: -0.5, mass: 1, shake: 1, soft: 0.55, anchorR: 0.62 },
  cheese: { h0: 1.7, g: 6.5, e: 0, bounces: 0, squash: 0.06, tilt: [0.22, -0.16], spin: 0.8, sway: 0.07, swayFreq: 6, mass: 0.25, soft: 0.2, anchorR: 0.6 },
  lettuce: { h0: 1.9, g: 4.6, e: 0, bounces: 0, squash: 0.3, omega: 16, zeta: 0.25, tilt: [0.3, 0.2], spin: 1.4, sway: 0.15, swayFreq: 3.3, mass: 0.2, soft: 1.1, anchorR: 0.6 },
  tomato: { h0: 1.8, g: 15, e: 0.22, bounces: 1, squash: 0.12, spin: 1.3, tilt: [0.2, -0.3], skid: [0.05, -0.02], mass: 0.35, soft: 0.4, stagger: 0.15, anchorR: 0.56 },
  onion: { h0: 1.7, g: 13, e: 0.42, bounces: 3, squash: 0.1, tilt: [0.5, -0.4], spin: 0.8, wobble: 0.14, mass: 0.15, soft: 0.6, stagger: 0.09, anchorR: 0.55 },
  pickles: { h0: 1.9, g: 13, e: 0.25, bounces: 1, squash: 0.08, flips: 1, spin: 1.2, wobble: 0.06, mass: 0.12, soft: 0.3, stagger: 0.11, anchorR: 0.54 },
};

const CROWN = { hoverY: 0.28, start: 1.8, mass: 0.9, soft: 0.45, anchorR: 0.54 };
const FRIES_SPEC: DropSpec = { h0: 2.4, g: 17, e: 0.18, bounces: 2, squash: 0.1, tilt: [0.2, -0.14], spin: 0.7 };
const LINER_SPEC: DropSpec = { h0: 1.5, g: 2.6, e: 0, bounces: 0, squash: 0, tilt: [0.32, -0.22], spin: 0.9, sway: 0.22, swayFreq: 2.4 };
const QUEUE_GAP = 0.16;

type Piece = { obj: THREE.Object3D; p: THREE.Vector3; r: THREE.Euler; spec: DropSpec; timing: DropTiming; delay: number };

type Actor = {
  id: LayerId;
  index: number;
  spec: LayerSpec;
  timing: DropTiming;
  layer: Layer;
  slot: THREE.Group;
  motion: THREE.Group;
  pieces: Piece[];
  state: "out" | "in" | "leaving";
  start: number;
  lastY: number;
};

type Impact = { time: number; index: number; strength: number; shake: number; owner: string };

export async function createExperienceScene(host: HTMLElement): Promise<ExperienceScene> {
  const tier = detectTier();
  const budget = budgets[tier];
  const renderer = createRenderer(budget);
  const canvas = renderer.domElement;
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  scene.environment = env;
  scene.environmentIntensity = 0.4;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const lights = studioLights(budget);
  scene.add(lights.group);

  const kit = await createKit(budget.detail);

  /* ── The table ──────────────────────────────────────────────────────────── */
  const catcherMat = new THREE.ShadowMaterial({ color: 0x5a3b24, opacity: 0.16, depthWrite: false });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), catcherMat);
  catcher.rotation.x = -Math.PI / 2;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // A warm pool of light that appears when the room goes dark.
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({ color: 0x6e4b30, map: kit.tex.radial, transparent: true, opacity: 0, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.001;
  pool.renderOrder = -2;
  scene.add(pool);

  /* ── The burger ─────────────────────────────────────────────────────────── */
  const rig = new THREE.Group();
  scene.add(rig);
  const liner = buildLiner(kit);
  const linerMotion = new THREE.Group();
  linerMotion.add(liner.object);
  liner.object.rotation.y = Math.PI + 0.2;
  rig.add(linerMotion);
  const linerMat = (liner.object.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;

  const burgerShadow = contactShadow(kit, 0.85);
  burgerShadow.position.y = 0.006;
  rig.add(burgerShadow);

  const stack = new THREE.Group();
  rig.add(stack);

  const builders: Record<Exclude<LayerId, "topBun">, () => Layer> = {
    bottomBun: () => bottomBun(kit),
    patty: () => patty(kit),
    cheese: () => cheese(kit),
    lettuce: () => lettuce(kit),
    tomato: () => tomato(kit),
    onion: () => onion(kit),
    pickles: () => pickles(kit),
  };

  const order: Exclude<LayerId, "topBun">[] = ["bottomBun", "patty", "cheese", "lettuce", "tomato", "onion", "pickles"];
  const actors: Actor[] = order.map((id, index) => {
    const layer = builders[id]();
    enableShadows(layer.object);
    const slot = new THREE.Group();
    const motion = new THREE.Group();
    motion.add(layer.object);
    slot.add(motion);
    slot.visible = false;
    stack.add(slot);
    const spec = SPECS[id];
    const pieces: Piece[] = (layer.pieces ?? []).map((obj, k) => {
      const sign = k % 2 ? -1 : 1;
      const pieceSpec: DropSpec = {
        ...spec,
        h0: spec.h0 + k * 0.12,
        tilt: spec.tilt ? [spec.tilt[0] * sign, spec.tilt[1] * -sign] : undefined,
        spin: (spec.spin ?? 0) * sign,
        skid: spec.skid ? [spec.skid[0] * sign, spec.skid[1] * sign] : undefined,
      };
      return { obj, p: obj.position.clone(), r: obj.rotation.clone(), spec: pieceSpec, timing: dropTiming(pieceSpec), delay: k * (spec.stagger ?? 0.1) };
    });
    return { id, index, spec, timing: dropTiming(spec), layer, slot, motion, pieces, state: "out", start: 0, lastY: spec.h0 };
  });

  const crownLayer = topBun(kit);
  enableShadows(crownLayer.object);
  const crownSlot = new THREE.Group();
  const crownMotion = new THREE.Group();
  crownMotion.add(crownLayer.object);
  crownSlot.add(crownMotion);
  crownSlot.visible = false;
  stack.add(crownSlot);
  const crown = {
    phase: "out" as "out" | "hover" | "land" | "leaving",
    start: 0,
    from: CROWN.start,
    lastY: CROWN.start,
    spec: null as DropSpec | null,
    timing: null as DropTiming | null,
  };

  /* ── Sides ──────────────────────────────────────────────────────────────── */
  const fries = buildFries(kit);
  enableShadows(fries.object);
  const friesRoot = new THREE.Group();
  const friesMotion = new THREE.Group();
  friesMotion.add(fries.object);
  friesRoot.add(friesMotion);
  friesRoot.visible = false;
  scene.add(friesRoot);
  const friesShadow = contactShadow(kit, 0.62);
  friesShadow.position.y = 0.004;
  friesRoot.add(friesShadow);
  const friesState = { state: "out" as "out" | "in" | "leaving", start: 0, lastY: 0, timing: dropTiming(FRIES_SPEC), landed: false };

  const drink = buildDrink(kit);
  enableShadows(drink.object);
  const drinkRoot = new THREE.Group();
  const drinkMotion = new THREE.Group();
  const drinkYaw = new THREE.Group();
  drinkYaw.add(drink.object);
  drink.object.scale.setScalar(0.84);
  drinkMotion.add(drinkYaw);
  drinkRoot.add(drinkMotion);
  drinkRoot.visible = false;
  scene.add(drinkRoot);
  const drinkShadow = contactShadow(kit, 0.66);
  drinkShadow.position.y = 0.004;
  drinkMotion.add(drinkShadow);
  const drinkState = { state: "out" as "out" | "in" | "leaving", start: 0, prevX: 0, prevV: 0 };

  /* ── State ──────────────────────────────────────────────────────────────── */
  let layout: LayoutKind = "wide";
  let width = 1;
  let height = 1;
  let initialised = false;
  let lastEnter = -Infinity;
  let lastLand = -Infinity;
  const impacts: Impact[] = [];
  const pose: Pose = restPose();
  const piecePose: Pose = restPose();
  const shot = { ...shots.wide[0] } as Shot;
  const shake = new THREE.Vector3();
  const yaw = new Spring(60, 11);
  const pitch = new Spring(60, 11);
  const lookAz = new Spring(40, 10);
  const lookEl = new Spring(40, 10);
  const shear = new Spring(90, 6.5);
  let prevRigX = 0;
  const linerState = { start: 0 };
  const linerTiming = dropTiming(LINER_SPEC);
  const assemble = { dir: 0 as 0 | 1, start: -Infinity, from: 0, value: 0 };
  const anchors: Record<string, Anchor> = {};
  const anchorIds = [...order, "topBun", "fries", "drink"];
  anchorIds.forEach((id) => (anchors[id] = { x: 0, y: 0, on: false }));

  const adaptive = new AdaptiveResolution(budget, Math.min(budget.dprStart, window.devicePixelRatio || 1), (r) => {
    renderer.setPixelRatio(r);
    renderer.setSize(width, height, false);
  });
  renderer.setPixelRatio(adaptive.ratio);

  const pushImpacts = (owner: string, index: number, start: number, timing: DropTiming, strength: number, shakeAmount: number) => {
    timing.impacts.forEach((t, k) => {
      impacts.push({ time: start + t, index, strength: strength * timing.speeds[k], shake: k === 0 ? shakeAmount : 0, owner });
    });
  };
  const dropImpacts = (owner: string) => {
    for (let i = impacts.length - 1; i >= 0; i--) if (impacts[i].owner === owner) impacts.splice(i, 1);
  };

  /** How much layer `j` is squeezed right now by everything that landed on top of it. */
  const compression = (j: number, now: number) => {
    let c = 0;
    for (const im of impacts) {
      if (im.index <= j) continue;
      const d = im.index - j;
      const tt = now - im.time - 0.022 * d;
      if (tt <= 0 || tt > 1.6) continue;
      c += im.strength * 0.09 * Math.pow(0.72, d - 1) * ring(tt, 26, 0.3);
    }
    return c;
  };

  const enterActor = (a: Actor, now: number, reduced: boolean) => {
    const fall = a.timing.fall;
    const start = reduced ? now - 100 : Math.max(now, lastEnter + QUEUE_GAP, lastLand + 0.08 - fall);
    a.state = "in";
    a.start = start;
    lastEnter = start;
    lastLand = start + fall + (a.pieces.length ? (a.pieces.length - 1) * (a.spec.stagger ?? 0.1) : 0);
    if (!reduced) {
      if (a.pieces.length) a.pieces.forEach((p) => pushImpacts(a.id, a.index, start + p.delay, p.timing, a.spec.mass / a.pieces.length, 0));
      else pushImpacts(a.id, a.index, start, a.timing, a.spec.mass, a.spec.shake ?? 0);
    }
  };

  const leaveActor = (a: Actor, now: number) => {
    a.state = "leaving";
    a.start = now;
    dropImpacts(a.id);
  };

  /** First frame: anything already scrolled past is simply there. */
  const initialise = (t: number, now: number) => {
    for (const a of actors) {
      const c = cueFor(a.id);
      if (t >= c) {
        a.state = "in";
        a.start = now - 100;
      }
    }
    if (t >= cue.crownLand) {
      crown.phase = "land";
      crown.from = 0;
      crown.spec = { h0: 0.001, g: 12, e: 0, bounces: 0, squash: 0 };
      crown.timing = dropTiming(crown.spec);
      crown.start = now - 100;
    } else if (t >= cue.crownEnter) {
      crown.phase = "hover";
      crown.from = CROWN.hoverY;
      crown.start = now - 100;
    }
    if (t >= cue.fries) {
      friesState.state = "in";
      friesState.start = now - 100;
      friesState.landed = true;
    }
    if (t >= cue.drink) {
      drinkState.state = "in";
      drinkState.start = now - 100;
    }
    linerState.start = t > cue.bottomBun - 0.4 ? now - 100 : now + 0.25;
    if (t >= cue.reassemble) {
      assemble.dir = 1;
      assemble.value = 1;
      assemble.start = now - 100;
      assemble.from = 1;
    }
    prevRigX = rig.position.x;
    initialised = true;
  };

  const cueFor = (id: LayerId) => (cue as Record<string, number>)[id];

  /* ── Frame ──────────────────────────────────────────────────────────────── */
  const tmpV = new THREE.Vector3();
  const right = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const place = placements;

  const project = (id: string, world: THREE.Vector3, on: boolean) => {
    ndc.copy(world).project(camera);
    const a = anchors[id];
    a.x = (ndc.x * 0.5 + 0.5) * width;
    a.y = (-ndc.y * 0.5 + 0.5) * height;
    a.on = on && ndc.z < 1;
  };

  const frame = (input: SceneInput) => {
    const { t, now, reduced } = input;
    const dt = Math.min(0.05, Math.max(0.0001, input.dt));
    if (!initialised) initialise(t, now);
    const P = place[layout];

    /* Entrances and exits for the stack. */
    for (const a of actors) {
      const want = t >= cueFor(a.id);
      if (want && (a.state === "out" || a.state === "leaving")) enterActor(a, now, reduced);
      else if (!want && a.state === "in") leaveActor(a, now);
    }

    // The crown hovers first, and only lands when you keep going.
    {
      const want = t >= cue.crownLand ? "land" : t >= cue.crownEnter ? "hover" : "out";
      if (want === "hover" && crown.phase !== "hover") {
        const fromOut = crown.phase === "out";
        crown.from = fromOut ? CROWN.start : crown.lastY;
        crown.phase = "hover";
        crown.start = reduced ? now - 100 : fromOut ? Math.max(now, lastEnter + QUEUE_GAP) : now;
        dropImpacts("topBun");
      } else if (want === "land" && crown.phase !== "land") {
        const from = crown.phase === "out" ? CROWN.start : crown.lastY;
        crown.spec = { h0: Math.max(0.02, from), g: 12, e: 0.12, bounces: 1, squash: 0.16, omega: 22 };
        crown.timing = dropTiming(crown.spec);
        crown.phase = "land";
        crown.start = reduced ? now - 100 : Math.max(now, lastLand + 0.1 - crown.timing.fall);
        if (!reduced) pushImpacts("topBun", 7, crown.start, crown.timing, CROWN.mass, 0.5);
      } else if (want === "out" && (crown.phase === "hover" || crown.phase === "land")) {
        crown.phase = "leaving";
        crown.from = crown.lastY;
        crown.start = now;
        dropImpacts("topBun");
      }
    }

    /* Burger layer poses. */
    for (const a of actors) {
      let visible = a.state !== "out";
      const tau = now - a.start;
      if (a.state === "leaving" && tau > LEAVE_TIME) {
        a.state = "out";
        visible = false;
      }
      if (a.state === "in" && tau < 0) visible = false;
      a.slot.visible = visible;
      if (!visible) continue;

      if (a.pieces.length) {
        for (const p of a.pieces) {
          if (a.state === "leaving") {
            p.obj.visible = true;
            leavePose(a.lastY, tau, piecePose);
          } else {
            const tk = tau - p.delay;
            p.obj.visible = tk >= 0;
            dropPose(p.spec, p.timing, Math.max(0, tk), piecePose);
          }
          p.obj.position.set(p.p.x + piecePose.x, p.p.y + piecePose.y, p.p.z + piecePose.z);
          p.obj.rotation.set(p.r.x + piecePose.rx, p.r.y + piecePose.ry, p.r.z + piecePose.rz);
          p.obj.scale.set(piecePose.sxz, piecePose.sy, piecePose.sxz);
        }
        if (a.state === "in") a.lastY = 0.2;
      } else {
        if (a.state === "leaving") leavePose(a.lastY, tau, pose);
        else {
          dropPose(a.spec, a.timing, tau, pose);
          a.lastY = pose.y;
        }
        a.motion.position.set(pose.x, pose.y, pose.z);
        a.motion.rotation.set(pose.rx, pose.ry, pose.rz);
        a.motion.scale.set(pose.sxz, pose.sy, pose.sxz);
      }

      if (a.layer.setMelt) {
        const since = tau - a.timing.fall;
        a.layer.setMelt(a.state === "in" && since > 0 ? (reduced ? 1 : easeOutCubic(since / 1.3)) : a.state === "leaving" ? 1 : 0);
      }
      if (a.layer.setFlutter) {
        const since = tau - a.timing.fall;
        const amount = reduced || a.state !== "in" ? 0 : since < 0 ? 0.85 : 0.85 * Math.exp(-since * 3.2) * Math.cos(since * 6);
        a.layer.setFlutter(amount, now);
      }
    }

    {
      const tau = now - crown.start;
      let visible = crown.phase !== "out";
      if (crown.phase === "leaving" && tau > LEAVE_TIME) {
        crown.phase = "out";
        visible = false;
      }
      // Queued behind the pickles: stay out of frame until it's the crown's turn.
      if (tau < 0 && crown.phase !== "leaving" && crown.from >= CROWN.start - 1e-3) visible = false;
      crownSlot.visible = visible;
      if (visible) {
        if (crown.phase === "hover") hoverPose(Math.max(0, tau), CROWN.hoverY, crown.from, now, reduced, pose);
        else if (crown.phase === "land" && crown.spec && crown.timing) dropPose(crown.spec, crown.timing, Math.max(0, tau), pose);
        else leavePose(crown.from, tau, pose);
        crown.lastY = pose.y;
        crownMotion.position.set(pose.x, pose.y, pose.z);
        crownMotion.rotation.set(pose.rx, pose.ry, pose.rz);
        crownMotion.scale.set(pose.sxz, pose.sy, pose.sxz);
      }
    }

    /* Explode into layers, then snap back together. */
    const explodeScrub = smoothstep(cue.explodeStart, cue.explodeEnd, t);
    {
      const want: 0 | 1 = t >= cue.reassemble ? 1 : 0;
      if (want !== assemble.dir) {
        assemble.from = assemble.value;
        assemble.dir = want;
        assemble.start = now;
      }
      const tau = now - assemble.start;
      if (reduced) assemble.value = want;
      else if (want === 1) {
        const v = assemble.from + (1 - assemble.from) * easeInCubic(clamp(tau / 0.34));
        if (assemble.value < 1 && v >= 1 && explodeScrub > 0.5) {
          // Clack.
          impacts.push({ time: now, index: 8, strength: 0.8, shake: 0.4, owner: "clack" });
        }
        assemble.value = v;
      } else assemble.value = assemble.from * (1 - easeOutCubic(clamp(tau / 0.45)));
    }
    const E = explodeScrub * (1 - assemble.value);

    /* Stack: heights, squash from impacts, lean from sliding, the exploded view. */
    const gap = layout === "wide" ? 0.22 : 0.2;
    const slots = [...actors.map((a) => ({ slot: a.slot, h: a.layer.height, soft: a.spec.soft, present: a.state === "in" })), { slot: crownSlot, h: 0, soft: CROWN.soft, present: false }];
    let y = 0;
    const shearAmt = shear.value;
    slots.forEach((s, i) => {
      const c = reduced ? 0 : compression(i, now);
      const sq = clamp(c * s.soft, -0.15, 0.3);
      s.slot.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
      s.slot.position.set(shearAmt * Math.pow(Math.max(0, y) / 1.0, 1.4), y + E * gap * i, 0);
      s.slot.rotation.y = E * 0.6 * (i / 7 - 0.5);
      if (s.present) y += s.h * (1 - sq);
    });

    /* Where the burger stands: nudged aside when the fries arrive. */
    const shift = easeInOutCubic(smoothstep(cue.shiftStart, cue.shiftEnd, t));
    rig.position.set(
      lerp(P.burgerBuild[0], P.burgerMeal[0], shift),
      0,
      lerp(P.burgerBuild[2], P.burgerMeal[2], shift),
    );
    const vx = (rig.position.x - prevRigX) / dt;
    prevRigX = rig.position.x;
    shear.step(reduced ? 0 : clamp(-vx * 0.03, -0.07, 0.07), dt);

    const pointerOn = input.pointer.inside && !reduced && layout === "wide";
    yaw.step(pointerOn ? input.pointer.x * 0.32 : 0, dt);
    pitch.step(pointerOn ? -input.pointer.y * 0.05 : 0, dt);
    stack.rotation.set(pitch.value, yaw.value, 0);

    /* The liner glides down when the page opens. */
    {
      const tau = reduced ? 100 : now - linerState.start;
      linerMotion.visible = tau >= 0;
      if (tau >= 0) {
        const timing = linerTiming;
        dropPose(LINER_SPEC, timing, tau, pose);
        linerMotion.position.set(pose.x, pose.y, pose.z);
        linerMotion.rotation.set(pose.rx, pose.ry, pose.rz);
        const since = tau - timing.fall;
        liner.setBend(since < 0 ? 0.75 * (1 - tau / timing.fall) : 0.3 * ring(since, 10, 0.35), now);
      }
    }

    /* Contact shadow under the burger follows the lowest layer's height. */
    {
      const base = actors[0];
      const hBase = base.state === "in" ? Math.max(0, base.lastY) : 3;
      const k = clamp(1 - hBase / 2.4);
      const present = linerMotion.visible ? 1 : 0;
      burgerShadow.visible = present > 0 && base.state !== "out";
      burgerShadow.scale.setScalar(1.35 - 0.35 * k + E * 0.2);
      (burgerShadow.material as THREE.MeshBasicMaterial).opacity = 0.42 * k * (1 - 0.5 * darkness(t));
    }

    /* Fries. */
    {
      const want = t >= cue.fries;
      if (want && friesState.state !== "in") {
        friesState.state = "in";
        friesState.start = reduced ? now - 100 : Math.max(now, 0);
        friesState.landed = false;
      } else if (!want && friesState.state === "in") {
        friesState.state = "leaving";
        friesState.start = now;
      }
      const tau = now - friesState.start;
      if (friesState.state === "leaving" && tau > LEAVE_TIME) friesState.state = "out";
      const away = easeInOutCubic(smoothstep(cue.dimStart - 0.05, cue.dimEnd + 0.1, t));
      friesRoot.visible = friesState.state !== "out" && away < 0.999;
      friesRoot.position.set(lerp(P.fries[0], P.friesAway[0], away), 0, lerp(P.fries[2], P.friesAway[2], away));
      friesRoot.rotation.y = P.friesYaw;
      if (friesRoot.visible) {
        if (friesState.state === "leaving") leavePose(friesState.lastY, tau, pose);
        else {
          dropPose(FRIES_SPEC, friesState.timing, tau, pose);
          friesState.lastY = pose.y;
        }
        friesMotion.position.set(pose.x, pose.y, pose.z);
        friesMotion.rotation.set(pose.rx, pose.ry, pose.rz);
        friesMotion.scale.set(pose.sxz, pose.sy, pose.sxz);
        const since = tau - friesState.timing.fall;
        if (friesState.state === "in" && since >= 0 && !friesState.landed) {
          friesState.landed = true;
          if (!reduced && since < 0.3) {
            fries.jostle(1);
            impacts.push({ time: now, index: 99, strength: 0, shake: 0.35, owner: "fries" });
          }
        }
        fries.setSpill(friesState.state === "in" ? (reduced ? 100 : Math.max(0, since)) : 100);
        if (!reduced) fries.update(dt);
        const k = clamp(1 - Math.max(0, pose.y) / 2.4);
        friesShadow.position.set(pose.x, 0.004 - pose.y, pose.z);
        (friesShadow.material as THREE.MeshBasicMaterial).opacity = 0.4 * k * (1 - darkness(t));
      }
    }

    /* Drink. */
    {
      const want = t >= cue.drink;
      if (want && drinkState.state !== "in") {
        drinkState.state = "in";
        drinkState.start = reduced ? now - 100 : now;
      } else if (!want && drinkState.state === "in") {
        drinkState.state = "leaving";
        drinkState.start = now;
      }
      const tau = now - drinkState.start;
      if (drinkState.state === "leaving" && tau > 0.6) drinkState.state = "out";
      const away = easeInOutCubic(smoothstep(cue.dimStart - 0.05, cue.dimEnd + 0.1, t));
      drinkRoot.visible = drinkState.state !== "out" && away < 0.999;
      drinkRoot.position.set(lerp(P.drink[0], P.drinkAway[0], away), 0, lerp(P.drink[2], P.drinkAway[2], away));
      drinkYaw.rotation.y = P.drinkYaw;
      if (drinkRoot.visible) {
        if (drinkState.state === "leaving") slideOutPose(tau, P.drinkFrom, pose);
        else slidePose(tau, P.drinkFrom, 0.95, pose);
        drinkMotion.position.set(pose.x, 0, pose.z);
        drinkYaw.rotation.set(0, P.drinkYaw + pose.ry, pose.rz);
        const v = (pose.x - drinkState.prevX) / dt;
        const acc = (v - drinkState.prevV) / dt;
        drinkState.prevX = pose.x;
        drinkState.prevV = v;
        if (!reduced && Math.abs(acc) < 400) drink.nudge(acc * dt * 0.02, 0);
        drink.update(dt, now, !reduced);
        (drinkShadow.material as THREE.MeshBasicMaterial).opacity = 0.36 * (1 - darkness(t));
      }
    }

    /* Light: studio → warm (the meal) → dark with a pool of light (the reveal). */
    applyMood(t);

    /* Camera. */
    sampleShot(shotsFor(layout, width / height), t, shot);
    const idle = reduced ? 0 : 1;
    lookAz.step(input.pointer.inside && !reduced ? input.pointer.x * 0.05 : 0, dt);
    lookEl.step(input.pointer.inside && !reduced ? input.pointer.y * 0.025 : 0, dt);
    shake.set(0, 0, 0);
    if (!reduced) {
      for (const im of impacts) {
        if (!im.shake) continue;
        const tt = now - im.time;
        if (tt < 0 || tt > 0.6) continue;
        const amp = im.shake * 0.016 * Math.exp(-tt * 9);
        shake.x += amp * Math.sin(tt * 71 + im.index);
        shake.y += amp * Math.sin(tt * 53 + 1.3);
      }
    }
    applyShot(camera, shot, {
      az: lookAz.value + idle * 0.014 * Math.sin(now * 0.37),
      el: lookEl.value + idle * 0.008 * Math.sin(now * 0.51),
      shake,
    });

    // Housekeeping for old impacts.
    for (let i = impacts.length - 1; i >= 0; i--) if (now - impacts[i].time > 2) impacts.splice(i, 1);

    /* Anchors for the DOM labels. */
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    stack.updateMatrixWorld(true);
    actors.forEach((a) => {
      const slot = a.slot;
      tmpV.set(0, a.layer.height * 0.5, 0);
      slot.localToWorld(tmpV);
      tmpV.addScaledVector(right, a.spec.anchorR);
      project(a.id, tmpV, a.state === "in" && now - a.start > a.timing.fall);
    });
    tmpV.set(0, 0.2, 0);
    crownSlot.localToWorld(tmpV);
    tmpV.addScaledVector(right, CROWN.anchorR);
    project("topBun", tmpV, crown.phase === "land" && now - crown.start > (crown.timing?.fall ?? 0));
    friesRoot.updateMatrixWorld(true);
    tmpV.set(0, 0.95, 0);
    friesMotion.localToWorld(tmpV);
    tmpV.addScaledVector(right, 0.25);
    project("fries", tmpV, friesState.state === "in");
    tmpV.set(0, 1.3, 0);
    drinkMotion.localToWorld(tmpV);
    tmpV.addScaledVector(right, 0.45);
    project("drink", tmpV, drinkState.state === "in");

    adaptive.sample(input.dt);
    renderer.render(scene, camera);
  };

  /* ── Mood ───────────────────────────────────────────────────────────────── */
  const keyStudio = new THREE.Color(0xfff0dc);
  const keyWarm = new THREE.Color(0xffd29c);
  const keyDark = new THREE.Color(0xffe4c4);
  const rimStudio = new THREE.Color(0xffe2c0);
  const rimDark = new THREE.Color(0xffa45c);
  const keyPos = { studio: new THREE.Vector3(-2.6, 4.6, 3.2), warm: new THREE.Vector3(-3.8, 3.1, 2.3), dark: new THREE.Vector3(-1.4, 5.4, 2.2) };
  const darkness = (t: number) => smoothstep(cue.dimStart, cue.dimEnd, t);

  function applyMood(t: number) {
    const dark = darkness(t);
    const warm = smoothstep(cue.mealStart, cue.mealEnd, t) * (1 - dark);
    lights.hemi.intensity = lerp(lerp(0.72, 0.62, warm), 0.16, dark);
    lights.key.intensity = lerp(lerp(2.1, 2.45, warm), 2.2, dark);
    lights.key.color.copy(keyStudio).lerp(keyWarm, warm).lerp(keyDark, dark);
    const target = rig.position;
    tmpV.copy(keyPos.studio).lerp(keyPos.warm, warm).lerp(keyPos.dark, dark);
    lights.key.position.copy(target).add(tmpV);
    lights.key.target.position.copy(target);
    lights.rim.intensity = lerp(lerp(0.8, 1.35, warm), 3.2, dark);
    lights.rim.color.copy(rimStudio).lerp(rimDark, dark);
    lights.rim.position.copy(target).add(tmpV.set(2.4, 2.8, -3.4));
    scene.environmentIntensity = lerp(lerp(0.4, 0.34, warm), 0.12, dark);
    catcherMat.opacity = lerp(lerp(0.16, 0.2, warm), 0, dark);
    const poolMat = pool.material as THREE.MeshBasicMaterial;
    poolMat.opacity = dark * 0.65;
    pool.position.set(rig.position.x, 0.001, rig.position.z);
    linerMat.color.setScalar(lerp(1, 0.66, dark));
  }

  /* ── Size, picking, cleanup ─────────────────────────────────────────────── */
  const resize = (w: number, h: number) => {
    width = Math.max(1, w);
    height = Math.max(1, h);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const next: LayoutKind = width / height < 0.9 ? "tall" : "wide";
    if (next !== layout) {
      layout = next;
      api.layout = next;
    }
    camera.fov = layout === "tall" ? 34 : 30;
    camera.updateProjectionMatrix();
  };

  const raycaster = new THREE.Raycaster();
  const sphere = new THREE.Sphere();
  const pick = (x: number, y: number): Pickable | null => {
    raycaster.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1), camera);
    const tests: [Pickable, THREE.Object3D, number, number, boolean][] = [
      ["burger", rig, 0.5, 0.66, actors[0].state === "in"],
      ["fries", friesMotion, 0.55, 0.52, friesState.state === "in"],
      ["drink", drinkMotion, 0.75, 0.56, drinkState.state === "in"],
    ];
    let best: Pickable | null = null;
    let bestD = Infinity;
    for (const [id, obj, cy, r, on] of tests) {
      if (!on || !obj.parent?.visible) continue;
      obj.getWorldPosition(sphere.center);
      sphere.center.y += cy;
      sphere.radius = r;
      const hit = raycaster.ray.intersectSphere(sphere, tmpV);
      if (hit) {
        const d = hit.distanceTo(camera.position);
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
    return best;
  };

  const poke = (what: Pickable) => {
    const now = performance.now() / 1000;
    if (what === "burger") {
      const top = crown.phase === "land" ? 8 : Math.max(1, actors.filter((a) => a.state === "in").length);
      impacts.push({ time: now, index: top, strength: 0.7, shake: 0, owner: "poke" });
      yaw.kick((Math.random() - 0.5) * 3);
    } else if (what === "fries") fries.jostle(1.2);
    else drink.stir(1);
  };

  const dispose = () => {
    disposeObject(scene);
    kit.dispose();
    env.dispose();
    renderer.dispose();
    canvas.remove();
  };

  const api: ExperienceScene = { layout, tier, anchors, resize, frame, pick, poke, dispose };
  return api;
}
