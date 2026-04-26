import type { MetadataRoute } from "next";

// PWA manifest for AlgoPlan. Next.js 16 auto-serves this at
// `/manifest.webmanifest` and auto-injects the `<link rel="manifest">` tag,
// so no manual <head> wiring is required in layout.tsx.
//
// theme_color matches viewport.themeColor dark token (#05070b) so the
// browser/installed-PWA chrome blends with the app's dark default surface.
// background_color is the splash background shown before first paint —
// kept white to match the light-theme initial state on cold launch.
//
// Phase 7 D-2 invariant: this file does NOT touch localStorage. The
// `multica:*` keys (chat) and `multica_*` keys (auth, view state) are
// preserved in their respective stores; renaming them would log every
// existing user out + lose their UI state. See packages/core/chat/store.test.ts
// and packages/core/auth/store.test.ts for the regression locks.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AlgoPlan",
    short_name: "AlgoPlan",
    description:
      "Open-source platform that turns coding agents into real teammates.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#05070b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
