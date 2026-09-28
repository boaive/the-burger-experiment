import * as THREE from "three";
import { rng } from "@/lib/math";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export function canvasTexture(w: number, h: number, draw: Draw, srgbColor = true): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgbColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Font stacks from the CSS variables next/font sets on <html>. */
export type BrandFonts = { display: string; mono: string; text: string };

export async function loadBrandFonts(): Promise<BrandFonts> {
  const css = getComputedStyle(document.documentElement);
  const pick = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback;
  const fonts = {
    display: pick("--font-caprasimo", "Georgia, serif"),
    mono: pick("--font-dm-mono", "monospace"),
    text: pick("--font-schibsted", "sans-serif"),
  };
  try {
    await Promise.all([
      document.fonts.load(`400 64px ${fonts.display}`),
      document.fonts.load(`400 24px ${fonts.mono}`),
      document.fonts.load(`600 24px ${fonts.text}`),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
  return fonts;
}

/** Fine paper tooth, drawn as tiny translucent specks. */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, color: string, alpha: number, seed = 7) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6);
    const s = 0.6 + r() * 1.4;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.restore();
}

function spacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Canvas letterSpacing is not everywhere yet; lay the characters out by hand.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

/* ── Food ───────────────────────────────────────────────────────────────────── */

/** Tomato cross-section: wall, five seed pockets, pale core. Mapped onto cylinder caps. */
export function tomatoFleshTexture(seed = 3): THREE.CanvasTexture {
  return canvasTexture(256, 256, (ctx, w) => {
    const r = rng(seed);
    const c = w / 2;
    const R = w / 2 - 2;
    ctx.fillStyle = "#b82a18";
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fill();
    const wall = ctx.createRadialGradient(c, c, R * 0.2, c, c, R * 0.96);
    wall.addColorStop(0, "#e24a2e");
    wall.addColorStop(0.85, "#d93b24");
    wall.addColorStop(1, "#c42f1b");
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.arc(c, c, R * 0.95, 0, Math.PI * 2);
    ctx.fill();

    const pockets = 5;
    for (let k = 0; k < pockets; k++) {
      const a = (k / pockets) * Math.PI * 2 + r() * 0.3;
      ctx.save();
      ctx.translate(c + Math.cos(a) * R * 0.5, c + Math.sin(a) * R * 0.5);
      ctx.rotate(a);
      const gel = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.3);
      gel.addColorStop(0, "#f7a067");
      gel.addColorStop(0.7, "#ef7446");
      gel.addColorStop(1, "#e45a36");
      ctx.fillStyle = gel;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.29, R * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let s = 0; s < 7; s++) {
        ctx.fillStyle = s % 2 ? "#f1d77f" : "#e9c768";
        ctx.beginPath();
        ctx.ellipse((r() - 0.5) * R * 0.34, (r() - 0.5) * R * 0.2, 3.2, 1.9, r() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    const core = ctx.createRadialGradient(c, c, 0, c, c, R * 0.22);
    core.addColorStop(0, "#f59a74");
    core.addColorStop(1, "rgba(226,74,46,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, R * 0.24, 0, Math.PI * 2);
    ctx.fill();
    speckle(ctx, w, w, 500, "#fff4e0", 0.12, seed);
  });
}

/** Crinkle-cut pickle chip face. */
export function pickleTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx, w) => {
    const c = w / 2;
    const R = w / 2 - 1;
    const g = ctx.createRadialGradient(c, c, 0, c, c, R);
    g.addColorStop(0, "#c4c978");
    g.addColorStop(0.55, "#a3b25a");
    g.addColorStop(0.82, "#7d9338");
    g.addColorStop(0.9, "#51691f");
    g.addColorStop(1, "#3f5418");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    const r = rng(11);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + r() * 0.2;
      ctx.fillStyle = "#e3e0a6";
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * R * 0.42, c + Math.sin(a) * R * 0.42, 4.5, 2.8, a, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, w, w, 200, "#26330c", 0.18, 5);
  });
}

