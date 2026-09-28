/**
 * Derives the web assets from the supplied Boaive logo (assets/boaive-logo.jpg).
 *
 * The logo is never redrawn, recoloured or distorted: every output is either a crop of the
 * original pixels or a uniform scale of such a crop, placed on the logo's own black (#000).
 *
 *   npm run brand
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "assets", "boaive-logo.jpg");
const out = (p) => path.join(root, p);

mkdirSync(out("public/brand"), { recursive: true });

// Measured on the 1600×800 original: mark x 345–567 / y 224–553, wordmark x 584–1279 / y 374–529.
// Crops keep a margin so the soft glow around the letterforms is not clipped.
const LOCKUP = { left: 305, top: 189, width: 1016, height: 400 };
const MARK = { left: 325, top: 204, width: 254, height: 370 };

const black = { r: 0, g: 0, b: 0, alpha: 1 };

// 1. The original, byte for byte.
copyFileSync(source, out("public/brand/boaive-logo.jpg"));

// 2. Full lockup (mark + wordmark + tagline), cropped to its content.
await sharp(source).extract(LOCKUP).webp({ quality: 92, smartSubsample: true }).toFile(out("public/brand/boaive-lockup.webp"));

// 3. Mark only, centred on a black square (for icons).
const markSquare = await sharp(source)
  .extract(MARK)
  .extend({
    top: 45,
    bottom: 45,
    left: Math.round((460 - MARK.width) / 2),
    right: 460 - MARK.width - Math.round((460 - MARK.width) / 2),
    background: black,
  })
  .png()
  .toBuffer();

const icon = (size) => sharp(markSquare).resize(size, size, { fit: "contain", background: black });

await icon(512).png().toFile(out("public/brand/icon-512.png"));
await icon(192).png().toFile(out("public/brand/icon-192.png"));
await icon(180).png().toFile(out("src/app/apple-icon.png"));
await icon(96).png().toFile(out("src/app/icon.png"));

console.log("brand assets written");
