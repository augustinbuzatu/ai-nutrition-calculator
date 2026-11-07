import type { MetadataRoute } from "next";

// What a phone needs to install the app on its home screen, where it opens
// full screen, like any other app. Served at /manifest.webmanifest; the
// icons come from scripts/make-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Nutrition Calculator",
    short_name: "Nutrition",
    description:
      "Describe what you ate, in English or Romanian, and get its calories and macros.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