/** 1×N band for red-onion rings along the tube (v): purple skin outside, white within. */
export function onionBandTexture(): THREE.DataTexture {
  const size = 32;
  const data = new Uint8Array(size * 4);
  const purple = [142, 62, 122];
  const white = [240, 228, 238];
  for (let i = 0; i < size; i++) {
    const v = i / (size - 1);
    const outer = Math.cos(v * Math.PI * 2); // 1 at the outer equator
    const t = Math.min(1, Math.max(0, (outer - 0.15) / 0.5));
    const col = white.map((w, k) => Math.round(w + (purple[k] - w) * t));
    data.set([...col, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, 1, size);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial blob, white centre → transparent edge. Used as an alpha map for contact shadows and light pools. */
export function radialTexture(): THREE.CanvasTexture {
  return canvasTexture(
    128,
    128,
    (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.72)");
      g.addColorStop(0.7, "rgba(255,255,255,0.2)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    },
    false,
  );
}

/** Paper straw: cream with a diagonal tomato stripe. */
export function strawTexture(stripe = "#c8381f", base = "#f5ecdc"): THREE.CanvasTexture {
  const tex = canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = stripe;
    for (let y = -h; y < h * 2; y += 44) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 30);
      ctx.lineTo(w, y + 48);
      ctx.lineTo(0, y + 18);
      ctx.closePath();
      ctx.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ── Packaging and paper: the fictional brand's print ─────────────────────── */

type PrintSize = { width: number; height: number };

/**
 * Wraparound print for a carton or cup. `perimeter`/`height` are the physical dimensions,
 * so type is pre-scaled horizontally and never looks stretched once wrapped.
 */
function wrapPrint(size: PrintSize, draw: (ctx: CanvasRenderingContext2D, w: number, h: number, sx: number) => void) {
  const W = 1024;
  const H = Math.round(Math.min(1024, (W * size.height) / size.width));
  const pxPerUnitX = W / size.width;
  const pxPerUnitY = H / size.height;
  const sx = pxPerUnitY / pxPerUnitX; // horizontal compensation for drawn type
  return canvasTexture(W, H, (ctx, w, h) => draw(ctx, w, h, sx));
}

/** The fries carton: tomato red, cream type on the front. */
export function cartonPrintTexture(fonts: BrandFonts, size: PrintSize, label = "No. 09 · Fries"): THREE.CanvasTexture {
  return wrapPrint(size, (ctx, w, h, sx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#c93b20");
    g.addColorStop(1, "#b9321a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 5000, "#5e1206", 0.08, 21);
    speckle(ctx, w, h, 2500, "#ffd9c4", 0.06, 22);

    ctx.save();
    ctx.translate(w / 2, 0);
    ctx.scale(sx, 1);
    ctx.fillStyle = "#f6ead6";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 ${h * 0.04}px ${fonts.mono}`;
    spacedText(ctx, "BOAIVE'S", 0, h * 0.4, h * 0.014);
    ctx.font = `400 ${h * 0.15}px ${fonts.display}`;
    ctx.fillText("Burger", 0, h * 0.55);
    ctx.font = `400 ${h * 0.088}px ${fonts.display}`;
    ctx.fillText("Experiment", 0, h * 0.648);
    ctx.fillRect(-h * 0.09, h * 0.7, h * 0.18, Math.max(2, h * 0.005));
    ctx.font = `400 ${h * 0.034}px ${fonts.mono}`;
    spacedText(ctx, label.toUpperCase(), 0, h * 0.76, h * 0.008);
    ctx.restore();
  });
}

/** The cup: cream paper, a red band carrying the name. */
export function cupPrintTexture(
  fonts: BrandFonts,
  size: PrintSize,
  opts: { label: string; band?: string; base?: string; ink?: string } = { label: "No. 10 · Cola" },
): THREE.CanvasTexture {
  const band = opts.band ?? "#c8381f";
  const base = opts.base ?? "#f4ebdc";
  const ink = opts.ink ?? "#2a1a11";
  return wrapPrint(size, (ctx, w, h, sx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 4000, "#6b4a2e", 0.06, 31);
    const top = h * 0.3;
    const bottom = h * 0.66;
    ctx.fillStyle = band;
    ctx.fillRect(0, top, w, bottom - top);
    speckle(ctx, w, h * 0.4, 1200, "#ffe2d2", 0.05, 32);

    ctx.save();
    ctx.translate(w / 2, 0);
    ctx.scale(sx, 1);
    ctx.textAlign = "center";
    ctx.fillStyle = ink;
    ctx.font = `500 ${h * 0.034}px ${fonts.mono}`;
    spacedText(ctx, "BOAIVE'S", 0, top - h * 0.045, h * 0.012);
    ctx.fillStyle = base;
    ctx.font = `400 ${h * 0.13}px ${fonts.display}`;
    ctx.fillText("Burger", 0, top + (bottom - top) * 0.52);
    ctx.font = `400 ${h * 0.074}px ${fonts.display}`;
    ctx.fillText("Experiment", 0, top + (bottom - top) * 0.8);
    ctx.fillStyle = ink;
    ctx.font = `400 ${h * 0.03}px ${fonts.mono}`;
    spacedText(ctx, opts.label.toUpperCase(), 0, bottom + h * 0.075, h * 0.008);
    ctx.restore();

    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.965, w, h * 0.035);
  });
}

/** Greaseproof liner under the burger: a printed border, a line of type, two honest grease marks. */
export function linerTexture(fonts: BrandFonts): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f4ecdd";
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 6000, "#8a6a48", 0.06, 41);

    // Grease: a couple of faint, warmer translucent patches.
    const grease = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(196,160,110,0.12)");
      g.addColorStop(0.6, "rgba(196,160,110,0.06)");
      g.addColorStop(1, "rgba(196,160,110,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.8, 0.6, 0, Math.PI * 2);
      ctx.fill();
    };
    grease(w * 0.78, h * 0.26, 70);
    grease(w * 0.2, h * 0.74, 48);

    const red = "#b8341d";
    ctx.strokeStyle = red;
    ctx.lineWidth = 3;
    const m1 = w * 0.055;
    const m2 = w * 0.1;
    ctx.strokeRect(m1, m1, w - m1 * 2, h - m1 * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(m2, m2, w - m2 * 2, h - m2 * 2);

    ctx.fillStyle = red;
    ctx.font = `500 ${w * 0.018}px ${fonts.mono}`;
    ctx.textBaseline = "middle";
    const line = "BOAIVE'S BURGER EXPERIMENT · MESSY HANDS. GOOD DECISIONS. · ";
    const band = (m1 + m2) / 2;
    for (let side = 0; side < 4; side++) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((side * Math.PI) / 2);
      ctx.translate(-w / 2, -h / 2);
      spacedText(ctx, line.repeat(2).slice(0, 74), w / 2, band, w * 0.0045);
      ctx.restore();
    }
  });
}
