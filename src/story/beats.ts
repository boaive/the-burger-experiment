/**
 * The landing-page film, as one timeline shared by the DOM overlays and the 3D scene.
 *
 * Story time `T` is measured in "screens": scrolling one viewport height advances T by 1.
 * Each segment below is a scene of the film; its `len` is how many screens it lasts.
 */

export const SEGMENTS = [
  { id: "intro", len: 0.9 }, //   01 Nothing yet
  { id: "bun", len: 0.75 }, //    02 The foundation
  { id: "patty", len: 0.75 }, //  03 The patty
  { id: "cheese", len: 0.75 }, // 04 Cheese
  { id: "fresh", len: 1.5 }, //   05 Lettuce, tomato, onion, pickles
  { id: "crown", len: 1.1 }, //   06 The top bun
  { id: "fries", len: 1.0 }, //   07 Fries
  { id: "drink", len: 1.0 }, //   08 Drink
  { id: "meal", len: 1.1 }, //    09 Complete meal
  { id: "layers", len: 1.8 }, //  10 Layer by layer
  { id: "boaive", len: 1.4 }, //     … and who made it
] as const;

export type SegmentId = (typeof SEGMENTS)[number]["id"];

export const TOTAL = SEGMENTS.reduce((s, x) => s + x.len, 0);

const starts: Record<string, number> = {};
{
  let acc = 0;
  for (const s of SEGMENTS) {
    starts[s.id] = acc;
    acc += s.len;
  }
}

/** Story time at fraction `f` (0–1) of a segment. */
export function at(id: SegmentId, f = 0): number {
  const seg = SEGMENTS.find((s) => s.id === id)!;
  return starts[id] + seg.len * f;
}

export function segmentIndexAt(t: number): number {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) if (t >= starts[SEGMENTS[i].id]) return i;
  return 0;
}

/** Moments. Ingredients enter when the (smoothed) story time crosses these. */
export const cue = {
  bottomBun: at("bun", 0.2),
  patty: at("patty", 0.2),
  cheese: at("cheese", 0.2),
  lettuce: at("fresh", 0.1),
  tomato: at("fresh", 0.33),
  onion: at("fresh", 0.55),
  pickles: at("fresh", 0.77),
  /** The top bun lowers in and hovers… */
  crownEnter: at("crown", 0.12),
  /** …and lands only when you keep scrolling. */
  crownLand: at("crown", 0.48),
  /** Burger nudged aside to make room. */
  shiftStart: at("fries", 0.02),
  shiftEnd: at("fries", 0.3),
  fries: at("fries", 0.24),
  drink: at("drink", 0.18),
  /** Lights warm, camera pulls back. */
  mealStart: at("meal", 0),
  mealEnd: at("meal", 0.45),
  /** Lights go down, the burger separates into its layers. */
  dimStart: at("layers", 0),
  dimEnd: at("layers", 0.18),
  explodeStart: at("layers", 0.1),
  explodeEnd: at("layers", 0.38),
  relabel: at("layers", 0.58),
  /** Layers snap back together; Boaive steps in. */
  reassemble: at("boaive", 0.04),
  reveal: at("boaive", 0.2),
};

/** Ranges (in T) in which story texts are on screen: [in, out]. */
export const textRanges = {
  title: [-1, at("intro", 0.82)],
  complete: [at("crown", 0.58), at("crown", 0.98)],
  together: [at("fries", 0.42), at("fries", 0.98)],
  meal: [at("meal", 0.25), at("meal", 0.95)],
  layered: [at("layers", 0.16), at("layers", 0.98)],
  digital: [cue.relabel, at("layers", 0.98)],
  reveal: [cue.reveal, TOTAL + 1],
  revealFiction: [at("boaive", 0.3), TOTAL + 1],
  revealStatement: [at("boaive", 0.42), TOTAL + 1],
  revealCta: [at("boaive", 0.54), TOTAL + 1],
  hud: [-1, at("boaive", 0.12)],
} satisfies Record<string, [number, number]>;

/** Chapter cards (scene number = segment index + 1). */
export const chapterRanges = {
  bun: { scene: 2, range: [at("bun", 0.08), at("bun", 0.98)] },
  patty: { scene: 3, range: [at("patty", 0.08), at("patty", 0.98)] },
  cheese: { scene: 4, range: [at("cheese", 0.08), at("cheese", 0.98)] },
  fresh: { scene: 5, range: [at("fresh", 0.05), at("fresh", 0.97)] },
  crown: { scene: 6, range: [at("crown", 0.06), cue.crownLand + 0.02] },
  drink: { scene: 8, range: [at("drink", 0.12), at("drink", 0.97)] },
} as const;

/** When each story label (callout) is visible during the build. */
export const buildLabelsEnd = at("fries", 0.08);
export const sideLabels = {
  fries: [cue.fries + 0.12, at("drink", 0.12)],
  drink: [cue.drink + 0.18, at("meal", 0.1)],
} as const;
export const layerLabels = [at("layers", 0.3), at("layers", 0.98)] as const;
