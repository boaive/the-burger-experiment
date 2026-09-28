import { clamp, lerp, smoothstep } from "@/lib/math";
import { layers, sceneNames, sides } from "@/content/experience";
import { buildLabelsEnd, cue, layerLabels, segmentIndexAt, sideLabels, TOTAL } from "./beats";

type Anchor = { x: number; y: number; on: boolean };
type SceneView = { layout: "wide" | "tall"; anchors: Record<string, Anchor> } | null;

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const CREAM = hex("#f2e9da");
const WARM = hex("#eee0c7");
const DIM = hex("#1d1511");
const CHAR = hex("#13100e");

/**
 * DOM side of the story: texts in and out, the scene counter, the stage colour, and the
 * callout labels that point at ingredients. Writes attributes and transforms only — no React
 * renders, no layout reads inside the loop.
 */
export function createOverlay(section: HTMLElement, stage: HTMLElement) {
  const beats = Array.from(stage.querySelectorAll<HTMLElement>("[data-in]")).map((el) => ({
    el,
    from: Number(el.dataset.in),
    to: Number(el.dataset.out ?? TOTAL + 1),
    inert: el.hasAttribute("data-inert"),
    on: false,
  }));
  const hudIndex = stage.querySelector<HTMLElement>("[data-hud-index]");
  const hudName = stage.querySelector<HTMLElement>("[data-hud-name]");
  const hudBar = stage.querySelector<HTMLElement>("[data-hud-bar]");
  const calloutList = stage.querySelector<HTMLElement>("[data-callouts]");
  const ticket = stage.querySelector<HTMLElement>("[data-ticket]");
  const ticketNum = stage.querySelector<HTMLElement>("[data-ticket-num]");
  const ticketName = stage.querySelector<HTMLElement>("[data-ticket-name]");
  const ticketNote = stage.querySelector<HTMLElement>("[data-ticket-note]");

  const ids = [...layers.map((l) => l.id), "fries", "drink"] as string[];
  const callouts = ids.map((id) => ({
    id,
    label: stage.querySelector<HTMLElement>(`[data-callout="${id}"]`),
    line: stage.querySelector<SVGPathElement>(`[data-callout-line="${id}"]`),
    dot: stage.querySelector<SVGCircleElement>(`[data-callout-dot="${id}"]`),
    on: false,
    y: 0,
    x: 0,
  }));

  let lastScene = -1;
  let lastBg = "";
  let lastTone = "";
  let lastMode = "";
  let lastTicket = "";
  let width = stage.clientWidth;
  let height = stage.clientHeight;
  const measure = () => {
    width = stage.clientWidth;
    height = stage.clientHeight;
  };

  const setOn = (el: Element | null, on: boolean) => {
    if (!el) return;
    if (on) el.setAttribute("data-on", "");
    else el.removeAttribute("data-on");
  };

  function update(t: number, scene: SceneView) {
    /* Texts. */
    for (const b of beats) {
      const on = t >= b.from && t < b.to;
      if (on === b.on) continue;
      b.on = on;
      setOn(b.el, on);
      if (b.inert) b.el.inert = !on;
    }

    /* Stage colour: cream → warm (the meal) → dark (the reveal). */
    const warm = smoothstep(cue.mealStart, cue.mealEnd, t);
    const dark = smoothstep(cue.dimStart, cue.dimEnd, t);
    const deep = smoothstep(cue.reassemble, cue.reveal, t);
    const c = mix(mix(mix(CREAM, WARM, warm), DIM, dark), CHAR, deep);
    const bg = `rgb(${c.map((v) => Math.round(v)).join(" ")})`;
    if (bg !== lastBg) {
      lastBg = bg;
      section.style.setProperty("--stage-bg", bg);
    }
    const tone = dark > 0.5 ? "dark" : "light";
    if (tone !== lastTone) {
      lastTone = tone;
      stage.dataset.tone = tone;
      section.dataset.surface = tone;
      window.dispatchEvent(new Event("surfacechange"));
    }

    /* Scene counter. */
    const index = Math.min(sceneNames.length - 1, segmentIndexAt(t));
    if (index !== lastScene) {
      lastScene = index;
      if (hudIndex) hudIndex.textContent = String(index + 1).padStart(2, "0");
      if (hudName) hudName.textContent = sceneNames[index];
    }
    if (hudBar) hudBar.style.transform = `scaleX(${clamp(t / TOTAL).toFixed(4)})`;

    /* Callouts: food names, then (in the reveal) what each layer means online. */
    const mode = t >= cue.relabel ? "digital" : "food";
    if (mode !== lastMode && calloutList) {
      lastMode = mode;
      calloutList.dataset.mode = mode;
    }
    const layout = scene?.layout ?? (width / height < 0.9 ? "tall" : "wide");
    const anchors = scene?.anchors;
    const exploded = t >= layerLabels[0] && t < layerLabels[1];
    const building = t < buildLabelsEnd;

    for (const co of callouts) {
      const a = anchors?.[co.id];
      let on = false;
      if (a?.on) {
        if (co.id === "fries") on = layout === "wide" && t >= sideLabels.fries[0] && t < sideLabels.fries[1];
        else if (co.id === "drink") on = layout === "wide" && t >= sideLabels.drink[0] && t < sideLabels.drink[1];
        else on = exploded || (building && layout === "wide");
      }
      if (on !== co.on) {
        co.on = on;
        setOn(co.label, on);
        setOn(co.line, on);
        setOn(co.dot, on);
      }
    }
    if (anchors) layoutCallouts(anchors, layout);

    /* Portrait: one kitchen ticket at a time instead of a column of labels. */
    if (ticket) {
      let key = "";
      if (layout === "tall") {
        if (t >= sideLabels.drink[0] && t < sideLabels.drink[1] && anchors?.drink.on) key = "drink";
        else if (t >= sideLabels.fries[0] && t < sideLabels.fries[1] && anchors?.fries.on) key = "fries";
        else if (building) {
          for (let i = layers.length - 1; i >= 0; i--) {
            if (anchors?.[layers[i].id]?.on) {
              key = layers[i].id;
              break;
            }
          }
        }
      }
      if (key !== lastTicket) {
        lastTicket = key;
        setOn(ticket, key !== "");
        if (key) {
          const i = layers.findIndex((l) => l.id === key);
          const item = i >= 0 ? { n: i + 1, name: layers[i].food, note: layers[i].foodNote } : key === "fries" ? { n: 9, name: sides.fries.label, note: sides.fries.note } : { n: 10, name: sides.drink.label, note: sides.drink.note };
          if (ticketNum) ticketNum.textContent = String(item.n).padStart(2, "0");
          if (ticketName) ticketName.textContent = item.name;
          if (ticketNote) ticketNote.textContent = item.note;
          ticket.classList.remove("is-printing");
          void ticket.offsetWidth;
          ticket.classList.add("is-printing");
        }
      }
    }
  }

  /** Labels in a tidy column beside the burger; lines run from each label to its layer. */
  function layoutCallouts(anchors: Record<string, Anchor>, layout: "wide" | "tall") {
    const tall = layout === "tall";
    const gap = tall ? 27 : 42;
    const labelW = tall ? 128 : 220;
    const margin = tall ? 14 : 28;
    const stack = callouts.filter((c) => c.on && c.id !== "fries" && c.id !== "drink");
    if (stack.length) {
      let colX = 0;
      for (const c of stack) colX = Math.max(colX, anchors[c.id].x);
      colX = Math.min(colX + (tall ? 26 : 64), width - labelW - margin);
      const sorted = [...stack].sort((a, b) => anchors[a.id].y - anchors[b.id].y);
      sorted.forEach((c) => (c.y = anchors[c.id].y));
      // Keep a minimum spacing, re-centre the column on its anchors (so labels drift both
      // ways, not only down), then pull it back into the frame.
      for (let i = 1; i < sorted.length; i++) sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + gap);
      const drift = sorted.reduce((s, c) => s + (c.y - anchors[c.id].y), 0) / sorted.length;
      sorted.forEach((c) => (c.y -= drift));
      const top = tall ? 96 : 110;
      const bottom = height - (tall ? 50 : 110);
      const overflow = sorted.length ? sorted[sorted.length - 1].y - bottom : 0;
      if (overflow > 0) sorted.forEach((c) => (c.y -= overflow));
      for (let i = 0; i < sorted.length; i++) sorted[i].y = Math.max(sorted[i].y, top + i * gap);
      sorted.forEach((c) => {
        c.x = colX;
        place(c, anchors[c.id]);
      });
    }
    for (const id of ["fries", "drink"]) {
      const c = callouts.find((x) => x.id === id)!;
      if (!c.on) continue;
      const a = anchors[id];
      c.x = Math.min(a.x + 44, width - labelW - margin);
      c.y = Math.max(110, a.y - 34);
      place(c, a);
    }
  }

  function place(c: (typeof callouts)[number], a: Anchor) {
    if (c.label) c.label.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
    if (c.line) c.line.setAttribute("d", `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${(c.x - 16).toFixed(1)} ${c.y.toFixed(1)}L${(c.x - 6).toFixed(1)} ${c.y.toFixed(1)}`);
    if (c.dot) {
      c.dot.setAttribute("cx", a.x.toFixed(1));
      c.dot.setAttribute("cy", a.y.toFixed(1));
    }
  }

  return { update, measure };
}

export type Overlay = ReturnType<typeof createOverlay>;
