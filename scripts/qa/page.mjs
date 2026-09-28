/**
 * QA for flowing pages: scrolls through to trigger reveals and lazy renders, then saves
 * per-screen shots (SHOTS=1) and a full-page shot, and reports horizontal overflow.
 *
 *   node scripts/qa/page.mjs <url> <outPrefix> <width> <height> [hoverSelector]
 *
 * e.g. node scripts/qa/page.mjs http://localhost:3000/menu .qa/menu 1440 900 "[data-size=feature]"
 */
import { ensureDir, launch, openPage, printLogs, sleep } from "./browser.mjs";

const [url, prefix, w = "1440", h = "900", hover] = process.argv.slice(2);
if (!url || !prefix) {
  console.error("Usage: node scripts/qa/page.mjs <url> <outPrefix> <width> <height> [hoverSelector]");
  process.exit(1);
}
ensureDir(prefix);

const browser = await launch();
const { page, logs } = await openPage(browser, url, +w, +h);
await sleep(1500);

const height = await page.evaluate(() => document.documentElement.scrollHeight);
let step = 0;
for (let y = 0; y < height; y += Math.round(+h * 0.85)) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await sleep(900);
  if (process.env.SHOTS) await page.screenshot({ path: `${prefix}-${String(step++).padStart(2, "0")}-y${y}.png` });
}

if (hover) {
  const el = await page.$(hover);
  if (el) {
    await el.scrollIntoView();
    await sleep(700);
    const box = await el.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.35);
    await sleep(1600);
    await page.screenshot({ path: `${prefix}-hover.png` });
  } else console.log("hover target not found:", hover);
}

await page.evaluate(() => window.scrollTo(0, 0));
await sleep(600);
if (!process.env.NOFULL) await page.screenshot({ path: `${prefix}-full.png`, fullPage: true });

const report = await page.evaluate(() => ({
  horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  reveals: `${document.querySelectorAll("[data-revealed]").length}/${document.querySelectorAll("[data-reveal]").length}`,
}));
console.log(JSON.stringify({ ...report, height }));
printLogs(logs);
await browser.close();
