/**
 * Copy for the brand / story page, the fictional reviews and the location block.
 * Everything about the restaurant is invented; the page says so plainly.
 */

export const storyPage = {
  label: "Our story",
  title: "Messy hands. Good decisions.",
  lede: "The Burger Experiment is a small, imaginary burger joint with one rule: every layer has to earn its place.",

  origin: {
    label: "How it started",
    title: "With one question and far too many opinions.",
    paragraphs: [
      "What happens if you treat a burger like something worth designing? Not decorating. Designing.",
      "So we toasted, smashed, stacked and restacked until every layer had a job. The bun holds. The patty carries it. The pickles surprise you. Anything that couldn't explain itself came off the plate.",
      "The restaurant is fictional. The attention to detail isn't.",
    ],
  },

  /** The notebook that got us here: every test that failed, and the one that didn't. */
  testLog: {
    title: "Test log",
    entries: [
      { n: "01", text: "Untoasted bun. Soggy by the third bite.", pass: false },
      { n: "04", text: "Thick patty. No crust at all.", pass: false },
      { n: "07", text: "Cheese added late. Never melted.", pass: false },
      { n: "12", text: "Three pickles. A regular complained.", pass: false },
      { n: "13", text: "Four pickles.", pass: true },
      { n: "19", text: "Every layer, in this order.", pass: true },
    ],
    signoff: "Ship it.",
  },

  why: {
    label: "Why we make it",
    timer: "The minute the table goes quiet.",
    quote: "A burger is a small, complete thing. You can hold the whole idea in two hands.",
    paragraph:
      "When one layer is off, you taste it straight away. When they all work, the table goes quiet for a minute. That minute is the whole point.",
  },

  beliefs: {
    label: "What we believe",
    items: [
      { title: "Toast the bun. Always.", body: "The foundation decides everything that sits on top of it." },
      { title: "Smash it, then leave it alone.", body: "Heat does the work. Fiddling ruins the crust." },
      { title: "Nothing on the plate without a reason.", body: "If a layer doesn't add something, it's decoration. We don't serve decoration." },
      { title: "Serve it while it's hot.", body: "Timing is an ingredient. Late is just cold." },
    ],
  },
};

export type Review = { quote: string; who: string };

export const reviews = {
  label: "Overheard at the counter",
  note: "Fictional reviews from a fictional burger joint.",
  items: [
    { quote: "That first bite was ridiculous.", who: "Table 4, Friday night" },
    { quote: "I came for the fries. I stayed for more fries.", who: "The window seat" },
    { quote: "The pickles flipped on the way down. I saw it.", who: "A very observant regular" },
    { quote: "Ordered the Double Stack. Needed a nap. Worth it.", who: "Booth 2" },
    { quote: "Best burger I've had at a place that doesn't exist.", who: "Someone who checked the map" },
  ] satisfies Review[],
};

export const visit = {
  label: "Find us (in theory)",
  address: ["8 Layer Lane", "The Experiment Quarter"],
  hours: [
    { days: "Tue – Thu", time: "12:00 – 22:00" },
    { days: "Fri – Sat", time: "12:00 – 00:00" },
    { days: "Sun", time: "12:00 – 21:00" },
    { days: "Mon", time: "Closed. Cleaning the grill." },
  ],
  note: "It's a fictional restaurant, so please don't queue outside. Its makers are real, though, and easy to find.",
};
