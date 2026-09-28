/**
 * Renders the site's still images with its own 3D engine (dev server must be running):
 *   - public/menu/<id>.webp        product posters (shown before the live 3D, and without WebGL)
 *   - public/story/house-special.webp   the story page's hero
 *   - public/story/frames/<layout>-<beat>.webp   the landing film's no-WebGL fallback
 *   - src/app/opengraph-image.jpg, twitter-image.jpg
 *
 *   node scripts/render-stills.mjs [baseUrl=http://localhost:3000] [--only=menu,story,frames,og]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { launch, sleep } from "./qa/browser.mjs";

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000").replace(/\/$/, "");
const only = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? "menu,story,frames,og").split(",");
const root = path.resolve(import.meta.dirname, "..");
const out = (p) => path.join(root, p);

const products = [
  "classic-smash",
  "double-stack",
  "crispy-chicken",
  "house-special",
  "classic-fries",
  "loaded-fries",
  "onion-rings",
  "cola",
  "lemonade",
  "strawberry-shake",
  "house-shake",
];

const browser = await launch();

async function lab() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1100, deviceScaleFactor: 1 });
  await page.goto(`${base}/lab/stills`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.dataset.lab === "ready", { timeout: 60000 });
  return page;
}

const dataUrlToBuffer = (url) => Buffer.from(url.split(",")[1], "base64");

if (only.includes("menu") || only.includes("story")) {
  const page = await lab();
  if (only.includes("menu")) {
    mkdirSync(out("public/menu"), { recursive: true });
    for (const id of products) {
      const url = await page.evaluate((id) => window.__renderStill(id, 720, 900), id);
      await sharp(dataUrlToBuffer(url)).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(out(`public/menu/${id}.webp`));
      console.log("menu", id);
    }
  }
  if (only.includes("story")) {
    mkdirSync(out("public/story"), { recursive: true });
    const url = await page.evaluate(() => window.__renderStill("house-special", 900, 1000));
    // The framing leaves headroom above the crown; trim it so the page layout, not the still, decides the spacing.
    await sharp(dataUrlToBuffer(url))
      .extract({ left: 0, top: 150, width: 900, height: 850 })
      .webp({ quality: 84, alphaQuality: 90, effort: 6 })
      .toFile(out("public/story/house-special.webp"));
    console.log("story hero");
  }
  await page.close();
}

/** Screenshots of the stage with every overlay hidden, at a given story time. */
async function stageShots(width, height, dpr, shots) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: width < 768, hasTouch: width < 768 });
  await page.goto(`${base}/`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector("[data-webgl]")?.dataset.webgl === "ready", { timeout: 60000 });
  const results = [];
  for (const { name, T, overlay = false } of shots) {
    await page.evaluate(
      ({ T, overlay }) => {
        document.getElementById("__stills-style")?.remove();
        const style = document.createElement("style");
        style.id = "__stills-style";
        style.textContent = overlay
          ? "#experience a[href='#after-story'], #experience div:has(> span > [data-hud-index]), nextjs-portal{display:none!important} header[data-tone] nav, header[data-tone] a[href='#contact']{visibility:hidden!important}"
          : "#experience [data-in], #experience svg, #experience ol, #experience [data-ticket], header[data-tone], nextjs-portal{visibility:hidden!important}";
        document.head.appendChild(style);
        const section = document.getElementById("experience");
        const stage = section.firstElementChild;
        const range = section.offsetHeight - stage.offsetHeight;
        const total = Number(getComputedStyle(section).getPropertyValue("--story-len"));
        window.scrollTo(0, section.offsetTop + (T / total) * range);
      },
      { T, overlay },
    );
    await sleep(3600);
    results.push({ name, buffer: await page.screenshot({ type: "png" }) });
  }
  await page.close();
  return results;
}

if (only.includes("frames")) {
  mkdirSync(out("public/story/frames"), { recursive: true });
  const beats = [
    { name: "build", T: 5.6 },
    { name: "meal", T: 8.4 },
    { name: "layers", T: 10.3 },
    { name: "reveal", T: 11.9 },
  ];
  for (const [layout, w, h, dpr] of [
    ["wide", 1600, 1000, 1],
    ["tall", 430, 932, 2],
  ]) {
    for (const { name, buffer } of await stageShots(w, h, dpr, beats)) {
      await sharp(buffer).webp({ quality: 78, effort: 6 }).toFile(out(`public/story/frames/${layout}-${name}.webp`));
      console.log("frame", layout, name);
    }
  }
}

if (only.includes("og")) {
  const [{ buffer }] = await stageShots(1200, 630, 2, [{ name: "og", T: 5.6, overlay: true }]);
  const jpg = await sharp(buffer).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  writeFileSync(out("src/app/opengraph-image.jpg"), jpg);
  writeFileSync(out("src/app/twitter-image.jpg"), jpg);
  console.log("og image");
}

await browser.close();
