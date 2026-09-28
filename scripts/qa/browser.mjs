/**
 * Shared headless Chrome launcher for visual QA.
 * WebGL needs the real GPU: ANGLE on D3D11 (Windows) with the GPU blocklist ignored.
 * Env: RM=1 reduced motion, DPR=<n> device pixel ratio, CHROME_PATH to override the browser.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) {
    console.error("No Chrome/Edge found. Set CHROME_PATH.");
    process.exit(1);
  }
  const gpu = process.platform === "win32" ? ["--use-angle=d3d11"] : [];
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars", "--enable-gpu", "--ignore-gpu-blocklist", ...gpu],
  });
}

/** New page with the viewport, optional reduced motion (RM=1) and console error capture. */
export async function openPage(browser, url, width, height) {
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => {
    if (["error", "warn", "warning"].includes(m.type()) && !m.text().includes("X4122")) logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`);
  });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  const mobile = width < 768;
  await page.setViewport({ width, height, deviceScaleFactor: Number(process.env.DPR ?? 1), isMobile: mobile, hasTouch: mobile });
  if (process.env.RM) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
  return { page, logs };
}

export function ensureDir(prefix) {
  mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
}

export function printLogs(logs) {
  if (logs.length) console.log([...new Set(logs)].slice(0, 40).join("\n---\n"));
}
