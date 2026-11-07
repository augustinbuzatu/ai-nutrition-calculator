// @ts-check
// Draws the app's icons, for the home screen and the browser tab, with the
// image renderer Next.js ships (next/og). Run it again after changing the
// design: `node scripts/make-icons.mjs`. The PNGs it writes are committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const GREEN = "#059669";

/**
 * A white plate with "kcal" on green. `plate` is the plate's share of the
 * icon: smaller for a maskable icon, which Android may crop to a circle.
 * @param {{ size: number, plate: number, rounded: boolean }} options
 */
function icon({ size, plate, rounded }) {
  const diameter = size * plate;
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GREEN,
        borderRadius: rounded ? size * 0.22 : 0,
      },
    },
    h(
      "div",
      {
        style: {
          width: diameter,
          height: diameter,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "white",
          // The plate's rim.
          boxShadow: `inset 0 0 0 ${diameter * 0.07}px #d1fae5`,
          color: GREEN,
          fontSize: diameter * 0.3,
          fontWeight: 700,
          letterSpacing: -diameter * 0.01,
        },
      },
      "kcal",
    ),
  );
}

/** @type {[string, { size: number, plate: number, rounded: boolean }][]} */
const ICONS = [
  // The manifest's icons, for Android and desktop installs.
  ["public/icon-192.png", { size: 192, plate: 0.7, rounded: true }],
  ["public/icon-512.png", { size: 512, plate: 0.7, rounded: true }],
  ["public/icon-maskable-512.png", { size: 512, plate: 0.56, rounded: false }],
  // iOS rounds the corners itself, and shows transparency as black.
  ["src/app/apple-icon.png", { size: 180, plate: 0.7, rounded: false }],
  // The browser tab.
  ["src/app/icon.png", { size: 64, plate: 0.8, rounded: true }],
];

mkdirSync("public", { recursive: true });
for (const [path, options] of ICONS) {
  const image = new ImageResponse(icon(options), {
    width: options.size,
    height: options.size,
  });
  writeFileSync(path, Buffer.from(await image.arrayBuffer()));
  console.log(`${path} (${options.size}x${options.size})`);
}
