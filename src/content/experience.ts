/**
 * Copy for the landing-page story. Timing lives in src/story/beats.ts; this file only holds words.
 */

export type LayerId = "bottomBun" | "patty" | "cheese" | "lettuce" | "tomato" | "onion" | "pickles" | "topBun";

export type LayerCopy = {
  id: LayerId;
  /** What it is on the plate. */
  food: string;
  foodNote: string;
  /** What it is in a digital experience (the reveal re-labels every layer). */
  digital: string;
  digitalNote: string;
};

/** Bottom to top — the order they land in. */
export const layers: LayerCopy[] = [
  { id: "bottomBun", food: "Bottom bun", foodNote: "Toasted, cut side up", digital: "Structure", digitalNote: "Holds everything up" },
  { id: "patty", food: "Patty", foodNote: "Smashed thin, hard sear", digital: "Story", digitalNote: "The part with substance" },
  { id: "cheese", food: "Cheese", foodNote: "One slice, fully melted", digital: "Identity", digitalNote: "What makes it yours" },
  { id: "lettuce", food: "Lettuce", foodNote: "Cold and crisp", digital: "Breathing room", digitalNote: "Space to take it in" },
  { id: "tomato", food: "Tomato", foodNote: "Two slices, ripe", digital: "Motion", digitalNote: "The juicy part" },
  { id: "onion", food: "Red onion", foodNote: "Shaved, raw", digital: "Detail", digitalNote: "Layers within layers" },
  { id: "pickles", food: "Pickles", foodNote: "Four. Never three.", digital: "Surprise", digitalNote: "The bite you didn't expect" },
  { id: "topBun", food: "Top bun", foodNote: "Brioche, sesame", digital: "First impression", digitalNote: "What people see first" },
];

export const sides = {
  fries: { label: "Fries", note: "Twice-cooked, sea salt" },
  drink: { label: "Cola", note: "Cold enough to hurt" },
};

export const storyCopy = {
  title: "Boaive's Burger Experiment",
  thesis: "Built one layer at a time.",
  scrollCue: "Scroll to start building",
  loading: "Preheating the grill",

  complete: "Eight layers. No shortcuts.",
  together: "Some things just belong together.",
  meal: "Messy hands. Good decisions.",
  layered: "Good things are built layer by layer.",
  digital: "So are great digital experiences.",

  reveal: {
    kicker: "An experiment by",
    fiction: "The burger is fictional. The craft isn't.",
    statement: "Boaive doesn't just build websites. We build digital experiences people remember.",
    cta: "Build something memorable",
  },

  skip: "Skip to the end",

  /** Text alternative for the canvas. */
  description:
    "An animated scene: on an empty table, a toasted bun drops into place, then a smashed patty, a slice of cheese that melts over the edges, lettuce, two tomato slices, red onion, four pickles and a sesame top bun. A carton of fries and a cold cola join it. The burger then separates into its eight layers, and each layer is relabelled as part of a digital experience: structure, story, identity, breathing room, motion, detail, surprise and first impression.",
};

/** Chapter cards: each scene of the build gets a title and one line, on the side the burger leaves free. */
export const chapterCopy = {
  bun: { title: "The foundation", line: "Everything else sits on this." },
  patty: { title: "The patty", line: "Smashed hard. Then left alone." },
  cheese: { title: "Cheese", line: "On while it's hot. Never after." },
  fresh: { title: "The fresh stuff", line: "Crunch, colour and one small surprise." },
  crown: { title: "The crown", line: "Wait for it." },
  drink: { title: "A drink", line: "Something cold, to slow things down." },
} as const;

/** Scene names shown in the story's small scene counter. */
export const sceneNames = [
  "Nothing yet",
  "The foundation",
  "The patty",
  "Cheese",
  "The fresh stuff",
  "The crown",
  "Fries",
  "A drink",
  "The whole meal",
  "Layer by layer",
] as const;
