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
// Phase 8 D-2: localStorage keys have been migrated to algoplan_* / algoplan:*
// via migrateLocalStorage (boot) + useWorkspaceStorageMigration (workspace mount).
// This file does NOT touch localStorage. Storage is owned by each respective store.
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
