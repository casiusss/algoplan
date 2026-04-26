#!/usr/bin/env node
// Run: node scripts/generate-brand-assets.mjs
// Re-run after editing apps/web/public/algoplan-mark.svg.
// Outputs are committed to source control — they are NOT regenerated at build time.
//
// Phase 7 brand asset generator (Plan 07-00 Task 2).
//
// Reads ONE seed SVG (apps/web/public/algoplan-mark.svg) and emits the full
// favicon stack, PWA icons, OG image, and Electron app icons (Linux PNG,
// Windows ICO, macOS ICNS) deterministically.
//
// Determinism contract: re-running the script with no SVG edit produces
// byte-identical outputs. The Phase 7 verification step relies on this
// (`git diff --stat` after re-run must be empty).
//
// Threat model: T-07-00-01 mitigation. The script reads only the committed
// seed SVG path (no CLI args, no network fetch). If you change the seed
// path, change it here in source.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import png2icons from "png2icons";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const SEED = path.join(ROOT, "apps/web/public/algoplan-mark.svg");

/**
 * Asset matrix — kept in lock-step with .planning/phases/07-rebrand-pass/07-PATTERNS.md §3.
 *
 * Each entry has exactly ONE format:
 *   - "svg-copy"  — copy seed SVG verbatim
 *   - "png"       — single PNG, optionally placed on a larger canvas (OG)
 *   - "ico"       — multi-size Windows .ico container
 *   - "icns"      — multi-size macOS .icns container
 */
const TARGETS = [
  // ── Web favicon stack ──────────────────────────────────────────────
  { out: "apps/web/public/favicon.svg", format: "svg-copy" },
  { out: "apps/web/public/favicon.ico", format: "ico", sizes: [16, 32, 48] },
  { out: "apps/web/public/apple-touch-icon.png", format: "png", size: 180 },
  { out: "apps/web/public/icon-192.png", format: "png", size: 192 },
  { out: "apps/web/public/icon-512.png", format: "png", size: 512 },
  // OG image: 1200x630 canvas with the 512px mark centered (white background
  // matches the seed SVG so the mark blends seamlessly).
  {
    out: "apps/web/public/og-image.png",
    format: "png",
    size: 512,
    canvas: { w: 1200, h: 630, background: "#ffffff" },
  },
  // ── Desktop app icons ──────────────────────────────────────────────
  { out: "apps/desktop/build/icon.png", format: "png", size: 512 },
  {
    out: "apps/desktop/build/icon.ico",
    format: "ico",
    sizes: [16, 32, 48, 64, 128, 256],
  },
  {
    out: "apps/desktop/build/icon.icns",
    format: "icns",
    sizes: [16, 32, 64, 128, 256, 512, 1024],
  },
  { out: "apps/desktop/resources/icon.png", format: "png", size: 256 },
];

async function ensureDir(absPath) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
}

/**
 * Render the seed SVG at a single size to a PNG buffer. The `density`
 * scaling makes vector edges crisp at high target sizes (sharp defaults
 * to 72 DPI which under-samples for large icons).
 */
async function renderPng(seedSvg, size) {
  return sharp(seedSvg, { density: Math.max(72, size * 2) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function writePng(seedSvg, target) {
  const out = path.join(ROOT, target.out);
  await ensureDir(out);
  const mark = await renderPng(seedSvg, target.size);

  if (target.canvas) {
    // Composite the mark onto a larger background canvas (OG image case).
    const { w, h, background } = target.canvas;
    const composite = await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background,
      },
    })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toBuffer();
    await fs.writeFile(out, composite);
  } else {
    await fs.writeFile(out, mark);
  }
  console.log(`  ✓ ${target.out} (${target.size}px${target.canvas ? ` on ${target.canvas.w}x${target.canvas.h}` : ""})`);
}

async function writeIco(seedSvg, target) {
  const out = path.join(ROOT, target.out);
  await ensureDir(out);
  const buffers = await Promise.all(
    target.sizes.map((s) => renderPng(seedSvg, s)),
  );
  const ico = await pngToIco(buffers);
  await fs.writeFile(out, ico);
  console.log(`  ✓ ${target.out} (sizes: ${target.sizes.join(", ")})`);
}

async function writeIcns(seedSvg, target) {
  const out = path.join(ROOT, target.out);
  await ensureDir(out);
  // png2icons.createICNS takes a SINGLE high-res PNG and internally generates
  // all standard macOS icon sizes. Feed it the largest target size.
  const largest = Math.max(...target.sizes);
  const sourcePng = await renderPng(seedSvg, largest);
  const icns = png2icons.createICNS(sourcePng, png2icons.BILINEAR, 0);
  if (!icns) {
    throw new Error(`png2icons.createICNS returned null for ${target.out}`);
  }
  await fs.writeFile(out, icns);
  console.log(`  ✓ ${target.out} (sizes: ${target.sizes.join(", ")})`);
}

async function copySvg(seedSvg, target) {
  const out = path.join(ROOT, target.out);
  await ensureDir(out);
  await fs.copyFile(seedSvg, out);
  console.log(`  ✓ ${target.out} (svg verbatim)`);
}

async function main() {
  console.log(`Generating brand assets from ${path.relative(ROOT, SEED)}…`);
  // Read the seed once into a buffer so all target generations share the
  // same byte-identical input (deterministic re-run guarantee).
  const seedBuf = await fs.readFile(SEED);

  for (const target of TARGETS) {
    if (target.format === "svg-copy") {
      await copySvg(SEED, target);
      continue;
    }
    if (target.format === "png") {
      await writePng(seedBuf, target);
      continue;
    }
    if (target.format === "ico") {
      await writeIco(seedBuf, target);
      continue;
    }
    if (target.format === "icns") {
      await writeIcns(seedBuf, target);
      continue;
    }
    throw new Error(`Unknown target format: ${target.format} for ${target.out}`);
  }

  console.log(`\nDone — ${TARGETS.length} assets generated.`);
}

main().catch((err) => {
  console.error("✗ generate-brand-assets failed:", err);
  process.exit(1);
});
