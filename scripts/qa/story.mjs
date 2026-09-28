/**
 * Screenshots of the landing-page story at given story times (T, in "screens").
 *
 *   node scripts/qa/story.mjs <url> <outPrefix> <width> <height> <T>...
 *   RM=1 emulates prefers-reduced-motion; DPR=2 renders at 2×; WAIT=<ms> per shot (default 3200).
 *
 * e.g. node scripts/qa/story.mjs http://localhost:3000/ .qa/story 1440 900 0 1.5 5.6 8.3 10 11.8
 */
import { ensureDir, launch, openPage, printLogs, sleep } from "./browser.mjs";

const [url, prefix, w = "1440", h = "900", ...points] = process.argv.slice(2);
if (!url || !prefix) {
  console.error("Usage: node scripts/qa/story.mjs <url> <outPrefix> <width> <height> <T>...");
  process.exit(1);
}
ensureDir(prefix);
const wait = Number(process.env.WAIT ?? 3200);

const browser = await launch();
const { page, logs } = await openPage(browser, url, +w, +h);
await page.waitForFunction(() => document.querySelector("[data-webgl]")?.dataset.webgl !== "loading", { timeout: 30000 }).catch(() => {});
await sleep(1500);
console.log("webgl:", await page.evaluate(() => document.querySelector("[data-webgl]")?.dataset.webgl));

let n = 0;
for (const point of points) {
  const T = Number(point);
  await page.evaluate((T) => {
    const section = document.getElementById("experience");
    const stage = section.firstElementChild;
    const range = section.offsetHeight - stage.offsetHeight;
    const total = Number(getComputedStyle(section).getPropertyValue("--story-len"));
    window.scrollTo(0, section.offsetTop + (T / total) * range);
  }, T);
  await sleep(wait);
  const file = `${prefix}-${String(n++).padStart(2, "0")}-T${point}.png`;
  await page.screenshot({ path: file });
  console.log("saved", file);
}

printLogs(logs);
await browser.close();
